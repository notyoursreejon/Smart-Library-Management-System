import { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#6C63FF','#FF6584','#43E97B','#FA709A','#89b4fa','#fab387'];
const tooltipStyle = { background:'#1a1a2e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#e2e8f0' };

export default function Reports() {
  const [reports, setReports] = useState(null);
  useEffect(() => { api.get('/dashboard/reports').then(r=>setReports(r.data.reports)).catch(()=>{}); }, []);

  if (!reports) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header"><h2>Reports & Analytics</h2><p>Library performance insights</p></div>
      <div className="charts-grid">
        <div className="card chart-card">
          <h3>Monthly Issues Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={reports.monthlyIssues}>
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#6C63FF" strokeWidth={2} dot={{fill:'#6C63FF',r:4}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart-card">
          <h3>Users by Role</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={reports.usersByRole} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={100} label={({role,count})=>`${role}: ${count}`}>
                {reports.usersByRole.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart-card">
          <h3>Issues by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={reports.issuesByCategory} layout="vertical">
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={12} width={100} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#89b4fa" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart-card">
          <h3>Recent Activity</h3>
          <div style={{maxHeight:'280px',overflowY:'auto'}}>
            {reports.recentActivity.map((a,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:'12px',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
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
    </div>
  );
}
