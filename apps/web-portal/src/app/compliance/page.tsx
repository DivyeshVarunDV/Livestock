'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import { ShieldCheck, Clock, Activity, FlaskConical, AlertTriangle, CheckCircle, Info, Filter } from 'lucide-react';
import { calculateMRLCompliance } from '@/lib/mrlEngine';
import { calculateWithdrawal } from '@/lib/withdrawalEngine';
import { calculateAMU } from '@/lib/amuEngine';

type Tab = 'mrl' | 'withdrawal' | 'amu' | 'laboratory';

export default function CompliancePage() {
  const { token, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<Tab>('mrl');
  const [loading, setLoading] = useState(true);
  
  const [animals, setAnimals] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [complianceReport, setComplianceReport] = useState<any>({ total: 0, cleared: 0, clearingSoon: 0, doNotSell: 0 });
  
  const [mrlFilter, setMrlFilter] = useState('ALL');

  useEffect(() => {
    if (!token || authLoading) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [animalsData, treatmentsData, reportData] = await Promise.all([
          apiFetch('/animals'),
          apiFetch('/treatments'),
          apiFetch('/reports/compliance')
        ]);
        
        setAnimals(animalsData || []);
        setTreatments(treatmentsData || []);
        if (reportData) setComplianceReport(reportData);
      } catch (error) {
        console.error('Failed to load compliance data', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, authLoading]);

  if (authLoading || loading) return <Loader />;

  // --- MRL Tab Data ---
  const filteredAnimals = animals.filter(a => mrlFilter === 'ALL' || a.mrlStatus === mrlFilter);

  // --- Withdrawal Tab Data ---
  const withdrawalTreatments = treatments
    .filter(t => t.withdrawalPeriod > 0)
    .map(t => {
      const wStatus = calculateWithdrawal(t.administrationDate, t.withdrawalPeriod);
      let priority = 'low';
      if (wStatus.daysRemaining <= 3 && wStatus.daysRemaining > 0) priority = 'high';
      else if (wStatus.daysRemaining <= 7 && wStatus.daysRemaining > 0) priority = 'medium';
      
      return { ...t, wStatus, priority };
    });

  const activeW = withdrawalTreatments.filter(t => t.wStatus.status === 'ACTIVE').length;
  const dueSoonW = withdrawalTreatments.filter(t => t.priority === 'medium' || t.priority === 'high').length;
  const clearedW = withdrawalTreatments.filter(t => t.wStatus.status === 'CLEARED').length;
  const highPriorityW = withdrawalTreatments.filter(t => t.priority === 'high').length;

  // --- AMU Tab Data ---
  const amuAnalytics = calculateAMU(treatments);
  const maxDose = Math.max(...Object.values(amuAnalytics.byDrug || {}).map((d: any) => d.doseUnits || 0), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 text-green-700 rounded-lg">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
          <p className="text-gray-500">Monitor MRL, withdrawal periods, and drug usage</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('mrl')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'mrl' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> MRL Status
        </button>
        <button
          onClick={() => setActiveTab('withdrawal')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'withdrawal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Clock className="w-4 h-4" /> Withdrawal
        </button>
        <button
          onClick={() => setActiveTab('amu')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'amu' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Activity className="w-4 h-4" /> AMU
        </button>
        <button
          onClick={() => setActiveTab('laboratory')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'laboratory' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FlaskConical className="w-4 h-4" /> Laboratory
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {/* MRL Tab */}
        {activeTab === 'mrl' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Cleared</p>
                    <p className="text-2xl font-bold text-gray-900">{complianceReport.cleared}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-amber-500 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Clearing Soon</p>
                    <p className="text-2xl font-bold text-gray-900">{complianceReport.clearingSoon}</p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-500 opacity-20" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-red-500 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Do Not Sell</p>
                    <p className="text-2xl font-bold text-gray-900">{complianceReport.doNotSell}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500 opacity-20" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-gray-400 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{complianceReport.total}</p>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-gray-400 opacity-20" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-semibold text-gray-800">MRL Compliance Status</h3>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-3 py-1.5 shadow-sm">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select 
                    className="text-sm bg-transparent outline-none text-gray-700 font-medium cursor-pointer"
                    value={mrlFilter}
                    onChange={(e) => setMrlFilter(e.target.value)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="CLEARED">Cleared</option>
                    <option value="CLEARING_SOON">Clearing Soon</option>
                    <option value="DO_NOT_SELL">Do Not Sell</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      <th className="px-6 py-3">Tag #</th>
                      <th className="px-6 py-3">Animal Name</th>
                      <th className="px-6 py-3">Species</th>
                      <th className="px-6 py-3">Farm</th>
                      <th className="px-6 py-3">MRL Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredAnimals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No animals found.</td>
                      </tr>
                    ) : (
                      filteredAnimals.map((animal: any) => (
                        <tr key={animal.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{animal.tagNumber}</td>
                          <td className="px-6 py-4 text-gray-700">{animal.name}</td>
                          <td className="px-6 py-4 text-gray-600">{animal.species}</td>
                          <td className="px-6 py-4 text-gray-600">{animal.farm?.name || '-'}</td>
                          <td className="px-6 py-4">
                            {animal.mrlStatus === 'CLEARED' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Cleared
                              </span>
                            )}
                            {animal.mrlStatus === 'CLEARING_SOON' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Clearing Soon
                              </span>
                            )}
                            {animal.mrlStatus === 'DO_NOT_SELL' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                Do Not Sell
                              </span>
                            )}
                            {!['CLEARED', 'CLEARING_SOON', 'DO_NOT_SELL'].includes(animal.mrlStatus) && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {animal.mrlStatus || 'UNKNOWN'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Tab */}
        {activeTab === 'withdrawal' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Active Withholds</p>
                  <p className="text-2xl font-bold text-gray-900">{activeW}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Due Soon (≤7d)</p>
                  <p className="text-2xl font-bold text-gray-900">{dueSoonW}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Cleared</p>
                  <p className="text-2xl font-bold text-gray-900">{clearedW}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">High Priority (≤3d)</p>
                  <p className="text-2xl font-bold text-gray-900">{highPriorityW}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                <h3 className="font-semibold text-gray-800">Withdrawal Tracking</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      <th className="px-6 py-3">Animal</th>
                      <th className="px-6 py-3">Farm</th>
                      <th className="px-6 py-3">Drug</th>
                      <th className="px-6 py-3">Treatment Date</th>
                      <th className="px-6 py-3">End Date</th>
                      <th className="px-6 py-3">Days Left</th>
                      <th className="px-6 py-3">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {withdrawalTreatments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No withdrawal records.</td>
                      </tr>
                    ) : (
                      withdrawalTreatments.map((t: any, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{t.animal?.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{t.animal?.tagNumber}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{t.animal?.farm?.name || '-'}</td>
                          <td className="px-6 py-4 font-medium text-gray-700">{t.drugName}</td>
                          <td className="px-6 py-4 text-gray-600">{new Date(t.administrationDate).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-gray-600">{t.wStatus.endDate ? new Date(t.wStatus.endDate).toLocaleDateString() : '-'}</td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900">{t.wStatus.daysRemaining > 0 ? t.wStatus.daysRemaining : 0} days</span>
                          </td>
                          <td className="px-6 py-4">
                            {t.wStatus.status === 'CLEARED' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Cleared
                              </span>
                            ) : t.priority === 'high' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                High
                              </span>
                            ) : t.priority === 'medium' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Medium
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Low
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* AMU Tab */}
        {activeTab === 'amu' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center">
                <p className="text-sm text-gray-500 font-medium mb-1">Total Treatments</p>
                <p className="text-3xl font-bold text-gray-900">{amuAnalytics.totalTreatments || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-center">
                <p className="text-sm text-gray-500 font-medium mb-1">Total Dose Units</p>
                <p className="text-3xl font-bold text-gray-900">{(amuAnalytics.totalDoseUnits || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                <h3 className="font-semibold text-gray-800">Antimicrobial Usage by Drug</h3>
              </div>
              <div className="p-6 space-y-6">
                {!amuAnalytics.byDrug || Object.keys(amuAnalytics.byDrug).length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No AMU data available.</p>
                ) : (
                  Object.entries(amuAnalytics.byDrug).map(([drugName, data]: [string, any]) => {
                    const widthPercent = maxDose > 0 ? (data.doseUnits / maxDose) * 100 : 0;
                    return (
                      <div key={drugName} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="font-medium text-gray-900">{drugName}</p>
                            <p className="text-xs text-gray-500">{data.treatments} treatments</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-700">{data.doseUnits.toLocaleString()} units</p>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.max(widthPercent, 1)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Laboratory Tab */}
        {activeTab === 'laboratory' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Laboratory integration coming soon</h4>
                <p className="text-sm mt-1 opacity-90">
                  Connect directly with national laboratories to receive automated test results and MRL compliance certifications.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                <h3 className="font-semibold text-gray-800">Recent Samples (Demo)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      <th className="px-6 py-3">Sample ID</th>
                      <th className="px-6 py-3">Animal</th>
                      <th className="px-6 py-3">Test</th>
                      <th className="px-6 py-3">Drug</th>
                      <th className="px-6 py-3">Result</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">LAB-8902</td>
                      <td className="px-6 py-4 font-medium text-gray-900">Bessie (TAG-001)</td>
                      <td className="px-6 py-4 text-gray-700">Residue Screen</td>
                      <td className="px-6 py-4 text-gray-600">Penicillin</td>
                      <td className="px-6 py-4 text-gray-600">0.02 mg/kg</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Passed
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">Oct 12, 2023</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">LAB-8903</td>
                      <td className="px-6 py-4 font-medium text-gray-900">Daisy (TAG-045)</td>
                      <td className="px-6 py-4 text-gray-700">Residue Screen</td>
                      <td className="px-6 py-4 text-gray-600">Oxytetracycline</td>
                      <td className="px-6 py-4 text-gray-600">Pending</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          In Progress
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">Oct 14, 2023</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">LAB-8904</td>
                      <td className="px-6 py-4 font-medium text-gray-900">Duke (TAG-088)</td>
                      <td className="px-6 py-4 text-gray-700">Residue Screen</td>
                      <td className="px-6 py-4 text-gray-600">Amoxicillin</td>
                      <td className="px-6 py-4 font-medium text-red-600">0.15 mg/kg</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Failed MRL
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">Oct 15, 2023</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
