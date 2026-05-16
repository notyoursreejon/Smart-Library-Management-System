import { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Search as SearchIcon, BookOpen, CalendarClock } from 'lucide-react';

export default function SearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const doSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const r = await api.get('/books', { params: { q: query, category: category !== 'all' ? category : undefined } });
      setResults(r.data.books);
    } catch { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const reserve = async (bookId) => {
    try {
      await api.post('/reservations', { book_id: bookId });
      toast.success('Book reserved!');
    } catch (err) { toast.error(err.response?.data?.error || 'Reservation failed'); }
  };

  return (
    <div>
      <div className="page-header"><h2>Search Books</h2><p>Find books by title, author, or ISBN</p></div>

      <form onSubmit={doSearch} style={{marginBottom:'28px'}}>
        <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
          <div className="search-bar" style={{flex:1,maxWidth:'500px'}}>
            <SearchIcon size={18} />
            <input placeholder="Search by title, author, or ISBN..." value={query} onChange={e=>setQuery(e.target.value)} />
          </div>
          <select className="form-select" style={{width:'auto',minWidth:'140px'}} value={category} onChange={e=>setCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {['Fiction','Technology','Science','History','Business','Self-Help','Philosophy','Psychology','Science Fiction'].map(c=><option key={c}>{c}</option>)}
          </select>
          <button className="btn btn-primary" type="submit">Search</button>
        </div>
      </form>

      {loading ? <div className="loading"><div className="spinner"></div></div> : searched && (
        results.length === 0 ? (
          <div className="empty-state"><SearchIcon /><h3>No books found</h3><p>Try different keywords</p></div>
        ) : (
          <div className="book-grid">
            {results.map(b => (
              <div className="card book-card" key={b.id}>
                <div className="book-cover"><BookOpen size={48} style={{color:'var(--text-muted)',opacity:0.3}} /></div>
                <div className="book-card-body">
                  <div className="book-title">{b.title}</div>
                  <div className="book-author">by {b.author}</div>
                  <div className="book-meta">
                    <span>{b.category}</span>
                    <span>•</span>
                    <span>{b.published_year || 'N/A'}</span>
                    <span>•</span>
                    <span className={b.available_copies > 0 ? '' : 'danger'}>{b.available_copies} available</span>
                  </div>
                  {b.description && <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'12px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{b.description}</p>}
                  <div className="book-actions">
                    {b.available_copies === 0 && (
                      <button className="btn btn-secondary btn-sm" onClick={()=>reserve(b.id)}>
                        <CalendarClock size={14} /> Reserve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
