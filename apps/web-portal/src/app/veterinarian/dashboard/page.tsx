'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  PawPrint, Syringe, AlertTriangle, FileText,
  Activity, Pill, ClipboardList, Package, Clock, Calendar,
  ArrowRight, CheckCircle2, AlertOctagon
} from 'lucide-react';

export default function VetDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [withdrawalAlerts, setWithdrawalAlerts] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<{ lowStock: any[]; expiringSoon: any[] }>({ lowStock: [], expiringSoon: [] });
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [animalsData, treatmentsData, alertsData, invAlerts, vaccsData, prescData] = await Promise.all([
          apiFetch('/animals').catch(() => []),
          apiFetch('/treatments').catch(() => []),
          apiFetch('/treatments/alerts').catch(() => []),
          apiFetch('/inventory/alerts').catch(() => ({ lowStock: [], expiringSoon: [] })),
          apiFetch('/vaccinations/upcoming').catch(() => []),
          apiFetch('/prescriptions').catch(() => []),
        ]);

        setAnimals(Array.isArray(animalsData) ? animalsData : []);
        setTreatments(Array.isArray(treatmentsData) ? treatmentsData : []);
        setWithdrawalAlerts(Array.isArray(alertsData) ? alertsData : []);
        setInventoryAlerts(invAlerts || { lowStock: [], expiringSoon: [] });
        setVaccinations(Array.isArray(vaccsData) ? vaccsData : []);
        setPrescriptions(Array.isArray(prescData) ? prescData : []);
      } catch (error) {
        console.error('Failed to load vet dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-gray-900 text-lg font-bold">LivestoCare Veterinary</h2>
          <p className="text-gray-500 text-sm mt-1">Loading Clinical Dashboard...</p>
        </div>
      </div>
    );
  }

  const activeTreatmentsCount = treatments.filter((t) => t.withdrawalCompletionDate && new Date(t.withdrawalCompletionDate) > new Date()).length;
  const underWithdrawalCount = withdrawalAlerts.length;
  const lowStockCount = inventoryAlerts?.lowStock?.length || 0;
  const pendingTransferCount = animals.reduce((count, animal) => count + (animal.ownershipTransfers?.filter((item: any) => item.status === 'PENDING').length || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="bg-gradient-to-r from-[#064E3B] to-[#047857] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-sm mb-2">
            <Activity size={14} className="animate-pulse text-emerald-300" />
            Veterinary Clinical Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back, {user?.name || 'Dr. Veterinarian'}</h1>
          <p className="text-emerald-100 text-sm mt-1 max-w-2xl">Monitor animal health, treatments, withdrawals, vaccination due dates, and transfer requests.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/treatments/new" className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#064E3B] hover:bg-emerald-50 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-105">
            <Syringe size={18} className="text-emerald-700" /> Record Treatment
          </Link>
          <Link href="/prescriptions/new" className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl font-semibold text-sm border border-emerald-600/50 transition-colors">
            <FileText size={18} /> New Prescription
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/veterinarian/animals" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all block group">
          <div className="flex items-start justify-between mb-3"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Animals Under Care</span><div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform"><PawPrint size={20} /></div></div>
          <div className="text-3xl font-extrabold text-gray-900">{animals.length}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">{animals.filter((a) => a.status === 'UNDER_TREATMENT').length} animals in treatment</div>
        </Link>

        <Link href="/veterinarian/treatments" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all block group">
          <div className="flex items-start justify-between mb-3"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Treatments</span><div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform"><Syringe size={20} /></div></div>
          <div className="text-3xl font-extrabold text-gray-900">{activeTreatmentsCount}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">{treatments.length} total treatment records</div>
        </Link>

        <Link href="/veterinarian/withdrawal" className="bg-white rounded-xl border border-amber-200 bg-amber-50/20 p-5 shadow-sm hover:border-amber-400 hover:shadow-md transition-all block group">
          <div className="flex items-start justify-between mb-3"><span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Withdrawal Locked</span><div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 group-hover:scale-110 transition-transform"><Clock size={20} /></div></div>
          <div className="text-3xl font-extrabold text-amber-900">{underWithdrawalCount}</div>
          <div className="text-xs text-amber-700 font-semibold mt-1 flex items-center gap-1"><AlertOctagon size={13} /> Active product restrictions</div>
        </Link>

        <Link href="/transfers" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all block group">
          <div className="flex items-start justify-between mb-3"><span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Transfers</span><div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform"><ClipboardList size={20} /></div></div>
          <div className="text-3xl font-extrabold text-gray-900">{pendingTransferCount}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Awaiting admin decision</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div><h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Live Animals in Withdrawal</h2></div>
            <Link href="/veterinarian/withdrawal" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">View All <ArrowRight size={13} /></Link>
          </div>
          <div className="divide-y divide-gray-100 flex-1">
            {withdrawalAlerts.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center"><CheckCircle2 size={40} className="text-emerald-500 mb-2" /><h3 className="text-sm font-bold text-gray-900">All Animals Cleared</h3><p className="text-xs text-gray-500 mt-1 max-w-sm">No active withdrawal periods at the moment.</p></div>
            ) : (
              withdrawalAlerts.slice(0, 5).map((a, i) => {
                const treatment = a.treatments?.[0];
                const compDate = treatment?.withdrawalCompletionDate ? new Date(treatment.withdrawalCompletionDate) : new Date();
                const diffMs = compDate.getTime() - new Date().getTime();
                const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                const isUrgent = daysLeft > 3;
                return (
                  <div key={i} className="p-4 hover:bg-gray-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}><AlertTriangle size={18} /></div>
                      <div>
                        <div className="flex items-center gap-2"><Link href={`/animals/${a.id}`} className="font-bold text-sm text-gray-900 hover:text-emerald-700 hover:underline">{a.tagNumber} ({a.name})</Link></div>
                        <div className="text-xs text-gray-500 mt-0.5">Medicine: <span className="font-semibold text-gray-800">{treatment?.drugName || 'Unknown'}</span> • Farm: {a.farm?.name || 'Local Farm'}</div>
                      </div>
                    </div>
                    <div className="text-right"><div className="text-xs font-bold text-gray-900">{daysLeft > 0 ? `${daysLeft} days remaining` : 'Clearing Today'}</div><div className="text-[10px] text-gray-400">Clears {compDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div></div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Veterinary Tools</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/treatments/new" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-center group"><div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform"><Syringe size={16} /></div><span className="text-xs font-bold text-gray-800">Record Treatment</span></Link>
              <Link href="/prescriptions/new" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-center group"><div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform"><FileText size={16} /></div><span className="text-xs font-bold text-gray-800">New Prescription</span></Link>
              <Link href="/veterinarian/inventory" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-center group"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform"><Package size={16} /></div><span className="text-xs font-bold text-gray-800">Medicine Pharmacy</span></Link>
              <Link href="/veterinarian/drug-reference" className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-center group"><div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform"><Pill size={16} /></div><span className="text-xs font-bold text-gray-800">Drug Reference</span></Link>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Package size={14} className="text-emerald-700" /> Pharmacy Medicine Alerts</h3><Link href="/veterinarian/inventory" className="text-xs font-bold text-emerald-700 hover:underline">Manage</Link></div>
            {inventoryAlerts.lowStock && inventoryAlerts.lowStock.length > 0 ? (
              <div className="space-y-2.5">{inventoryAlerts.lowStock.slice(0, 3).map((item, idx) => <div key={idx} className="p-2.5 rounded-lg bg-red-50/60 border border-red-100 flex items-center justify-between text-xs"><div><div className="font-bold text-gray-900">{item.medicineName}</div><div className="text-red-700 font-semibold mt-0.5">Stock: {item.stock} / min {item.minimumStock}</div></div><Link href="/veterinarian/inventory" className="px-2 py-1 bg-white border border-red-200 text-red-700 rounded font-bold text-[10px] hover:bg-red-50">Restock</Link></div>)}</div>
            ) : (
              <div className="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded-lg">No low stock alerts. All medicine supplies are adequate.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50"><h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recent Clinical Treatments</h2><Link href="/veterinarian/treatments" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">All Treatments <ArrowRight size={13} /></Link></div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-400 uppercase font-semibold text-[10px] border-b border-gray-100"><tr><th className="px-4 py-2.5">Animal</th><th className="px-4 py-2.5">Medicine</th><th className="px-4 py-2.5">Dosage</th><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Withdrawal</th><th className="px-4 py-2.5 text-right">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {treatments.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No recent treatments recorded.</td></tr> : treatments.slice(0, 6).map((t, i) => {
                  const compDate = t.withdrawalCompletionDate ? new Date(t.withdrawalCompletionDate) : null;
                  const isActive = compDate && compDate > new Date();
                  return <tr key={i} className="hover:bg-gray-50/50 transition-colors"><td className="px-4 py-3 font-bold text-gray-900"><Link href={`/animals/${t.animalId}`} className="hover:text-emerald-700 hover:underline">{t.animal?.tagNumber || t.animalId?.substring(0, 8)}</Link></td><td className="px-4 py-3 font-semibold text-gray-800">{t.drugName || t.medicine}</td><td className="px-4 py-3 text-gray-600">{t.dosage}</td><td className="px-4 py-3 text-gray-500">{t.administrationDate ? new Date(t.administrationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'}</td><td className="px-4 py-3 text-gray-600">{t.withdrawalPeriod ? `${t.withdrawalPeriod} days` : 'None'}</td><td className="px-4 py-3 text-right"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{isActive ? 'In Withdrawal' : 'Cleared'}</span></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50"><h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={15} className="text-purple-600" /> Vaccinations Due</h2><Link href="/veterinarian/animals" className="text-xs font-bold text-emerald-700 hover:underline">View All</Link></div>
          <div className="divide-y divide-gray-100 flex-1">
            {vaccinations.length === 0 ? <div className="p-6 text-center text-xs text-gray-400">No upcoming vaccinations scheduled.</div> : vaccinations.slice(0, 5).map((v, i) => <div key={i} className="p-3.5 hover:bg-gray-50/60 transition-colors flex items-center justify-between text-xs"><div><div className="font-bold text-gray-900">{v.animal?.name || v.animal?.tagNumber || 'Animal'}</div><div className="text-gray-500 text-[11px] mt-0.5">{v.vaccineName}</div></div><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[11px]">{v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Soon'}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
