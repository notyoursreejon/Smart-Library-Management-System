import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'student' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (k,v) => setForm(p=>({...p,[k]:v}));

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{textAlign:'center',fontSize:'48px',marginBottom:'8px'}}>📚</div>
        <h2>Create Account</h2>
        <p className="subtitle">Join Smart Library today</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input className="form-input" value={form.name} onChange={e=>update('name',e.target.value)} placeholder="John Doe" required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="john@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="form-input" type="password" value={form.password} onChange={e=>update('password',e.target.value)} placeholder="Min 6 characters" required minLength={6} />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select className="form-select" value={form.role} onChange={e=>update('role',e.target.value)}>
              <option value="student">Student</option>
              <option value="librarian">Librarian</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></div>
      </div>
    </div>
  );
}
