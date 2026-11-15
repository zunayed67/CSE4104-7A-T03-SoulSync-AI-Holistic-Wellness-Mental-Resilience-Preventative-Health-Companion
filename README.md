# SoulSync AI

**Holistic Wellness, Mental Resilience & Preventative Health Companion**

An AI-powered full-stack web application that helps users record everyday wellbeing habits, understand patterns in their own data and turn those patterns into practical, non-medical next steps.

> **Course:** CSE 4104 – Software Development III | **Section:** 7A | **Team:** CSE4104-7A-T03
> **Department:** Computer Science and Engineering, Northern University of Business and Technology, Khulna
> **Submitted to:** Md. Riaz Mahmud, Assistant Professor

> ⚠️ **Disclaimer:** SoulSync AI is a wellness-awareness and habit-support tool. It is **not a medical device** and does not diagnose conditions, prescribe treatment or replace doctors, counsellors or other qualified professionals. AI-generated suggestions are general wellness guidance and are not clinically validated. If you need help with a medical or mental-health concern, please contact a qualified professional or local emergency services.

---

## Team Information

| No. | Member                        | Student ID  | Primary responsibility                                                                     |
| --- | ----------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| 1   | Zunayed Hossain (Team Leader) | 11230321505 | QA, DevOps, project coordination, integration support and final submission                 |
| 2   | Mousumi Khatun                | 11230321229 | AI integration, prompt design, provider service and AI safety testing                      |
| 3   | Promith Saha Joy              | 11230321389 | Backend development, REST APIs, database models, authentication and server-side validation |
| 4   | Samira Islam Kanta            | 11230321317 | Frontend development, responsive UI, dashboard, forms, charts and API integration          |

All members take part in integration, testing, documentation and code review.

---

## Project Overview

University students and young professionals often face irregular sleep, stress, inactivity and skipped meals, but their information is scattered across apps, notebooks and memory, and most trackers show records without suggesting what to do next.

SoulSync AI follows a simple cycle: **Track → Understand → Act → Review → Improve.** Users log daily wellness metrics, see trends calculated from their own stored records, receive consent-based AI suggestions and routines, and review a weekly report. Numerical statistics are always calculated by the application; the AI is used only to explain patterns and draft suggestions.

## Objectives

1. Develop a secure full-stack web application with registration, login, profile management and role-based access.
2. Let users record daily mood, stress, sleep, water intake, activity and energy in one place.
3. Present weekly and monthly charts and statistics calculated from actual stored records.
4. Provide AI-supported wellness chat, personalised recommendations, daily routines and weekly summaries.
5. Support healthy habits through goals, guided breathing exercises, reminders and notifications.
6. Protect privacy through data minimisation, explicit consent for external AI processing and secure access controls.
7. Give administrators basic tools to manage users and wellness resources.
8. Test, document and deploy a functional application suitable for academic demonstration.

## Features

- **Authentication & profile** – registration, login/logout, profile settings, password change, protected routes, User/Admin roles
- **Daily wellness tracker** – mood, stress, sleep, hydration, activity and energy; one record per user per day
- **Mental wellness tools** – private journal, daily reflection, guided breathing timer, curated resource library
- **Dashboard & analytics** – today's overview, weekly/monthly charts, streaks, missing-day indicators
- **Goals & habits** – daily/weekly goals with progress and consistency tracking
- **AI wellness assistant** – wellness chatbot, personalised recommendations, daily routine generator, weekly summary (consent-based, with safety checks and disclaimers)
- **Reminders & notifications** – in-app reminders, goal deadlines, automated weekly reports (optional email)
- **Admin panel** – manage users and wellness resources, review reported content

### AI safety and privacy highlights

- The AI provider is called **only from the backend**; API keys never reach the browser or GitHub.
- Wellness data is sent to the AI provider **only after explicit user consent** and only as the minimum required fields.
- **Private journal text is excluded** from AI requests by default.
- A rule-based safety check runs before every AI call; crisis messages receive a supportive response that points to professional and emergency help.
- AI output is validated, filtered and shown with a non-medical disclaimer.

## Technology Stack

