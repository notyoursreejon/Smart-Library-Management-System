import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CornerDownLeft, Search } from 'lucide-react';

export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [bookId, setBookId] = useState('');
  const [userId, setUserId] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/issues', { params: { status: filter !== 'all' ? filter : undefined } })
      .then(r => setIssues(r.data.issues)).catch(()=>{}).finally(()=>setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);
  useEffect(() => {
    api.get('/books').then(r => setBooks(r.data.books)).catch(()=>{});
    api.get('/dashboard/users').then(r => setUsers(r.data.users)).catch(()=>{});
  }, []);

  const issueBook = async () => {
    if (!bookId || !userId) return toast.error('Select both book and user');
    try {
      const res = await api.post('/issues', { book_id: bookId, user_id: userId });
      toast.success(`"${res.data.issue.book_title}" issued to ${res.data.issue.user_name}`);
      setBookId(''); setUserId('');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to issue'); }
  };

  const returnBook = async (id) => {
    try {
      const res = await api.put(`/issues/${id}/return`);
      if (res.data.fine) {
        toast.success(`Book returned. Fine: $${res.data.fine.amount} (${res.data.fine.days_late} days late)`);
      } else {
        toast.success('Book returned successfully!');
      }
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const availableBooks = books.filter(b => b.available_copies > 0);
  const studentUsers = users.filter(u => u.role === 'student');

  return (
    <div>
      <div className="page-header"><h2>Issue & Return</h2><p>Manage book issues and returns</p></div>

      <div className="card" style={{marginBottom:'24px'}}>
        <h3 style={{fontSize:'16px',marginBottom:'16px'}}>Issue a Book</h3>
        <div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'flex-end'}}>
          <div className="form-group" style={{flex:1,minWidth:'200px',marginBottom:0}}>
            <label>Book</label>
            <select className="form-select" value={bookId} onChange={e=>setBookId(e.target.value)}>
              <option value="">Select a book...</option>
              {availableBooks.map(b=><option key={b.id} value={b.id}>{b.title} ({b.available_copies} avail.)</option>)}
            </select>
          </div>
          <div className="form-group" style={{flex:1,minWidth:'200px',marginBottom:0}}>
            <label>Student</label>
            <select className="form-select" value={userId} onChange={e=>setUserId(e.target.value)}>
              <option value="">Select a student...</option>
              {studentUsers.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={issueBook} style={{height:'42px'}}>Issue Book</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="filter-group">
            <label style={{fontSize:'13px',color:'var(--text-muted)'}}>Status:</label>
            <select className="form-select" value={filter} onChange={e=>setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="issued">Issued</option>
              <option value="overdue">Overdue</option>
              <option value="returned">Returned</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? <div className="loading"><div className="spinner"></div></div> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Book</th><th>Student</th><th>Issue Date</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {issues.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No issues found</td></tr>
              ) : issues.map(i => (
                <tr key={i.id}>
                  <td style={{fontWeight:600}}>{i.book_title}</td>
                  <td>{i.user_name}</td>
                  <td style={{fontSize:'13px'}}>{new Date(i.issue_date).toLocaleDateString()}</td>
                  <td style={{fontSize:'13px'}}>{new Date(i.due_date).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${i.status}`}>{i.status}</span></td>
                  <td>
                    {i.status !== 'returned' && (
                      <button className="btn btn-success btn-sm" onClick={()=>returnBook(i.id)}>
                        <CornerDownLeft size={14} /> Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
