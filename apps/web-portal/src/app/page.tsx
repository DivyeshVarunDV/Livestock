'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (user.role === 'veterinarian') {
          router.push('/veterinarian/dashboard');
        } else if (user.role === 'tester') {
          router.push('/tester/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
      <div className="text-center animate-pulse">
        <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-gray-900 text-lg font-bold">Loading...</h2>
      </div>
    </div>
  );
}
