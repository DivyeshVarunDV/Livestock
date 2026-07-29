'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from './Navbar';
import { useEffect } from 'react';

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
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fa fa-circle-o-notch fa-spin" style={{ fontSize: '3rem', color: 'var(--accent-primary)', marginBottom: '16px' }}></i>
          <h2 style={{ color: 'var(--text-muted)' }}>AgriShield</h2>
        </div>
      </div>
    );
  }

  const isLogin = pathname === '/login';

  if (isLogin) {
    return <>{children}</>;
  }

  // Protected Dashboard layout
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
}
