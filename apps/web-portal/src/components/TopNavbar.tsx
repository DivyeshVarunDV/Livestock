'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, PawPrint, Tractor, Syringe, Clock, BarChart3,
  Bell, LogOut, User, Settings, Users, ClipboardList, Menu, X, ChevronDown,
  Shield, Package, Pill, FileText, FlaskConical, Droplets, ShieldAlert, Search
} from 'lucide-react';

export default function TopNavbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin';
  const isVet = user?.role === 'veterinarian';
  const isTester = user?.role === 'tester';

  const homePath = isAdmin
    ? '/admin/dashboard'
    : isVet
      ? '/veterinarian/dashboard'
      : isTester
        ? '/tester/dashboard'
        : '/dashboard';

  const vetNavItems = [
    { name: 'Dashboard', href: '/veterinarian/dashboard', icon: LayoutDashboard },
    { name: 'Animals', href: '/veterinarian/animals', icon: PawPrint },
    { name: 'Treatments', href: '/veterinarian/treatments', icon: Syringe },
    { name: 'Withdrawal Timers', href: '/veterinarian/withdrawal', icon: Clock },
    { name: 'Pharmacy Inventory', href: '/veterinarian/inventory', icon: Package },
    { name: 'Drug Reference', href: '/veterinarian/drug-reference', icon: Pill },
  ];

  const testerNavItems = [
    { name: 'Dashboard', href: '/tester/dashboard', icon: LayoutDashboard },
    { name: 'Farms', href: '/farms', icon: Tractor },
    { name: 'Collections', href: '/milk-collection', icon: Droplets },
    { name: 'Testing', href: '/milk-testing', icon: FlaskConical },
    { name: 'Violations', href: '/violations', icon: ShieldAlert },
    { name: 'Animals', href: '/animals', icon: PawPrint },
    { name: 'Search', href: '/reports', icon: Search },
  ];

  const adminNavItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Farms', href: '/farms', icon: Tractor },
    { name: 'Animals', href: '/animals', icon: PawPrint },
    { name: 'Treatments', href: '/treatments', icon: Syringe },
    { name: 'Withdrawal', href: '/withdrawal', icon: Clock },
    { name: 'MRL Compliance', href: '/mrl', icon: Shield },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
  ];

  const mainNavItems = isVet ? vetNavItems : isTester ? testerNavItems : adminNavItems;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    if (
      href === homePath ||
      href === '/dashboard' ||
      href === '/admin/dashboard' ||
      href === '/veterinarian/dashboard' ||
      href === '/tester/dashboard'
    ) {
      return pathname === '/dashboard' || pathname === '/admin/dashboard' || pathname === '/veterinarian/dashboard' || pathname === '/tester/dashboard';
    }
    return pathname.startsWith(href);
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#064E3B] to-[#065F46] shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-[56px]">
            <div className="flex items-center gap-6 lg:gap-8">
              <Link href={homePath} className="flex items-center gap-2.5 shrink-0 group">
                <div className="w-8 h-8 bg-white/15 backdrop-blur-sm rounded-lg flex items-center justify-center group-hover:bg-white/25 transition-colors">
                  <Shield size={18} className="text-emerald-300" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-[16px] font-bold text-white tracking-tight">Livesto<span className="text-[#39A852]">Care</span></span>
                  <span className="block text-[9px] text-emerald-300/80 font-medium -mt-0.5 tracking-wider uppercase">Farm &amp; MRL Compliance</span>
                </div>
              </Link>

              <nav className="hidden lg:flex items-center gap-0.5">
                {mainNavItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? 'text-white bg-white/20 shadow-sm'
                        : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <item.icon size={15} className={isActive(item.href) ? 'text-emerald-300' : ''} />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                href="/notifications"
                className="p-2 rounded-lg hover:bg-white/10 transition-colors relative text-emerald-100/80 hover:text-white"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full ring-2 ring-[#064E3B] animate-pulse" />
              </Link>

              <div className="h-6 w-px bg-white/15 mx-1.5 hidden sm:block" />

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center text-emerald-200 font-bold text-xs">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-[13px] font-semibold text-white leading-tight">{user?.name || 'User'}</div>
                    <div className="text-[10px] text-emerald-300/70 capitalize leading-tight font-medium">{user?.role || 'user'}</div>
                  </div>
                  <ChevronDown size={13} className={`text-emerald-300/60 hidden md:block transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-fade-in-up">
                    <div className="px-3.5 py-2.5 border-b border-gray-100">
                      <div className="text-sm font-semibold text-gray-900">{user?.name}</div>
                      <div className="text-xs text-gray-500">{user?.email || `${user?.role}@agrishield.io`}</div>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User size={15} className="text-gray-400" />
                        My Profile
                      </Link>
                    </div>

                    {isAdmin && (
                      <>
                        <div className="h-px bg-gray-100" />
                        <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Administration</div>
                        <Link href="/users" className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Users size={15} className="text-gray-400" />
                          User Management
                        </Link>
                        <Link href="/audit" className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <ClipboardList size={15} className="text-gray-400" />
                          Audit Logs
                        </Link>
                        <Link href="/settings" className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Settings size={15} className="text-gray-400" />
                          System Settings
                        </Link>
                      </>
                    )}

                    <div className="h-px bg-gray-100 mt-1" />
                    <div className="py-1">
                      <button
                        onClick={() => { setProfileOpen(false); logout(); }}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                      >
                        <LogOut size={15} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-emerald-100/80 hover:bg-white/10 hover:text-white lg:hidden ml-0.5 transition-colors"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[#053D2E] animate-fade-in">
            <nav className="px-4 py-3 space-y-0.5">
              {mainNavItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-white bg-white/15'
                      : 'text-emerald-100/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <item.icon size={18} className={isActive(item.href) ? 'text-emerald-300' : ''} />
                  {item.name}
                </Link>
              ))}

              {isAdmin && (
                <>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="px-3 py-1.5 text-[10px] font-bold text-emerald-300/50 uppercase tracking-wider">Administration</div>
                  <Link href="/users" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-emerald-100/70 hover:text-white hover:bg-white/10 transition-colors">
                    <Users size={18} />
                    Users
                  </Link>
                  <Link href="/audit" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-emerald-100/70 hover:text-white hover:bg-white/10 transition-colors">
                    <ClipboardList size={18} />
                    Audit Logs
                  </Link>
                  <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-emerald-100/70 hover:text-white hover:bg-white/10 transition-colors">
                    <Settings size={18} />
                    Settings
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
