import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

const emptyBook = { title:'',author:'',isbn:'',category:'General',description:'',total_copies:1,published_year:'',publisher:'' };

export default function Books() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBook);
  const canEdit = ['admin','librarian'].includes(user?.role);

  const debounceRef = useRef(null);

  const loadBooks = useCallback((q) => {
    setLoading(true);
    api.get('/books', { params: { q: q || undefined } })
      .then(r => setBooks(r.data.books))
      .catch(() => toast.error('Failed to load books'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadBooks(search), search ? 300 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [search, loadBooks]);

  const openAdd = () => { setEditing(null); setForm(emptyBook); setShowModal(true); };
  const openEdit = (b) => { setEditing(b); setForm({ title:b.title,author:b.author,isbn:b.isbn,category:b.category,description:b.description||'',total_copies:b.total_copies,published_year:b.published_year||'',publisher:b.publisher||'' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/books/${editing.id}`, form);
        toast.success('Book updated');
      } else {
        await api.post('/books', form);
        toast.success('Book added');
      }
      setShowModal(false);
      loadBooks(search);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this book?')) return;
    try {
      await api.delete(`/books/${id}`);
      toast.success('Book deleted');
      loadBooks(search);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const update = (k,v) => setForm(p=>({...p,[k]:v}));

  return (
    <div>
      <div className="page-header">
        <h2>Book Management</h2>
        <p>Manage your library's book collection</p>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-bar" style={{maxWidth:'360px',flex:1}}>
            <Search size={18} />
            <input placeholder="Search books..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>
        {canEdit && (
          <div className="toolbar-right">
            <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Book</button>
          </div>
        )}
      </div>

      {loading ? <div className="loading"><div className="spinner"></div></div> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Title</th><th>Author</th><th>ISBN</th><th>Category</th><th>Copies</th><th>Available</th>{canEdit && <th>Actions</th>}</tr></thead>
            <tbody>
              {books.length === 0 ? (
                <tr><td colSpan={canEdit?7:6} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No books found</td></tr>
              ) : books.map(b => (
                <tr key={b.id}>
                  <td style={{fontWeight:600}}>{b.title}</td>
                  <td>{b.author}</td>
                  <td style={{fontSize:'13px',color:'var(--text-muted)'}}>{b.isbn}</td>
                  <td><span className="badge badge-issued">{b.category}</span></td>
                  <td>{b.total_copies}</td>
                  <td><span className={`badge ${b.available_copies > 0 ? 'badge-returned' : 'badge-overdue'}`}>{b.available_copies}</span></td>
                  {canEdit && (
                    <td>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(b)}><Edit size={14} /></button>
                        {user?.role === 'admin' && <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(b.id)}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Book' : 'Add New Book'} onClose={()=>setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group"><label>Title*</label><input className="form-input" value={form.title} onChange={e=>update('title',e.target.value)} required /></div>
              <div className="form-group"><label>Author*</label><input className="form-input" value={form.author} onChange={e=>update('author',e.target.value)} required /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>ISBN*</label><input className="form-input" value={form.isbn} onChange={e=>update('isbn',e.target.value)} required /></div>
              <div className="form-group"><label>Category</label>
                <select className="form-select" value={form.category} onChange={e=>update('category',e.target.value)}>
                  {['General','Fiction','Technology','Science','History','Business','Self-Help','Philosophy','Psychology','Science Fiction'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Copies</label><input className="form-input" type="number" min="1" value={form.total_copies} onChange={e=>update('total_copies',e.target.value)} /></div>
              <div className="form-group"><label>Year</label><input className="form-input" type="number" value={form.published_year} onChange={e=>update('published_year',e.target.value)} /></div>
            </div>
            <div className="form-group"><label>Publisher</label><input className="form-input" value={form.publisher} onChange={e=>update('publisher',e.target.value)} /></div>
            <div className="form-group"><label>Description</label><textarea className="form-textarea" value={form.description} onChange={e=>update('description',e.target.value)} /></div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Book'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
