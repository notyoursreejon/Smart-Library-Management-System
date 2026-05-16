import { memo, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { LayoutDashboard, BookOpen, ArrowLeftRight, Search, CalendarClock, FileText, Users, LogOut, BookMarked } from 'lucide-react';

const allNav = [
  { section: 'Main', items: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/books', label: 'Books', icon: BookOpen },
    { path: '/search', label: 'Search', icon: Search },
  ]},
  { section: 'Operations', items: [
    { path: '/issues', label: 'Issue / Return', icon: ArrowLeftRight, roles: ['admin','librarian'] },
    { path: '/reservations', label: 'Reservations', icon: CalendarClock },
    { path: '/fines', label: 'Fines', icon: FileText },
  ]},
  { section: 'Library', items: [
    { path: '/digital-library', label: 'Digital Library', icon: BookMarked },
    { path: '/reports', label: 'Reports', icon: FileText, roles: ['admin','librarian'] },
    { path: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  ]},
];

const NavItem = memo(function NavItem({ item, isActive, onNavigate }) {
  const handleClick = useCallback(() => onNavigate(item.path), [item.path, onNavigate]);
  return (
    <button className={`nav-item ${isActive ? 'active' : ''}`} onClick={handleClick}>
      <item.icon size={18} /> {item.label}
    </button>
  );
});

export default memo(function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = useCallback((path) => navigate(path), [navigate]);
  const handleLogout = useCallback(() => logout(), [logout]);

  const filteredNav = useMemo(() =>
    allNav.map(section => ({
      ...section,
      items: section.items.filter(i => !i.roles || i.roles.includes(user?.role))
    })).filter(s => s.items.length > 0),
    [user?.role]
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">📚</div>
        <div style={{ flex: 1 }}>
          <h1>Smart Library</h1>
          <p>Management System</p>
        </div>
        <ThemeToggle />
      </div>

      <nav className="sidebar-nav">
        {filteredNav.map(section => (
          <div className="sidebar-section" key={section.section}>
            <div className="sidebar-section-title">{section.section}</div>
            {section.items.map(item => (
              <NavItem
                key={item.path}
                item={item}
                isActive={location.pathname === item.path}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="avatar" style={{ background: user?.avatar_color || 'linear-gradient(135deg, #1E3A8A, #6366F1)' }}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div className="user-info">
          <div className="user-name">{user?.name}</div>
          <div className="user-role">{user?.role}</div>
        </div>
        <button className="theme-toggle" onClick={handleLogout} title="Logout" style={{ color: 'var(--text-muted)' }}>
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
});
