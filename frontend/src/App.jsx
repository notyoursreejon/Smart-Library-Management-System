import { lazy, Suspense, memo, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

/* ── Lazy-load all pages for code splitting ── */
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Books = lazy(() => import('./pages/Books'));
const Issues = lazy(() => import('./pages/Issues'));
const SearchPage = lazy(() => import('./pages/Search'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Fines = lazy(() => import('./pages/Fines'));
const Reports = lazy(() => import('./pages/Reports'));
const DigitalLibrary = lazy(() => import('./pages/DigitalLibrary'));
const UsersPage = lazy(() => import('./pages/Users'));

/* ── Lazy-load AI assistant (not needed until user clicks) ── */
const FloatingAiAssistant = lazy(() => import('./components/ui/FloatingAiAssistant'));

/* ── Skeleton loader for Suspense boundaries ── */
function PageSkeleton() {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ width: '240px', height: '32px', background: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '8px' }} />
      <div style={{ width: '360px', height: '16px', background: 'var(--bg-elevated)', borderRadius: '6px', marginBottom: '32px', opacity: 0.6 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: '100px', background: 'var(--bg-elevated)', borderRadius: '16px', opacity: 0.5 }} />
        ))}
      </div>
    </div>
  );
}

/* ── Memoized layout: prevents Sidebar + AI re-renders on route change ── */
const AppLayout = memo(function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Suspense fallback={<PageSkeleton />}>
          {children}
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <FloatingAiAssistant />
      </Suspense>
    </div>
  );
});

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading" style={{ minHeight: '100vh' }}><div className="spinner"></div></div>;

  return (
    <Suspense fallback={<div className="loading" style={{ minHeight: '100vh' }}><div className="spinner"></div></div>}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/books" element={<ProtectedRoute><AppLayout><Books /></AppLayout></ProtectedRoute>} />
        <Route path="/issues" element={<ProtectedRoute roles={['admin','librarian']}><AppLayout><Issues /></AppLayout></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><AppLayout><SearchPage /></AppLayout></ProtectedRoute>} />
        <Route path="/reservations" element={<ProtectedRoute><AppLayout><Reservations /></AppLayout></ProtectedRoute>} />
        <Route path="/fines" element={<ProtectedRoute><AppLayout><Fines /></AppLayout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['admin','librarian']}><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
        <Route path="/digital-library" element={<ProtectedRoute><AppLayout><DigitalLibrary /></AppLayout></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute roles={['admin']}><AppLayout><UsersPage /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Suspense>
  );
}
