const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb, getOne, runQuery, saveDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const AVATAR_COLORS = ['#6C63FF', '#FF6584', '#43E97B', '#FA709A', '#FEE140', '#00C9FF', '#A18CD1', '#FF9A9E'];

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  const existing = getOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  const validRoles = ['student', 'librarian', 'admin'];
  const userRole = validRoles.includes(role) ? role : 'student';

  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 12);
  const avatar_color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  runQuery(
    'INSERT INTO users (id, name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name.trim(), email.toLowerCase().trim(), password_hash, userRole, avatar_color]
  );

  const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

  res.status(201).json({
    token,
    user: { id, name: name.trim(), email: email.toLowerCase().trim(), role: userRole, avatar_color }
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = getOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_color: user.avatar_color }
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
