import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { apiLimiter } from './middleware/rateLimit.js';

import authRoutes        from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import userRoutes        from './routes/users.js';
import statsRoutes       from './routes/stats.js';
import aiRoutes          from './routes/ai.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Body + cookie parsing ─────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

// ── Static files (frontend) ───────────────────────────────────────────────────
app.use(express.static('public'));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);
app.use('/api/auth',         authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/user',         userRoutes);
app.use('/api/stats',        statsRoutes);
app.use('/api/ai',           aiRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const status  = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  if (status === 500) console.error(err);
  res.status(status).json({ error: message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`TrackMyJobs running on http://localhost:${PORT}`);
});
