import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Trash2, Shield } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/dashboard/users').then(r=>setUsers(r.data.users)).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(load, []);

  const changeRole = async (id, role) => {
    try { await api.put(`/dashboard/users/${id}/role`, { role }); toast.success('Role updated'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    try { await api.delete(`/dashboard/users/${id}`); toast.success('User deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div>
      <div className="page-header"><h2>User Management</h2><p>Manage system users and roles</p></div>
      {loading ? <div className="loading"><div className="spinner"></div></div> : (
        <div className="table-container">
          <table>
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <div style={{width:'32px',height:'32px',borderRadius:'50%',background:u.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'13px',color:'white'}}>
                        {u.name[0].toUpperCase()}
                      </div>
                      <span style={{fontWeight:600}}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{color:'var(--text-muted)'}}>{u.email}</td>
                  <td>
                    <select className="form-select" style={{width:'auto',padding:'4px 8px',fontSize:'12px'}} value={u.role}
                      onChange={e=>changeRole(u.id,e.target.value)}>
                      <option value="student">Student</option>
                      <option value="librarian">Librarian</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td style={{fontSize:'13px'}}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={()=>deleteUser(u.id)}><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
