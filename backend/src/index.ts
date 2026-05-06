import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import teamRoutes from './routes/teams';
import shiftRoutes from './routes/shifts';
import requestRoutes from './routes/requests';
import messageRoutes from './routes/messages';
import userRoutes from './routes/users';
import availabilityRoutes from './routes/availability';
import notificationRoutes from './routes/notifications';
import analyticsRoutes from './routes/analytics';
import timeOffRoutes from './routes/timeoff';
import templateRoutes from './routes/templates';
import clockRoutes from './routes/clock';
import performanceRoutes from './routes/performance';
import exportRoutes from './routes/export';
import payrollRoutes from './routes/payroll';
import activityRoutes from './routes/activity';
import reportRoutes from './routes/reports';

import pool from './config/db';

dotenv.config();

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'employee',
      avatar_url TEXT,
      hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      join_code VARCHAR(20) UNIQUE NOT NULL,
      manager_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS team_members (
      team_id INTEGER REFERENCES teams(id),
      user_id INTEGER REFERENCES users(id),
      PRIMARY KEY (team_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id),
      employee_id INTEGER REFERENCES users(id),
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS shift_requests (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      requester_id INTEGER REFERENCES users(id),
      shift_id INTEGER REFERENCES shifts(id),
      target_shift_id INTEGER REFERENCES shifts(id),
      target_employee_id INTEGER REFERENCES users(id),
      status VARCHAR(20) DEFAULT 'pending',
      swap_status VARCHAR(20) DEFAULT 'pending',
      reason TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS availability (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      team_id INTEGER REFERENCES teams(id),
      day_of_week INTEGER NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      UNIQUE(user_id, team_id, day_of_week, start_time)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      related_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS time_off_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      team_id INTEGER REFERENCES teams(id),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      reviewed_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS schedule_templates (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id),
      name VARCHAR(255) NOT NULL,
      created_by INTEGER REFERENCES users(id),
      template_data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL DEFAULT 'dm',
      name VARCHAR(255),
      created_by INTEGER REFERENCES users(id),
      team_id INTEGER REFERENCES teams(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      joined_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      preferences JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS clock_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      team_id INTEGER REFERENCES teams(id),
      shift_id INTEGER REFERENCES shifts(id),
      clock_in TIMESTAMP NOT NULL,
      clock_out TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS performance_reports (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER REFERENCES users(id),
      team_id INTEGER REFERENCES teams(id),
      manager_id INTEGER REFERENCES users(id),
      category VARCHAR(50) NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      notes TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id),
      user_id INTEGER REFERENCES users(id),
      type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      related_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) DEFAULT 0.00;
  `);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',') || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// Health check with DB ping
app.get('/api/health', async (_req, res) => {
  try {
    const dbCheck = await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/time-off', timeOffRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/clock', clockRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports', reportRoutes);

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`ShiftSync API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

export default app;
