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

## Git Remotes

- `origin` — https://github.com/TAndronaco/CS4800-Worker-Schedule-Project.git (primary)
- `shiftsync` — https://github.com/chablades/shiftsync.git (Nicolas's fork)

Push to both remotes when deploying changes.

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
    employee/
      join/               # Join team via code
      schedule/           # Employee schedule grid view
      requests/           # Employee shift requests
    manager/
      teams/              # Team management
      schedule/           # Manager schedule grid with tooltips
      requests/           # Approve/deny shift requests
  components/
    Navbar.tsx            # Sticky glassmorphism navbar

backend/
  src/
    index.ts              # Express app entry point
    config/               # Database config
    middleware/            # Auth middleware
    routes/               # API route handlers
    types/                # TypeScript type definitions
  db/
    schema.sql            # PostgreSQL schema
```

## Contributors

- Nicolas Tran (@chablades)
- Thaimas Andronaco (@TAndronaco)
- Khine Zar Hein (@Khine12)
