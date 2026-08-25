'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import {
  PawPrint, Tractor, Syringe, AlertTriangle, Calendar,
  Clock, Activity, CheckCircle2, XCircle, ArrowRight,
  TrendingUp, ShieldCheck, Pill, ChevronRight, Eye
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, c, v, a] = await Promise.all([
          apiFetch('/reports/dashboard').catch(() => null),
          apiFetch('/reports/compliance').catch(() => null),
          apiFetch('/vaccinations/upcoming').catch(() => []),
          apiFetch('/treatments/alerts').catch(() => [])
        ]);
        if (d) setData(d);
        if (c) setCompliance(c);
        if (Array.isArray(v)) setVaccinations(v.slice(0, 5));
        if (Array.isArray(a)) setAlerts(a.slice(0, 5));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const s = data?.stats || { totalAnimals: 0, totalFarms: 0, underTreatment: 0, activeMrlAlerts: 0, vaccinationsDue: 0, veterinaryPrescriptions: 0 };
  const total = compliance?.total || 1;
  const clearedPct = Math.round(((compliance?.cleared || 0) / total) * 100);
  const clearingSoonPct = Math.round(((compliance?.clearingSoon || 0) / total) * 100);
  const doNotSellPct = Math.round(((compliance?.doNotSell || 0) / total) * 100);
  const chartData = (data?.monthlyTreatments || []).map((m: any) => ({ name: m.month?.substring(5) || '', count: m.count || 0 }));
  const activities = data?.recentActivities?.slice(0, 6) || [];

  const kpis = [
    { label: 'Total Animals', value: s.totalAnimals, icon: PawPrint, color: 'from-blue-500 to-blue-600', iconBg: 'bg-blue-400/20', link: '/livestock' },
    { label: 'Registered Farms', value: s.totalFarms, icon: Tractor, color: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-400/20', link: '/farms' },
    { label: 'Under Treatment', value: s.underTreatment, icon: Syringe, color: 'from-indigo-500 to-indigo-600', iconBg: 'bg-indigo-400/20', link: '/health' },
    { label: 'MRL Alerts', value: s.activeMrlAlerts, icon: AlertTriangle, color: 'from-amber-500 to-amber-600', iconBg: 'bg-amber-400/20', link: '/compliance' },
    { label: 'Vaccinations Due', value: s.vaccinationsDue, icon: Calendar, color: 'from-purple-500 to-purple-600', iconBg: 'bg-purple-400/20', link: '/health' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of farm operations and compliance status</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
          <Activity size={13} className="text-green-600" />
          <span className="font-medium">Live</span>
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <Link
            key={i}
            href={kpi.link}
            className="group relative overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${kpi.color}`} />
            <div className="p-4 pt-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${kpi.iconBg}`}>
                  <kpi.icon size={20} className={`bg-gradient-to-r ${kpi.color} bg-clip-text`} style={{ color: `var(--tw-gradient-from)` }} />
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-1 font-medium">{kpi.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Compliance + Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Compliance Overview - 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-green-600" />
              <h2 className="text-sm font-semibold text-gray-900">Compliance Overview</h2>
            </div>
            <Link href="/compliance" className="text-xs text-green-700 font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-5 space-y-5">
            {/* Big compliance ring */}
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" stroke="#E5E7EB" strokeWidth="6" fill="none" />
                  <circle cx="36" cy="36" r="30" stroke="#10B981" strokeWidth="6" fill="none"
                    strokeDasharray={`${clearedPct * 1.884} 188.4`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{clearedPct}%</span>
                </div>
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Cleared</span>
                  <span className="font-semibold text-gray-900">{compliance?.cleared || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Clearing Soon</span>
                  <span className="font-semibold text-gray-900">{compliance?.clearingSoon || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Do Not Sell</span>
                  <span className="font-semibold text-gray-900">{compliance?.doNotSell || 0}</span>
                </div>
              </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-3">
              {[
                { label: 'Cleared', pct: clearedPct, color: 'bg-emerald-500' },
                { label: 'Clearing Soon', pct: clearingSoonPct, color: 'bg-amber-500' },
                { label: 'Do Not Sell', pct: doNotSellPct, color: 'bg-red-500' },
              ].map((b) => (
                <div key={b.label}>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={`${b.color} h-2 rounded-full transition-all duration-1000`} style={{ width: `${Math.max(b.pct, 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Treatment Trend Chart - 3 cols */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" />
              <h2 className="text-sm font-semibold text-gray-900">Treatment Trend</h2>
            </div>
            <Link href="/health" className="text-xs text-green-700 font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-5">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="treatmentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2.5} fill="url(#treatmentGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">No treatment data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Actions + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              Upcoming Actions
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {vaccinations.length === 0 && alerts.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No upcoming actions</div>
            )}
            {vaccinations.map((v: any, i: number) => (
              <div key={`v-${i}`} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                <div className="p-1.5 rounded-lg bg-purple-50">
                  <Calendar size={14} className="text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{v.animal?.name || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{v.vaccineName} vaccination due</div>
                </div>
                <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A'}
                </span>
              </div>
            ))}
            {alerts.map((a: any, i: number) => {
              const treatment = a.treatments?.[0];
              const daysLeft = treatment ? Math.ceil((new Date(treatment.withdrawalCompletionDate).getTime() - Date.now()) / 86400000) : 0;
              return (
                <div key={`a-${i}`} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className="p-1.5 rounded-lg bg-amber-50">
                    <AlertTriangle size={14} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{a.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{treatment?.drugName || 'Drug'} — withdrawal ending</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${daysLeft <= 3 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {daysLeft > 0 ? `${daysLeft}d left` : 'Cleared'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Activity size={16} className="text-green-600" />
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {activities.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No recent activity</div>
            )}
            {activities.map((act: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                <div className="mt-0.5 p-1.5 rounded-lg bg-green-50">
                  <Activity size={13} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 leading-snug">
                    <span className="font-medium">{act.type || 'Activity'}</span>
                    {act.details && <span className="text-gray-500"> — {act.details}</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {act.date ? new Date(act.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Register Animal', href: '/animals/new', icon: PawPrint, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
          { label: 'Record Treatment', href: '/treatments/new', icon: Syringe, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
          { label: 'New Prescription', href: '/prescriptions/new', icon: Pill, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
          { label: 'View Compliance', href: '/compliance', icon: ShieldCheck, color: 'text-green-600 bg-green-50 hover:bg-green-100' },
        ].map((q) => (
          <Link key={q.label} href={q.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${q.color} hover:shadow-sm`}>
            <q.icon size={18} />
            {q.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
