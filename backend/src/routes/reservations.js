const express = require('express');
const Book = require('../models/Book');
const Issue = require('../models/Issue');
const Reservation = require('../models/Reservation');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/reservations
router.post('/', authenticate, async (req, res) => {
  try {
    const { book_id } = req.body;
    if (!book_id) return res.status(400).json({ error: 'Book ID is required.' });

    const book = await Book.findById(book_id);
    if (!book) return res.status(404).json({ error: 'Book not found.' });

    const existingRes = await Reservation.findOne({ book_id, user_id: req.user.id, status: 'pending' });
    if (existingRes) return res.status(400).json({ error: 'You already have a pending reservation for this book.' });

    const existingIssue = await Issue.findOne({ book_id, user_id: req.user.id, status: 'issued' });
    if (existingIssue) return res.status(400).json({ error: 'You already have this book issued.' });

    const maxRes = parseInt(process.env.MAX_RESERVATIONS_PER_USER) || 3;
    const userResCount = await Reservation.countDocuments({ user_id: req.user.id, status: 'pending' });
    if (userResCount >= maxRes) return res.status(400).json({ error: `Maximum ${maxRes} reservations allowed.` });

    const lastRes = await Reservation.findOne({ book_id, status: 'pending' }).sort({ queue_position: -1 }).lean();
    const queuePos = ((lastRes && lastRes.queue_position) || 0) + 1;

    const reservation = await Reservation.create({
      book_id, user_id: req.user.id, queue_position: queuePos
    });

    res.status(201).json({
      reservation: {
        id: reservation._id, book_id, user_id: req.user.id,
        book_title: book.title, book_author: book.author,
        user_name: req.user.name, queue_position: queuePos,
        status: reservation.status, reserved_at: reservation.reserved_at
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create reservation.' });
  }
});

// GET /api/reservations
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'student') filter.user_id = req.user.id;

    const reservations = await Reservation.find(filter)
      .populate('book_id', 'title author isbn available_copies')
      .populate('user_id', 'name email')
      .sort({ status: 1, queue_position: 1, reserved_at: 1 })
      .lean();

    const mapped = reservations.map(r => ({
      id: r._id,
      book_id: r.book_id?._id,
      book_title: r.book_id?.title,
      book_author: r.book_id?.author,
      book_isbn: r.book_id?.isbn,
      available_copies: r.book_id?.available_copies,
      user_id: r.user_id?._id,
      user_name: r.user_id?.name,
      user_email: r.user_id?.email,
      queue_position: r.queue_position,
      status: r.status,
      reserved_at: r.reserved_at,
    }));

    res.json({ reservations: mapped });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reservations.' });
  }
});

// DELETE /api/reservations/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
    if (req.user.role === 'student' && reservation.user_id.toString() !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
    if (reservation.status !== 'pending') return res.status(400).json({ error: 'Can only cancel pending reservations.' });

    reservation.status = 'cancelled';
    await reservation.save();

    await Reservation.updateMany(
      { book_id: reservation.book_id, status: 'pending', queue_position: { $gt: reservation.queue_position } },
      { $inc: { queue_position: -1 } }
    );

    res.json({ message: 'Reservation cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel reservation.' });
  }
});

module.exports = router;
