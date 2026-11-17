<div align="center">

# 🧠✨ SoulSync AI

**Holistic Wellness, Mental Resilience & Preventative Health Companion**

An AI-powered full-stack web application that helps users record everyday wellbeing habits, uncover patterns in their own data, and turn those insights into practical, non-medical next steps.

[![Course](https://img.shields.io/badge/Course-CSE%204104%20%7C%20Software%20Development%20III-blue?style=for-the-badge)](https://github.com)
[![Section](https://img.shields.io/badge/Section-7A%20%7C%20Team%20T03-indigo?style=for-the-badge)](https://github.com)
[![University](https://img.shields.io/badge/University-NUBT%20Khulna-teal?style=for-the-badge)](https://github.com)
[![Status](https://img.shields.io/badge/Status-In%20Progress-amber?style=for-the-badge)](https://github.com)

<p>
  <a href="#-project-overview">Overview</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-technology-stack">Tech Stack</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-team-information">Team</a>
</p>

</div>

---

> [!WARNING]
> **Medical Disclaimer:** SoulSync AI is a wellness-awareness and habit-support tool. It is **not a medical device** and does not diagnose conditions, prescribe treatment, or replace doctors, counsellors, or other qualified professionals. AI-generated suggestions are general wellness guidance and are not clinically validated. If you need help with a medical or mental-health concern, please contact a qualified professional or local emergency services.

---

## 🎓 Academic Context

* **Course:** CSE 4104 – Software Development III
* **Section & Team:** Section `7A` | Team `CSE4104-7A-T03`
* **Department:** Computer Science and Engineering, Northern University of Business and Technology, Khulna
* **Submitted to:** Md. Riaz Mahmud, Assistant Professor

---

## 📖 Project Overview

University students and young professionals frequently experience irregular sleep, high stress, physical inactivity, and skipped meals. Existing health data is often scattered across multiple apps and notebooks, while most standard trackers merely display logs without offering actionable guidance.

**SoulSync AI** bridges this gap through a continuous five-stage wellness cycle:

```
  📝 Track   ──▶   📊 Understand   ──▶   ⚡ Act   ──▶   🔍 Review   ──▶   🌱 Improve
```

Users log daily wellness metrics, view trends calculated strictly from their own stored records, receive consent-based AI suggestions and daily routines, and review automated weekly progress reports. **All numerical statistics are deterministically computed by the application**—the AI is utilized solely to explain patterns and draft personalized wellness suggestions.

### 🎯 Core Objectives
1. **Secure Architecture:** Build a full-stack web application featuring authentication, profile management, and role-based access control (RBAC).
2. **Unified Tracking:** Centralize daily logs for mood, stress, sleep, hydration, physical activity, and energy levels.
3. **Data-Driven Analytics:** Render weekly and monthly charts and statistics derived from actual user records.
4. **AI Wellness Guidance:** Provide consent-driven wellness chat, tailored recommendations, daily routines, and weekly summaries.
5. **Habit Reinforcement:** Support consistency via goal tracking, guided breathing timers, reminders, and notifications.
6. **Privacy-First Design:** Enforce data minimization, explicit consent gates for external AI calls, and strict access controls.
7. **Administrative Control:** Equip administrators with tools to manage platform users and curated wellness resources.
8. **Academic Readiness:** Deliver a thoroughly tested, well-documented, and deployed application suitable for live academic evaluation.

---

## ✨ Key Features

* 🔐 **Authentication & Profile Management** — Registration, secure login/logout, profile settings, password updates, protected routes, and `User` / `Admin` role separation.
* 📅 **Daily Wellness Tracker** — Log mood, stress, sleep, hydration, activity, and energy (enforcing one structured entry per user per day).
* 🧘 **Mental Wellness Toolkit** — Private reflection journal, daily prompts, interactive guided breathing timer, and a curated wellness resource library.
* 📈 **Dashboard & Analytics** — Today's snapshot, weekly/monthly visual trends, habit streaks, and missing-day indicators.
* 🎯 **Goals & Habit Tracking** — Configurable daily and weekly targets with real-time progress and consistency metrics.
* 🤖 **AI Wellness Assistant** — Interactive wellness chatbot, personalized recommendations, daily routine generator, and weekly summary compiler.
* 🔔 **Reminders & Notifications** — In-app reminders, goal deadline alerts, and automated weekly reports (with optional email delivery).
* 🛡️ **Admin Panel** — User account oversight, wellness resource curation, and moderation of reported content.

### 🔒 AI Safety & Privacy Highlights
> [!IMPORTANT]
> Privacy and user safety are built directly into the backend pipeline:
> * **Server-Side Execution:** The AI provider is invoked **exclusively from the backend**; API keys are never exposed to the client or version control.
> * **Explicit Consent Gate:** Wellness metrics are transmitted to the AI provider **only after explicit user consent** and stripped down to minimal required fields.
> * **Zero Journal Exposure:** **Private journal text is excluded** from AI requests by default.
> * **Pre-Flight Crisis Detection:** A rule-based safety filter screens every prompt prior to AI execution; crisis indicators immediately trigger a supportive response with professional and emergency helpline resources.
> * **Output Guardrails:** All AI responses undergo validation, filtering, and mandatory non-medical disclaimer tagging.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) React Router, Axios, Context API, Recharts, Lucide React |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white) REST API (`/api/v1`), Mongoose ODM |
| **Database** | ![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-4EA94B?style=flat-square&logo=mongodb&logoColor=white) |
| **Security & Auth** | JWT (HTTP-only secure cookies), Password Hashing (`bcrypt`), RBAC Middleware, Helmet, Rate Limiting |
| **AI Integration** | ![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white) / ![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=flat-square&logo=google&logoColor=white) (Swappable backend adapter service) |
| **Automation** | `node-cron`, MongoDB-backed notifications, Nodemailer (optional email alerts) |
| **Testing** | Vitest, Supertest, React Testing Library, Playwright |
| **DevOps & Hosting** | ![Git](https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white) ![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white) ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white) ![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white) |

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                React + Tailwind + Recharts (Browser / Vercel)           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS / JSON · Secure HTTP-Only Cookie
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 Node.js + Express REST API (/api/v1 · Render)           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Middleware: Helmet · CORS · Rate Limit · JWT Auth · RBAC · Joi/Zod │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ Services:   Auth · Wellness · Analytics · Goals · Reports · AI    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└──────────────┬─────────────────────┬─────────────────────┬──────────────┘
               │                     │                     │
               ▼                     ▼                     ▼
      ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
      │  MongoDB Atlas  │   │   AI Provider   │   │  node-cron Jobs │
      │ (via Mongoose)  │   │  (via Adapter)  │   │ (Alerts/Reports)│
      └─────────────────┘   └─────────────────┘   └─────────────────┘
```

> 📄 *Refer to [`docs/CSE4104-7A-T03_ArchitectureDiagram.pdf`](docs/CSE4104-7A-T03_ArchitectureDiagram.pdf) for the complete system architecture diagram.*

---

## 📂 Repository Structure

> [!NOTE]
> *This reflects the planned modular architecture and will evolve as implementation progresses.*

```text
SoulSync-AI/
├── client/                  # React (Vite) frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Dashboard, Tracker, Journal, Goals, AI, Admin
│   │   ├── context/         # Auth and global app state (Context API)
│   │   ├── services/        # Axios API client modules
│   │   └── utils/           # Helper functions & formatters
│   └── tests/               # Frontend unit & component tests
├── server/                  # Node.js + Express backend API
│   ├── src/
│   │   ├── config/          # Environment, database & security configs
│   │   ├── middleware/      # Auth, role guard, validation, rate limit, error handlers
│   │   ├── models/          # Mongoose schemas (Users, WellnessLogs, Goals, etc.)
│   │   ├── routes/          # /api/v1 endpoint definitions
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Analytics, reports, notifications & ai/ (adapter, safety, consent)
│   │   └── jobs/            # node-cron reminder & weekly report schedulers
│   └── tests/               # API integration & unit tests
├── docs/                    # Project proposal, SRS & UML/ER diagrams
│   ├── CSE4104-7A-T03_SRS.pdf
│   ├── CSE4104-7A-T03_UseCaseDiagram.pdf
│   ├── CSE4104-7A-T03_ERDiagram.pdf
│   └── CSE4104-7A-T03_ArchitectureDiagram.pdf
├── .env.example             # Environment variable template (no real secrets)
├── .gitignore
└── README.md
```

---

## 📑 Project Documentation

| Document | File Path |
| :--- | :--- |
| **Software Requirement Specification (SRS)** | [`docs/CSE4104-7A-T03_SRS.pdf`](docs/CSE4104-7A-T03_SRS.pdf) |
| **Use Case Diagram** | [`docs/CSE4104-7A-T03_UseCaseDiagram.pdf`](docs/CSE4104-7A-T03_UseCaseDiagram.pdf) |
| **Entity-Relationship (ER) Diagram** | [`docs/CSE4104-7A-T03_ERDiagram.pdf`](docs/CSE4104-7A-T03_ERDiagram.pdf) |
| **Initial System Architecture Diagram** | [`docs/CSE4104-7A-T03_ArchitectureDiagram.pdf`](docs/CSE4104-7A-T03_ArchitectureDiagram.pdf) |

---

## 🚀 Getting Started

> [!TIP]
> *Setup steps below outline the standard local development workflow as modules are completed.*

### Prerequisites
* **Node.js** (v18+ recommended)
* **npm** or **yarn**
* **MongoDB Atlas** cluster (or local MongoDB instance)
* **OpenAI** or **Google Gemini** API key

### Local Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/SoulSync-AI.git
   cd SoulSync-AI
   ```

2. **Configure & start the Backend**
   ```bash
   cd server
   cp .env.example .env   # Add MONGODB_URI, JWT_SECRET, AI_API_KEY, CLIENT_ORIGIN
   npm install
   npm run dev
   ```

3. **Configure & start the Frontend** *(in a new terminal)*
   ```bash
   cd client
   npm install
   npm run dev
   ```

> [!CAUTION]
> **Never commit** `.env` files, API keys, database credentials, real private journal entries, or production secrets to the repository.

---

## 🔄 Team Workflow & Standards

* **Agile Iterations:** Short development sprints utilizing feature branches (`feature/<name>`), pull requests (PRs), and mandatory peer code reviews.
* **Branch Protection:** Direct pushes to `main` are restricted; all changes merge via reviewed PRs.
* **Definition of Done:** A feature is marked complete only after passing baseline tests and integrating cleanly into the shared codebase.
* **API-First Collaboration:** Early agreement on REST API contracts enables parallel frontend and backend development with clean, atomic commits.

---

## 📊 Project Roadmap & Status

| Milestone | Status | Notes |
| :--- | :---: | :--- |
| **Project Proposal** | ✅ Completed | Submitted on 08 Nov 2026 |
| **SRS & Initial System Diagrams** | ✅ Completed | Submitted in Week 03 |
| **System Design & Full-Stack Implementation** | 🔄 In Progress | Active sprint development |
| **Testing, Deployment & Final Report** | ⏳ Planned | End-to-end QA & live hosting |

---

## 👥 Team Information

| # | Member Name | Student ID | Primary Responsibilities |
| :-: | :--- | :---: | :--- |
| **1** | **Zunayed Hossain** *(Team Leader)* | `11230321505` | QA, DevOps, project coordination, integration support & final submission |
| **2** | **Mousumi Khatun** | `11230321229` | AI integration, prompt engineering, provider service & AI safety testing |
| **3** | **Promith Saha Joy** | `11230321389` | Backend development, REST APIs, database schemas, auth & server validation |
| **4** | **Samira Islam Kanta** | `11230321317` | Frontend development, responsive UI, dashboard, forms, charts & API integration |

> *All team members actively contribute to system integration, testing, documentation, and peer code reviews.*

---

## 📜 License

This is an academic project developed for **CSE 4104 – Software Development III** at **Northern University of Business and Technology, Khulna**. All rights are reserved by Team `CSE4104-7A-T03` unless an open-source license is explicitly added later.
