const express = require('express');
const Book = require('../models/Book');
const User = require('../models/User');
const Issue = require('../models/Issue');
const Reservation = require('../models/Reservation');
const Fine = require('../models/Fine');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/issues — Issue a book
router.post('/', authenticate, authorize('admin', 'librarian'), async (req, res) => {
  try {
    const { book_id, user_id } = req.body;
    if (!book_id || !user_id) return res.status(400).json({ error: 'Book ID and User ID are required.' });

    const book = await Book.findById(book_id);
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    if (book.available_copies <= 0) return res.status(400).json({ error: 'No copies available.' });

    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const alreadyIssued = await Issue.findOne({ book_id, user_id, status: 'issued' });
    if (alreadyIssued) return res.status(400).json({ error: 'User already has this book issued.' });

    const maxDays = parseInt(process.env.MAX_ISSUE_DAYS) || 14;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + maxDays);

    const issue = await Issue.create({
      book_id, user_id, issued_by: req.user.id,
      due_date: dueDate, status: 'issued'
    });

    book.available_copies -= 1;
    await book.save();

    await Reservation.updateMany(
      { book_id, user_id, status: 'pending' },
      { status: 'fulfilled' }
    );

    res.status(201).json({
      issue: {
        id: issue._id, book_id, user_id,
        book_title: book.title, book_author: book.author,
        user_name: user.name, user_email: user.email,
        issue_date: issue.issue_date, due_date: issue.due_date,
        status: issue.status
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to issue book.' });
  }
});

// PUT /api/issues/:id/return
router.put('/:id/return', authenticate, authorize('admin', 'librarian'), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue record not found.' });
    if (issue.status === 'returned') return res.status(400).json({ error: 'Book already returned.' });

    const book = await Book.findById(issue.book_id);
    const now = new Date();
    const dueDate = new Date(issue.due_date);
    let fineAmount = 0;

    if (now > dueDate) {
      const daysLate = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
      fineAmount = daysLate * (parseFloat(process.env.FINE_PER_DAY) || 2.0);
    }

    issue.status = 'returned';
    issue.return_date = now;
    await issue.save();

    if (book) {
      book.available_copies += 1;
      await book.save();
    }

    if (fineAmount > 0) {
      await Fine.create({ issue_id: issue._id, user_id: issue.user_id, amount: fineAmount });
    }

    const user = await User.findById(issue.user_id).select('name email').lean();
    const daysLate = fineAmount > 0 ? Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;

    res.json({
      issue: {
        id: issue._id, book_title: book?.title, book_author: book?.author,
        user_name: user?.name, user_email: user?.email,
        issue_date: issue.issue_date, due_date: issue.due_date,
        return_date: issue.return_date, status: issue.status
      },
      fine: fineAmount > 0 ? { amount: fineAmount, days_late: daysLate } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to return book.' });
  }
});

// GET /api/issues
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, user_id } = req.query;

    // Auto-update overdue
    await Issue.updateMany(
      { status: 'issued', due_date: { $lt: new Date() } },
      { status: 'overdue' }
    );

    const filter = {};
    if (req.user.role === 'student') {
      filter.user_id = req.user.id;
    } else if (user_id) {
      filter.user_id = user_id;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }

    const issues = await Issue.find(filter)
      .populate('book_id', 'title author isbn')
      .populate('user_id', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const mapped = issues.map(i => ({
      id: i._id,
      book_id: i.book_id?._id,
      book_title: i.book_id?.title,
      book_author: i.book_id?.author,
      book_isbn: i.book_id?.isbn,
      user_id: i.user_id?._id,
      user_name: i.user_id?.name,
      user_email: i.user_id?.email,
      issue_date: i.issue_date,
      due_date: i.due_date,
      return_date: i.return_date,
      status: i.status,
    }));

    res.json({ issues: mapped });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch issues.' });
  }
});

module.exports = router;
