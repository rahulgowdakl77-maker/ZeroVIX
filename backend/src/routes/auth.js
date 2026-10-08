import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db.js';
import { asyncHandler, httpError, requireAuth, signToken } from '../middleware/auth.js';

const router = Router();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name?.trim()) throw httpError(400, 'Enter your full name.');
  if (!EMAIL.test(email ?? '')) throw httpError(400, 'Enter a valid email address.');
  if (!password || password.length < 8) throw httpError(400, 'Password must be at least 8 characters.');
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, lower($2), $3)
     ON CONFLICT (email) DO NOTHING RETURNING id, name, email, role`,
    [name.trim().slice(0, 80), email.trim(), await bcrypt.hash(password, 10)]
  );
  if (!rows[0]) throw httpError(409, 'An account with this email already exists.');
  res.status(201).json({ token: signToken(rows[0]), user: rows[0] });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body ?? {};
  const { rows } = await query('SELECT * FROM users WHERE email = lower($1)', [String(email ?? '').trim()]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(password ?? ''), u.password_hash))) throw httpError(401, 'Email or password is incorrect.');
  const user = { id: u.id, name: u.name, email: u.email, role: u.role };
  res.json({ token: signToken(user), user });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

// No email service is wired up: the reset link is printed to the server console.
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  const { rowCount } = await query(
    `UPDATE users SET reset_token_hash = $1, reset_expires = now() + interval '30 minutes' WHERE email = lower($2)`,
    [sha(token), String(req.body?.email ?? '').trim()]
  );
  if (rowCount) console.log(`[password reset] ${process.env.CLIENT_URL || 'http://localhost:5173'}/reset?token=${token}`);
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body ?? {};
  if (!password || password.length < 8) throw httpError(400, 'Password must be at least 8 characters.');
  const { rowCount } = await query(
    `UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_expires = NULL
     WHERE reset_token_hash = $2 AND reset_expires > now()`,
    [await bcrypt.hash(password, 10), sha(String(token ?? ''))]
  );
  if (!rowCount) throw httpError(400, 'This reset link is invalid or has expired.');
  res.json({ message: 'Password updated. You can now log in.' });
}));

export default router;
