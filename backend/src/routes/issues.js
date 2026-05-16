const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getOne, getAll, runQuery, saveDb } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/issues — Issue a book
router.post('/', authenticate, authorize('admin', 'librarian'), (req, res) => {
  const { book_id, user_id } = req.body;
  if (!book_id || !user_id) return res.status(400).json({ error: 'Book ID and User ID are required.' });

  const book = getOne('SELECT * FROM books WHERE id = ?', [book_id]);
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  if (book.available_copies <= 0) return res.status(400).json({ error: 'No copies available.' });

  const user = getOne('SELECT * FROM users WHERE id = ?', [user_id]);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const alreadyIssued = getOne("SELECT id FROM issues WHERE book_id=? AND user_id=? AND status='issued'", [book_id, user_id]);
  if (alreadyIssued) return res.status(400).json({ error: 'User already has this book issued.' });

  const maxDays = parseInt(process.env.MAX_ISSUE_DAYS) || 14;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + maxDays);

  const id = uuidv4();

  runQuery("INSERT INTO issues (id,book_id,user_id,issued_by,due_date,status) VALUES (?,?,?,?,?,'issued')",
    [id, book_id, user_id, req.user.id, dueDate.toISOString()]);
  runQuery('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [book_id]);
  runQuery("UPDATE reservations SET status='fulfilled' WHERE book_id=? AND user_id=? AND status='pending'", [book_id, user_id]);

  const issue = getOne(`
    SELECT i.*, b.title as book_title, b.author as book_author, u.name as user_name, u.email as user_email
    FROM issues i JOIN books b ON i.book_id=b.id JOIN users u ON i.user_id=u.id WHERE i.id=?
  `, [id]);

  res.status(201).json({ issue });
});

// PUT /api/issues/:id/return
router.put('/:id/return', authenticate, authorize('admin', 'librarian'), (req, res) => {
  const issue = getOne(`SELECT i.*, b.title as book_title FROM issues i JOIN books b ON i.book_id=b.id WHERE i.id=?`, [req.params.id]);
  if (!issue) return res.status(404).json({ error: 'Issue record not found.' });
  if (issue.status === 'returned') return res.status(400).json({ error: 'Book already returned.' });

  const now = new Date();
  const dueDate = new Date(issue.due_date);
  let fineAmount = 0;

  if (now > dueDate) {
    const daysLate = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
    fineAmount = daysLate * (parseFloat(process.env.FINE_PER_DAY) || 2.0);
  }

  runQuery("UPDATE issues SET status='returned', return_date=datetime('now') WHERE id=?", [req.params.id]);
  runQuery('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [issue.book_id]);

  if (fineAmount > 0) {
    runQuery('INSERT INTO fines (id,issue_id,user_id,amount) VALUES (?,?,?,?)',
      [uuidv4(), req.params.id, issue.user_id, fineAmount]);
  }

  const updatedIssue = getOne(`
    SELECT i.*, b.title as book_title, b.author as book_author, u.name as user_name, u.email as user_email
    FROM issues i JOIN books b ON i.book_id=b.id JOIN users u ON i.user_id=u.id WHERE i.id=?
  `, [req.params.id]);

  const daysLate = fineAmount > 0 ? Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;
  res.json({
    issue: updatedIssue,
    fine: fineAmount > 0 ? { amount: fineAmount, days_late: daysLate } : null
  });
});

// GET /api/issues
router.get('/', authenticate, (req, res) => {
  const { status, user_id } = req.query;

  // Auto-update overdue
  runQuery("UPDATE issues SET status='overdue' WHERE status='issued' AND due_date < datetime('now')");

  let sql = `
    SELECT i.*, b.title as book_title, b.author as book_author, b.isbn as book_isbn,
           u.name as user_name, u.email as user_email
    FROM issues i JOIN books b ON i.book_id=b.id JOIN users u ON i.user_id=u.id
  `;

  const conditions = [];
  const params = [];

  if (req.user.role === 'student') {
    conditions.push('i.user_id = ?');
    params.push(req.user.id);
  } else if (user_id) {
    conditions.push('i.user_id = ?');
    params.push(user_id);
  }
  if (status && status !== 'all') {
    conditions.push('i.status = ?');
    params.push(status);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY i.created_at DESC';

  res.json({ issues: getAll(sql, params) });
});

module.exports = router;
