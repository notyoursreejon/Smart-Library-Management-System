require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const issueRoutes = require('./routes/issues');
const reservationRoutes = require('./routes/reservations');
const fineRoutes = require('./routes/fines');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Test Route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: 'mongodb', timestamp: new Date().toISOString() });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Connect to DB, then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Smart Library Management System - API      ║
  ║   Server running on http://localhost:${PORT}    ║
  ║   Database: MongoDB                          ║
  ╚══════════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
