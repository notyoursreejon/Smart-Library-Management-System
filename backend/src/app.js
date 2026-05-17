require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const issueRoutes = require('./routes/issues');
const reservationRoutes = require('./routes/reservations');
const fineRoutes = require('./routes/fines');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Test Route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: 'mongodb-memory-server', timestamp: new Date().toISOString() });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Auto-seed function for in-memory DB
async function autoSeed() {
  const bcrypt = require('bcryptjs');
  const User = require('./models/User');
  const Book = require('./models/Book');
  const Issue = require('./models/Issue');
  const Reservation = require('./models/Reservation');
  const Fine = require('./models/Fine');

  // Only seed if DB is empty
  const count = await User.countDocuments();
  if (count > 0) return;

  console.log('🌱 Auto-seeding database...');

  // Users
  const usersData = [
    { name: 'Admin User', email: 'admin@library.com', password: 'admin123', role: 'admin', avatar_color: '#6C63FF' },
    { name: 'Sarah Johnson', email: 'librarian@library.com', password: 'lib123', role: 'librarian', avatar_color: '#FF6584' },
    { name: 'Alex Thompson', email: 'student@library.com', password: 'student123', role: 'student', avatar_color: '#43E97B' },
    { name: 'Emily Davis', email: 'emily@library.com', password: 'student123', role: 'student', avatar_color: '#FA709A' },
    { name: 'James Wilson', email: 'james@library.com', password: 'student123', role: 'student', avatar_color: '#00C9FF' },
    { name: 'Priya Sharma', email: 'priya@library.com', password: 'student123', role: 'student', avatar_color: '#FEE140' },
    { name: 'Michael Brown', email: 'michael@library.com', password: 'lib123', role: 'librarian', avatar_color: '#A18CD1' },
  ];

  const users = [];
  for (const u of usersData) {
    const user = await User.create({ name: u.name, email: u.email, password_hash: bcrypt.hashSync(u.password, 12), role: u.role, avatar_color: u.avatar_color });
    users.push(user);
  }

  // Books
  const booksData = [
    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '978-0743273565', category: 'Fiction', total_copies: 5, description: 'A novel about the American Dream set in the Jazz Age.', published_year: 1925, publisher: 'Scribner' },
    { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '978-0061120084', category: 'Fiction', total_copies: 4, description: 'A story of racial injustice and childhood innocence.', published_year: 1960, publisher: 'J.B. Lippincott' },
    { title: 'Clean Code', author: 'Robert C. Martin', isbn: '978-0132350884', category: 'Technology', total_copies: 3, description: 'A handbook of agile software craftsmanship.', published_year: 2008, publisher: 'Prentice Hall' },
    { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '978-0262033848', category: 'Technology', total_copies: 6, description: 'The bible of algorithms textbooks.', published_year: 2009, publisher: 'MIT Press' },
    { title: 'Design Patterns', author: 'Gang of Four', isbn: '978-0201633610', category: 'Technology', total_copies: 2, description: 'Elements of reusable object-oriented software.', published_year: 1994, publisher: 'Addison-Wesley' },
    { title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '978-0553380163', category: 'Science', total_copies: 4, description: 'A landmark volume in science writing.', published_year: 1988, publisher: 'Bantam Dell' },
    { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '978-0062316097', category: 'History', total_copies: 5, description: 'A brief history of humankind.', published_year: 2011, publisher: 'Harper' },
    { title: 'The Art of War', author: 'Sun Tzu', isbn: '978-1590302255', category: 'Philosophy', total_copies: 3, description: 'Ancient Chinese military treatise.', published_year: -500, publisher: 'Shambhala' },
    { title: '1984', author: 'George Orwell', isbn: '978-0451524935', category: 'Fiction', total_copies: 5, description: 'A dystopian social science fiction novel.', published_year: 1949, publisher: 'Secker & Warburg' },
    { title: 'The Lean Startup', author: 'Eric Ries', isbn: '978-0307887894', category: 'Business', total_copies: 3, description: 'How constant innovation creates radically successful businesses.', published_year: 2011, publisher: 'Crown Business' },
    { title: 'Atomic Habits', author: 'James Clear', isbn: '978-0735211292', category: 'Self-Help', total_copies: 4, description: 'An easy & proven way to build good habits.', published_year: 2018, publisher: 'Avery' },
    { title: 'The Pragmatic Programmer', author: 'David Thomas', isbn: '978-0135957059', category: 'Technology', total_copies: 3, description: 'Your journey to mastery.', published_year: 2019, publisher: 'Addison-Wesley' },
    { title: 'Cosmos', author: 'Carl Sagan', isbn: '978-0345539434', category: 'Science', total_copies: 2, description: 'A personal voyage through space and time.', published_year: 1980, publisher: 'Random House' },
    { title: 'Rich Dad Poor Dad', author: 'Robert Kiyosaki', isbn: '978-1612680194', category: 'Business', total_copies: 4, description: 'What the rich teach their kids about money.', published_year: 1997, publisher: 'Plata Publishing' },
    { title: 'The Catcher in the Rye', author: 'J.D. Salinger', isbn: '978-0316769488', category: 'Fiction', total_copies: 3, description: 'A story about teenage angst.', published_year: 1951, publisher: 'Little, Brown' },
    { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', isbn: '978-0374533557', category: 'Psychology', total_copies: 3, description: 'The two systems that drive the way we think.', published_year: 2011, publisher: 'Farrar, Straus and Giroux' },
    { title: 'Dune', author: 'Frank Herbert', isbn: '978-0441172719', category: 'Science Fiction', total_copies: 4, description: 'The saga of Paul Atreides.', published_year: 1965, publisher: 'Ace' },
    { title: 'The Psychology of Money', author: 'Morgan Housel', isbn: '978-0857197689', category: 'Business', total_copies: 3, description: 'Timeless lessons on wealth.', published_year: 2020, publisher: 'Harriman House' },
    { title: 'Eloquent JavaScript', author: 'Marijn Haverbeke', isbn: '978-1593279509', category: 'Technology', total_copies: 4, description: 'A modern introduction to programming.', published_year: 2018, publisher: 'No Starch Press' },
    { title: 'The Alchemist', author: 'Paulo Coelho', isbn: '978-0062315007', category: 'Fiction', total_copies: 5, description: 'A fable about following your dream.', published_year: 1988, publisher: 'HarperOne' },
  ];

  const books = [];
  for (const b of booksData) {
    const book = await Book.create({ ...b, available_copies: b.total_copies });
    books.push(book);
  }

  // Issues
  const students = users.filter(u => u.role === 'student');
  const librarian = users.find(u => u.role === 'librarian');
  const issuesData = [
    { bi: 0, si: 0, daysAgo: 10 }, { bi: 2, si: 0, daysAgo: 5 },
    { bi: 1, si: 1, daysAgo: 20, status: 'overdue' }, { bi: 3, si: 2, daysAgo: 3 },
    { bi: 5, si: 1, daysAgo: 30, returned: true, retAgo: 5 },
    { bi: 6, si: 0, daysAgo: 25, returned: true, retAgo: 10 },
    { bi: 8, si: 3, daysAgo: 7 }, { bi: 10, si: 2, daysAgo: 18, status: 'overdue' },
  ];

  const issues = [];
  for (const iss of issuesData) {
    const issDate = new Date(); issDate.setDate(issDate.getDate() - iss.daysAgo);
    const dueDate = new Date(issDate); dueDate.setDate(dueDate.getDate() + 14);
    let retDate = null, status = iss.status || 'issued';
    if (iss.returned) { retDate = new Date(); retDate.setDate(retDate.getDate() - (iss.retAgo || 0)); status = 'returned'; }
    const issue = await Issue.create({ book_id: books[iss.bi]._id, user_id: students[iss.si % students.length]._id, issued_by: librarian._id, issue_date: issDate, due_date: dueDate, return_date: retDate, status });
    issues.push(issue);
    if (status !== 'returned') { books[iss.bi].available_copies -= 1; await books[iss.bi].save(); }
  }

  // Reservations
  await Reservation.create([
    { book_id: books[0]._id, user_id: students[1]._id, queue_position: 1 },
    { book_id: books[2]._id, user_id: students[2]._id, queue_position: 1 },
    { book_id: books[8]._id, user_id: students[0]._id, queue_position: 1 },
  ]);

  // Fines
  await Fine.create([
    { issue_id: issues[2]._id, user_id: students[1]._id, amount: 12.00, paid: false },
    { issue_id: issues[7]._id, user_id: students[2]._id, amount: 8.00, paid: false },
    { issue_id: issues[4]._id, user_id: students[1]._id, amount: 6.00, paid: true, paid_at: new Date() },
  ]);

  console.log('✅ Auto-seeded: 7 users, 20 books, 8 issues, 3 reservations, 3 fines');
  console.log('📧 Login credentials:');
  console.log('   Admin:     admin@library.com / admin123');
  console.log('   Librarian: librarian@library.com / lib123');
  console.log('   Student:   student@library.com / student123');
}

// Connect to DB, seed, then start server
connectDB().then(async () => {
  await autoSeed();
  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Smart Library Management System - API      ║
  ║   Server running on http://localhost:${PORT}    ║
  ║   Database: In-Memory MongoDB               ║
  ╚══════════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
