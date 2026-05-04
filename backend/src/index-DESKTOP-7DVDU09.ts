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

import pool from './config/db';

dotenv.config();

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

app.listen(PORT, () => {
  console.log(`ShiftSync API running on http://localhost:${PORT}`);
});

export default app;
