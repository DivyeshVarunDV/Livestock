'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Tractor, 
  PawPrint, 
  Syringe, 
  FileText, 
  Clock, 
  ShieldCheck, 
  FlaskConical, 
  BarChart3, 
  Users, 
  Settings,
  Shield,
  Activity,
  Bell,
  User as UserIcon,
  Stethoscope
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const [attentionData, setAttentionData] = useState({
    restrictedAnimals: 0,
    withdrawalThisWeek: 0,
    mrlTestsPending: 0,
    treatmentsThisWeek: 0,
    clearedAnimals: 0
  });


  useEffect(() => {
    const fetchAttentionData = async () => {
      try {
        const [compliance, treatments, alerts] = await Promise.all([
          apiFetch('/reports/compliance'),
          apiFetch('/treatments'),
          apiFetch('/treatments/alerts')
        ]);

        const withdrawalThisWeek = (alerts || []).filter((a: any) => {
          if (!a.treatments?.[0]) return false;
          const diff = new Date(a.treatments[0].withdrawalCompletionDate).getTime() - new Date().getTime();
          const daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
          return daysLeft >= 0 && daysLeft <= 7;
        }).length;

        const treatmentsThisWeek = (treatments || []).filter((t: any) => {
          if (!t.administrationDate) return false;
          const diff = new Date().getTime() - new Date(t.administrationDate).getTime();
          const daysAgo = Math.ceil(diff / (1000 * 3600 * 24));
          return daysAgo >= 0 && daysAgo <= 7;
        }).length;

        setAttentionData({
          restrictedAnimals: compliance.doNotSell || 0,
          withdrawalThisWeek,
          mrlTestsPending: compliance.clearingSoon || 0,
          treatmentsThisWeek,
          clearedAnimals: compliance.cleared || 0
        });
      } catch (error) {
        console.error('Failed to load attention data:', error);
      }
    };
    fetchAttentionData();
  }, []);


  const adminNavItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Farms', href: '/farms', icon: Tractor },
    { name: 'Animals', href: '/animals', icon: PawPrint },
    { name: 'Treatments', href: '/treatments', icon: Syringe },
    { name: 'Prescriptions', href: '/prescriptions', icon: FileText },
    { name: 'Withdrawal Monitoring', href: '/withdrawal', icon: Clock },
    { name: 'MRL Compliance', href: '/mrl', icon: ShieldCheck },
    { name: 'Laboratory', href: '/lab', icon: FlaskConical },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const vetNavItems = [
    { name: 'Dashboard', href: '/veterinarian/dashboard', icon: LayoutDashboard },
    { name: 'My Animals', href: '/veterinarian/animals', icon: PawPrint },
    { name: 'Treatments', href: '/veterinarian/treatments', icon: Syringe },
    { name: 'Prescriptions', href: '/veterinarian/prescriptions', icon: FileText },
    { name: 'Withdrawal Monitoring', href: '/veterinarian/withdrawal', icon: Clock },
    { name: 'MRL & Compliance', href: '/veterinarian/mrl', icon: ShieldCheck },
    { name: 'Laboratory', href: '/veterinarian/laboratory', icon: FlaskConical },
    { name: 'AMU Monitoring', href: '/veterinarian/amu', icon: Activity },
    { name: 'Health Records', href: '/veterinarian/health-records', icon: Stethoscope },
    { name: 'Alerts', href: '/veterinarian/alerts', icon: Bell },
    { name: 'Reports', href: '/veterinarian/reports', icon: BarChart3 },
    { name: 'My Profile', href: '/veterinarian/profile', icon: UserIcon },
  ];

  const navItems = user?.role === 'veterinarian' ? vetNavItems : adminNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[240px] bg-[#064E3B] text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-emerald-400">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-[15px] font-bold leading-tight">LivestoCare</h1>
            <p className="text-[10px] text-emerald-100 font-medium leading-tight mt-0.5">Digital Farm Management &amp;<br/>MRL Compliance</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive 
                    ? 'bg-[#166534] text-white' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <item.icon size={18} className={isActive ? 'text-emerald-400' : 'text-gray-400'} />
                {item.name}
              </Link>
            );
          })}

          <div className="mt-8 pt-6 border-t border-white/10 px-1 pb-4">
            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider mb-3">Today's Attention</h3>
            <div className="space-y-2">
              
              <div className="flex items-start gap-2.5 p-1.5 -mx-1.5 rounded hover:bg-white/5 transition-colors group">
                <div className="flex flex-col transition-all">
                  <span className="text-[12px] font-medium text-gray-200 group-hover:text-white transition-colors flex items-center">
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#EF4444] text-white text-[9px] font-bold mr-1.5 shrink-0">{attentionData.restrictedAnimals}</span>
                    Animals
                  </span>
                  <span className="text-[10px] text-emerald-200/60 leading-tight mt-0.5 ml-[24px]">Cannot enter food chain</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-1.5 -mx-1.5 rounded hover:bg-white/5 transition-colors group">
                <div className="flex flex-col transition-all">
                  <span className="text-[12px] font-medium text-gray-200 group-hover:text-white transition-colors flex items-center">
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#F59E0B] text-white text-[9px] font-bold mr-1.5 shrink-0">{attentionData.withdrawalThisWeek}</span>
                    Withdrawal
                  </span>
                  <span className="text-[10px] text-emerald-200/60 leading-tight mt-0.5 ml-[24px]">Periods ending this week</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-1.5 -mx-1.5 rounded hover:bg-white/5 transition-colors group">
                <div className="flex flex-col transition-all">
                  <span className="text-[12px] font-medium text-gray-200 group-hover:text-white transition-colors flex items-center">
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#2563EB] text-white text-[9px] font-bold mr-1.5 shrink-0">{attentionData.mrlTestsPending}</span>
                    MRL Tests
                  </span>
                  <span className="text-[10px] text-emerald-200/60 leading-tight mt-0.5 ml-[24px]">Awaiting results</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-1.5 -mx-1.5 rounded hover:bg-white/5 transition-colors group">
                <div className="flex flex-col transition-all">
                  <span className="text-[12px] font-medium text-gray-200 group-hover:text-white transition-colors flex items-center">
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#16A34A] text-white text-[9px] font-bold mr-1.5 shrink-0">{attentionData.treatmentsThisWeek}</span>
                    Treatments
                  </span>
                  <span className="text-[10px] text-emerald-200/60 leading-tight mt-0.5 ml-[24px]">Recorded this week</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-1.5 -mx-1.5 rounded hover:bg-white/5 transition-colors group">
                <div className="flex flex-col transition-all">
                  <span className="text-[12px] font-medium text-gray-200 group-hover:text-white transition-colors flex items-center">
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#22C55E] text-white text-[9px] font-bold mr-1.5 shrink-0">{attentionData.clearedAnimals}</span>
                    Cleared Animals
                  </span>
                  <span className="text-[10px] text-emerald-200/60 leading-tight mt-0.5 ml-[24px]">Currently cleared</span>
                </div>
              </div>

            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}
