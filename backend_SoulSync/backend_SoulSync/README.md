# SoulSync AI: Backend

REST API for **SoulSync AI** (Holistic Wellness, Mental Resilience & Preventative Health Companion).
Node.js 22+, Express 5, Mongoose 9 (MongoDB Atlas), JWT in HTTP-only cookies, node-cron, Vitest.

> Wellness guidance only. Not a medical device: no diagnosis, treatment or disease prediction.

## Quick start

```bash
npm install
cp .env.example .env          # set MONGODB_URI and JWT_SECRET (see below)
npm run seed:admin            # first administrator (needs ADMIN_EMAIL / ADMIN_PASSWORD in .env)
npm run seed:resources        # starter breathing exercises and articles
npm run dev                   # http://localhost:5000/api/v1/health
```

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Scripts

| Script                   | Purpose                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `npm run dev`            | Start with auto-restart (`--watch`)                               |
| `npm start`              | Start for production                                              |
| `npm test`               | Unit + integration tests (real MongoDB via mongodb-memory-server) |
| `npm run lint`           | ESLint                                                            |
| `npm run format:check`   | Prettier check (CI runs this too)                                 |
| `npm run seed:admin`     | Create or promote the administrator from `ADMIN_*` env vars       |
| `npm run seed:resources` | Insert-only seed of library content (never overwrites edits)      |

## Environment

All variables are validated at startup (`src/config/index.js`); a bad value stops the server with a list of
every problem. See `.env.example` for the full annotated list. The important ones:

| Variable                    | Notes                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `MONGODB_URI`, `JWT_SECRET` | Required. Secret must be 32+ characters                                                  |
| `CLIENT_ORIGINS`            | Exact frontend origin(s), comma-separated. Required in production                        |
| `AI_PROVIDER`               | `openai` or `gemini`; set the matching `*_API_KEY`                                       |
| `AI_MODEL`                  | Optional model override. Gemini defaults to `gemini-3.5-flash-lite`; OpenAI retains its provider default |
| `AI_DAILY_REQUEST_LIMIT`    | Per-user AI requests per day (default 30)                                                |
| `EMAIL_ENABLED` + `SMTP_*`  | Optional Nodemailer delivery                                                             |
| `ENABLE_JOBS`               | `false` disables the cron jobs                                                           |

Without an AI key the rest of the app works; AI endpoints return a friendly 503 `AI_NOT_CONFIGURED`.
Model names change often: if a provider rejects the default, set `AI_MODEL` to one your account can use.

## API

Base path `/api/v1`. The complete contract is in [`docs/api/openapi.yaml`](docs/api/openapi.yaml)
(64 operations); the design is described in [`docs/architecture.md`](docs/architecture.md).

| Group                   | Highlights                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Auth                    | register, login, logout, me, email verification, password reset (HTTP-only `soulsync_token` cookie) |
| Profile                 | profile, reminder preferences, password change, **AI consent**, account deletion           |
| Wellness                | one record per user per day; range-filtered history; edit and delete                       |
| Journal                 | private entries, reflections and check-ins, tags                                           |
| Analytics               | dashboard overview; weekly, monthly and custom (≤ 90 days) trends with missing days marked |
| AI                      | chat, recommendations, routine draft, weekly summary, usage, saved conversations           |
| Goals / Routines        | goals with progress, streak and completion rate; saved routines                            |
| Notifications / Reports | in-app notifications; weekly reports                                                       |
| Resources               | published library, categories, content reports                                             |
| Admin                   | users (suspend, reactivate, delete), resources, report review, stats                       |

Responses: `{ success: true, data, meta? }` or `{ success: false, error: { code, message, details?, requestId } }`.

## Behaviour worth knowing

- **Days** are calendar days in the user's timezone (`YYYY-MM-DD`); "today" is never the server's day.
- **Privacy**: AI data features need explicit consent; only whitelisted numeric metrics and goal titles
  are sent; journal text is never sent or logged. Admins cannot read users' private data.
- **AI safety**: crisis, medical and prompt-injection messages are answered locally; output is filtered
  for diagnosis, dosage and clinical claims; every AI response carries the disclaimer.
- **Sessions** are re-checked on every request: suspension, role change or password change apply at once.
- **Jobs** are idempotent. On free hosting that sleeps, weekly reports missed while asleep are generated
  on the next start; missed daily reminders are not replayed.

## Testing

```bash
npm test
```

Integration tests start a throwaway MongoDB with `mongodb-memory-server` (downloads a `mongod` binary on the
first run). To use something else: `TEST_MONGODB_URI=mongodb://...` for an existing server, or
`MONGOMS_SYSTEM_BINARY=/path/to/mongod` for a local binary. The AI provider is mocked in feature tests and
exercised against a local fake HTTP server in `tests/unit/ai/providers.test.js`.

## Deployment (Render + Vercel + Atlas)

1. Create an Atlas cluster and allow Render's outbound IPs (or `0.0.0.0/0` for a demo).
2. In Render choose **New → Blueprint** and select this repo (`render.yaml`). Set `MONGODB_URI`,
   `CLIENT_ORIGINS=https://<your-app>.vercel.app` and the AI key. `JWT_SECRET` is generated for you.
3. Run `npm run seed:admin` once (Render shell, or locally against the Atlas URI).
4. Frontend: set `VITE_API_URL=https://<service>.onrender.com/api/v1`; the shared fetch client sends credentials.

Production cookies are `Secure; SameSite=None` because the frontend and API are different sites.
