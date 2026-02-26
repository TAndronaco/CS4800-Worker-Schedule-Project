# ShiftSync - Employee Shift Scheduling

A web-based employee shift scheduling application for small and medium-sized businesses. Managers can assign shifts, handle schedule changes, and communicate updates. Employees can view schedules, request shift swaps, and manage availability.

## Tech Stack

- **Frontend:** Next.js (TypeScript) with App Router
- **Backend:** Express.js (TypeScript) REST API
- **Database:** PostgreSQL
- **Auth:** JWT-based authentication

## Project Structure

```
├── frontend/    # Next.js app (port 3000)
├── backend/     # Express API (port 5000)
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL installed and running
- npm

### Backend Setup

```bash
cd backend
cp .env.example .env       # Edit with your database credentials
npm install
npm run dev                 # Starts on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # Starts on http://localhost:3000
```

### Database Setup

Create a PostgreSQL database called `shiftsync`, then run:

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

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/teams` | Get user's teams |
| POST | `/api/teams` | Create a team (manager) |
| POST | `/api/teams/join` | Join a team via code |
| GET | `/api/shifts` | Get shifts |
| POST | `/api/shifts` | Create a shift (manager) |
| DELETE | `/api/shifts/:id` | Delete a shift (manager) |
| GET | `/api/requests` | Get requests |
| POST | `/api/requests` | Create a request |
| PATCH | `/api/requests/:id` | Approve/deny request (manager) |

## Contributors

- Nicolas Tran
- Thaimas Andronaco
- Khine Zar Hein
