import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import teamRoutes from './routes/teams';
import shiftRoutes from './routes/shifts';
import requestRoutes from './routes/requests';
import messageRoutes from './routes/messages';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);

app.listen(PORT, () => {
  console.log(`ShiftSync API running on http://localhost:${PORT}`);
});

export default app;
