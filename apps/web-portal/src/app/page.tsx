'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import Loader from '@/components/Loader';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await apiFetch('/reports/dashboard');
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return <Loader message="Loading compliance metrics..." />;
  }

  if (error) {
    return (
      <div style={{ padding: '24px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <i className="fa fa-exclamation-circle" style={{ fontSize: '2rem' }}></i>
        <div>
          <h3 style={{ borderBottom: 'none', paddingBottom: '4px', marginBottom: 0, color: '#991b1b' }}>Error Loading Dashboard</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const { stats, recentActivities, monthlyTreatments, speciesDistribution } = data;

  const COLORS = ['#059669', '#3b82f6', '#d97706', '#8b5cf6', '#ec4899'];

  return (
    <div className="animate-fade-in delay-1">
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>AgriShield Dashboard</h1>
        <p style={{ color: 'var(--text-muted)' }}>Real-time AMU monitoring and MRL compliance tracking.</p>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <span className="stat-label">Total Farms</span>
          <span className="stat-value">{stats.totalFarms}</span>
          <span className="stat-trend" style={{ color: 'var(--text-muted)' }}>
            <i className="fa fa-home"></i> Active production centers
          </span>
        </div>

        <div className="glass-panel stat-card">
          <span className="stat-label">Total Animals</span>
          <span className="stat-value">{stats.totalAnimals}</span>
          <span className="stat-trend" style={{ color: 'var(--text-muted)' }}>
            <i className="fa fa-paw"></i> Livestock registry
          </span>
        </div>

        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <span className="stat-label">Under Treatment</span>
          <span className="stat-value" style={{ color: 'var(--warning)' }}>{stats.underTreatment}</span>
          <span className="stat-trend trend-up">
            Active medical regimens
          </span>
        </div>

        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <span className="stat-label">MRL Withdrawal Restrictions</span>
          <span className="stat-value" style={{ color: 'var(--danger)' }}>{stats.activeMrlAlerts}</span>
          <span className="stat-trend trend-down">
            🚫 DO NOT SELL / CLEARING SOON
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Treatment Trend Chart */}
        <div className="glass-panel" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '20px' }}>Monthly Treatments Logged</h3>
          {monthlyTreatments.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No treatment records available yet.
            </div>
          ) : (
            <div style={{ flex: 1, width: '100%' }}>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={monthlyTreatments} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: '0.8rem', fill: 'var(--text-muted)' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '0.8rem', fill: 'var(--text-muted)' }} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '6px', border: '1px solid var(--border-light)' }} />
                  <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Species Distribution Chart */}
        <div className="glass-panel" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '20px' }}>Herd Composition</h3>
          {speciesDistribution.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No herd statistics.
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={speciesDistribution}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {speciesDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid var(--border-light)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Main Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Recent MRL / Activity Logs */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, border: 'none', padding: 0 }}>Recent Activity Log</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Audited veterinary treatments, diagnoses, and compliance notifications.</p>
          
          <div className="data-list" style={{ marginTop: 0 }}>
            {recentActivities.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No recent activities found.
              </div>
            ) : (
              recentActivities.map((act: any) => (
                <div key={act.id} className="data-row">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: act.type === 'TREATMENT' ? '#fee2e2' : act.type === 'VACCINATION' ? '#dbeafe' : '#d1fae5',
                        color: act.type === 'TREATMENT' ? '#ef4444' : act.type === 'VACCINATION' ? '#3b82f6' : '#10b981',
                        fontSize: '0.75rem',
                      }}>
                        <i className={act.type === 'TREATMENT' ? 'fa fa-medkit' : act.type === 'VACCINATION' ? 'fa fa-shield' : 'fa fa-stethoscope'}></i>
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{act.description}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '32px', marginTop: '4px' }}>
                      By {act.user} • {new Date(act.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className={`badge ${act.type === 'TREATMENT' ? 'danger' : act.type === 'VACCINATION' ? 'warning' : 'success'}`}>
                      {act.type}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Help / Info */}
        <div className="glass-panel" style={{ background: 'var(--bg-main)', borderStyle: 'dashed' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Compliance Standards</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.85rem', marginTop: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--danger)' }}>
                <span className="badge danger">DO NOT SELL</span>
              </div>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>The animal is currently within its drug withdrawal period. It cannot be sold or processed for meat/milk.</p>
            </div>
            
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--warning)' }}>
                <span className="badge warning">CLEARING SOON</span>
              </div>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>The withdrawal period has less than 3 days remaining. Clearance inspection recommended.</p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--success)' }}>
                <span className="badge success">CLEARED</span>
              </div>
              <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>No active withdrawal limits. The animal and its products are safe for distribution.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
