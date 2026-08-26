'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { 
  Shield, Globe, User, Mail, Lock, Eye, EyeOff, LogIn, CheckCircle2, Stethoscope, Home, ShieldCheck, ChevronDown
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'veterinarian') router.push('/veterinarian/dashboard');
      else if (user.role === 'tester') router.push('/tester/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(data.user, data.token);
      // Wait for useEffect to handle redirection
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#f4f5f7] p-3 sm:p-4 md:p-6 overflow-hidden">
      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[44%_56%] bg-white rounded-[24px] overflow-hidden shadow-2xl relative">
      
      {/* ================= LEFT PANEL ================= */}
      <div className="hidden lg:flex relative bg-[#003F2D] flex-col justify-between p-6 xl:p-10 text-white h-full overflow-hidden">
        
        {/* Real Farm Photograph Background */}
        <div 
          className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat"
          style={{ backgroundImage: "url('/farm_background.jpg')" }}
        ></div>
        
        {/* Dark Green Transparent Overlay */}
        <div className="absolute inset-0 z-0 bg-[#003F2D]/70 mix-blend-multiply"></div>
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#003F2D]/80 via-[#00452F]/60 to-[#003F2D]/90"></div>
        
        {/* Top Branding */}
        <div className="relative z-10 flex flex-col items-center mt-6 xl:mt-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 mb-4 backdrop-blur-md shadow-lg">
            <Shield size={28} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold tracking-tight leading-none mb-2">
            <span className="text-white">Livesto</span><span className="text-[#39A852]">Care</span>
          </h1>
          <p className="text-gray-300 text-sm xl:text-[15px] font-medium tracking-wide">
            Digital Farm Management & MRL Compliance
          </p>
          
          {/* Divider */}
          <div className="flex items-center justify-center gap-3 mt-5 opacity-70">
            <div className="h-px w-12 bg-[#39A852]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#39A852]"></div>
            <div className="h-px w-12 bg-[#39A852]"></div>
          </div>
        </div>
        
        {/* Feature Text Block */}
        <div className="relative z-10 flex flex-col w-full max-w-[420px] mx-auto mt-auto mb-10 xl:mb-16 text-left">
          {/* Small accent */}
          <div className="h-1 w-10 bg-[#39A852] rounded-full mb-6"></div>
          
          {/* Main heading */}
          <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight mb-4 drop-shadow-lg">
            <span className="text-white block">Smarter Livestock.</span>
            <span className="text-[#39A852] block">Safer Food.</span>
          </h2>
          
          {/* Paragraph */}
          <p className="text-white/80 text-[13px] xl:text-[14.5px] leading-relaxed drop-shadow-md mb-6 pr-4">
            LivestoCare brings livestock records, antimicrobial usage, withdrawal monitoring and MRL compliance into one connected management platform.
          </p>

          {/* Bottom supporting text */}
          <p className="text-[#a7f3d0] text-[12px] xl:text-[13px] font-medium drop-shadow-md">
            Built for responsible livestock management
          </p>
        </div>

        {/* Bottom Lock */}
        <div className="relative z-10 flex items-center gap-2 text-white/80 text-[12px] font-medium tracking-wide pb-2 drop-shadow-md">
          <Lock size={12} />
          <span>Secure • Reliable • Compliant</span>
        </div>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div className="w-full flex flex-col relative h-[100dvh] overflow-y-auto bg-[#F9FAFB] lg:bg-white">
        
        {/* Language Selector */}
        <div className="absolute top-3 right-4 xl:top-5 xl:right-6 z-20">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#D9DEE5] text-[#5B6472] text-[12px] font-medium hover:bg-gray-50 transition-colors bg-white">
            <Globe size={14} />
            English
            <ChevronDown size={14} className="text-gray-400" />
          </button>
        </div>

        {/* Main Login Form Container */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 xl:py-6 w-full max-w-[600px] mx-auto min-h-min">
          
          {/* Form Header */}
          <div className="w-full flex flex-col items-center text-center mb-4 mt-6 lg:mt-0">
            <div className="w-10 h-10 xl:w-12 xl:h-12 rounded-full border-[1.5px] border-[#005B3A] flex items-center justify-center bg-[#F0FDF4] mb-2 xl:mb-3">
              <User size={22} className="text-[#005B3A]" strokeWidth={1.5} />
            </div>
            <h2 className="text-[22px] xl:text-[26px] font-bold text-[#111827] tracking-tight mb-1">
              Sign in to <span className="text-[#005B3A]">LivestoCare</span>
            </h2>
            <p className="text-[#5B6472] text-[13px] xl:text-[14px]">
              Access your farm, livestock and compliance records.
            </p>
          </div>

          {error && (
            <div className="w-full bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] px-3 py-2 rounded-lg text-sm mb-3 flex items-center gap-2">
              <ShieldCheck size={16} />
              {error}
            </div>
          )}

          {/* Temporary Auto-fill Buttons for Testing */}
          <div className="w-full flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@livestocare.local');
                setPassword('Admin@12345');
              }}
              className="flex-1 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors border border-gray-300"
            >
              Fill Admin Info
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('vet@livestocare.local');
                setPassword('Vet@12345');
              }}
              className="flex-1 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors border border-gray-300"
            >
              Fill Vet Info
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('tester@livestocare.local');
                setPassword('Tester@12345');
              }}
              className="flex-1 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors border border-gray-300"
            >
              Fill Tester Info
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-3">

            {/* Email Field */}
            <div className="space-y-1">
              <label className="block text-[12px] font-semibold text-[#111827]">Email / User ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail size={16} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email or user ID"
                  className="block w-full pl-10 pr-4 py-2 xl:py-2.5 border border-[#D9DEE5] rounded-[8px] bg-white text-[#111827] text-[13px] xl:text-[14px] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005B3A]/20 focus:border-[#005B3A] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="block text-[12px] font-semibold text-[#111827]">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={16} className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-10 pr-10 py-2 xl:py-2.5 border border-[#D9DEE5] rounded-[8px] bg-white text-[#111827] text-[13px] xl:text-[14px] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005B3A]/20 focus:border-[#005B3A] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Options Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer w-3.5 h-3.5 rounded border-[#D9DEE5] text-[#005B3A] focus:ring-[#005B3A] cursor-pointer appearance-none checked:bg-[#005B3A] checked:border-[#005B3A] transition-colors"
                  />
                  <CheckCircle2 size={10} className="absolute text-white pointer-events-none opacity-0 peer-checked:opacity-100" />
                </div>
                <span className="text-[12px] font-medium text-[#5B6472] group-hover:text-[#111827] transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-[12px] font-semibold text-[#005B3A] hover:text-[#003F2D] transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 mt-1 py-2 xl:py-2.5 px-4 bg-[#006B3C] hover:bg-[#005B3A] text-white rounded-[8px] text-[13px] xl:text-[14px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006B3C] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <LogIn size={16} />
                </>
              )}
            </button>
          </form>

          {/* Google Login */}
          <div className="w-full mt-4">
            <div className="flex items-center gap-3 w-full mb-3">
              <div className="h-px bg-[#D9DEE5] flex-1"></div>
              <span className="text-[#5B6472] text-[11px] font-medium">or</span>
              <div className="h-px bg-[#D9DEE5] flex-1"></div>
            </div>
            
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2 xl:py-2.5 px-4 bg-white border border-[#D9DEE5] hover:bg-gray-50 text-[#111827] rounded-[8px] text-[13px] xl:text-[14px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>

          {/* Security Notice */}
          <div className="w-full mt-4 p-2.5 rounded-lg border border-[#D9DEE5] bg-white lg:bg-[#F9FAFB] flex gap-2">
            <ShieldCheck size={16} className="text-[#39A852] shrink-0 mt-0.5" />
            <p className="text-[#5B6472] text-[11px] leading-relaxed">
              Authorized users only. Activity may be recorded for compliance and audit purposes.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full mt-auto border-t border-[#D9DEE5] p-3 xl:p-4">
          <div className="w-full max-w-[600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[#5B6472] text-[11px] xl:text-[12px] font-medium">
              <Shield size={12} className="text-[#005B3A]" strokeWidth={2} />
              © 2026 LivestoCare
            </div>
            <div className="flex items-center gap-5 text-[#5B6472] text-[11px] xl:text-[12px] font-medium">
              <a href="#" className="hover:text-[#111827] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[#111827] transition-colors">Terms of Use</a>
              <a href="#" className="hover:text-[#111827] transition-colors">Support</a>
            </div>
          </div>
        </div>
        
      </div>
      </div>
    </div>
  );
}
