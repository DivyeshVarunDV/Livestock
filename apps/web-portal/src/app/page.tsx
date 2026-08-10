'use client';

import React from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Tractor, PawPrint, Syringe, AlertTriangle, ShieldCheck, FileText, 
  TrendingUp, TrendingDown, Activity, Plus, Pill, ClipboardList
} from 'lucide-react';

const amuData = [
  { month: 'Mar', amu: 450, treatments: 120 },
  { month: 'Apr', amu: 380, treatments: 150 },
  { month: 'May', amu: 360, treatments: 180 },
  { month: 'Jun', amu: 340, treatments: 210 },
  { month: 'Jul', amu: 312, treatments: 250 },
  { month: 'Aug', amu: 290, treatments: 310 },
];

const livestockData = [
  { name: 'Cattle', value: 1840, color: '#14532D' },
  { name: 'Buffalo', value: 1250, color: '#2563EB' },
  { name: 'Goat', value: 680, color: '#F59E0B' },
  { name: 'Sheep', value: 410, color: '#8B5CF6' },
  { name: 'Pig', value: 210, color: '#EF4444' },
  { name: 'Poultry', value: 172, color: '#06B6D4' },
];

const recentTreatments = [
  { id: '#TAG-0042', medicine: 'Oxytetracycline', vet: 'Dr. R. Kumar', date: '10 Aug', status: 'Active' },
  { id: '#TAG-0018', medicine: 'Amoxicillin', vet: 'Dr. A. Sharma', date: '09 Aug', status: 'Active' },
  { id: '#TAG-0091', medicine: 'Enrofloxacin', vet: 'Dr. V. Singh', date: '08 Aug', status: 'Active' },
  { id: '#TAG-0112', medicine: 'Ivermectin', vet: 'Dr. R. Kumar', date: '05 Aug', status: 'Active' },
  { id: '#TAG-0065', medicine: 'Meloxicam', vet: 'Dr. A. Sharma', date: '02 Aug', status: 'Completed' },
];

const withdrawalAlerts = [
  { id: '#TAG-0065', drug: 'Meloxicam', days: '2 Days', priority: 'High' },
  { id: '#TAG-0042', drug: 'Oxytetracycline', days: '7 Days', priority: 'High' },
  { id: '#TAG-0018', drug: 'Amoxicillin', days: '5 Days', priority: 'Medium' },
  { id: '#TAG-0091', drug: 'Enrofloxacin', days: '8 Days', priority: 'Medium' },
  { id: '#TAG-0134', drug: 'Tylosin', days: '10 Days', priority: 'Low' },
];

