# 📚 Smart Library Management System

A full-stack library management system with a premium dark-themed UI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router, Recharts, Lucide Icons |
| Backend | Node.js, Express.js, Mongoose, JWT Auth |
| Database | MongoDB (local or Atlas) |
| Styling | Vanilla CSS with Glassmorphism design |

## Prerequisites

- **Node.js** 18+
- **MongoDB** — [Install locally](https://www.mongodb.com/docs/manual/installation/) or use [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)

## Quick Start

### 1. Backend

```bash
cd backend
npm install
node seed.js       # Seeds MongoDB with sample data
node src/app.js    # Starts API on http://localhost:5000
```

> **MongoDB Atlas?** Set `MONGO_URI` in `backend/.env` to your Atlas connection string.

### 2. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev        # Starts UI on http://localhost:5173
```

### 3. Open in Browser

→ **http://localhost:5173**

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@library.com | admin123 |
| Librarian | librarian@library.com | lib123 |
| Student | student@library.com | student123 |

## Features

- **Authentication** — JWT-based with 3 roles (Admin, Librarian, Student)
- **Book Management** — Add, Edit, Delete, Stock tracking
- **Search** — By title, author, ISBN with category filtering
- **Issue & Return** — Issue books, auto fine calculation on late returns
- **Reservations** — Queue-based reservation system
- **Fines** — Auto-calculated, payment tracking
- **Dashboard** — Stats cards + interactive charts
- **Reports** — Monthly trends, category breakdown, popular books
- **Digital Library** — PDF upload/download
- **User Management** — Admin role management

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET/POST/PUT/DELETE | `/api/books` | Book CRUD |
| GET | `/api/books?q=search` | Search books |
| POST | `/api/books/:id/upload-pdf` | Upload PDF |
| POST/GET | `/api/issues` | Issue management |
| PUT | `/api/issues/:id/return` | Return book |
| POST/GET/DELETE | `/api/reservations` | Reservations |
| GET | `/api/fines` | List fines |
| PUT | `/api/fines/:id/pay` | Pay fine |
| GET | `/api/dashboard/stats` | Dashboard stats |
| GET | `/api/dashboard/reports` | Analytics |

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/database.js
│   │   ├── models/User, Book, Issue, Reservation, Fine
│   │   ├── middleware/auth.js, errorHandler.js
│   │   ├── routes/auth, books, issues, reservations, fines, dashboard
│   │   └── app.js
│   ├── uploads/
│   ├── seed.js
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── context/AuthContext.jsx
│   │   ├── services/api.js
│   │   ├── components/Sidebar, Modal, ProtectedRoute
│   │   ├── pages/Login, Register, Dashboard, Books, Issues, Search,
│   │   │        Reservations, Fines, Reports, DigitalLibrary, Users
│   │   ├── App.jsx
│   │   └── index.css
│   └── vite.config.js
└── README.md
```
