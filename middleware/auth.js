const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'zaid_secret_2025';

// Verify JWT token
function requireAuth(req, res, next) {
  const token = req.cookies?.admin_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.redirect('/admin/login');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('admin_token');
    return res.redirect('/admin/login');
  }
}

// Verify JWT for API routes
function requireAuthAPI(req, res, next) {
  const token = req.cookies?.admin_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Brute force protection — max 5 attempts per IP per 15 min
function checkBruteForce(req, res, next) {
  const ip = req.ip;
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const attempts = db.prepare(
    'SELECT COUNT(*) as c FROM login_attempts WHERE ip = ? AND attempted_at > ?'
  ).get(ip, cutoff).c;

  if (attempts >= 5) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  }
  next();
}

function recordFailedAttempt(ip) {
  db.prepare('INSERT INTO login_attempts (ip) VALUES (?)').run(ip);
  // Clean old attempts
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM login_attempts WHERE attempted_at < ?').run(cutoff);
}

function clearAttempts(ip) {
  db.prepare('DELETE FROM login_attempts WHERE ip = ?').run(ip);
}

module.exports = { requireAuth, requireAuthAPI, checkBruteForce, recordFailedAttempt, clearAttempts, JWT_SECRET };
