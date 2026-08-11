'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, FlaskConical, Plus, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Modal from '@/components/Modal';

// Sample data since no lab backend exists yet
const sampleLabRecords = [
  {
    id: 'LAB-2026-001',
    animalId: 'TAG-84920',
    sampleType: 'Milk',
    drugTested: 'Penicillin G',
    testDate: '2026-08-01T09:00:00Z',
    result: 'Pass',
    mrlStatus: 'Compliant',
    laboratory: 'Central Vet Labs',
    notes: 'No residues detected above limit.'
  },
  {
    id: 'LAB-2026-002',
    animalId: 'TAG-11234',
    sampleType: 'Blood',
    drugTested: 'Oxytetracycline',
    testDate: '2026-08-05T14:30:00Z',
    result: 'Fail',
    mrlStatus: 'Non-Compliant',
    laboratory: 'AgriTest Labs',
    notes: 'Residue level exceeded MRL by 15%.'
  },
  {
    id: 'LAB-2026-003',
    animalId: 'TAG-99382',
    sampleType: 'Tissue',
    drugTested: 'Ivermectin',
    testDate: '2026-08-10T11:15:00Z',
    result: 'Pending',
    mrlStatus: 'Pending Review',
    laboratory: 'State Vet Services',
    notes: 'Sample received, analysis in progress.'
  },
  {
    id: 'LAB-2026-004',
    animalId: 'TAG-55210',
    sampleType: 'Urine',
    drugTested: 'Ceftiofur',
    testDate: '2026-07-28T08:45:00Z',
    result: 'Pass',
    mrlStatus: 'Compliant',
    laboratory: 'Central Vet Labs',
    notes: 'Cleared for production.'
  }
];

export default function LabPage() {
  const [records] = useState(sampleLabRecords);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const uniqueTypes = Array.from(new Set(records.map(r => r.sampleType)));
  const uniqueStatuses = Array.from(new Set(records.map(r => r.result)));

  const filteredRecords = records.filter(r => {
    const matchSearch = 
      r.animalId.toLowerCase().includes(search.toLowerCase()) || 
      r.drugTested.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = statusFilter ? r.result === statusFilter : true;
    const matchType = typeFilter ? r.sampleType === typeFilter : true;
    
    return matchSearch && matchStatus && matchType;
  });

  const passedCount = records.filter(r => r.result === 'Pass').length;
  const failedCount = records.filter(r => r.result === 'Fail').length;
  const pendingCount = records.filter(r => r.result === 'Pending').length;

  return (
    <div className="flex flex-col gap-6 w-full pb-8 bg-gray-50 min-h-screen">
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laboratory & Residue Testing</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage laboratory samples, residue tests, test results, and MRL verification.</p>
          </div>
          
          <button className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm">
            <Plus size={18} />
            Add Laboratory Test
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-500 font-medium">Total Samples:</span>
            <span className="text-sm font-bold text-gray-900">{records.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-sm text-yellow-700 font-medium">Pending Tests:</span>
            <span className="text-sm font-bold text-yellow-700">{pendingCount}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-sm text-green-700 font-medium">Passed:</span>
            <span className="text-sm font-bold text-green-700">{passedCount}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm text-red-700 font-medium">Failed:</span>
            <span className="text-sm font-bold text-red-700">{failedCount}</span>
          </div>
        </div>
      </div>

      <div className="px-8 flex-1">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by ID, animal tag, or drug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
              />
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white min-w-[140px]"
              >
                <option value="">All Sample Types</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white min-w-[120px]"
              >
                <option value="">All Results</option>
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
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Sample ID</th>
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Animal ID</th>
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Sample Type</th>
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Drug Tested</th>
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Test Date</th>
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Laboratory</th>
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Result</th>
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">MRL Status</th>
                  <th className="p-4 font-semibold text-gray-900 text-right align-middle whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((r, i) => {
                    const isPass = r.result === 'Pass';
                    const isFail = r.result === 'Fail';

                    return (
                      <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-4 font-mono text-xs text-gray-500 align-middle">{r.id}</td>
                        <td className="p-4 font-bold text-gray-900 align-middle">{r.animalId}</td>
                        <td className="p-4 font-medium text-gray-800 align-middle">{r.sampleType}</td>
                        <td className="p-4 font-medium text-gray-800 align-middle">{r.drugTested}</td>
                        <td className="p-4 align-middle text-gray-700">
                          {new Date(r.testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 align-middle text-gray-700">{r.laboratory}</td>
                        <td className="p-4 align-middle">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                            isPass ? 'bg-green-100 text-green-800' : 
                            isFail ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {isPass && <CheckCircle2 size={12} className="mr-1" />}
                            {isFail && <XCircle size={12} className="mr-1" />}
                            {!isPass && !isFail && <Clock size={12} className="mr-1" />}
                            {r.result}
                          </span>
                        </td>
                        <td className="p-4 align-middle">
                          <span className={`font-semibold ${
                            r.mrlStatus === 'Compliant' ? 'text-green-600' : 
                            r.mrlStatus === 'Non-Compliant' ? 'text-red-600' : 'text-orange-600'
                          }`}>
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
                      No lab records found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500 flex justify-between items-center">
            <span>Showing {filteredRecords.length} record(s)</span>
          </div>
        </div>
      </div>
      
      {/* Detail Modal */}
      {selectedRecord && (
        <Modal isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} title="Laboratory Test Details" icon="fa-flask">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Sample ID</span>
                <span className="text-sm font-mono text-gray-900">{selectedRecord.id}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Animal ID</span>
                <span className="text-sm font-bold text-gray-900">{selectedRecord.animalId}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Sample Type</span>
                <span className="text-sm text-gray-800">{selectedRecord.sampleType}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Laboratory</span>
                <span className="text-sm text-gray-800">{selectedRecord.laboratory}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Drug Tested</span>
                <span className="text-sm font-semibold text-gray-800">{selectedRecord.drugTested}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Test Date</span>
                <span className="text-sm text-gray-800">
                  {new Date(selectedRecord.testDate).toLocaleDateString('en-GB')}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Test Result</span>
                <span className={`text-sm font-bold ${
                  selectedRecord.result === 'Pass' ? 'text-green-600' : 
                  selectedRecord.result === 'Fail' ? 'text-red-600' : 'text-orange-600'
                }`}>{selectedRecord.result}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">MRL Status</span>
                <span className="text-sm font-semibold">{selectedRecord.mrlStatus}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-gray-500 font-semibold block uppercase">Notes / Findings</span>
                <span className="text-sm text-gray-800">{selectedRecord.notes}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
