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
