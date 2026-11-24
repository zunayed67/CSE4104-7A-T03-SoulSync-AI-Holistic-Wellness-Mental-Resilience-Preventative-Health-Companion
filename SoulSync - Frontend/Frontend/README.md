# SoulSync AI

## Holistic Wellness, Mental Resilience & Preventative Health Companion

SoulSync AI is an AI-powered wellness companion that helps users record everyday wellbeing habits, understand patterns in their own data, and turn those patterns into practical next steps. It combines daily wellness tracking, analytics, goals, guided breathing, reminders, and consent-based AI assistance.

> **Important:** SoulSync AI is a wellness-support and habit-awareness tool. It does not diagnose, treat, prescribe, predict disease, or replace qualified medical or mental-health professionals. AI-generated content is general information, not medical advice.

## Team Information

- **Team name:** CSE4104-7A-T03
- **Section:** 7A
- **Course:** CSE 4104 – Software Development III
- **Institution:** Northern University of Business and Technology, Khulna
- **Course teacher:** Md. Riaz Mahmud, Assistant Professor

| Member                        |  Student ID | Responsibility                   |
| ----------------------------- | ----------: | -------------------------------- |
| Zunayed Hossain (Team Leader) | 11230321505 | QA, DevOps, Project Coordination |
| Mousumi Khatun                | 11230321229 | AI and Integration Developer     |
| Promith Saha Joy              | 11230321389 | Backend Developer                |
| Samira Islam Kanta            | 11230321317 | Frontend Developer               |

## Problem We Aim to Solve

People often track sleep, mood, stress, hydration and physical activity in separate places—or do not track them consistently. Conventional trackers may display records without translating them into clear, personalised and achievable next steps. SoulSync AI brings these records together and uses consent-based AI assistance to explain trends and suggest general wellness actions.

## Proposed Features

- User registration, login, profile and role-based access (User/Admin)
- Daily mood, stress, sleep, hydration, activity and energy tracking
- Private journal and daily reflection
- Dashboard with weekly/monthly charts and habit statistics
- AI wellness chatbot (general, non-medical guidance)
- Personalised recommendations based on consented recent metrics
- AI-generated daily routine drafts and weekly summaries
- Goals, habits, progress tracking and reminders
- Guided breathing exercises and wellness resource library
- In-app notifications and basic admin/content management

## Technology Stack

- **Frontend:** React.js (Vite), JavaScript ES6+, Tailwind CSS, React Router, Axios, Context API, Recharts, Lucide React
- **Backend:** Node.js, Express.js, REST API (`/api/v1`), Mongoose
- **Database:** MongoDB Atlas
- **Authentication:** JWT in secure HTTP-only cookies, password hashing, role-based authorisation
- **AI:** OpenAI API or Google Gemini API through a backend-only provider service
- **Automation:** node-cron, MongoDB-backed notifications, optional Nodemailer
- **Testing:** Vitest, Supertest, React Testing Library, Playwright
- **Deployment:** Vercel (frontend), Render (backend), MongoDB Atlas
- **Version control:** Git and GitHub

## High-Level Architecture

React frontend → Express REST API → service layer (authentication, wellness, analytics, AI, goals, reports, notifications) → MongoDB Atlas. The backend sends only minimum, consented information to the selected AI provider. API keys are stored in server-side environment variables and must never be committed to the repository.

## Planned Repository Structure

```text
soulsync-ai/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   └── hooks/
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── jobs/
│   │   └── utils/
│   └── package.json
├── docs/
├── .gitignore
└── README.md
```

## Initial Project Plan

1. **Week 1 – Foundation:** repository, MERN setup, database connection, authentication, protected routes and dashboard shell.
2. **Week 2 – Core features:** wellness tracking, journal, goals, analytics and charts.
3. **Week 3 – AI and automation:** provider service, chatbot, recommendations, routine generator, weekly summary and reminders.
4. **Week 4 – Finalisation:** integration, responsive UI, security and end-to-end tests, deployment and documentation.
5. **Remaining semester:** refine features, address instructor feedback, complete report and prepare final presentation.

## Privacy and Safety Principles

- Obtain user consent before sending wellness data to an external AI provider.
- Do not send private journal text by default.
- Keep AI API keys on the backend; never expose secrets in frontend code or GitHub.
- Validate inputs and AI outputs; apply rate limits and ownership checks.
- Clearly label AI output as non-medical wellness guidance.
- Use a supportive crisis-safety response and direct users to professional/emergency help when appropriate.
- Do not claim clinical effectiveness without evidence.

## Local Development

Setup instructions, environment variables, scripts and deployment details will be added as the application is implemented. Never commit `.env` files or real API keys. Use a `.env.example` file with placeholder values only.

## Project Status

Initial proposal and planning stage. Features and implementation details may be refined based on course-teacher feedback and semester requirements.
