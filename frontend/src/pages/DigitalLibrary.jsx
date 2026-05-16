import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Upload, Download, BookOpen, FileText } from 'lucide-react';

export default function DigitalLibrary() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const canUpload = ['admin','librarian'].includes(user?.role);

  useEffect(() => {
    api.get('/books').then(r => setBooks(r.data.books)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const uploadPdf = async (bookId) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('pdf', file);
      try {
        await api.post(`/books/${bookId}/upload-pdf`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('PDF uploaded!');
        const r = await api.get('/books');
        setBooks(r.data.books);
      } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
    };
    input.click();
  };

  const downloadPdf = (bookId, title) => {
    window.open(`/api/books/${bookId}/download-pdf`, '_blank');
  };

  const booksWithPdf = books.filter(b => b.pdf_path);
  const booksWithoutPdf = books.filter(b => !b.pdf_path);

  return (
    <div>
      <div className="page-header"><h2>Digital Library</h2><p>Access and manage PDF books</p></div>

      {loading ? <div className="loading"><div className="spinner"></div></div> : (
        <>
          <h3 style={{fontSize:'16px',marginBottom:'16px',color:'var(--text-secondary)'}}>📄 Available PDFs ({booksWithPdf.length})</h3>
          {booksWithPdf.length === 0 ? (
            <div className="card" style={{textAlign:'center',padding:'40px',marginBottom:'28px',color:'var(--text-muted)'}}>
              <FileText size={48} style={{opacity:0.3,marginBottom:'12px'}} />
              <p>No PDFs uploaded yet</p>
            </div>
          ) : (
            <div className="book-grid" style={{marginBottom:'28px'}}>
              {booksWithPdf.map(b => (
                <div className="card book-card" key={b.id}>
                  <div className="book-cover" style={{height:'120px',background:'linear-gradient(135deg,rgba(108,99,255,0.2),rgba(139,92,246,0.1))'}}>
                    <FileText size={40} style={{color:'var(--accent)',opacity:0.6}} />
                  </div>
                  <div className="book-card-body">
                    <div className="book-title">{b.title}</div>
                    <div className="book-author">by {b.author}</div>
                    <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                      <button className="btn btn-primary btn-sm" onClick={()=>downloadPdf(b.id,b.title)}><Download size={14} /> Download</button>
                      {canUpload && <button className="btn btn-secondary btn-sm" onClick={()=>uploadPdf(b.id)}><Upload size={14} /> Replace</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {canUpload && (
            <>
              <h3 style={{fontSize:'16px',marginBottom:'16px',color:'var(--text-secondary)'}}>📚 Books Without PDF ({booksWithoutPdf.length})</h3>
              <div className="table-container">
                <table>
                  <thead><tr><th>Title</th><th>Author</th><th>Category</th><th>Action</th></tr></thead>
                  <tbody>
                    {booksWithoutPdf.map(b => (
                      <tr key={b.id}>
                        <td style={{fontWeight:600}}>{b.title}</td>
                        <td>{b.author}</td>
                        <td><span className="badge badge-issued">{b.category}</span></td>
                        <td><button className="btn btn-secondary btn-sm" onClick={()=>uploadPdf(b.id)}><Upload size={14} /> Upload PDF</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
