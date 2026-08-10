'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('FARMER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, name, role }),
        });
        login(data.user, data.token);
      } else {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        login(data.user, data.token);
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 50%, #f0fdf4 0%, #f9fafb 100%)',
      padding: '24px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)',
        border: '1px solid #d1fae5',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--accent-primary-light)',
            color: 'var(--accent-primary)',
            fontSize: '1.5rem',
            marginBottom: '16px',
          }}>
            <i className="fa fa-leaf"></i>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Welcome to LivestoCare</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {isRegister ? 'Create your management account' : 'Sign in to access your dashboard'}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <i className="fa fa-exclamation-circle"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Account Type (Role)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.9rem',
                  background: '#fff',
                  outline: 'none',
                }}
              >
                <option value="FARMER">Farmer / Herd Manager</option>
                <option value="VETERINARIAN">Veterinarian</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '6px',
              background: 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
              transition: 'background 0.2s',
            }}
          >
            {loading ? (
              <i className="fa fa-circle-o-notch fa-spin"></i>
            ) : (
              isRegister ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setIsRegister(false); setError(''); }}
                style={{ color: 'var(--accent-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account yet?{' '}
              <button
                onClick={() => { setIsRegister(true); setError(''); }}
                style={{ color: 'var(--accent-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
