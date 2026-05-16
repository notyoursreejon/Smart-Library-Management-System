const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Book = require('../models/Book');
const Issue = require('../models/Issue');
const Reservation = require('../models/Reservation');
const Fine = require('../models/Fine');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Multer setup
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,10)}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  }
});

// GET /api/books
router.get('/', authenticate, async (req, res) => {
  try {
    const { q, category, available } = req.query;
    const filter = {};

    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [{ title: regex }, { author: regex }, { isbn: regex }];
    }
    if (category && category !== 'all') filter.category = category;
    if (available === 'true') filter.available_copies = { $gt: 0 };

    const books = await Book.find(filter).sort({ createdAt: -1 }).lean();
    // Map _id to id for frontend compatibility
    res.json({ books: books.map(b => ({ ...b, id: b._id })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books.' });
  }
});

// GET /api/books/categories
router.get('/categories', authenticate, async (req, res) => {
  try {
    const cats = await Book.distinct('category');
    res.json({ categories: cats.sort() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// GET /api/books/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    res.json({ book: { ...book, id: book._id } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch book.' });
  }
});

// POST /api/books
router.post('/', authenticate, authorize('admin', 'librarian'), async (req, res) => {
  try {
    const { title, author, isbn, category, description, cover_url, total_copies, published_year, publisher } = req.body;
    if (!title || !author || !isbn) return res.status(400).json({ error: 'Title, author, and ISBN are required.' });

    const existing = await Book.findOne({ isbn: isbn.trim() });
    if (existing) return res.status(409).json({ error: 'A book with this ISBN already exists.' });

    const copies = parseInt(total_copies) || 1;
    const book = await Book.create({
      title: title.trim(), author: author.trim(), isbn: isbn.trim(),
      category: category || 'General', description: description || '',
      cover_url: cover_url || '', total_copies: copies, available_copies: copies,
      published_year: published_year || null, publisher: publisher || ''
    });

    res.status(201).json({ book: { ...book.toObject(), id: book._id } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create book.' });
  }
});

// PUT /api/books/:id
router.put('/:id', authenticate, authorize('admin', 'librarian'), async (req, res) => {
  try {
    const existing = await Book.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Book not found.' });

    const { title, author, isbn, category, description, cover_url, total_copies, published_year, publisher } = req.body;
    const newTotal = parseInt(total_copies) || existing.total_copies;
    const diff = newTotal - existing.total_copies;
    const newAvail = Math.max(0, existing.available_copies + diff);

    existing.title = title || existing.title;
    existing.author = author || existing.author;
    existing.isbn = isbn || existing.isbn;
    existing.category = category || existing.category;
    if (description !== undefined) existing.description = description;
    if (cover_url !== undefined) existing.cover_url = cover_url;
    existing.total_copies = newTotal;
    existing.available_copies = newAvail;
    existing.published_year = published_year || existing.published_year;
    if (publisher !== undefined) existing.publisher = publisher;

    await existing.save();
    res.json({ book: { ...existing.toObject(), id: existing._id } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update book.' });
  }
});

// DELETE /api/books/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found.' });

    const activeCount = await Issue.countDocuments({ book_id: req.params.id, status: 'issued' });
    if (activeCount > 0) return res.status(400).json({ error: 'Cannot delete book with active issues.' });

    const issueIds = (await Issue.find({ book_id: req.params.id }).select('_id').lean()).map(i => i._id);
    await Reservation.deleteMany({ book_id: req.params.id });
    await Fine.deleteMany({ issue_id: { $in: issueIds } });
    await Issue.deleteMany({ book_id: req.params.id });
    await Book.findByIdAndDelete(req.params.id);

    res.json({ message: 'Book deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete book.' });
  }
});

// POST /api/books/:id/upload-pdf
router.post('/:id/upload-pdf', authenticate, authorize('admin', 'librarian'), upload.single('pdf'), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

    if (book.pdf_path) {
      const old = path.join(uploadsDir, book.pdf_path);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }

    book.pdf_path = req.file.filename;
    await book.save();
    res.json({ message: 'PDF uploaded successfully.', filename: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload PDF.' });
  }
});

// GET /api/books/:id/download-pdf
router.get('/:id/download-pdf', authenticate, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book || !book.pdf_path) return res.status(404).json({ error: 'PDF not found.' });
    const fp = path.join(uploadsDir, book.pdf_path);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'PDF file not found on server.' });
    res.download(fp, `${book.title}.pdf`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download PDF.' });
  }
});

module.exports = router;
