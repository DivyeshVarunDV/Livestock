'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Search, ShieldCheck, ShieldAlert, AlertCircle, Eye } from 'lucide-react';
import { calculateMRLCompliance } from '@/lib/mrlEngine';
import Modal from '@/components/Modal';

export default function MRLCompliancePage() {
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await apiFetch('/animals');
        setAnimals(res || []);
      } catch (err) {
        console.error('Failed to load MRL records', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const mrlRecords = animals.map(a => {
    let measuredResidue: number | null = 5;
    let mrlLimit = 100;
    let testDate = new Date().toISOString();
    let drug = 'Various';
    let withdrawalStatus: 'ACTIVE' | 'DUE SOON' | 'CLEARED' = 'CLEARED';
    let withdrawalDaysRemaining = 0;

    if (a.mrlStatus === 'DO_NOT_SELL') {
      measuredResidue = 150;
      mrlLimit = 100;
      drug = 'Penicillin G';
      withdrawalStatus = 'ACTIVE';
      withdrawalDaysRemaining = 4;
    } else if (a.mrlStatus === 'CLEARING_SOON') {
      measuredResidue = null;
      drug = 'Oxytetracycline';
    }

    const decision = calculateMRLCompliance({
      animalId: a.id,
      drug,
      measuredResidue,
      mrlLimit,
      testDate,
      withdrawalStatus,
      withdrawalDaysRemaining
    });

    let result = 'Pass';
    if (decision.status === 'NON-COMPLIANT' || decision.status === 'DO_NOT_SELL') {
      result = 'Fail';
    } else if (decision.status === 'PENDING') {
      result = 'Pending';
    }

    return {
      ...a,
      mrlStatus: decision.status,
      decisionReason: decision.reason,
      result,
      residueLevel: measuredResidue ? `${measuredResidue} µg/kg` : 'Pending',
      mrlLimit: `${mrlLimit} µg/kg`,
      testDate,
      drug
    };
  });

  const uniqueStatuses = ['COMPLIANT', 'NON-COMPLIANT', 'DO_NOT_SELL', 'PENDING'];

  const filteredRecords = mrlRecords.filter(r => {
    const matchSearch = 
      r.tagNumber?.toLowerCase().includes(search.toLowerCase()) || 
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.drug?.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = statusFilter ? r.mrlStatus === statusFilter : true;
    
    return matchSearch && matchStatus;
  });

  const total = mrlRecords.length;
  const compliant = mrlRecords.filter(r => r.mrlStatus === 'COMPLIANT').length;
  const nonCompliant = mrlRecords.filter(r => r.mrlStatus === 'NON-COMPLIANT' || r.mrlStatus === 'DO_NOT_SELL').length;
  const pending = mrlRecords.filter(r => r.mrlStatus === 'PENDING').length;
  const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;
  const remainingRate = 100 - complianceRate;

  return (
    <div className="flex flex-col gap-6 w-full pb-8 bg-gray-50 min-h-screen">
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MRL Compliance</h1>
            <p className="text-gray-500 mt-1 text-sm">Monitor maximum residue limits and identify animals or products requiring regulatory attention.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 mt-6">
          <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="relative w-12 h-12 flex items-center justify-center bg-gray-200 rounded-full overflow-hidden">
               <div 
                  className="absolute top-0 left-0 w-full h-full bg-green-500" 
                  style={{ clipPath: `polygon(50% 50%, -50% -50%, ${complianceRate > 50 ? '150% -50%, 150% 150%, -50% 150%' : '150% -50%'})`, transform: `rotate(${(complianceRate / 100) * 360 - 90}deg)` }} 
               />
               <div className="absolute w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center z-10">
                 <span className="text-xs font-bold text-gray-800">{complianceRate}%</span>
               </div>
            </div>
            <div>
              <span className="block text-sm text-gray-500 font-medium">Overall Compliance</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-sm text-green-700 font-medium">Compliant:</span>
            <span className="text-sm font-bold text-green-700">{compliant}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm text-red-700 font-medium">Non-Compliant / DNC:</span>
            <span className="text-sm font-bold text-red-700">{nonCompliant}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
            <span className="text-sm text-orange-700 font-medium">Pending Review:</span>
            <span className="text-sm font-bold text-orange-700">{pending}</span>
          </div>
        </div>
      </div>

      <div className="px-8 flex-1">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading compliance records...</p>
            </div>
          ) : mrlRecords.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-bold text-gray-700">No MRL records found</h3>
              <p className="text-gray-500 text-sm mt-1">There are no animals available for MRL compliance tracking.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by animal tag, name or drug..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                  />
                </div>
                <div className="flex w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white min-w-[150px]"
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
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Animal</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Drug</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Residue Level</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">MRL Limit</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Result</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Test Date</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Status</th>
                      <th className="p-4 font-semibold text-gray-900 text-right align-middle whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map((r, i) => {
                        const isCompliant = r.mrlStatus === 'COMPLIANT';
                        const isNonCompliant = r.mrlStatus === 'NON-COMPLIANT' || r.mrlStatus === 'DO_NOT_SELL';

                        return (
                          <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                            <td className="p-4 font-bold text-gray-900 align-middle">{r.tagNumber || 'N/A'}</td>
                            <td className="p-4 align-middle text-gray-700">{r.name || 'N/A'}</td>
                            <td className="p-4 font-medium text-gray-800 align-middle">{r.drug}</td>
                            <td className={`p-4 align-middle font-bold ${isNonCompliant ? 'text-red-600' : 'text-gray-700'}`}>
                              {r.residueLevel}
                            </td>
                            <td className="p-4 align-middle text-gray-700">{r.mrlLimit}</td>
                            <td className="p-4 align-middle">
                              <span className={`font-semibold ${isCompliant ? 'text-green-600' : isNonCompliant ? 'text-red-600' : 'text-orange-600'}`}>
                                {r.result}
                              </span>
                            </td>
                            <td className="p-4 align-middle text-gray-700">
                              {new Date(r.testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="p-4 align-middle">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                                isCompliant ? 'bg-green-100 text-green-800' : 
                                isNonCompliant ? 'bg-red-100 text-red-800' : 
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {isCompliant && <ShieldCheck size={12} className="mr-1" />}
                                {isNonCompliant && <ShieldAlert size={12} className="mr-1" />}
                                {!isCompliant && !isNonCompliant && <AlertCircle size={12} className="mr-1" />}
                                {r.mrlStatus}
                              </span>
                            </td>
                            <td className="p-4 text-right align-middle">
                              <button 
                                onClick={() => setSelectedRecord(r)} 
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
                          No MRL records found matching your criteria.
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
        <Modal isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} title="MRL Compliance Details" icon="fa-shield">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Animal ID</span>
                <span className="text-sm font-bold text-gray-900">{selectedRecord.tagNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Animal Name</span>
                <span className="text-sm text-gray-800">{selectedRecord.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Tested Drug</span>
                <span className="text-sm font-semibold text-gray-800">{selectedRecord.drug}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Residue Level</span>
                <span className={`text-sm font-bold ${selectedRecord.mrlStatus === 'NON-COMPLIANT' ? 'text-red-600' : 'text-gray-900'}`}>
                  {selectedRecord.residueLevel}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">MRL Limit</span>
                <span className="text-sm text-gray-800">{selectedRecord.mrlLimit}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Test Date</span>
                <span className="text-sm text-gray-800">
                  {new Date(selectedRecord.testDate).toLocaleDateString('en-GB')}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Test Result</span>
                <span className={`text-sm font-semibold ${
                  selectedRecord.result === 'Pass' ? 'text-green-600' : 
                  selectedRecord.result === 'Fail' ? 'text-red-600' : 'text-orange-600'
                }`}>{selectedRecord.result}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Compliance Status</span>
                <span className="text-sm font-semibold">{selectedRecord.mrlStatus.replace('_', ' ')}</span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <span className="text-xs text-gray-500 font-semibold block uppercase mb-1">Decision Reason</span>
              <p className="text-sm text-gray-800">{selectedRecord.decisionReason}</p>
            </div>
            
            {(selectedRecord.mrlStatus === 'NON-COMPLIANT' || selectedRecord.mrlStatus === 'DO_NOT_SELL') && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-800">
                  <strong>Critical Violation:</strong> This animal is not compliant with MRL limits or withdrawal period. It must be withheld from the food chain until cleared.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
