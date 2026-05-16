const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getOne, getAll, runQuery } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/reservations
router.post('/', authenticate, (req, res) => {
  const { book_id } = req.body;
  if (!book_id) return res.status(400).json({ error: 'Book ID is required.' });

  const book = getOne('SELECT * FROM books WHERE id = ?', [book_id]);
  if (!book) return res.status(404).json({ error: 'Book not found.' });

  const existingRes = getOne("SELECT id FROM reservations WHERE book_id=? AND user_id=? AND status='pending'", [book_id, req.user.id]);
  if (existingRes) return res.status(400).json({ error: 'You already have a pending reservation for this book.' });

  const existingIssue = getOne("SELECT id FROM issues WHERE book_id=? AND user_id=? AND status='issued'", [book_id, req.user.id]);
  if (existingIssue) return res.status(400).json({ error: 'You already have this book issued.' });

  const maxRes = parseInt(process.env.MAX_RESERVATIONS_PER_USER) || 3;
  const userRes = getOne("SELECT COUNT(*) as count FROM reservations WHERE user_id=? AND status='pending'", [req.user.id]);
  if (userRes && userRes.count >= maxRes) return res.status(400).json({ error: `Maximum ${maxRes} reservations allowed.` });

  const lastPos = getOne("SELECT MAX(queue_position) as pos FROM reservations WHERE book_id=? AND status='pending'", [book_id]);
  const queuePos = ((lastPos && lastPos.pos) || 0) + 1;

  const id = uuidv4();
  runQuery('INSERT INTO reservations (id,book_id,user_id,queue_position) VALUES (?,?,?,?)', [id, book_id, req.user.id, queuePos]);

  const reservation = getOne(`
    SELECT r.*, b.title as book_title, b.author as book_author, u.name as user_name
    FROM reservations r JOIN books b ON r.book_id=b.id JOIN users u ON r.user_id=u.id WHERE r.id=?
  `, [id]);

  res.status(201).json({ reservation });
});

// GET /api/reservations
router.get('/', authenticate, (req, res) => {
  let sql = `
    SELECT r.*, b.title as book_title, b.author as book_author, b.isbn as book_isbn,
           b.available_copies, u.name as user_name, u.email as user_email
    FROM reservations r JOIN books b ON r.book_id=b.id JOIN users u ON r.user_id=u.id
  `;
  const params = [];
  if (req.user.role === 'student') {
    sql += ' WHERE r.user_id = ?';
    params.push(req.user.id);
  }
  sql += ' ORDER BY r.status ASC, r.queue_position ASC, r.reserved_at ASC';

  res.json({ reservations: getAll(sql, params) });
});

// DELETE /api/reservations/:id
router.delete('/:id', authenticate, (req, res) => {
  const reservation = getOne('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
  if (req.user.role === 'student' && reservation.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  if (reservation.status !== 'pending') return res.status(400).json({ error: 'Can only cancel pending reservations.' });

  runQuery("UPDATE reservations SET status='cancelled' WHERE id=?", [req.params.id]);
  runQuery("UPDATE reservations SET queue_position=queue_position-1 WHERE book_id=? AND status='pending' AND queue_position>?",
    [reservation.book_id, reservation.queue_position]);

  res.json({ message: 'Reservation cancelled successfully.' });
});

module.exports = router;