export default function Dashboard() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Dashboard Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor antimicrobial usage, livestock health, withdrawal periods and MRL compliance.</p>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Registered Farms', value: '128', icon: Tractor, trend: '+4.2%', up: true, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Registered Animals', value: '4,562', icon: PawPrint, trend: '+12.8%', up: true, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Treatments', value: '312', icon: Syringe, trend: '-3.5%', up: false, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Animals Under Withdrawal', value: '23', icon: AlertTriangle, trend: '+2 today', up: false, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'MRL Compliance', value: '95%', icon: ShieldCheck, trend: '+1.5%', up: true, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Veterinary Prescriptions', value: '256', icon: FileText, trend: '+18.4%', up: true, color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</span>
              <div className={`p-1.5 rounded-lg ${kpi.bg} ${kpi.color}`}>
                <kpi.icon size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${kpi.up ? 'text-green-600' : 'text-red-500'}`}>
                {kpi.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>{kpi.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Chart 1: Antimicrobial Usage Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm xl:col-span-1 lg:col-span-1">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-900">Antimicrobial Usage Trend</h2>
            <p className="text-xs text-gray-500">Last 6 Months</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={amuData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#15803D" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#15803D" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTreatments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '11px', color: '#4B5563' }} 
                />
                <Area type="monotone" dataKey="amu" name="AMU Units" stroke="#15803D" strokeWidth={3} fillOpacity={1} fill="url(#colorAmu)" activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} dot={{ r: 4, fill: '#15803D', strokeWidth: 2, stroke: '#fff' }} />
                <Area type="monotone" dataKey="treatments" name="Treatments Recorded" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorTreatments)" activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Livestock Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm xl:col-span-1 lg:col-span-1">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-gray-900">Livestock Distribution</h2>
            <p className="text-xs text-gray-500">Total: 4,562</p>
          </div>
          <div className="h-56 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={livestockData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {livestockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '11px', color: '#4B5563', paddingTop: '10px' }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center">
              <div className="text-lg font-bold text-gray-900 leading-none">4,562</div>
              <div className="text-[10px] text-gray-500 font-medium uppercase mt-1">Total</div>
            </div>
          </div>
        </div>

        {/* Chart 3: MRL Compliance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm xl:col-span-1 lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-900">MRL Compliance</h2>
            <p className="text-xs text-gray-500">Current Status</p>
          </div>
          <div className="flex flex-col items-center justify-center h-52">
            {/* Custom Circular Progress for Tailwind */}
            <div className="relative w-32 h-32 mb-6">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-gray-100 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                <circle className="text-green-600 progress-ring stroke-current" strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset="12.56" transform="rotate(-90 50 50)"></circle>
              </svg>
              <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">95%</span>
                <span className="text-[10px] uppercase font-bold text-green-600">Compliant</span>
              </div>
            </div>
            
            <div className="flex w-full justify-between px-6 text-xs font-medium text-gray-600 border-t border-gray-100 pt-4">
              <div className="flex flex-col items-center">
                <span className="text-gray-400 mb-1">Compliant</span>
                <span className="text-gray-900 font-bold">123</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-gray-400 mb-1">Non-Compliant</span>
                <span className="text-gray-900 font-bold">3</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-gray-400 mb-1">Pending</span>
                <span className="text-gray-900 font-bold">2</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Treatments */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Recent Treatments</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Animal ID</th>
                  <th className="px-4 py-2.5">Medicine</th>
                  <th className="px-4 py-2.5">Veterinarian</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentTreatments.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{t.id}</td>
                    <td className="px-4 py-3">{t.medicine}</td>
                    <td className="px-4 py-3">{t.vet}</td>
                    <td className="px-4 py-3">{t.date}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === 'Active' ? 'bg-[#DCFCE7] text-[#166534]' : 
                        t.status === 'Completed' ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 
                        t.status === 'Pending' ? 'bg-[#FFEDD5] text-[#C2410C]' : 
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Withdrawal Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Withdrawal Alerts</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Animal ID</th>
                  <th className="px-4 py-2.5">Drug</th>
                  <th className="px-4 py-2.5">Days Left</th>
                  <th className="px-4 py-2.5 text-right">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawalAlerts.map((w, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{w.id}</td>
                    <td className="px-4 py-3">{w.drug}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{w.days}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        w.priority === 'High' ? 'bg-[#FEE2E2] text-[#B91C1C]' :
                        w.priority === 'Medium' ? 'bg-[#FFEDD5] text-[#C2410C]' :
                        w.priority === 'Low' ? 'bg-[#DCFCE7] text-[#166534]' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {w.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 flex-1 content-start">
            <Link href="/farms/new" className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 hover:border-green-600 hover:bg-green-50 transition-all text-gray-700 hover:text-green-700 group text-center">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-green-100 mb-2 transition-colors">
                <Plus size={18} />
              </div>
              <span className="text-xs font-semibold">Add Farm</span>
            </Link>
            <Link href="/animals/new" className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 hover:border-green-600 hover:bg-green-50 transition-all text-gray-700 hover:text-green-700 group text-center">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-green-100 mb-2 transition-colors">
                <PawPrint size={18} />
              </div>
              <span className="text-xs font-semibold">Register Animal</span>
            </Link>
            <Link href="/treatments/new" className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 hover:border-green-600 hover:bg-green-50 transition-all text-gray-700 hover:text-green-700 group text-center">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-green-100 mb-2 transition-colors">
                <Pill size={18} />
              </div>
              <span className="text-xs font-semibold">Record Treatment</span>
            </Link>
            <Link href="/prescriptions/new" className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 hover:border-green-600 hover:bg-green-50 transition-all text-gray-700 hover:text-green-700 group text-center">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-green-100 mb-2 transition-colors">
                <ClipboardList size={18} />
              </div>
              <span className="text-xs font-semibold">Add Prescription</span>
            </Link>
          </div>
        </div>

      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">System Status</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-xs font-medium text-gray-600">All Systems Operational</span>
        </div>
      </div>

    </div>
  );
}
