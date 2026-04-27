# ShiftSync — Claude Code Instructions

## Project Overview

ShiftSync is a CS4800 course project — a web-based employee shift scheduling platform. Monorepo with two services:

- **`frontend/`** — Next.js 16 (TypeScript, App Router, React 19) on port 3000
- **`backend/`** — Express.js (TypeScript) REST API on port 5000

## Quick Commands

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && npm install && npm run dev

# Lint frontend
cd frontend && npm run lint
```

## Deployment

| Service  | Platform | URL |
|----------|----------|-----|
| Frontend | Vercel   | https://shiftsync13.vercel.app |
| Backend  | Render   | https://cs4800-worker-schedule-project.onrender.com |
| Database | Neon     | PostgreSQL (connection string in Render env vars) |

- Vercel root directory is set to `frontend/`
- Render uses `render.yaml` at repo root
- Backend API base path: `/api` (e.g., `/api/health`, `/api/auth/login`)

## Git Remote

- `origin` — https://github.com/TAndronaco/CS4800-Worker-Schedule-Project.git

## Conventions

- **Brand color**: `#d4500a` (burnt orange), hover darker: `#b04008`
- **CSS**: CSS Modules (`page.module.css`) per page, global keyframes in `globals.css`
- **Auth**: JWT stored in localStorage, role is `"manager"` or `"employee"`
- **API calls**: Frontend uses `NEXT_PUBLIC_API_URL` env var for backend URL
- **Backend CORS**: `FRONTEND_URL` env var supports comma-separated origins

## Project Structure

```
frontend/
  src/app/
    page.tsx              # Landing page with logo + test buttons
    login/                # Login page
    register/             # Registration page
    dashboard/            # Role-based dashboard (supports ?role= test mode)
    messages/             # Direct messaging (DMs + group chats)
    employee/
      join/               # Join team via code
      schedule/           # Employee schedule grid view
      requests/           # Employee shift requests
      time-off/           # Employee time-off request form
    manager/
      teams/              # Team management
      schedule/           # Manager schedule grid with tooltips + template save/load
      requests/           # Approve/deny shift requests
      analytics/          # Team analytics (coverage gaps, overtime, headcount)
      time-off/           # Manager time-off request review
  components/
    Navbar.tsx            # Sticky glassmorphism navbar
    EmployeeLayout.tsx    # Employee sidebar layout
    ManagerLayout.tsx     # Manager sidebar layout
    LayoutShell.tsx       # Shared layout wrapper
    ManagerOverview.tsx   # Manager dashboard overview card
    ScheduleSummary.tsx   # Schedule summary widget

backend/
  src/
    index.ts              # Express app entry point
    config/               # Database config
    middleware/            # Auth middleware
    routes/               # API route handlers
    services/             # Business logic (service layer)
    types/                # TypeScript type definitions
    utils/                # Shared helpers (error handling, query utils)
  db/
    schema.sql            # PostgreSQL schema
```

## Work In Progress

Features added but not yet fully tested/integrated end-to-end:

- **Messaging** — Backend conversations/messages API + frontend DM/group chat UI built. Schema tables (`conversations`, `conversation_members`, `messages`) need to be run on Neon. Frontend UI needs live testing with real API.
- **Time-Off Requests** — Backend CRUD + approve/deny API, employee request form, manager review page built. Schema table (`time_off_requests`) needs to be run on Neon. Needs end-to-end testing.
- **Schedule Templates** — Backend save/load API, manager schedule page has template save/load UI. Schema table (`schedule_templates`) needs to be run on Neon. Needs end-to-end testing.
- **Analytics** — Backend coverage gap, overtime, headcount queries + manager analytics dashboard page built. Needs end-to-end testing with real schedule data.
- **Nav links** — EmployeeLayout and ManagerLayout sidebars updated with links to new pages; verify routing works in production.

### DB Migration Needed

The following tables from `backend/db/schema.sql` need to be created on the Neon production database:
- `time_off_requests`
- `schedule_templates`
- `conversations`
- `conversation_members`
- `messages`

## Contributors

- Nicolas Tran (@chablades)
- Thaimas Andronaco (@TAndronaco)
- Khine Zar Hein (@Khine12)
