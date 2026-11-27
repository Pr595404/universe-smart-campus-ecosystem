const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { jwtSecret } = require('../config/env');

const AVATAR_COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#3b82f6', '#10b981', '#ec4899'];

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
}

exports.register = (req, res) => {
  const { name, email, password, department, semester } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, department, semester, avatar_color, xp, is_demo)
    VALUES (?, ?, ?, 'student', ?, ?, ?, 50, 0)
  `).run(
    String(name).trim(),
    normalizedEmail,
    hash,
    department ? String(department).trim() : 'Computer Science',
    semester ? String(semester).trim() : 'Sem 1',
    avatarColor
  );

  const user = db.prepare(
    'SELECT id, name, email, role, department, semester, bio, avatar_color, portfolio_url, xp, is_demo FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);

  db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(
    user.id,
    'Welcome to UniVerse!',
    'You earned 50 starter XP. Complete Campus Quests to level up!'
  );

  res.status(201).json({ token: signToken(user), user });
};

exports.login = (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!userRow || !bcrypt.compareSync(password, userRow.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (role && userRow.role !== role) {
    return res.status(403).json({ error: `This account is registered as "${userRow.role}", not "${role}".` });
  }

  const { password_hash, ...user } = userRow;
  res.json({ token: signToken(user), user });
};

exports.me = (req, res) => {
  res.json({ user: req.user });
};

exports.updateProfile = (req, res) => {
  const { name, department, semester, bio, portfolio_url } = req.body;
  db.prepare(`
    UPDATE users
    SET name = COALESCE(?, name),
        department = COALESCE(?, department),
        semester = COALESCE(?, semester),
        bio = COALESCE(?, bio),
        portfolio_url = COALESCE(?, portfolio_url)
    WHERE id = ?
  `).run(
    name ? String(name).trim() : null,
    department ? String(department).trim() : null,
    semester ? String(semester).trim() : null,
    bio !== undefined ? String(bio).trim() : null,
    portfolio_url !== undefined ? String(portfolio_url).trim() : null,
    req.user.id
  );
  const user = db.prepare(
    'SELECT id, name, email, role, department, semester, bio, avatar_color, portfolio_url, xp, is_demo FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json({ user });
};
