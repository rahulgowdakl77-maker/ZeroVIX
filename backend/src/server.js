import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { initSchema, pool } from './db.js';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/auth.js';
import { grokEnabled } from './services/grok.js';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import tutorRoutes from './routes/tutor.js';
import quizRoutes from './routes/quiz.js';
import progressRoutes from './routes/progress.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and set it.');
  process.exit(1);
}

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads')));
app.get('/api/health', (req, res) => res.json({ ok: true, ai: grokEnabled() ? 'grok' : 'offline' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/tutor', aiLimiter, tutorRoutes);
app.use('/api/quiz', aiLimiter, quizRoutes);
app.use('/api', progressRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use(errorHandler);

const port = process.env.PORT || 5000;
try {
  await initSchema(); // idempotent: creates tables on first run
  app.listen(port, () => console.log(`LearnAI API on http://localhost:${port} (AI: ${grokEnabled() ? 'Grok' : 'offline mode'})`));
} catch (err) {
  console.error('PostgreSQL connection failed:', err.message);
  await pool.end().catch(() => {});
  process.exit(1);
}
