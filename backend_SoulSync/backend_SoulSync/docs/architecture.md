# SoulSync AI: Backend architecture

Layered Express 5 API (`/api/v1`) on MongoDB Atlas, matching the SRS architecture diagram.

```
HTTP ─▶ requestContext (id, logs) ─▶ helmet ─▶ CORS allow-list ─▶ rate limit ─▶ JSON parser
     ─▶ routes ─▶ authenticate ─▶ authorize / requireAiConsent ─▶ validate (zod)
     ─▶ controller ─▶ service ─▶ repository (owner-scoped) ─▶ Mongoose ─▶ MongoDB
     ─▶ errorHandler (single place for error → JSON)
```

| Layer        | Folder          | Responsibility                                                           |
| ------------ | --------------- | ------------------------------------------------------------------------ |
| Routes       | `routes/`       | Paths, middleware order, which validator guards which endpoint           |
| Controllers  | `controllers/`  | Thin: read `req.validated`, call a service, shape the response           |
| Services     | `services/`     | Business rules (one record per day, streaks, quotas, AI orchestration)   |
| Repositories | `repositories/` | All queries. Owned records are always filtered by `_id` **and** `userId` |
| Models       | `models/`       | Schemas, validation and indexes (the ten collections of the ER diagram)  |
| Validators   | `validators/`   | zod schemas: type, range, strip unknown keys                             |
| Jobs         | `jobs/`         | node-cron: reminders (5 min), weekly report (hourly), startup recovery   |

## Conventions

- **Dates**: a calendar day is a `YYYY-MM-DD` key resolved in the **user's** timezone, stored as a Date at
  00:00 UTC (`utils/date.js`). `(userId, date)` is unique, so "one record per day" holds for every timezone.
- **Errors**: throw `AppError.*`; Express 5 forwards async errors. Clients receive
  `{ success: false, error: { code, message, details?, requestId } }`; internals never leak.
- **Not found vs forbidden**: another user's record is reported as 404, so ids are not confirmed.
- **Statistics** (averages, trends, streaks, missing days) are computed in `utils/stats.js` and
  `services/analytics.service.js`, never by the AI. Missing days are `null`, never zero.

## AI flow (FR-30 to FR-40)

```
request ─▶ requireAiConsent (data features) ─▶ safetyCheck (crisis / medical / injection / invalid)
        ─▶ quota (atomic, per user per day) ─▶ dataMinimizer + assertMinimized
        ─▶ provider adapter (OpenAI or Gemini, timeout) ─▶ outputValidator ─▶ disclaimer + response
```

- Safety hits (crisis, medical, injection) are answered with canned text; **no provider call, no quota used**.
- A failed provider call refunds the quota unit and returns a friendly 502/503/504.
- The payload is built from a whitelist (six numeric metrics, goal title/progress). Journal text, names,
  emails and ids cannot be sent; `assertMinimized` throws if a forbidden key ever appears.
- Providers implement `AIProvider.generate()`; `AI_PROVIDER` selects one, the frontend is unaffected.
- Conversations expire 30 days after the last message (MongoDB TTL index) and can be deleted by the user.

## Jobs and idempotency (NFR-20)

| Job             | Schedule        | Idempotency key                                               |
| --------------- | --------------- | ------------------------------------------------------------- |
| `reminders`     | every 5 min     | notification `dedupeKey` (`daily:<date>`, `goal:<id>:<date>`) |
| `weekly-report` | hourly          | report unique on `(userId, ISO week)`; notice `weekly:<week>` |
| `recovery`      | on start, 03:00 | runs the weekly catch-up and closes overdue goals             |

Each run is overlap-protected and failure-isolated per user. Free Render instances sleep: missed weekly
reports are generated on the next start; missed daily reminders are intentionally not replayed.

## Security controls → SRS

| Requirement | Implementation                                                                              |
| ----------- | ------------------------------------------------------------------------------------------- |
| NFR-05      | bcrypt (cost 12), 72-byte limit enforced, dummy compare for unknown emails                  |
| NFR-06      | JWT (HS256, pinned) in an HttpOnly cookie only; `Secure; SameSite=None` in production       |
| NFR-07      | Origin allow-list rejects other origins for every method (also the CSRF defence)            |
| NFR-08      | zod on every input; unknown fields stripped; Mongo filters built only from validated values |
| NFR-09      | global, auth and per-user AI rate limits; separate persistent daily AI quota                |
| NFR-10      | `authenticate` reloads the user each request; role from DB; owner-scoped repositories       |
| NFR-12/13   | data minimiser + consent gate; request bodies, cookies and message text are never logged    |
| FR-50       | no admin route or service touches wellness, journal, goal or conversation data              |

## Testing

`npm test` runs unit tests plus integration tests against a real MongoDB (`mongodb-memory-server`;
set `TEST_MONGODB_URI` to use an existing server, or `MONGOMS_SYSTEM_BINARY` for a local `mongod`).
The AI provider is mocked in feature tests and exercised against a local fake HTTP server in
`tests/unit/ai/providers.test.js`.
