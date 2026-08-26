'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Search, AlertTriangle, CheckCircle, Clock, Eye } from 'lucide-react';
import Modal from '@/components/Modal';
import { calculateWithdrawal } from '@/lib/withdrawalEngine';

export default function WithdrawalPage() {
  const [treatments, setTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const [search, setSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await apiFetch('/treatments');
        // Only keep treatments that have a withdrawal period
        const withdrawalRecords = (res || []).filter((t: any) => (t.withdrawalPeriod || t.withdrawalPeriodDays || 0) > 0);
        setTreatments(withdrawalRecords);
      } catch (err) {
        console.error('Failed to load withdrawal records', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const enrichRecord = (t: any) => {
    const adminDate = t.administrationDate || t.treatmentDate;
    const periodDays = Number(t.withdrawalPeriod || t.withdrawalPeriodDays || 0);
    const drug = t.drugName || t.medicine || 'Unknown Drug';
    const animalTag = t.animal?.tagNumber || t.animal?.name || t.animalId || 'N/A';
    const farmName = t.animal?.farm?.name || t.farm?.name || 'Local Farm';

    const calc = calculateWithdrawal(adminDate, periodDays);
    const daysRemaining = calc.daysRemaining;
    
    // Map ENGINE status to UI status
    let status = 'Cleared';
    if (calc.status === 'ACTIVE') status = 'Active';
    if (calc.status === 'DUE SOON') status = 'Due Soon';
    if (calc.status === 'CLEARED') status = 'Cleared';

    let priority = 'Low';
    if (daysRemaining > 0) {
      priority = daysRemaining <= 3 ? 'High' : (daysRemaining <= 7 ? 'Medium' : 'Low');
    } else if (daysRemaining === 0) {
      priority = 'High';
    }

    return { 
      ...t, 
      daysRemaining, 
      withdrawalStatus: status, 
      priority,
      adminDate,
      periodDays,
      drug,
      animalTag,
      farmName
    };
  };

  const enrichedTreatments = treatments.map(enrichRecord);

  const uniqueFarms = Array.from(new Set(enrichedTreatments.map(t => t.farmName).filter(Boolean)));
  const uniquePriorities = ['High', 'Medium', 'Low'];
  const uniqueStatuses = ['Active', 'Due Soon', 'Cleared'];

  const filteredRecords = enrichedTreatments.filter(t => {
    const matchSearch = 
      t.animalTag?.toLowerCase().includes(search.toLowerCase()) || 
      t.animalId?.toLowerCase().includes(search.toLowerCase()) || 
      t.drug?.toLowerCase().includes(search.toLowerCase());
    
    const matchFarm = farmFilter ? t.farmName === farmFilter : true;
    const matchPriority = priorityFilter ? t.priority === priorityFilter : true;
    const matchStatus = statusFilter ? t.withdrawalStatus === statusFilter : true;
    
    return matchSearch && matchFarm && matchPriority && matchStatus;
  });

  const activeWithdrawals = enrichedTreatments.filter(t => t.withdrawalStatus === 'Active').length;
  const dueSoon = enrichedTreatments.filter(t => t.withdrawalStatus === 'Due Soon').length;
  const cleared = enrichedTreatments.filter(t => t.withdrawalStatus === 'Cleared').length;
  const highPriority = enrichedTreatments.filter(t => t.priority === 'High' && t.withdrawalStatus !== 'Cleared').length;

  return (
    <div className="flex flex-col gap-6 w-full pb-8 bg-gray-50 min-h-screen">
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Withdrawal Monitoring</h1>
            <p className="text-gray-500 mt-1 text-sm">Track antimicrobial withdrawal periods and prevent animals from entering the food chain before clearance.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
            <span className="text-sm text-orange-700 font-medium">Active Withdrawals:</span>
            <span className="text-sm font-bold text-orange-700">{activeWithdrawals}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-sm text-yellow-700 font-medium">Due Soon:</span>
            <span className="text-sm font-bold text-yellow-700">{dueSoon}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-sm text-green-700 font-medium">Cleared:</span>
            <span className="text-sm font-bold text-green-700">{cleared}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm text-red-700 font-medium">High Priority:</span>
            <span className="text-sm font-bold text-red-700">{highPriority}</span>
          </div>
        </div>
      </div>

      <div className="px-8 flex-1">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading withdrawal records...</p>
            </div>
          ) : enrichedTreatments.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-bold text-gray-700">No withdrawal records</h3>
              <p className="text-gray-500 text-sm mt-1">There are currently no active treatments requiring withdrawal monitoring.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col xl:flex-row gap-3 items-center justify-between">
                <div className="relative w-full xl:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by animal ID or drug..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                  />
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                  <select
                    value={farmFilter}
                    onChange={(e) => setFarmFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white min-w-[120px]"
                  >
                    <option value="">All Farms</option>
                    {uniqueFarms.map(f => (
                      <option key={String(f)} value={String(f)}>{String(f)}</option>
                    ))}
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white min-w-[120px]"
                  >
                    <option value="">All Priorities</option>
                    {uniquePriorities.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white min-w-[120px]"
                  >
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-200">
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Animal ID</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Farm</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Drug</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Treatment Date</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Withdrawal End</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Days Remaining</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Status</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Priority</th>
                      <th className="p-4 font-semibold text-gray-900 text-right align-middle whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map((t, i) => {
                        const isHigh = t.priority === 'High';
                        const isMedium = t.priority === 'Medium';
                        const isCleared = t.withdrawalStatus === 'Cleared';

                        const endDate = t.adminDate && t.periodDays 
                          ? new Date(new Date(t.adminDate).getTime() + t.periodDays * 24 * 60 * 60 * 1000)
                          : null;

                        return (
                          <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                            <td className="p-4 font-bold text-gray-900 align-middle">
                              <span className="font-bold text-emerald-800">{t.animalTag}</span>
                              {t.animalId && t.animalId !== t.animalTag && (
                                <span className="block text-xs text-gray-400 font-normal">{t.animalId.substring(0, 8)}</span>
                              )}
                            </td>
                            <td className="p-4 font-medium text-gray-800 align-middle">{t.farmName}</td>
                            <td className="p-4 font-semibold text-gray-800 align-middle">{t.drug}</td>
                            <td className="p-4 align-middle text-gray-700">
                              {t.adminDate ? new Date(t.adminDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </td>
                            <td className="p-4 align-middle text-gray-700">
                              {endDate ? endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </td>
                            <td className={`p-4 align-middle font-bold ${isCleared ? 'text-green-600' : 'text-gray-900'}`}>
                              {isCleared ? '0' : t.daysRemaining}
                            </td>
                            <td className="p-4 align-middle">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                                isCleared ? 'bg-green-100 text-green-800' : 
                                t.withdrawalStatus === 'Due Soon' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {isCleared && <CheckCircle size={12} className="mr-1" />}
                                {!isCleared && <Clock size={12} className="mr-1" />}
                                {t.withdrawalStatus}
                              </span>
                            </td>
                            <td className="p-4 align-middle">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                                isHigh ? 'bg-red-100 text-red-800' : 
                                isMedium ? 'bg-orange-100 text-orange-800' : 
                                'bg-green-100 text-green-800'
                              }`}>
                                {isHigh && <AlertTriangle size={12} className="mr-1" />}
                                {t.priority}
                              </span>
                            </td>
                            <td className="p-4 text-right align-middle">
                              <button 
                                onClick={() => setSelectedRecord(t)} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-md hover:bg-green-100 transition-colors"
                              >
                                <Eye size={14} />
                                Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-500">
                          No withdrawal records found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500 flex justify-between items-center">
                <span>Showing {filteredRecords.length} record(s)</span>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Detail Modal */}
      {selectedRecord && (
        <Modal isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} title="Withdrawal Details" icon="fa-clock-o">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Treatment ID</span>
                <span className="text-sm font-mono text-gray-900">{selectedRecord.id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Animal ID</span>
                <span className="text-sm font-bold text-gray-900">{selectedRecord.animalId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Drug/Medicine</span>
                <span className="text-sm font-semibold text-gray-800">{selectedRecord.drug || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Dosage</span>
                <span className="text-sm text-gray-800">{selectedRecord.dosage || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Treatment Date</span>
                <span className="text-sm text-gray-800">
                  {selectedRecord.adminDate ? new Date(selectedRecord.adminDate).toLocaleDateString('en-GB') : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Withdrawal Period</span>
                <span className="text-sm text-gray-800">{selectedRecord.periodDays} days</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Withdrawal End Date</span>
                <span className="text-sm font-bold text-gray-900">
                  {selectedRecord.adminDate && selectedRecord.periodDays ?
                    new Date(new Date(selectedRecord.adminDate).getTime() + selectedRecord.periodDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')
                    : 'N/A'
                  }
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Days Remaining</span>
                <span className={`text-sm font-bold ${selectedRecord.daysRemaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {selectedRecord.withdrawalStatus === 'Cleared' ? 'Cleared' : `${selectedRecord.daysRemaining} days`}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Priority</span>
                <span className="text-sm font-semibold">{selectedRecord.priority}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Status</span>
                <span className="text-sm font-semibold">{selectedRecord.withdrawalStatus}</span>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This animal must not enter the food chain until the withdrawal period has fully elapsed and MRL compliance is verified.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
