const express = require('express');
const { getOne, getAll, runQuery } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/fines
router.get('/', authenticate, (req, res) => {
  let sql = `
    SELECT f.*, u.name as user_name, u.email as user_email,
           i.book_id, i.issue_date, i.due_date, i.return_date,
           b.title as book_title, b.author as book_author
    FROM fines f JOIN users u ON f.user_id=u.id JOIN issues i ON f.issue_id=i.id JOIN books b ON i.book_id=b.id
  `;
  const params = [];
  if (req.user.role === 'student') {
    sql += ' WHERE f.user_id = ?';
    params.push(req.user.id);
  }
  sql += ' ORDER BY f.created_at DESC';

  const fines = getAll(sql, params);

  let totalSql = 'SELECT COALESCE(SUM(amount), 0) as total FROM fines WHERE paid = 0';
  const totalParams = [];
  if (req.user.role === 'student') {
    totalSql += ' AND user_id = ?';
    totalParams.push(req.user.id);
  }
  const totalUnpaid = getOne(totalSql, totalParams);

  res.json({ fines, totalUnpaid: totalUnpaid ? totalUnpaid.total : 0 });
});

// PUT /api/fines/:id/pay
router.put('/:id/pay', authenticate, authorize('admin', 'librarian'), (req, res) => {
  const fine = getOne('SELECT * FROM fines WHERE id = ?', [req.params.id]);
  if (!fine) return res.status(404).json({ error: 'Fine not found.' });
  if (fine.paid) return res.status(400).json({ error: 'Fine already paid.' });

  runQuery("UPDATE fines SET paid=1, paid_at=datetime('now') WHERE id=?", [req.params.id]);

  const updated = getOne(`
    SELECT f.*, u.name as user_name, b.title as book_title
    FROM fines f JOIN users u ON f.user_id=u.id JOIN issues i ON f.issue_id=i.id JOIN books b ON i.book_id=b.id WHERE f.id=?
  `, [req.params.id]);

  res.json({ fine: updated, message: 'Fine marked as paid.' });
});

module.exports = router;
