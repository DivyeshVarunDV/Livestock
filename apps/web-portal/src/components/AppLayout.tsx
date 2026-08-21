'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const isAdminRoute = pathname.startsWith('/users') || pathname.startsWith('/settings') || pathname.startsWith('/admin');
  const isAdmin = user?.role === 'admin';

  const isVeterinarianRoute = pathname.startsWith('/veterinarian');
  const isVeterinarian = user?.role === 'veterinarian';

  let content = children;
  if ((isAdminRoute && !isAdmin) || (isVeterinarianRoute && !isVeterinarian)) {
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
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex flex-col flex-1 w-full min-w-0 overflow-hidden">
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 w-full h-full flex flex-col">
            {content}
          </div>

          {/* Minimalist Footer */}
          <footer className="w-full bg-white border-t border-gray-200 py-4 px-6 mt-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-3">
              <div>
                &copy; 2026 LivestoCare
              </div>
              <div className="flex items-center gap-4">
                <Link href="/privacy" className="hover:text-green-700 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-green-700 transition-colors">Terms</Link>
                <Link href="/support" className="hover:text-green-700 transition-colors">Support</Link>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
