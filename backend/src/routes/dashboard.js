const express = require('express');
const Book = require('../models/Book');
const User = require('../models/User');
const Issue = require('../models/Issue');
const Reservation = require('../models/Reservation');
const Fine = require('../models/Fine');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, async (req, res) => {
  try {
    await Issue.updateMany({ status: 'issued', due_date: { $lt: new Date() } }, { status: 'overdue' });

    const [totalBooks, totalCopies, availableCopies, issuedBooks, overdueBooks, totalUsers, activeStudents, pendingReservations, unpaidAgg, collectedAgg] = await Promise.all([
      Book.countDocuments(),
      Book.aggregate([{ $group: { _id: null, t: { $sum: '$total_copies' } } }]),
      Book.aggregate([{ $group: { _id: null, t: { $sum: '$available_copies' } } }]),
      Issue.countDocuments({ status: { $in: ['issued', 'overdue'] } }),
      Issue.countDocuments({ status: 'overdue' }),
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      Reservation.countDocuments({ status: 'pending' }),
      Fine.aggregate([{ $match: { paid: false } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
      Fine.aggregate([{ $match: { paid: true } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    ]);

    res.json({ stats: {
      totalBooks, totalCopies: totalCopies[0]?.t || 0, availableCopies: availableCopies[0]?.t || 0,
      issuedBooks, overdueBooks, totalUsers, activeStudents, pendingReservations,
      totalFinesUnpaid: Math.round((unpaidAgg[0]?.t || 0) * 100) / 100,
      totalFinesCollected: Math.round((collectedAgg[0]?.t || 0) * 100) / 100,
    }});
  } catch (err) { res.status(500).json({ error: 'Failed to fetch stats.' }); }
});

router.get('/reports', authenticate, authorize('admin', 'librarian'), async (req, res) => {
  try {
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [monthlyIssues, issuesByCategory, popularBooks, recentActivity, monthlyFines, usersByRole] = await Promise.all([
      Issue.aggregate([
        { $match: { issue_date: { $gte: sixMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$issue_date' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }, { $project: { month: '$_id', count: 1, _id: 0 } }
      ]),
      Issue.aggregate([
        { $lookup: { from: 'books', localField: 'book_id', foreignField: '_id', as: 'book' } },
        { $unwind: '$book' },
        { $group: { _id: '$book.category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
        { $project: { category: '$_id', count: 1, _id: 0 } }
      ]),
      Book.aggregate([
        { $lookup: { from: 'issues', localField: '_id', foreignField: 'book_id', as: 'issues' } },
        { $project: { title: 1, author: 1, issue_count: { $size: '$issues' } } },
        { $sort: { issue_count: -1 } }, { $limit: 10 }
      ]),
      Issue.find().populate('book_id', 'title').populate('user_id', 'name')
        .sort({ createdAt: -1 }).limit(20).lean()
        .then(items => items.map(i => ({ id: i._id, status: i.status, issue_date: i.issue_date, return_date: i.return_date, book_title: i.book_id?.title, user_name: i.user_id?.name }))),
      Fine.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: '$amount' }, collected: { $sum: { $cond: ['$paid', '$amount', 0] } } } },
        { $sort: { _id: 1 } }, { $project: { month: '$_id', total: 1, collected: 1, _id: 0 } }
      ]),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }, { $project: { role: '$_id', count: 1, _id: 0 } }]),
    ]);

    res.json({ reports: { monthlyIssues, issuesByCategory, popularBooks, recentActivity, monthlyFines, usersByRole } });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch reports.' }); }
});

router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('name email role avatar_color createdAt').sort({ createdAt: -1 }).lean();
    res.json({ users: users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role, avatar_color: u.avatar_color, created_at: u.createdAt })) });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch users.' }); }
});

router.put('/users/:id/role', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'librarian', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot change your own role.' });
    user.role = role; await user.save();
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar_color: user.avatar_color, created_at: user.createdAt } });
  } catch (err) { res.status(500).json({ error: 'Failed to update role.' }); }
});

router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const active = await Issue.countDocuments({ user_id: req.params.id, status: 'issued' });
    if (active > 0) return res.status(400).json({ error: 'Cannot delete user with active issues.' });
    await Promise.all([
      Reservation.deleteMany({ user_id: req.params.id }),
      Fine.deleteMany({ user_id: req.params.id }),
      Issue.deleteMany({ user_id: req.params.id }),
      User.findByIdAndDelete(req.params.id),
    ]);
    res.json({ message: 'User deleted successfully.' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete user.' }); }
});

module.exports = router;
