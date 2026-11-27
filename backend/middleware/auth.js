const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const db = require('../config/database');

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = db.prepare(
      'SELECT id, name, email, role, department, semester, bio, avatar_color, portfolio_url, xp, is_demo, created_at FROM users WHERE id = ?'
    ).get(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = db.prepare(
      'SELECT id, name, email, role, department, semester, bio, avatar_color, portfolio_url, xp, is_demo FROM users WHERE id = ?'
    ).get(payload.id);
    if (user) req.user = user;
  } catch (_) {
    // Ignore invalid optional token
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };
