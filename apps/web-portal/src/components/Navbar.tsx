'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'fa fa-dashboard' },
    { name: 'Farms & Animals', path: '/farms', icon: 'fa fa-paw' },
    { name: 'AMU Tracking', path: '/amu', icon: 'fa fa-medkit' },
    { name: 'Compliance Alerts', path: '/alerts', icon: 'fa fa-bell' },
    { name: 'Reports', path: '/reports', icon: 'fa fa-list-alt' },
  ];

  // Helper to format role names
  const formatRole = (role: string) => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  // Helper for avatar initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <i className="fa fa-leaf" style={{ marginRight: '4px' }}></i>
        <span>AgriShield</span>
      </div>
      
      <nav className="navbar-nav">
        {navItems.map((item) => (
          <Link 
            href={item.path} 
            key={item.name}
            className={`nav-item ${pathname === item.path ? 'active' : ''}`}
          >
            <i className={item.icon}></i>
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="navbar-right">
        {user && (
          <div className="user-profile">
            <div style={{ textAlign: 'right', marginRight: '8px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatRole(user.role)}</div>
            </div>
            <div className="avatar" style={{ marginRight: '16px' }}>{getInitials(user.name)}</div>
            <button 
              onClick={logout} 
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
              title="Logout"
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <i className="fa fa-sign-out"></i>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
