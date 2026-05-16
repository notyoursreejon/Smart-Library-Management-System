import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { DollarSign, Check } from 'lucide-react';

export default function Fines() {
  const { user } = useAuth();
  const [fines, setFines] = useState([]);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const canPay = ['admin','librarian'].includes(user?.role);

  const load = () => {
    setLoading(true);
    api.get('/fines').then(r=>{ setFines(r.data.fines); setTotalUnpaid(r.data.totalUnpaid); }).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(load, []);

  const payFine = async (id) => {
    try { await api.put(`/fines/${id}/pay`); toast.success('Fine paid'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div>
      <div className="page-header"><h2>Fines</h2><p>Track and manage overdue fines</p></div>

      {totalUnpaid > 0 && (
        <div className="stat-card" style={{marginBottom:'24px',borderColor:'rgba(243,139,168,0.3)'}}>
          <div className="stat-icon" style={{background:'rgba(243,139,168,0.15)',color:'var(--danger)'}}><DollarSign size={24} /></div>
          <div><div className="stat-value" style={{color:'var(--danger)'}}>${totalUnpaid.toFixed(2)}</div><div className="stat-label">Total Unpaid Fines</div></div>
        </div>
      )}

      {loading ? <div className="loading"><div className="spinner"></div></div> : (
        <div className="table-container">
          <table>
            <thead><tr><th>Book</th>{canPay && <th>User</th>}<th>Amount</th><th>Due Date</th><th>Status</th>{canPay && <th>Action</th>}</tr></thead>
            <tbody>
              {fines.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No fines</td></tr>
              ) : fines.map(f => (
                <tr key={f.id}>
                  <td style={{fontWeight:600}}>{f.book_title}</td>
                  {canPay && <td>{f.user_name}</td>}
                  <td style={{fontWeight:700,color:f.paid?'var(--success)':'var(--danger)'}}>${f.amount.toFixed(2)}</td>
                  <td style={{fontSize:'13px'}}>{new Date(f.due_date).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${f.paid?'paid':'unpaid'}`}>{f.paid?'Paid':'Unpaid'}</span></td>
                  {canPay && <td>{!f.paid && <button className="btn btn-success btn-sm" onClick={()=>payFine(f.id)}><Check size={14} /> Pay</button>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
