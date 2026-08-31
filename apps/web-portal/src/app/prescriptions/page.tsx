'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { Plus, Search, Eye } from 'lucide-react';
import Modal from '@/components/Modal';

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vetFilter, setVetFilter] = useState('');

  useEffect(() => {
    async function loadPrescriptions() {
      setLoading(true);
      try {
        const res = await apiFetch('/prescriptions');
        setPrescriptions(res || []);
      } catch (err) {
        console.error('Failed to load prescriptions', err);
      } finally {
        setLoading(false);
      }
    }
    loadPrescriptions();
  }, []);

  const uniqueVets = Array.from(new Set(prescriptions.map(p => p.veterinarian).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(prescriptions.map(p => p.status).filter(Boolean)));

  const filteredPrescriptions = prescriptions.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = 
      (p.animal?.animalCode || p.animal?.tagNumber || p.animalId || '').toLowerCase().includes(s) || 
      (p.medicine || '').toLowerCase().includes(s) ||
      (p.activeIngredient || '').toLowerCase().includes(s) ||
      (p.veterinarianName || p.veterinarian || '').toLowerCase().includes(s) ||
      (p.prescriptionCode || p.id || '').toLowerCase().includes(s);
    
    const matchStatus = statusFilter ? p.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const now = new Date();
  const thisMonthCount = prescriptions.filter(p => {
    const dateStr = p.prescriptionDate || p.issueDate || p.createdAt;
    if (!dateStr) return false;
    const pDate = new Date(dateStr);
    return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="flex flex-col gap-6 w-full pb-8 bg-gray-50 min-h-screen">
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Veterinary Prescriptions</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage digital prescriptions, active ingredients, withdrawal periods, and track medicine dispensing.</p>
          </div>
          
          <div className="flex gap-3">
            <Link 
              href="/veterinarian/dispensing" 
              className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
            >
              Dispensing Logs
            </Link>
            <Link 
              href="/prescriptions/new" 
              className="inline-flex items-center gap-2 bg-[#064E3B] hover:bg-[#065F46] text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
            >
              <Plus size={18} />
              New Prescription
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-500 font-medium">Total Prescriptions:</span>
            <span className="text-sm font-bold text-gray-900">{prescriptions.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-sm text-green-700 font-medium">Active:</span>
            <span className="text-sm font-bold text-green-700">{prescriptions.filter(p => p.status === 'ACTIVE' || p.status === 'Active').length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm text-blue-700 font-medium">Completed:</span>
            <span className="text-sm font-bold text-blue-700">{prescriptions.filter(p => p.status === 'COMPLETED' || p.status === 'Completed').length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
            <span className="text-sm text-purple-700 font-medium">This Month:</span>
            <span className="text-sm font-bold text-purple-700">{thisMonthCount}</span>
          </div>
        </div>
      </div>

      <div className="px-8 flex-1">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading prescriptions...</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-bold text-gray-700">No prescriptions found</h3>
              <p className="text-gray-500 text-sm mt-1 mb-4">You have not added any veterinary prescriptions yet.</p>
              <Link href="/prescriptions/new" className="inline-flex items-center gap-2 bg-[#064E3B] text-white px-4 py-2 rounded-lg font-medium text-sm">
                <Plus size={16} /> Add Prescription
              </Link>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col xl:flex-row gap-3 items-center justify-between">
                <div className="relative w-full xl:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by code, animal, medicine..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-200">
                      <th className="p-4 font-semibold text-gray-900">Code</th>
                      <th className="p-4 font-semibold text-gray-900">Animal</th>
                      <th className="p-4 font-semibold text-gray-900">Medicine</th>
                      <th className="p-4 font-semibold text-gray-900">Dosage</th>
                      <th className="p-4 font-semibold text-gray-900">Veterinarian</th>
                      <th className="p-4 font-semibold text-gray-900">Date</th>
                      <th className="p-4 font-semibold text-gray-900">Duration</th>
                      <th className="p-4 font-semibold text-gray-900">Status</th>
                      <th className="p-4 font-semibold text-gray-900 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPrescriptions.length > 0 ? (
                      filteredPrescriptions.map((p, i) => {
                        const statusUpper = (p.status || '').toUpperCase();
                        const isCompleted = statusUpper === 'COMPLETED';
                        
                        return (
                          <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                            <td className="p-4 font-bold text-xs text-gray-900">
                              {p.prescriptionCode || p.id?.slice(0, 8)}
                            </td>
                            <td className="p-4 font-semibold text-emerald-800">
                              {p.animal?.animalCode || p.animal?.tagNumber || p.animalId || 'N/A'}
                            </td>
                            <td className="p-4 font-medium text-gray-800">{p.medicine || 'N/A'}</td>
                            <td className="p-4 text-gray-700">{p.dosage || 'N/A'}</td>
                            <td className="p-4 text-gray-700">{p.veterinarianName || p.veterinarian || 'N/A'}</td>
                            <td className="p-4 text-gray-700">
                              {p.prescriptionDate || p.issueDate ? new Date(p.prescriptionDate || p.issueDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-4 text-gray-700">
                              {p.duration || p.durationDays ? `${p.duration || p.durationDays} days` : 'N/A'}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                                isCompleted ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {p.status || 'Active'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => setSelectedPrescription(p)} 
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
                          No prescriptions found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500 flex justify-between items-center">
                <span>Showing {filteredPrescriptions.length} prescription(s)</span>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Detail Modal */}
      {selectedPrescription && (
        <Modal isOpen={!!selectedPrescription} onClose={() => setSelectedPrescription(null)} title="Prescription Details" icon="fa-file-text-o">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Prescription ID</span>
                <span className="text-sm font-mono text-gray-900">{selectedPrescription.id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Animal ID</span>
                <span className="text-sm font-bold text-gray-900">{selectedPrescription.animalId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Medicine</span>
                <span className="text-sm font-semibold text-gray-800">{selectedPrescription.medicine || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Dosage</span>
                <span className="text-sm text-gray-800">{selectedPrescription.dosage || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Duration</span>
                <span className="text-sm text-gray-800">{selectedPrescription.durationDays ? `${selectedPrescription.durationDays} days` : 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Veterinarian</span>
                <span className="text-sm text-gray-800">{selectedPrescription.veterinarian || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Date Issued</span>
                <span className="text-sm text-gray-800">
                  {selectedPrescription.issueDate ? new Date(selectedPrescription.issueDate).toLocaleDateString('en-GB') : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Status</span>
                <span className="text-sm text-gray-800">{selectedPrescription.status || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-gray-500 font-semibold block uppercase">Instructions</span>
                <span className="text-sm text-gray-800">{selectedPrescription.instructions || 'No additional instructions provided.'}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
