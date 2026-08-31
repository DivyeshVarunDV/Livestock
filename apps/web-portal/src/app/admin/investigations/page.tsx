'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { ShieldAlert, Search, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp, FileText, Syringe, Building, User } from 'lucide-react';
import Modal from '@/components/Modal';

export default function AdminInvestigationsPage() {
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const [traceabilityData, setTraceabilityData] = useState<any>(null);
  const [traceabilityLoading, setTraceabilityLoading] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('PENDING_INVESTIGATION');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadViolations();
  }, []);

  async function loadViolations() {
    setLoading(true);
    try {
      const res = await apiFetch('/violations').catch(() => []);
      setViolations(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleInspect = async (v: any) => {
    setSelectedViolation(v);
    setTraceabilityData(null);
    if (v.batchId) {
      setTraceabilityLoading(true);
      try {
        const batchRes = await apiFetch(`/collection-batches?status=FAILED`).catch(() => []);
        const targetBatch = (batchRes || []).find((b: any) => b.batchCode === v.batchId || b.id === v.batchId);
        if (targetBatch) {
          const trace = await apiFetch(`/collection-batches/${targetBatch.id}/traceability`).catch(() => null);
          setTraceabilityData(trace);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setTraceabilityLoading(false);
      }
    }
  };

  const handleOpenUpdate = (v: any) => {
    setSelectedViolation(v);
    setUpdateStatus(v.status || 'UNDER_REVIEW');
    setAdminRemarks(v.adminRemarks || v.notes || '');
    setIsUpdateModalOpen(true);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedViolation) return;
    setSubmitting(true);
    try {
      await apiFetch(`/violations/${selectedViolation.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: updateStatus,
          adminRemarks,
          resolvedDate: updateStatus === 'RESOLVED' || updateStatus === 'DISMISSED' ? new Date().toISOString() : null,
        }),
      });
      setIsUpdateModalOpen(false);
      loadViolations();
      if (selectedViolation) {
        setSelectedViolation({ ...selectedViolation, status: updateStatus, adminRemarks });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredViolations = violations.filter((v) => {
    const s = search.toLowerCase();
    return (
      (v.violationCode || v.id || '').toLowerCase().includes(s) ||
      (v.type || '').toLowerCase().includes(s) ||
      (v.batchId || '').toLowerCase().includes(s) ||
      (v.status || '').toLowerCase().includes(s) ||
      (v.severity || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="text-red-600" size={26} /> Violation Investigation &amp; Traceability
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Government official audit panel for investigating non-compliant batches, MRL violations, and unauthorized product dispatch.
          </p>
        </div>
      </div>

      {/* Main Grid: Violations List & Traceability Drill-down */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Violations List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search violations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[700px] overflow-y-auto">
            {filteredViolations.map((v) => {
              const isSelected = selectedViolation?.id === v.id;
              const isPending = ['PENDING_INVESTIGATION', 'UNDER_REVIEW'].includes(v.status);
              return (
                <div
                  key={v.id}
                  onClick={() => handleInspect(v)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-50/70 border-l-4 border-[#064E3B]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-gray-900">{v.violationCode || v.id.slice(0, 8)}</span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPending ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-gray-800 mt-1">{v.type || 'MRL Failure'}</div>
                  <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
                    <span>Batch: {v.batchId || 'N/A'}</span>
                    <span>{new Date(v.date || v.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
            {filteredViolations.length === 0 && !loading && (
              <div className="p-8 text-center text-gray-400 text-xs">No violations recorded.</div>
            )}
          </div>
        </div>

        {/* Right Column: Investigation & Traceability Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedViolation ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                      {selectedViolation.severity || 'HIGH'} SEVERITY
                    </span>
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedViolation.violationCode || selectedViolation.id}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Triggered: {new Date(selectedViolation.date || selectedViolation.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenUpdate(selectedViolation)}
                  className="bg-[#064E3B] hover:bg-[#065F46] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  Update Decision / Status
                </button>
              </div>

              {/* Violation Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="block font-bold text-gray-400 uppercase">Violation Type</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block">{selectedViolation.type}</span>
                </div>
                <div>
                  <span className="block font-bold text-gray-400 uppercase">Batch ID</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block">{selectedViolation.batchId || 'N/A'}</span>
                </div>
                <div>
                  <span className="block font-bold text-gray-400 uppercase">Current Status</span>
                  <span className="font-semibold text-red-700 mt-0.5 block">{selectedViolation.status}</span>
                </div>
                <div>
                  <span className="block font-bold text-gray-400 uppercase">Product Type</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block">{selectedViolation.productType || 'MILK'}</span>
                </div>
              </div>

              {/* Evidence & Remarks */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2">
                <div className="font-bold text-gray-700 uppercase">Evidence / Test Notes:</div>
                <p className="text-gray-800 font-mono">{selectedViolation.evidence || selectedViolation.description || 'Residue above reference limit.'}</p>
                {selectedViolation.adminRemarks && (
                  <>
                    <div className="font-bold text-gray-700 uppercase pt-2 border-t border-gray-200">Admin Remarks:</div>
                    <p className="text-gray-800">{selectedViolation.adminRemarks}</p>
                  </>
                )}
              </div>

              {/* Full Traceability Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="text-emerald-700" size={16} /> Traceability Drill-down
                </h3>

                {traceabilityLoading ? (
                  <div className="p-8 text-center text-gray-400 text-xs">Loading batch traceability...</div>
                ) : traceabilityData ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs flex justify-between">
                      <div>
                        <span className="font-bold text-emerald-900">Pooled Batch: {traceabilityData.batch?.batchCode}</span>
                        <p className="text-gray-600 mt-0.5">Collections: {traceabilityData.totalCollections} • Farms: {traceabilityData.totalFarmers}</p>
                      </div>
                      <span className="font-bold text-emerald-800">{traceabilityData.batch?.status}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-gray-700 uppercase">Contributing Animals &amp; Treatments:</div>
                      {traceabilityData.animals?.map((a: any) => (
                        <div key={a.id} className="p-3 bg-white rounded-lg border border-gray-200 text-xs space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-900">{a.name} ({a.animalCode || a.tagNumber}) - {a.farm?.name}</span>
                            <span className={`px-2 py-0.5 rounded font-bold ${a.mrlStatus === 'CLEARED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {a.mrlStatus}
                            </span>
                          </div>
                          {a.treatments && a.treatments.length > 0 && (
                            <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded">
                              <span className="font-semibold">Recent Treatment:</span> {a.treatments[0]?.drugName} ({a.treatments[0]?.dosage}) on {new Date(a.treatments[0]?.administrationDate).toLocaleDateString()}
                              {a.treatments[0]?.withdrawalCompletionDate && (
                                <span> • Withdrawal Ends: {new Date(a.treatments[0]?.withdrawalCompletionDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-400 text-xs bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    No batch traceability directly linked to this violation record.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-400 text-sm">
              Select a violation from the left panel to inspect full traceability and recorded treatments.
            </div>
          )}
        </div>
      </div>

      {/* Update Status Modal */}
      {isUpdateModalOpen && (
        <Modal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} title="Update Investigation Status" icon="fa-gavel">
          <form onSubmit={handleSaveStatus} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Decision / Status *</label>
              <select
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
              >
                <option value="PENDING_INVESTIGATION">PENDING_INVESTIGATION</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="CONFIRMED">CONFIRMED (Violation Upheld)</option>
                <option value="DISMISSED">DISMISSED (False Alarm / Cleared)</option>
                <option value="RESOLVED">RESOLVED (Action Taken)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Official Findings / Remarks *</label>
              <textarea
                required
                rows={3}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Enter investigation conclusion and official action taken..."
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#064E3B] hover:bg-[#065F46] text-white px-5 py-2 rounded-lg text-sm font-bold"
              >
                {submitting ? 'Saving...' : 'Save Decision'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
