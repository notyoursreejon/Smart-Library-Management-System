const express = require('express');
const Fine = require('../models/Fine');
const Issue = require('../models/Issue');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'student') filter.user_id = req.user.id;

    const fines = await Fine.find(filter)
      .populate('user_id', 'name email')
      .populate({ path: 'issue_id', populate: { path: 'book_id', select: 'title author' }, select: 'book_id issue_date due_date return_date' })
      .sort({ createdAt: -1 }).lean();

    const mapped = fines.map(f => ({
      id: f._id, user_name: f.user_id?.name, user_email: f.user_id?.email,
      book_title: f.issue_id?.book_id?.title, book_author: f.issue_id?.book_id?.author,
      issue_date: f.issue_id?.issue_date, due_date: f.issue_id?.due_date,
      return_date: f.issue_id?.return_date, amount: f.amount, paid: f.paid,
      paid_at: f.paid_at, created_at: f.createdAt,
    }));

    const tFilter = { paid: false };
    if (req.user.role === 'student') tFilter.user_id = req.user.id;
    const agg = await Fine.aggregate([{ $match: tFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }]);

    res.json({ fines: mapped, totalUnpaid: agg[0]?.total || 0 });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch fines.' }); }
});

router.put('/:id/pay', authenticate, authorize('admin', 'librarian'), async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);
    if (!fine) return res.status(404).json({ error: 'Fine not found.' });
    if (fine.paid) return res.status(400).json({ error: 'Fine already paid.' });
    fine.paid = true; fine.paid_at = new Date(); await fine.save();
    const user = await User.findById(fine.user_id).select('name').lean();
    const issue = await Issue.findById(fine.issue_id).populate('book_id', 'title').lean();
    res.json({ fine: { id: fine._id, amount: fine.amount, paid: fine.paid, user_name: user?.name, book_title: issue?.book_id?.title }, message: 'Fine marked as paid.' });
  } catch (err) { res.status(500).json({ error: 'Failed to pay fine.' }); }
});

module.exports = router;
