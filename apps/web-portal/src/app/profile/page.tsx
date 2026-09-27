'use client';

import React, { useEffect, useState } from 'react';
import { User, Mail, Shield, Key, Phone, Building2, Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

const ROLE_LABELS: Record<string, string> = {
  admin: 'System Administrator',
  veterinarian: 'Veterinary Officer',
  tester: 'Testing Officer',
  farmer: 'Farmer',
};

const POLICY = [
  { test: (p: string) => p.length >= 10, label: 'At least 10 characters' },
  { test: (p: string) => /[a-z]/.test(p), label: 'A lowercase letter' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'An uppercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'A digit' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'A special character' },
];

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-700 min-h-[46px]">
        <Icon size={18} className="text-gray-400 shrink-0" />
        <span className="truncate">{value || '—'}</span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, login, logout } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [showChange, setShowChange] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    apiFetch('/auth/me')
      .then(setProfile)
      .catch((e: any) => setError(e?.message || 'Unable to load your profile.'));
    // Deep link from sign-in when a password change is mandatory.
    if (typeof window !== 'undefined' && window.location.search.includes('changePassword=1')) setShowChange(true);
  }, []);

  const mustChange = Boolean(profile?.mustChangePassword ?? user?.mustChangePassword);
  const policyOk = POLICY.every((r) => r.test(next));
  const canSubmit = current.length > 0 && policyOk && next === confirmPw && !saving;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setMessage(null);
    try {
      const session = await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      // Other sessions were revoked; continue with the fresh token.
      login(session.user, session.token);
      setProfile((p: any) => (p ? { ...p, mustChangePassword: false, passwordChangedAt: new Date().toISOString() } : p));
      setCurrent('');
      setNext('');
      setConfirmPw('');
      setShowChange(false);
      setMessage({ kind: 'ok', text: 'Password changed. You have been signed out on all other devices.' });
    } catch (err: any) {
      setMessage({ kind: 'error', text: err?.message || 'Password change failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOutEverywhere = async () => {
    if (!window.confirm('Sign out of LivestoCare on every device, including this one?')) return;
    try {
      await apiFetch('/auth/logout-all', { method: 'POST' });
    } finally {
      logout();
    }
  };

  const name: string = profile?.name || user?.name || '';
  const initials = name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const role = String(profile?.role || user?.role || '').toLowerCase();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1100px] mx-auto">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Your official account details and security settings.</p>
      </div>

      {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">{error}</div>}
      {mustChange && (
        <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-3 text-sm">
          Your password was set by an administrator. Please choose a new password now.
        </div>
      )}
      {message && (
        <div role="status" className={`rounded-lg px-4 py-3 text-sm border ${message.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 flex items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-2xl shrink-0">{initials}</div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 truncate">{name || '—'}</h2>
            <p className="text-gray-500 flex items-center gap-2 mt-1">
              <Shield size={16} className="text-green-600" />
              {ROLE_LABELS[role] || role || '—'}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field icon={User} label="Full Name" value={name} />
            <Field icon={Mail} label="Email Address" value={profile?.email || user?.email} />
            <Field icon={Phone} label="Phone" value={profile?.phone} />
            <Field icon={Building2} label="Department / Office" value={profile?.department} />
            <Field icon={Clock} label="Last Sign-in" value={profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : null} />
            <Field icon={Key} label="Password Last Changed" value={profile?.passwordChangedAt ? new Date(profile.passwordChangedAt).toLocaleString() : 'Not recorded'} />
          </div>
        </div>

        <div className="border-t border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Access Rights</h3>
          <p className="text-sm text-gray-500 mb-3">Granted by your role. Contact an administrator if you need different access.</p>
          <div className="flex flex-wrap gap-2">
            {(profile?.permissions || user?.permissions || []).map((p: string) => (
              <span key={p} className="text-xs font-mono bg-gray-100 border border-gray-200 text-gray-700 rounded px-2 py-1">{p}</span>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Security</h3>
          {!showChange ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowChange(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Key size={18} />
                Change Password
              </button>
              <button
                type="button"
                onClick={handleSignOutEverywhere}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 font-medium rounded-md hover:bg-red-50 transition-colors shadow-sm"
              >
                <LogOut size={18} />
                Sign Out Everywhere
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div className="md:col-span-2">
                <label htmlFor="pw-current" className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
                <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" required />
              </div>
              <div>
                <label htmlFor="pw-new" className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" required />
              </div>
              <div>
                <label htmlFor="pw-confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                <input id="pw-confirm" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" required />
                {confirmPw && next !== confirmPw && <p className="text-xs text-red-600 mt-1">Passwords do not match.</p>}
              </div>
              <ul className="md:col-span-2 text-xs space-y-1">
                {POLICY.map((r) => (
                  <li key={r.label} className={r.test(next) ? 'text-emerald-700' : 'text-gray-500'}>
                    {r.test(next) ? '✓' : '•'} {r.label}
                  </li>
                ))}
              </ul>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" disabled={!canSubmit} className="px-4 py-2 bg-green-700 text-white rounded-md font-medium disabled:opacity-50">
                  {saving ? 'Saving…' : 'Update Password'}
                </button>
                <button type="button" onClick={() => { setShowChange(false); setMessage(null); }} className="px-4 py-2 border border-gray-300 rounded-md">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
