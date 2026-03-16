# ShiftSync — Employee Shift Scheduling

A web-based shift scheduling platform built for small and medium-sized businesses. ShiftSync lets managers create and manage schedules while giving employees the tools to view shifts, request swaps, and communicate with their team — all in one place.

---

## Features

- **Authentication** — Secure JWT-based register and login for both managers and employees
- **Team Management** — Managers can create teams and invite employees via a join code
- **Shift Scheduling** — Managers can create, assign, and delete shifts
- **Shift Requests** — Employees can request time off or shift swaps; managers can approve or deny
- **In-App Messaging** *(coming soon)* — Team members will be able to message each other directly without switching to another platform

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (TypeScript) with App Router |
| Backend | Express.js (TypeScript) REST API |
| Database | PostgreSQL |
| Auth | JWT-based authentication |
| Deployment | Vercel (frontend) · Render (backend) |

---

## Project Structure

```
├── frontend/    # Next.js app (port 3000)
├── backend/     # Express API (port 5000)
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL installed and running
- npm

### 1. Clone the repository

```bash
git clone https://github.com/TAndronaco/CS4800-Worker-Schedule-Project.git
cd CS4800-Worker-Schedule-Project
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev        # Runs on http://localhost:5000
```

Edit `.env` with your database credentials:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/shiftsync
JWT_SECRET=your-secret-key-here
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev        # Runs on http://localhost:3000
```

### 4. Database Setup

Create a PostgreSQL database called `shiftsync`:

```bash
psql -U postgres -c "CREATE DATABASE shiftsync;"
```

Then run the setup script to create all tables:

```bash
psql -U postgres -d shiftsync -f backend/db/schema.sql
```

> If a schema file is not available, see [Database Schema](#database-schema) below for the full SQL.

---

## API Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/health` | Health check | Public |
| POST | `/api/auth/register` | Register a new user | Public |
| POST | `/api/auth/login` | Login | Public |
| GET | `/api/teams` | Get user's teams | Auth |
| POST | `/api/teams` | Create a team | Manager |
| POST | `/api/teams/join` | Join a team via code | Auth |
| GET | `/api/shifts` | Get shifts | Auth |
| POST | `/api/shifts` | Create a shift | Manager |
| DELETE | `/api/shifts/:id` | Delete a shift | Manager |
| GET | `/api/requests` | Get requests | Auth |
| POST | `/api/requests` | Create a request | Auth |
| PATCH | `/api/requests/:id` | Approve or deny a request | Manager |

---

## Database Schema

<details>
<summary>Click to expand full SQL schema</summary>

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  join_code VARCHAR(20) UNIQUE NOT NULL,
  manager_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id INTEGER REFERENCES teams(id),
  user_id INTEGER REFERENCES users(id),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id),
  employee_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shift_requests (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  requester_id INTEGER REFERENCES users(id),
  shift_id INTEGER REFERENCES shifts(id),
  target_shift_id INTEGER REFERENCES shifts(id),
  status VARCHAR(20) DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

</details>

---

## Contributors

- [Nicolas Tran](https://github.com/chablades)
- [Thaimas Andronaco](https://github.com/TAndronaco)
- [Khine Zar Hein](https://github.com/khinezarheinrubyaura-3208)
