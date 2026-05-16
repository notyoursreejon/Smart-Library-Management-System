const express = require('express');
const { getOne, getAll, runQuery } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, (req, res) => {
  // Auto-update overdue
  runQuery("UPDATE issues SET status='overdue' WHERE status='issued' AND due_date < datetime('now')");

  const totalBooks = getOne('SELECT COUNT(*) as count FROM books');
  const totalCopies = getOne('SELECT COALESCE(SUM(total_copies),0) as count FROM books');
  const availableCopies = getOne('SELECT COALESCE(SUM(available_copies),0) as count FROM books');
  const issuedBooks = getOne("SELECT COUNT(*) as count FROM issues WHERE status IN ('issued','overdue')");
  const overdueBooks = getOne("SELECT COUNT(*) as count FROM issues WHERE status='overdue'");
  const totalUsers = getOne('SELECT COUNT(*) as count FROM users');
  const activeStudents = getOne("SELECT COUNT(*) as count FROM users WHERE role='student'");
  const pendingReservations = getOne("SELECT COUNT(*) as count FROM reservations WHERE status='pending'");
  const totalFinesUnpaid = getOne('SELECT COALESCE(SUM(amount),0) as total FROM fines WHERE paid=0');
  const totalFinesCollected = getOne('SELECT COALESCE(SUM(amount),0) as total FROM fines WHERE paid=1');

  res.json({
    stats: {
      totalBooks: totalBooks.count,
      totalCopies: totalCopies.count,
      availableCopies: availableCopies.count,
      issuedBooks: issuedBooks.count,
      overdueBooks: overdueBooks.count,
      totalUsers: totalUsers.count,
      activeStudents: activeStudents.count,
      pendingReservations: pendingReservations.count,
      totalFinesUnpaid: Math.round((totalFinesUnpaid.total || 0) * 100) / 100,
      totalFinesCollected: Math.round((totalFinesCollected.total || 0) * 100) / 100
    }
  });
});

// GET /api/dashboard/reports
router.get('/reports', authenticate, authorize('admin', 'librarian'), (req, res) => {
  const monthlyIssues = getAll(`
    SELECT strftime('%Y-%m', issue_date) as month, COUNT(*) as count
    FROM issues WHERE issue_date >= date('now','-6 months')
    GROUP BY month ORDER BY month ASC
  `);

  const issuesByCategory = getAll(`
    SELECT b.category, COUNT(*) as count FROM issues i JOIN books b ON i.book_id=b.id
    GROUP BY b.category ORDER BY count DESC LIMIT 10
  `);

  const popularBooks = getAll(`
    SELECT b.title, b.author, COUNT(i.id) as issue_count
    FROM books b LEFT JOIN issues i ON b.id=i.book_id
    GROUP BY b.id ORDER BY issue_count DESC LIMIT 10
  `);

  const recentActivity = getAll(`
    SELECT i.id, i.status, i.issue_date, i.return_date, b.title as book_title, u.name as user_name
    FROM issues i JOIN books b ON i.book_id=b.id JOIN users u ON i.user_id=u.id
    ORDER BY i.created_at DESC LIMIT 20
  `);

  const monthlyFines = getAll(`
    SELECT strftime('%Y-%m', created_at) as month,
           SUM(amount) as total, SUM(CASE WHEN paid=1 THEN amount ELSE 0 END) as collected
    FROM fines WHERE created_at >= date('now','-6 months')
    GROUP BY month ORDER BY month ASC
  `);

  const usersByRole = getAll('SELECT role, COUNT(*) as count FROM users GROUP BY role');

  res.json({ reports: { monthlyIssues, issuesByCategory, popularBooks, recentActivity, monthlyFines, usersByRole } });
});

// GET /api/dashboard/users
router.get('/users', authenticate, authorize('admin'), (req, res) => {
  const users = getAll('SELECT id,name,email,role,avatar_color,created_at FROM users ORDER BY created_at DESC');
  res.json({ users });
});

// PUT /api/dashboard/users/:id/role
router.put('/users/:id/role', authenticate, authorize('admin'), (req, res) => {
  const { role } = req.body;
  if (!['student', 'librarian', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });

  const user = getOne('SELECT id FROM users WHERE id=?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot change your own role.' });

  runQuery("UPDATE users SET role=?, updated_at=datetime('now') WHERE id=?", [role, req.params.id]);
  const updated = getOne('SELECT id,name,email,role,avatar_color,created_at FROM users WHERE id=?', [req.params.id]);
  res.json({ user: updated });
});

// DELETE /api/dashboard/users/:id
router.delete('/users/:id', authenticate, authorize('admin'), (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account.' });

  const user = getOne('SELECT id FROM users WHERE id=?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const active = getOne("SELECT COUNT(*) as count FROM issues WHERE user_id=? AND status='issued'", [req.params.id]);
  if (active && active.count > 0) return res.status(400).json({ error: 'Cannot delete user with active issues.' });

  runQuery('DELETE FROM reservations WHERE user_id=?', [req.params.id]);
  runQuery('DELETE FROM fines WHERE user_id=?', [req.params.id]);
  runQuery('DELETE FROM issues WHERE user_id=?', [req.params.id]);
  runQuery('DELETE FROM users WHERE id=?', [req.params.id]);

  res.json({ message: 'User deleted successfully.' });
});

module.exports = router;
