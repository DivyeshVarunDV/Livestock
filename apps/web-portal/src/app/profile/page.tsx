import React from 'react';
import { User, Mail, Shield, Key } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account details and security settings.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-3xl">
              AU
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Admin User</h2>
              <p className="text-gray-500 flex items-center gap-2 mt-1">
                <Shield size={16} className="text-green-600" />
                Super Admin
              </p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-700">
                <User size={18} className="text-gray-400" />
                Admin User
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-700">
                <Mail size={18} className="text-gray-400" />
                admin@livestocare.com
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Security</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm">
            <Key size={18} />
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}
