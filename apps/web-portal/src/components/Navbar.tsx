'use client';
import Link from 'next/link';
import { Menu, Search, Bell, MessageSquare, Download, Calendar, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar({ toggleSidebar }: { toggleSidebar: () => void }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-white px-4 border-b border-gray-200 shadow-sm sm:px-6">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={toggleSidebar}
          className="p-2 text-gray-500 rounded-md lg:hidden hover:bg-gray-100 focus:outline-none"
        >
          <Menu size={20} />
        </button>
        
        <div className="hidden sm:flex relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input 
            type="text" 
            className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-700 focus:border-green-700 sm:text-sm transition-colors" 
            placeholder="Search farms, animals, treatments, prescriptions..." 
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Date Selector (Simplified) */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
          <Calendar size={16} className="text-gray-400" />
          <span>Aug 10, 2026</span>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 sm:gap-2 text-gray-500">
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors relative">
            <MessageSquare size={18} />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>

        <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1"></div>

        {/* Export Report Button */}
        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors">
          <Download size={16} />
          Export Report
        </button>

        {/* Admin Profile with Dropdown */}
        <div className="relative ml-2">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 focus:outline-none hover:bg-gray-50 p-1.5 rounded-md transition-colors"
          >
            <div className="hidden md:block text-right">
              <div className="text-sm font-semibold text-gray-800">{user?.name || (user?.role === 'veterinarian' ? 'LivestoCare Veterinarian' : 'Admin User')}</div>
              <div className="text-[11px] font-medium text-gray-500">{user?.role === 'veterinarian' ? 'Veterinarian' : 'Super Admin'}</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-700 font-bold text-xs shadow-sm overflow-hidden">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : (user?.role === 'veterinarian' ? 'LV' : 'AU')}
            </div>
          </button>
          
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50">
              <Link 
                href="/profile"
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                onClick={() => setIsProfileOpen(false)}
              >
                <User size={16} />
                My Profile
              </Link>
              <div className="h-px bg-gray-100 my-1"></div>
              <button 
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                onClick={() => {
                  setIsProfileOpen(false);
                  logout();
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
