'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fa fa-circle-o-notch fa-spin" style={{ fontSize: '2.2rem', color: '#2E7D32', marginBottom: '10px' }}></i>
          <h2 style={{ color: '#111827', fontSize: '1.05rem', fontWeight: 700 }}>AgriShield Enterprise</h2>
          <p style={{ color: '#6B7280', fontSize: '0.8rem', marginTop: '4px' }}>Digital Farm Management &amp; MRL Compliance Platform...</p>
        </div>
      </div>
    );
  }

  const isLogin = pathname === '/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar />
        <main className="main-content">
          <div className="dashboard-content">
            {children}
          </div>

          {/* Official AgriShield Enterprise Thin Professional Footer */}
          <footer
            className="gov-footer"
            style={{
              background: '#F9FAFB',
              borderTop: '1px solid #E5E7EB',
              padding: '14px 24px',
              fontSize: '0.76rem',
              color: '#6B7280',
              marginTop: 'auto',
            }}
          >
            <div className="gov-footer-left">
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4B5563',
                  fontSize: '0.9rem',
                }}
                title="Government of India Emblem"
              >
                <i className="fa fa-institution"></i>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.8rem' }}>
                  AgriShield Enterprise
                </span>
                <span style={{ color: '#D1D5DB' }}>•</span>
                <span style={{ color: '#6B7280', fontSize: '0.76rem' }}>
                  Digital Farm Management &amp; MRL Compliance Platform
                </span>
              </div>
            </div>

            <div className="gov-footer-links" style={{ fontSize: '0.76rem' }}>
              <Link href="/reports">Privacy Policy</Link>
              <span>•</span>
              <Link href="/reports">Terms of Service</Link>
              <span>•</span>
              <Link href="/inventory">Support</Link>
              <span>•</span>
              <span style={{ fontWeight: 700, color: '#4B5563' }}>Version 2.1</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
