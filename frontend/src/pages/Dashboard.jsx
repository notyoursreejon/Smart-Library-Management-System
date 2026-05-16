import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { BookOpen, Users, AlertTriangle, DollarSign, ArrowLeftRight, CalendarClock, TrendingUp, Plus, CornerDownLeft, Clock, Search, BookMarked, Activity, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

const COLORS = ['#1E3A8A','#6366F1','#22D3EE','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
const tooltipStyle = { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'12px', color:'var(--text-primary)', boxShadow:'var(--shadow-lg)' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);
  const [myIssues, setMyIssues] = useState([]);

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data.stats)).catch(()=>{});
    if (user?.role !== 'student') {
      api.get('/dashboard/reports').then(r => setReports(r.data.reports)).catch(()=>{});
    }
    if (user?.role === 'student') {
      api.get('/issues', { params: { status: 'issued' } }).then(r => setMyIssues(r.data.issues || [])).catch(()=>{});
    }
  }, [user]);

  const getDaysRemaining = useCallback((due) => {
    const diff = Math.ceil((new Date(due) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  }, []);

  const goTo = useCallback((path) => navigate(path), [navigate]);

  if (!stats) return <div className="loading"><div className="spinner"></div></div>;

  /* ─── ADMIN DASHBOARD ─── */
  if (user?.role === 'admin') return (
    <div>
      <div className="page-header">
        <h2>Admin Dashboard</h2>
        <p>System overview and analytics — Welcome back, {user.name}</p>
      </div>

      <div className="stats-grid">
        {[
          { label:'Total Books', value: stats.totalBooks, icon: BookOpen, color:'#1E3A8A', bg:'rgba(30,58,138,0.12)' },
          { label:'Total Users', value: stats.totalUsers, icon: Users, color:'#6366F1', bg:'rgba(99,102,241,0.12)' },
          { label:'Active Borrowers', value: stats.issuedBooks, icon: ArrowLeftRight, color:'#22D3EE', bg:'rgba(34,211,238,0.12)' },
          { label:'Pending Returns', value: stats.overdueBooks, icon: AlertTriangle, color:'#ef4444', bg:'rgba(239,68,68,0.12)' },
          { label:'Reservations', value: stats.pendingReservations, icon: CalendarClock, color:'#f59e0b', bg:'rgba(245,158,11,0.12)' },
          { label:'Available', value: stats.availableCopies, icon: BookMarked, color:'#10b981', bg:'rgba(16,185,129,0.12)' },
          { label:'Unpaid Fines', value: `$${stats.totalFinesUnpaid}`, icon: DollarSign, color:'#ef4444', bg:'rgba(239,68,68,0.12)' },
          { label:'Collected', value: `$${stats.totalFinesCollected}`, icon: TrendingUp, color:'#10b981', bg:'rgba(16,185,129,0.12)' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}><s.icon size={24} /></div>
            <div><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      {reports && (
        <div className="charts-grid">
          <div className="card chart-card">
            <h3>📈 Book Issue Trends</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={reports.monthlyIssues}>
                <defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366F1" stopOpacity={0.3}/><stop offset="100%" stopColor="#6366F1" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="#6366F1" fill="url(#gArea)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <h3>👥 Users by Role</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={reports.usersByRole} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={95} innerRadius={55} label={({role,count})=>`${role}: ${count}`}>
                  {reports.usersByRole.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <h3>📊 Most Borrowed Books</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={reports.popularBooks} layout="vertical">
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                <YAxis type="category" dataKey="title" stroke="var(--text-muted)" fontSize={11} width={120} tick={{fill:'var(--text-secondary)'}} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="issue_count" fill="#22D3EE" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <h3>🕐 Recent Activity</h3>
            <div style={{maxHeight:'260px',overflowY:'auto'}}>
              {reports.recentActivity.map((a,i)=>(
                <div className="activity-item" key={i}>
                  <span className={`badge badge-${a.status}`}>{a.status}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.book_title}</div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)'}}>{a.user_name} • {new Date(a.issue_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ─── LIBRARIAN DASHBOARD ─── */
  if (user?.role === 'librarian') return (
    <div>
      <div className="page-header">
        <h2>Librarian Dashboard</h2>
        <p>Daily operations at a glance — {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</p>
      </div>

      <div className="quick-actions">
        {[
          { label:'Issue Book', icon: ArrowLeftRight, color:'#1E3A8A', bg:'rgba(30,58,138,0.12)', path:'/issues' },
          { label:'Return Book', icon: CornerDownLeft, color:'#10b981', bg:'rgba(16,185,129,0.12)', path:'/issues' },
          { label:'Add New Book', icon: Plus, color:'#6366F1', bg:'rgba(99,102,241,0.12)', path:'/books' },
          { label:'Reservations', icon: CalendarClock, color:'#f59e0b', bg:'rgba(245,158,11,0.12)', path:'/reservations' },
        ].map(a => (
          <button className="quick-action-btn" key={a.label} onClick={()=>goTo(a.path)}>
            <div className="qa-icon" style={{background:a.bg,color:a.color}}><a.icon size={26} /></div>
            <div className="qa-label">{a.label}</div>
          </button>
        ))}
      </div>

      <div className="stats-grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))'}}>
        {[
          { label:'Issued Today', value: stats.issuedBooks, icon: ArrowLeftRight, color:'#1E3A8A', bg:'rgba(30,58,138,0.12)' },
          { label:'Overdue', value: stats.overdueBooks, icon: AlertTriangle, color:'#ef4444', bg:'rgba(239,68,68,0.12)' },
          { label:'Available', value: stats.availableCopies, icon: BookOpen, color:'#10b981', bg:'rgba(16,185,129,0.12)' },
          { label:'Pending Fines', value: `$${stats.totalFinesUnpaid}`, icon: DollarSign, color:'#f59e0b', bg:'rgba(245,158,11,0.12)' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{background:s.bg,color:s.color}}><s.icon size={22} /></div>
            <div><div className="stat-value" style={{fontSize:'24px'}}>{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      {reports && (
        <div className="charts-grid">
          <div className="card chart-card">
            <h3>📊 Issues by Category</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={reports.issuesByCategory}>
                <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#6366F1" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card chart-card">
            <h3>🏆 Popular Books</h3>
            <div className="table-container" style={{border:'none',boxShadow:'none'}}>
              <table>
                <thead><tr><th>#</th><th>Title</th><th>Author</th><th>Issues</th></tr></thead>
                <tbody>
                  {reports.popularBooks.map((b,i) => (
                    <tr key={i}><td style={{fontWeight:700,color:'var(--secondary)'}}>{i+1}</td><td style={{fontWeight:600}}>{b.title}</td><td>{b.author}</td><td><span className="badge badge-issued">{b.issue_count}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {stats.totalFinesUnpaid > 0 && (
        <div className="card" style={{marginTop:'24px',borderColor:'rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.04)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <AlertTriangle size={20} style={{color:'var(--danger)'}} />
            <div>
              <div style={{fontWeight:700,color:'var(--danger)'}}>Fine Alert</div>
              <div style={{fontSize:'13px',color:'var(--text-secondary)'}}>There are ${stats.totalFinesUnpaid} in unpaid fines requiring attention.</div>
            </div>
            <button className="btn btn-danger btn-sm" style={{marginLeft:'auto'}} onClick={()=>goTo('/fines')}>View Fines</button>
          </div>
        </div>
      )}
    </div>
  );

  /* ─── STUDENT DASHBOARD ─── */
  return (
    <div>
      <div className="page-header">
        <h2>My Library</h2>
        <p>Welcome back, {user?.name}! Here's your library activity.</p>
      </div>

      <div style={{marginBottom:'32px'}}>
        <div className="search-bar" style={{maxWidth:'500px',marginBottom:'24px'}} onClick={()=>goTo('/search')}>
          <Search size={18} />
          <input placeholder="Search for books by title, author, or ISBN..." readOnly style={{cursor:'pointer'}} />
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))'}}>
        {[
          { label:'My Issued Books', value: myIssues.length, icon: BookOpen, color:'#1E3A8A', bg:'rgba(30,58,138,0.12)' },
          { label:'Reservations', value: stats.pendingReservations, icon: CalendarClock, color:'#f59e0b', bg:'rgba(245,158,11,0.12)' },
          { label:'Unpaid Fines', value: `$${stats.totalFinesUnpaid}`, icon: DollarSign, color:'#ef4444', bg:'rgba(239,68,68,0.12)' },
          { label:'Books Available', value: stats.availableCopies, icon: BookMarked, color:'#10b981', bg:'rgba(16,185,129,0.12)' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{background:s.bg,color:s.color}}><s.icon size={22} /></div>
            <div><div className="stat-value" style={{fontSize:'24px'}}>{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      {myIssues.length > 0 && (
        <div className="card" style={{marginBottom:'24px'}}>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:'18px',marginBottom:'16px'}}>📚 My Issued Books</h3>
          <div className="table-container" style={{border:'none',boxShadow:'none'}}>
            <table>
              <thead><tr><th>Book</th><th>Issue Date</th><th>Due Date</th><th>Days Left</th></tr></thead>
              <tbody>
                {myIssues.map(issue => {
                  const days = getDaysRemaining(issue.due_date);
                  return (
                    <tr key={issue.id}>
                      <td style={{fontWeight:600}}>{issue.book_title}</td>
                      <td style={{fontSize:'13px'}}>{new Date(issue.issue_date).toLocaleDateString()}</td>
                      <td style={{fontSize:'13px'}}>{new Date(issue.due_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`countdown ${days <= 2 ? 'urgent' : 'safe'}`}>
                          {days > 0 ? `${days} days` : days === 0 ? 'Due today!' : `${Math.abs(days)} days overdue`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="quick-actions" style={{gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))'}}>
        {[
          { label:'Search Books', icon: Search, color:'#1E3A8A', bg:'rgba(30,58,138,0.12)', path:'/search' },
          { label:'My Reservations', icon: CalendarClock, color:'#f59e0b', bg:'rgba(245,158,11,0.12)', path:'/reservations' },
          { label:'Digital Library', icon: BookMarked, color:'#6366F1', bg:'rgba(99,102,241,0.12)', path:'/digital-library' },
          { label:'My Fines', icon: DollarSign, color:'#ef4444', bg:'rgba(239,68,68,0.12)', path:'/fines' },
        ].map(a => (
          <button className="quick-action-btn" key={a.label} onClick={()=>goTo(a.path)}>
            <div className="qa-icon" style={{background:a.bg,color:a.color}}><a.icon size={26} /></div>
            <div className="qa-label">{a.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
