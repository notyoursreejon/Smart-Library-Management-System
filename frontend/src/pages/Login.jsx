import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { BookOpen, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{textAlign:'center',marginBottom:'24px'}}>
          <div style={{width:'56px',height:'56px',margin:'0 auto 12px',borderRadius:'16px',background:'linear-gradient(135deg,#1E3A8A,#6366F1)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 24px rgba(30,58,138,0.3)'}}>
            <BookOpen size={28} style={{color:'white'}} />
          </div>
          <h2>Welcome Back</h2>
          <p className="subtitle">Sign in to Smart Library</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@library.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="form-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight size={16} /></>}
          </button>
        </form>
        <div className="auth-footer">Don't have an account? <Link to="/register">Sign up</Link></div>
        <div style={{marginTop:'20px',padding:'16px',background:'var(--bg-glass)',borderRadius:'var(--radius-md)',fontSize:'12px',color:'var(--text-muted)',border:'1px solid var(--border)'}}>
          <strong style={{color:'var(--text-secondary)',display:'block',marginBottom:'6px'}}>Demo Credentials:</strong>
          <div style={{display:'grid',gap:'4px'}}>
            <span>🔑 Admin: admin@library.com / admin123</span>
            <span>📋 Librarian: librarian@library.com / lib123</span>
            <span>🎓 Student: student@library.com / student123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
