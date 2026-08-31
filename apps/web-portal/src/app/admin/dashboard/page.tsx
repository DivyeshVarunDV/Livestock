'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { Tractor, PawPrint, Syringe, AlertTriangle, Plus, Pill, ClipboardList } from 'lucide-react';
import { calculateOverallWithdrawal } from '@/lib/withdrawalEngine';
import { detectAMUAnomalies, AMUAnomaly } from '@/lib/amuEngine';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: { totalFarms: 0, totalAnimals: 0, underTreatment: 0, animalsUnderWithdrawal: 0 },
    withdrawalAlerts: [] as any[],
    outbreakAnomalies: [] as AMUAnomaly[]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardStats, alerts, treatments] = await Promise.all([
          apiFetch('/reports/dashboard').catch(() => ({
            stats: { totalFarms: 0, totalAnimals: 0, underTreatment: 0, animalsUnderWithdrawal: 0 },
          })),
          apiFetch('/treatments/alerts').catch(() => []),
          apiFetch('/treatments').catch(() => []),
        ]);

        const wAlerts = (alerts || []).map((a: any) => {
          const mappedTreatments = (a.treatments || []).map((t: any) => ({
            animalId: a.id,
            treatmentDate: t.administrationDate,
            medicine: t.drugName,
            withdrawalPeriodDays: t.withdrawalPeriod,
          }));
          const calc = calculateOverallWithdrawal(mappedTreatments);
          return {
            id: a.tagNumber,
            animalId: a.id,
            drug: mappedTreatments[0]?.medicine || 'Unknown',
            days: `${calc.daysRemaining} Days`,
            priority: calc.daysRemaining <= 3 ? 'High' : 'Medium'
          };
        });

        // AMU Anomaly Detection via ML algorithm simulation
        const anomalies = detectAMUAnomalies(treatments || []);

        setDashboardData({
          stats: dashboardStats.stats,
          withdrawalAlerts: wAlerts,
          outbreakAnomalies: anomalies
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading Dashboard...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">Essential overview of system metrics.</p>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Registered Farms', value: dashboardData.stats.totalFarms, icon: Tractor, link: '/farms' },
          { label: 'Registered Animals', value: dashboardData.stats.totalAnimals, icon: PawPrint, link: '/animals' },
          { label: 'Active Treatments', value: dashboardData.stats.underTreatment, icon: Syringe, link: '/treatments' },
          { label: 'Withdrawal Alerts', value: dashboardData.stats.animalsUnderWithdrawal, icon: AlertTriangle, link: '/withdrawal' }
        ].map((kpi, idx) => (
          <Link href={kpi.link || "#"} key={idx} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center justify-between hover:border-green-400 transition-colors">
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{kpi.label}</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{kpi.value || 0}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 text-gray-600">
              <kpi.icon size={24} />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-full">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/farms/new" className="flex items-center gap-2 p-4 border rounded-xl hover:bg-green-50 hover:border-green-600 transition-colors font-medium text-gray-700 hover:text-green-800">
              <Plus size={18} className="text-green-600" /> Add Farm
            </Link>
            <Link href="/animals/new" className="flex items-center gap-2 p-4 border rounded-xl hover:bg-green-50 hover:border-green-600 transition-colors font-medium text-gray-700 hover:text-green-800">
              <PawPrint size={18} className="text-green-600" /> Register Animal
            </Link>
            <Link href="/treatments/new" className="flex items-center gap-2 p-4 border rounded-xl hover:bg-green-50 hover:border-green-600 transition-colors font-medium text-gray-700 hover:text-green-800">
              <Pill size={18} className="text-green-600" /> Record Treatment
            </Link>
            <Link href="/prescriptions/new" className="flex items-center gap-2 p-4 border rounded-xl hover:bg-green-50 hover:border-green-600 transition-colors font-medium text-gray-700 hover:text-green-800">
              <ClipboardList size={18} className="text-green-600" /> Add Prescription
            </Link>
          </div>
        </div>

        {/* Withdrawal Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Critical Withdrawal Alerts</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 uppercase text-xs font-semibold text-gray-500">
                <tr>
                  <th className="px-5 py-3 border-b">Animal ID</th>
                  <th className="px-5 py-3 border-b">Medicine</th>
                  <th className="px-5 py-3 border-b text-right">Days Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dashboardData.withdrawalAlerts.slice(0, 5).map((w, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold"><Link href={`/animals?id=${w.animalId}`} className="hover:text-green-700 hover:underline">{w.id}</Link></td>
                    <td className="px-5 py-3">{w.drug}</td>
                    <td className="px-5 py-3 text-right text-red-600 font-bold">{w.days}</td>
                  </tr>
                ))}
                {dashboardData.withdrawalAlerts.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-500">No active withdrawal alerts</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AMU AI Outbreak Anomalies */}
      {dashboardData.outbreakAnomalies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl shadow-sm overflow-hidden flex flex-col p-5 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-red-600 animate-pulse" />
            <h3 className="text-sm font-bold text-red-900">AI Detection: Potential Disease Outbreak Warnings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData.outbreakAnomalies.map((anomaly, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold bg-red-100 text-red-800 px-2 py-1 rounded">
                    {anomaly.severity} {anomaly.type}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">{anomaly.farmId}</span>
                </div>
                <p className="text-sm text-gray-800 font-medium">{anomaly.message}</p>
                <Link href="/treatments" className="text-xs text-red-600 font-bold mt-3 inline-block hover:underline">
                  Investigate Treatments →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
