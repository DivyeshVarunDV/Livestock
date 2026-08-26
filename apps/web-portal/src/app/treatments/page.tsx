'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { Plus, Search, Eye } from 'lucide-react';
import Modal from '@/components/Modal';
import { calculateWithdrawal } from '@/lib/withdrawalEngine';

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTreatment, setSelectedTreatment] = useState<any | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [medicineFilter, setMedicineFilter] = useState('');

  useEffect(() => {
    async function loadTreatments() {
      setLoading(true);
      try {
        const [res, audit] = await Promise.all([
          apiFetch('/treatments'),
          apiFetch('/audit-logs').catch(() => [])
        ]);
        setTreatments(res || []);
        setAuditLogs(Array.isArray(audit) ? audit : []);
      } catch (err) {
        console.error('Failed to load treatments', err);
      } finally {
        setLoading(false);
      }
    }
    loadTreatments();
  }, []);

  const normalizedTreatments = treatments.map((t) => ({
    ...t,
    medicineName: t.drugName || t.medicine || 'N/A',
    treatmentDateValue: t.administrationDate || t.treatmentDate || null,
    withdrawalPeriodValue: t.withdrawalPeriod ?? t.withdrawalPeriodDays ?? 0,
    veterinarianDisplay: t.veterinarianName || t.administeredBy || 'N/A',
    animalDisplay: t.animal?.animalCode || t.animal?.tagNumber || t.animal?.name || t.animalId || 'N/A',
  }));

  const uniqueMedicines = Array.from(new Set(normalizedTreatments.map((t) => t.medicineName).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(normalizedTreatments.map((t) => t.status).filter(Boolean)));

  const filteredTreatments = normalizedTreatments.filter((t) => {
    const searchLower = search.toLowerCase();
    const matchSearch =
      t.animalDisplay?.toLowerCase().includes(searchLower) ||
      t.animalId?.toLowerCase().includes(searchLower) ||
      t.medicineName?.toLowerCase().includes(searchLower) ||
      t.veterinarianDisplay?.toLowerCase().includes(searchLower) ||
      t.id?.toLowerCase().includes(searchLower);

    const matchStatus = statusFilter ? t.status === statusFilter : true;
    const matchMedicine = medicineFilter ? t.medicineName === medicineFilter : true;

    return matchSearch && matchStatus && matchMedicine;
  });

  return (
    <div className="flex flex-col gap-6 w-full pb-8 bg-gray-50 min-h-screen">
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Treatment Management</h1>
            <p className="text-gray-500 mt-1 text-sm">Monitor antimicrobial treatments, dosage, veterinarians, treatment status, and withdrawal periods.</p>
          </div>

          <Link
            href="/treatments/new"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
          >
            <Plus size={18} />
            Record Treatment
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-500 font-medium">Total Treatments:</span>
            <span className="text-sm font-bold text-gray-900">{normalizedTreatments.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-sm text-green-700 font-medium">Active:</span>
            <span className="text-sm font-bold text-green-700">{normalizedTreatments.filter((t) => t.status === 'ACTIVE' || t.status === 'Active').length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm text-blue-700 font-medium">Completed:</span>
            <span className="text-sm font-bold text-blue-700">{normalizedTreatments.filter((t) => t.status === 'COMPLETED' || t.status === 'Completed').length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
            <span className="text-sm text-orange-700 font-medium">With Withdrawal:</span>
            <span className="text-sm font-bold text-orange-700">{normalizedTreatments.filter((t) => t.withdrawalPeriodValue > 0).length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
            <span className="text-sm text-purple-700 font-medium">AMU Units:</span>
            <span className="text-sm font-bold text-purple-700">
              {normalizedTreatments.reduce((sum, t) => sum + (t.amuUnits || 0), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="px-8 flex-1">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading treatments...</p>
            </div>
          ) : normalizedTreatments.length === 0 ? (
            <div className="text-center py-12">
              <i className="fa fa-stethoscope text-4xl text-gray-300 mb-3 block"></i>
              <h3 className="text-lg font-bold text-gray-700">No treatment records found</h3>
              <p className="text-gray-500 text-sm mt-1 mb-4">You have not recorded any livestock treatments yet.</p>
              <Link href="/treatments/new" className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm">
                <Plus size={16} /> Record Treatment
              </Link>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col xl:flex-row gap-3 items-center justify-between">
                <div className="relative w-full xl:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by animal, medicine, vet..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                  />
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white min-w-[120px]"
                  >
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map((st) => (
                      <option key={String(st)} value={String(st)}>{String(st)}</option>
                    ))}
                  </select>
                  <select
                    value={medicineFilter}
                    onChange={(e) => setMedicineFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white min-w-[120px]"
                  >
                    <option value="">All Medicines</option>
                    {uniqueMedicines.map((med) => (
                      <option key={String(med)} value={String(med)}>{String(med)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-200">
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Treatment ID</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Animal</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Medicine</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Dosage</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Veterinarian</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Date</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Withdrawal</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Status</th>
                      <th className="p-4 font-semibold text-gray-900 text-right align-middle whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTreatments.length > 0 ? (
                      filteredTreatments.map((t, i) => {
                        const statusUpper = (t.status || '').toUpperCase();
                        const isCompleted = statusUpper === 'COMPLETED';
                        const isPending = statusUpper === 'PENDING';

                        return (
                          <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                            <td className="p-4 font-mono text-xs text-gray-500 align-middle">
                              {t.id ? t.id.split('-')[0] : 'N/A'}
                            </td>
                            <td className="p-4 font-bold text-gray-900 align-middle">{t.animalDisplay}</td>
                            <td className="p-4 font-medium text-gray-800 align-middle">{t.medicineName}</td>
                            <td className="p-4 align-middle text-gray-700">{t.dosage || 'N/A'}</td>
                            <td className="p-4 align-middle text-gray-700">{t.veterinarianDisplay}</td>
                            <td className="p-4 align-middle text-gray-700">
                              {t.treatmentDateValue ? new Date(t.treatmentDateValue).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </td>
                            <td className="p-4 align-middle text-gray-700">
                              {t.withdrawalPeriodValue ? `${t.withdrawalPeriodValue} days` : 'None'}
                            </td>
                            <td className="p-4 align-middle">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                                isCompleted ? 'bg-blue-100 text-blue-800' :
                                isPending ? 'bg-orange-100 text-orange-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {t.status ? (t.status.charAt(0).toUpperCase() + t.status.slice(1).toLowerCase()) : 'Active'}
                              </span>
                            </td>
                            <td className="p-4 text-right align-middle">
                              <button
                                onClick={() => setSelectedTreatment(t)}
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
                          No treatments found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500 flex justify-between items-center">
                <span>Showing {filteredTreatments.length} treatment(s)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedTreatment && (
        <Modal isOpen={!!selectedTreatment} onClose={() => setSelectedTreatment(null)} title="Treatment Details" icon="fa-stethoscope">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Treatment ID</span>
                <span className="text-sm font-mono text-gray-900">{selectedTreatment.id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Animal ID</span>
                <span className="text-sm font-bold text-gray-900">{selectedTreatment.animalDisplay}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Medicine</span>
                <span className="text-sm font-semibold text-gray-800">{selectedTreatment.medicineName}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Dosage</span>
                <span className="text-sm text-gray-800">{selectedTreatment.dosage || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Route</span>
                <span className="text-sm text-gray-800">{selectedTreatment.route || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Veterinarian</span>
                <span className="text-sm text-gray-800">{selectedTreatment.veterinarianDisplay}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Treatment Date</span>
                <span className="text-sm text-gray-800">
                  {selectedTreatment.treatmentDateValue ? new Date(selectedTreatment.treatmentDateValue).toLocaleDateString('en-GB') : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Withdrawal End Date</span>
                <span className="text-sm font-semibold text-orange-700">
                  {(() => {
                    const calc = calculateWithdrawal(selectedTreatment.treatmentDateValue, selectedTreatment.withdrawalPeriodValue);
                    return calc.endDate ? calc.endDate.toLocaleDateString('en-GB') : 'N/A';
                  })()}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-gray-500 font-semibold block uppercase">Notes</span>
                <span className="text-sm text-gray-800">{selectedTreatment.notes || 'No additional notes provided.'}</span>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Audit Trail</h3>
              <div className="space-y-3">
                {auditLogs.filter((log) => log.entity === 'TREATMENT' && log.entityId === selectedTreatment.id).length > 0 ? (
                  auditLogs.filter((log) => log.entity === 'TREATMENT' && log.entityId === selectedTreatment.id).map((log, index) => {
                    let detail = '';
                    if (log.newValue) {
                      try {
                        const parsed = JSON.parse(log.newValue);
                        detail = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ');
                      } catch {
                        detail = log.newValue;
                      }
                    }

                    return (
                      <div key={index} className="flex gap-3 text-sm">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                          {index !== auditLogs.filter((l) => l.entity === 'TREATMENT' && l.entityId === selectedTreatment.id).length - 1 && (
                            <div className="w-px h-full bg-gray-200 my-1" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{log.action}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-gray-700 mt-0.5">User: {log.userName || log.userEmail || 'System'}</div>
                          {detail && <div className="text-gray-600 italic text-xs mt-0.5">{detail}</div>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-500 italic">No audit records found.</div>
                )}
              </div>
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
}
