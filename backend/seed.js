require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { initDatabase, getDb, runQuery, saveDb } = require('./src/config/database');

async function seed() {
  await initDatabase();
  const db = getDb();
  console.log('🌱 Seeding database...\n');

  // Clear existing data
  db.run('DELETE FROM fines');
  db.run('DELETE FROM reservations');
  db.run('DELETE FROM issues');
  db.run('DELETE FROM books');
  db.run('DELETE FROM users');
  saveDb();

  // ── Users ──
  const users = [
    { id: uuidv4(), name: 'Admin User', email: 'admin@library.com', password: 'admin123', role: 'admin', avatar_color: '#6C63FF' },
    { id: uuidv4(), name: 'Sarah Johnson', email: 'librarian@library.com', password: 'lib123', role: 'librarian', avatar_color: '#FF6584' },
    { id: uuidv4(), name: 'Alex Thompson', email: 'student@library.com', password: 'student123', role: 'student', avatar_color: '#43E97B' },
    { id: uuidv4(), name: 'Emily Davis', email: 'emily@library.com', password: 'student123', role: 'student', avatar_color: '#FA709A' },
    { id: uuidv4(), name: 'James Wilson', email: 'james@library.com', password: 'student123', role: 'student', avatar_color: '#00C9FF' },
    { id: uuidv4(), name: 'Priya Sharma', email: 'priya@library.com', password: 'student123', role: 'student', avatar_color: '#FEE140' },
    { id: uuidv4(), name: 'Michael Brown', email: 'michael@library.com', password: 'lib123', role: 'librarian', avatar_color: '#A18CD1' },
  ];

  for (const u of users) {
    db.run(
      'INSERT INTO users (id, name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?, ?)',
      [u.id, u.name, u.email, bcrypt.hashSync(u.password, 12), u.role, u.avatar_color]
    );
  }
  console.log(`✅ Created ${users.length} users`);

  // ── Books ──
  const books = [
    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '978-0743273565', category: 'Fiction', total_copies: 5, description: 'A novel about the American Dream set in the Jazz Age.', published_year: 1925, publisher: 'Scribner' },
    { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '978-0061120084', category: 'Fiction', total_copies: 4, description: 'A story of racial injustice and childhood innocence in the Deep South.', published_year: 1960, publisher: 'J.B. Lippincott' },
    { title: 'Clean Code', author: 'Robert C. Martin', isbn: '978-0132350884', category: 'Technology', total_copies: 3, description: 'A handbook of agile software craftsmanship.', published_year: 2008, publisher: 'Prentice Hall' },
    { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '978-0262033848', category: 'Technology', total_copies: 6, description: 'The bible of algorithms textbooks.', published_year: 2009, publisher: 'MIT Press' },
    { title: 'Design Patterns', author: 'Gang of Four', isbn: '978-0201633610', category: 'Technology', total_copies: 2, description: 'Elements of reusable object-oriented software.', published_year: 1994, publisher: 'Addison-Wesley' },
    { title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '978-0553380163', category: 'Science', total_copies: 4, description: 'A landmark volume in science writing.', published_year: 1988, publisher: 'Bantam Dell' },
    { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '978-0062316097', category: 'History', total_copies: 5, description: 'A brief history of humankind.', published_year: 2011, publisher: 'Harper' },
    { title: 'The Art of War', author: 'Sun Tzu', isbn: '978-1590302255', category: 'Philosophy', total_copies: 3, description: 'Ancient Chinese military treatise.', published_year: -500, publisher: 'Shambhala' },
    { title: '1984', author: 'George Orwell', isbn: '978-0451524935', category: 'Fiction', total_copies: 5, description: 'A dystopian social science fiction novel.', published_year: 1949, publisher: 'Secker & Warburg' },
    { title: 'The Lean Startup', author: 'Eric Ries', isbn: '978-0307887894', category: 'Business', total_copies: 3, description: 'How constant innovation creates radically successful businesses.', published_year: 2011, publisher: 'Crown Business' },
    { title: 'Atomic Habits', author: 'James Clear', isbn: '978-0735211292', category: 'Self-Help', total_copies: 4, description: 'An easy & proven way to build good habits.', published_year: 2018, publisher: 'Avery' },
    { title: 'The Pragmatic Programmer', author: 'David Thomas', isbn: '978-0135957059', category: 'Technology', total_copies: 3, description: 'Your journey to mastery in software development.', published_year: 2019, publisher: 'Addison-Wesley' },
    { title: 'Cosmos', author: 'Carl Sagan', isbn: '978-0345539434', category: 'Science', total_copies: 2, description: 'A personal voyage through space and time.', published_year: 1980, publisher: 'Random House' },
    { title: 'Rich Dad Poor Dad', author: 'Robert Kiyosaki', isbn: '978-1612680194', category: 'Business', total_copies: 4, description: 'What the rich teach their kids about money.', published_year: 1997, publisher: 'Plata Publishing' },
    { title: 'The Catcher in the Rye', author: 'J.D. Salinger', isbn: '978-0316769488', category: 'Fiction', total_copies: 3, description: 'A story about teenage angst and alienation.', published_year: 1951, publisher: 'Little, Brown' },
    { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', isbn: '978-0374533557', category: 'Psychology', total_copies: 3, description: 'The two systems that drive the way we think.', published_year: 2011, publisher: 'Farrar, Straus and Giroux' },
    { title: 'Dune', author: 'Frank Herbert', isbn: '978-0441172719', category: 'Science Fiction', total_copies: 4, description: 'Set in the distant future, the saga of Paul Atreides.', published_year: 1965, publisher: 'Ace' },
    { title: 'The Psychology of Money', author: 'Morgan Housel', isbn: '978-0857197689', category: 'Business', total_copies: 3, description: 'Timeless lessons on wealth, greed, and happiness.', published_year: 2020, publisher: 'Harriman House' },
    { title: 'Eloquent JavaScript', author: 'Marijn Haverbeke', isbn: '978-1593279509', category: 'Technology', total_copies: 4, description: 'A modern introduction to programming.', published_year: 2018, publisher: 'No Starch Press' },
    { title: 'The Alchemist', author: 'Paulo Coelho', isbn: '978-0062315007', category: 'Fiction', total_copies: 5, description: 'A fable about following your dream.', published_year: 1988, publisher: 'HarperOne' },
  ];

  const bookIds = [];
  for (const b of books) {
    const id = uuidv4();
    bookIds.push(id);
    db.run(
      'INSERT INTO books (id,title,author,isbn,category,total_copies,available_copies,description,published_year,publisher) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, b.title, b.author, b.isbn, b.category, b.total_copies, b.total_copies, b.description, b.published_year, b.publisher]
    );
  }
  console.log(`✅ Created ${books.length} books`);

  // ── Sample Issues ──
  const studentIds = users.filter(u => u.role === 'student').map(u => u.id);
  const librarianId = users.find(u => u.role === 'librarian').id;

  const issues = [
    { book_idx: 0, student_idx: 0, daysAgo: 10, status: 'issued' },
    { book_idx: 2, student_idx: 0, daysAgo: 5, status: 'issued' },
    { book_idx: 1, student_idx: 1, daysAgo: 20, status: 'overdue' },
    { book_idx: 3, student_idx: 2, daysAgo: 3, status: 'issued' },
    { book_idx: 5, student_idx: 1, daysAgo: 30, returned: true, returnedDaysAgo: 5 },
    { book_idx: 6, student_idx: 0, daysAgo: 25, returned: true, returnedDaysAgo: 10 },
    { book_idx: 8, student_idx: 3, daysAgo: 7, status: 'issued' },
    { book_idx: 10, student_idx: 2, daysAgo: 18, status: 'overdue' },
  ];

  const issueIds = [];
  for (const iss of issues) {
    const id = uuidv4();
    issueIds.push(id);
    const issueDate = new Date(); issueDate.setDate(issueDate.getDate() - iss.daysAgo);
    const dueDate = new Date(issueDate); dueDate.setDate(dueDate.getDate() + 14);
    let returnDate = null;
    let status = iss.status || 'issued';
    if (iss.returned) {
      returnDate = new Date(); returnDate.setDate(returnDate.getDate() - (iss.returnedDaysAgo || 0));
      status = 'returned';
    }
    db.run(
      'INSERT INTO issues (id,book_id,user_id,issued_by,issue_date,due_date,return_date,status) VALUES (?,?,?,?,?,?,?,?)',
      [id, bookIds[iss.book_idx], studentIds[iss.student_idx % studentIds.length], librarianId,
       issueDate.toISOString(), dueDate.toISOString(), returnDate ? returnDate.toISOString() : null, status]
    );
    if (status !== 'returned') {
      db.run('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [bookIds[iss.book_idx]]);
    }
  }
  console.log(`✅ Created ${issues.length} issue records`);

  // ── Sample Reservations ──
  db.run('INSERT INTO reservations (id,book_id,user_id,queue_position,status) VALUES (?,?,?,?,?)',
    [uuidv4(), bookIds[0], studentIds[1], 1, 'pending']);
  db.run('INSERT INTO reservations (id,book_id,user_id,queue_position,status) VALUES (?,?,?,?,?)',
    [uuidv4(), bookIds[2], studentIds[2], 1, 'pending']);
  db.run('INSERT INTO reservations (id,book_id,user_id,queue_position,status) VALUES (?,?,?,?,?)',
    [uuidv4(), bookIds[8], studentIds[0], 1, 'pending']);
  console.log('✅ Created 3 reservations');

  // ── Sample Fines ──
  db.run('INSERT INTO fines (id,issue_id,user_id,amount,paid) VALUES (?,?,?,?,?)',
    [uuidv4(), issueIds[2], studentIds[1], 12.00, 0]);
  db.run('INSERT INTO fines (id,issue_id,user_id,amount,paid) VALUES (?,?,?,?,?)',
    [uuidv4(), issueIds[7], studentIds[2], 8.00, 0]);
  db.run('INSERT INTO fines (id,issue_id,user_id,amount,paid) VALUES (?,?,?,?,?)',
    [uuidv4(), issueIds[4], studentIds[1], 6.00, 1]);
  console.log('✅ Created 3 fines');

  saveDb();

  console.log('\n✨ Database seeded successfully!\n');
  console.log('Login credentials:');
  console.log('  Admin:     admin@library.com / admin123');
  console.log('  Librarian: librarian@library.com / lib123');
  console.log('  Student:   student@library.com / student123\n');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
