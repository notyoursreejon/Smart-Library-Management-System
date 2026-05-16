const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, getOne, getAll, runQuery, saveDb } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Multer setup
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${path.extname(file.originalname)}`)
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
router.get('/', authenticate, (req, res) => {
  const { q, category, available } = req.query;
  let sql = 'SELECT * FROM books';
  const conditions = [];
  const params = [];

  if (q) {
    conditions.push('(title LIKE ? OR author LIKE ? OR isbn LIKE ?)');
    const s = `%${q}%`;
    params.push(s, s, s);
  }
  if (category && category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }
  if (available === 'true') {
    conditions.push('available_copies > 0');
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY created_at DESC';

  res.json({ books: getAll(sql, params) });
});

// GET /api/books/categories
router.get('/categories', authenticate, (req, res) => {
  const cats = getAll('SELECT DISTINCT category FROM books ORDER BY category');
  res.json({ categories: cats.map(c => c.category) });
});

// GET /api/books/:id
router.get('/:id', authenticate, (req, res) => {
  const book = getOne('SELECT * FROM books WHERE id = ?', [req.params.id]);
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  res.json({ book });
});

// POST /api/books
router.post('/', authenticate, authorize('admin', 'librarian'), (req, res) => {
  const { title, author, isbn, category, description, cover_url, total_copies, published_year, publisher } = req.body;
  if (!title || !author || !isbn) return res.status(400).json({ error: 'Title, author, and ISBN are required.' });

  const existing = getOne('SELECT id FROM books WHERE isbn = ?', [isbn]);
  if (existing) return res.status(409).json({ error: 'A book with this ISBN already exists.' });

  const id = uuidv4();
  const copies = parseInt(total_copies) || 1;

  runQuery(
    'INSERT INTO books (id,title,author,isbn,category,description,cover_url,total_copies,available_copies,published_year,publisher) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [id, title.trim(), author.trim(), isbn.trim(), category || 'General', description || '', cover_url || '', copies, copies, published_year || null, publisher || '']
  );

  res.status(201).json({ book: getOne('SELECT * FROM books WHERE id = ?', [id]) });
});

// PUT /api/books/:id
router.put('/:id', authenticate, authorize('admin', 'librarian'), (req, res) => {
  const existing = getOne('SELECT * FROM books WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Book not found.' });

  const { title, author, isbn, category, description, cover_url, total_copies, published_year, publisher } = req.body;
  const newTotal = parseInt(total_copies) || existing.total_copies;
  const diff = newTotal - existing.total_copies;
  const newAvail = Math.max(0, existing.available_copies + diff);

  runQuery(
    "UPDATE books SET title=?,author=?,isbn=?,category=?,description=?,cover_url=?,total_copies=?,available_copies=?,published_year=?,publisher=?,updated_at=datetime('now') WHERE id=?",
    [title || existing.title, author || existing.author, isbn || existing.isbn, category || existing.category,
     description !== undefined ? description : existing.description, cover_url !== undefined ? cover_url : existing.cover_url,
     newTotal, newAvail, published_year || existing.published_year, publisher !== undefined ? publisher : existing.publisher, req.params.id]
  );

  res.json({ book: getOne('SELECT * FROM books WHERE id = ?', [req.params.id]) });
});

// DELETE /api/books/:id
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const book = getOne('SELECT * FROM books WHERE id = ?', [req.params.id]);
  if (!book) return res.status(404).json({ error: 'Book not found.' });

  const active = getOne("SELECT COUNT(*) as count FROM issues WHERE book_id = ? AND status = 'issued'", [req.params.id]);
  if (active && active.count > 0) return res.status(400).json({ error: 'Cannot delete book with active issues.' });

  runQuery('DELETE FROM reservations WHERE book_id = ?', [req.params.id]);
  runQuery('DELETE FROM fines WHERE issue_id IN (SELECT id FROM issues WHERE book_id = ?)', [req.params.id]);
  runQuery('DELETE FROM issues WHERE book_id = ?', [req.params.id]);
  runQuery('DELETE FROM books WHERE id = ?', [req.params.id]);

  res.json({ message: 'Book deleted successfully.' });
});

// POST /api/books/:id/upload-pdf
router.post('/:id/upload-pdf', authenticate, authorize('admin', 'librarian'), upload.single('pdf'), (req, res) => {
  const book = getOne('SELECT * FROM books WHERE id = ?', [req.params.id]);
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

  if (book.pdf_path) {
    const old = path.join(uploadsDir, book.pdf_path);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }

  runQuery("UPDATE books SET pdf_path = ?, updated_at = datetime('now') WHERE id = ?", [req.file.filename, req.params.id]);
  res.json({ message: 'PDF uploaded successfully.', filename: req.file.filename });
});

// GET /api/books/:id/download-pdf
router.get('/:id/download-pdf', authenticate, (req, res) => {
  const book = getOne('SELECT * FROM books WHERE id = ?', [req.params.id]);
  if (!book || !book.pdf_path) return res.status(404).json({ error: 'PDF not found.' });
  const fp = path.join(uploadsDir, book.pdf_path);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'PDF file not found on server.' });
  res.download(fp, `${book.title}.pdf`);
});

module.exports = router;