| Layer           | Technology                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Frontend        | React.js (Vite), JavaScript ES6+, Tailwind CSS, React Router, Axios, Context API, Recharts, Lucide React |
| Backend         | Node.js, Express.js, REST API under `/api/v1`, Mongoose                                                  |
| Database        | MongoDB Atlas                                                                                            |
| Authentication  | JWT in secure HTTP-only cookies, password hashing, role-based authorisation                              |
| AI integration  | OpenAI API **or** Google Gemini API (one provider initially, behind a swappable backend service)         |
| Automation      | node-cron, MongoDB-backed notifications, optional Nodemailer email                                       |
| Testing         | Vitest, Supertest, React Testing Library, Playwright                                                     |
| Version control | Git and GitHub (feature branches + pull requests)                                                        |
| Deployment      | Vercel (frontend), Render (backend), MongoDB Atlas (database)                                            |

## System Architecture

```
React + Tailwind + Recharts (browser, Vercel)
        │  HTTPS / JSON · secure HTTP-only cookie
        ▼
Node.js + Express REST API  (/api/v1, Render)
  middleware: Helmet · CORS · rate limit · JWT auth · role guard · validation
  services:   Auth · Wellness · Analytics · Goals · Reports · Notifications · AI
        │                          │                         │
        ▼                          ▼                         ▼
 MongoDB Atlas            AI provider (OpenAI)   node-cron jobs
 (via Mongoose)           backend only, via adapter       (reminders, weekly reports)
```

See `docs/CSE4104-7A-T03_ArchitectureDiagram.pdf` for the full diagram.

## Repository Structure

> Planned structure – update as the implementation proceeds.

```
SoulSync-AI/
├── client/                  # React (Vite) frontend
│   ├── src/
│   │   ├── components/      # reusable UI components
│   │   ├── pages/           # Dashboard, Tracker, Journal, Goals, AI, Admin ...
│   │   ├── context/         # auth and app state (Context API)
│   │   ├── services/        # Axios API clients
│   │   └── utils/
│   └── tests/
├── server/                  # Node.js + Express backend
│   ├── src/
│   │   ├── config/          # env, database, security settings
│   │   ├── middleware/      # auth, role guard, validation, rate limit, errors
│   │   ├── models/          # Mongoose schemas (Users, WellnessLogs, Goals ...)
│   │   ├── routes/          # /api/v1 route definitions
│   │   ├── controllers/
│   │   ├── services/        # analytics, reports, notifications, ai/ (adapter, safety, consent)
│   │   └── jobs/            # node-cron reminder and weekly report jobs
│   └── tests/
├── docs/                    # proposal, SRS and diagrams
│   ├── CSE4104-7A-T03_SRS.pdf
│   ├── CSE4104-7A-T03_UseCaseDiagram.pdf
│   ├── CSE4104-7A-T03_ERDiagram.pdf
│   └── CSE4104-7A-T03_ArchitectureDiagram.pdf
├── .env.example             # variable names only – never commit real secrets
├── .gitignore
└── README.md
```

## Documentation

| Document                            | File                                          |
| ----------------------------------- | --------------------------------------------- |
| Software Requirement Specification  | `docs/CSE4104-7A-T03_SRS.pdf`                 |
| Use Case Diagram                    | `docs/CSE4104-7A-T03_UseCaseDiagram.pdf`      |
| ER Diagram                          | `docs/CSE4104-7A-T03_ERDiagram.pdf`           |
| Initial System Architecture Diagram | `docs/CSE4104-7A-T03_ArchitectureDiagram.pdf` |

## Getting Started

> Setup instructions will be completed as the implementation proceeds. The intended workflow is:

```bash
# 1. Clone the repository
git clone <repository-url>
cd SoulSync-AI

# 2. Backend
cd server
cp .env.example .env        # fill in MONGODB_URI, JWT_SECRET, AI provider key, CLIENT_ORIGIN
npm install
npm run dev

# 3. Frontend (new terminal)
cd client
npm install
npm run dev
```

**Never commit** `.env` files, API keys, passwords, real private journal data or production secrets.

## Team Workflow

- Agile-style short cycles with feature branches, pull requests and peer code review.
- The `main` branch is protected where possible; every feature merges through a reviewed pull request.
- A feature is complete only after its basic tests pass and it is integrated into the shared repository.
- Small, meaningful commits; API contracts agreed early so frontend and backend can progress in parallel.

## Project Status

| Phase                                                   | Status                     |
| ------------------------------------------------------- | -------------------------- |
| Project Proposal                                        | ✅ Submitted (08 Nov 2026) |
| Software Requirement Specification and initial diagrams | ✅ Submitted (Week 03)     |
| System design and implementation                        | 🔄 In progress             |
| Testing, deployment and final report                    | ⏳ Planned                 |

## License

Academic project for CSE 4104 – Software Development III, NUBT Khulna. All rights reserved by the team unless a licence is added later.
