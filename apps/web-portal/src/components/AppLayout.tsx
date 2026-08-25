'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import TopNavbar from './TopNavbar';
import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  if (!loading && !user && pathname !== '/login') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-gray-900 text-lg font-bold">Redirecting to Login...</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-gray-900 text-lg font-bold">LivestoCare</h2>
          <p className="text-gray-500 text-sm mt-1">Digital Farm Management &amp; MRL Compliance</p>
        </div>
      </div>
    );
  }

  const isLogin = pathname === '/login';
  if (isLogin) {
    return <>{children}</>;
  }

  // Admin-only routes
  const isAdminRoute = pathname.startsWith('/users') || pathname.startsWith('/settings') || pathname.startsWith('/admin') || pathname.startsWith('/audit');
  const isAdmin = user?.role === 'admin';

  let content = children;
  if (isAdminRoute && !isAdmin) {
    content = (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600 max-w-md">
          You do not have permission to access this section.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#F8FAFC] overflow-hidden">
      <TopNavbar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          {content}
        </div>
      </main>
    </div>
  );
}
