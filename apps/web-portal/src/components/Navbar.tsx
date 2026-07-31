'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [lang, setLang] = useState('English');
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await apiFetch('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([
        {
          id: 'n1',
          title: 'Withdrawal Alert Generated',
          message: 'Oxytetracycline withdrawal alert for Tag #TAG-0042',
          type: 'WITHDRAWAL_ENDING',
          read: false,
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'n2',
          title: 'MRL Violation Flagged',
          message: 'Lab sample #LAB-8819 exceeded MRL threshold',
          type: 'CRITICAL_ALERT',
          read: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'n3',
          title: 'Pending Prescription',
          message: 'Dr. Ramesh Kumar submitted 4 veterinary prescriptions',
          type: 'VACCINATION_DUE',
          read: false,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'n4',
          title: 'Lab Report Verified',
          message: 'Sample #LAB-8810 cleared HPLC testing at NDRI',
          type: 'WITHDRAWAL_ENDING',
          read: true,
          createdAt: new Date(Date.now() - 14400000).toISOString(),
        },
        {
          id: 'n5',
          title: 'Farm Registration Approved',
          message: 'Amrit Sarovar Dairy verified under District Registry',
          type: 'SYSTEM_NOTIFICATION',
          read: true,
          createdAt: new Date(Date.now() - 28800000).toISOString(),
        },
      ]);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications/mark-all-read', { method: 'PUT' });
    } catch {
      // offline fallback
    }
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const formatRole = (r: string) => {
    if (!r) return 'GOVT_OFFICIAL';
    return r.replace(/_/g, ' ');
  };

  const getInitials = (name: string) => {
    if (!name) return 'GO';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const exportReport = () => {
    alert('Generating Official Government of India MRL Compliance Report (PDF/Excel)...');
  };

  return (
    <header className="topbar">
      {/* Large Search Bar */}
      <div className="topbar-left" style={{ flex: 1, maxWidth: '440px' }}>
        <div className="search-container" style={{ width: '100%' }}>
          <i className="fa fa-search search-icon"></i>
          <input
            type="text"
            className="search-bar"
            placeholder="Search RFID tags, farmers, MRL lab results, veterinary drugs..."
            style={{ width: '100%', maxWidth: '420px' }}
          />
        </div>
      </div>

      {/* Top Navigation Controls */}
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Notifications Button & Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            title="Notifications"
            className="topbar-icon-btn"
          >
            <i className="fa fa-bell-o"></i>
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="notif-dropdown" style={{ right: 0, width: '340px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F8FAFC',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1F2937' }}>
                  Government Alerts ({unreadCount})
                </span>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Mark all as read
                </button>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-light)',
                      background: n.read ? '#FFFFFF' : '#F0FDF4',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#2E7D32',
                        marginTop: '5px',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1F2937' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#4B5563', marginTop: '2px' }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: '3px' }}>
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: '8px 14px',
                  borderTop: '1px solid var(--border-light)',
                  textAlign: 'center',
                  background: '#F8FAFC',
                }}
              >
                <Link
                  href="/notifications"
                  onClick={() => setNotifOpen(false)}
                  style={{
                    color: 'var(--accent-primary)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    textDecoration: 'none',
                  }}
                >
                  View All Government Alerts &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <button type="button" className="topbar-icon-btn" title="Messages">
          <i className="fa fa-envelope-o"></i>
        </button>

        {/* Language Selector */}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid var(--border-light)',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 600,
            background: '#F9FAFB',
            color: '#374151',
            cursor: 'pointer',
          }}
          title="Language Selector"
        >
          <option value="English">EN • English</option>
          <option value="Hindi">HI • हिन्दी (Hindi)</option>
          <option value="Punjabi">PA • ਪੰਜਾਬੀ</option>
          <option value="Gujarati">GU • ગુજરાતી</option>
          <option value="Tamil">TA • தமிழ்</option>
        </select>

        {/* Export Report Button */}
        <button
          type="button"
          onClick={exportReport}
          className="btn-secondary"
          style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Export Official Compliance Report"
        >
          <i className="fa fa-download" style={{ color: 'var(--accent-primary)' }}></i>
          <span>Export Report</span>
        </button>

        {/* Admin Profile & Logout */}
        <div className="user-profile-compact">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1F2937', lineHeight: '1.2' }}>
              {user?.name || 'Dr. Rajesh Sharma'}
            </div>
            <div
              style={{
                color: 'var(--accent-primary)',
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {formatRole(user?.role || 'REGULATORY_AUTHORITY')}
            </div>
          </div>
          <div className="avatar-compact">
            {getInitials(user?.name || 'Rajesh Sharma')}
          </div>
          <button
            onClick={logout}
            className="topbar-logout-btn"
            title="Logout"
          >
            <i className="fa fa-sign-out"></i>
          </button>
        </div>
      </div>
    </header>
  );
}
