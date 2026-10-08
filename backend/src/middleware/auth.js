import jwt from 'jsonwebtoken';
import { query } from '../db.js';

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const httpError = (status, message) => Object.assign(new Error(message), { status });

export const signToken = (user) => jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in to continue.' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
  const { rows } = await query('SELECT id, name, email, role FROM users WHERE id = $1', [payload.id]);
  if (!rows[0]) return res.status(401).json({ error: 'Account not found.' });
  req.user = rows[0];
  next();
});

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have permission to do that.' });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err.code === '23505') return res.status(409).json({ error: 'That value is already in use.' });
  if (err.code === '22P02') return res.status(400).json({ error: 'Invalid id.' });
  if (err.name === 'MulterError') return res.status(400).json({ error: err.message });
  const status = err.status || (err.message?.startsWith('Upload a ') ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server.' : err.message });
};
