import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { X, CalendarClock } from 'lucide-react';

export default function Reservations() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/reservations').then(r=>setReservations(r.data.reservations)).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(load, []);

  const cancel = async (id) => {
    if (!confirm('Cancel this reservation?')) return;
    try { await api.delete(`/reservations/${id}`); toast.success('Cancelled'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div>
      <div className="page-header"><h2>Reservations</h2><p>Manage book reservations and queue</p></div>
      {loading ? <div className="loading"><div className="spinner"></div></div> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Book</th><th>Author</th>{user?.role !== 'student' && <th>User</th>}<th>Queue</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No reservations</td></tr>
              ) : reservations.map(r => (
                <tr key={r.id}>
                  <td style={{fontWeight:600}}>{r.book_title}</td>
                  <td>{r.book_author}</td>
                  {user?.role !== 'student' && <td>{r.user_name}</td>}
                  <td>#{r.queue_position}</td>
                  <td style={{fontSize:'13px'}}>{new Date(r.reserved_at).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td>{r.status === 'pending' && <button className="btn btn-danger btn-sm" onClick={()=>cancel(r.id)}><X size={14} /> Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
