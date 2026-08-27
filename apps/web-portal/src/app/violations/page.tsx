'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { ShieldAlert, Plus, RefreshCw, Search, Eye, AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ViolationsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Referenced Data
  const [farms, setFarms] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);

  // Form Fields
  const [farmId, setFarmId] = useState('');
  const [animalId, setAnimalId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [productType, setProductType] = useState('MILK');
  const [type, setType] = useState('RESTRICTED_PRODUCT_SUPPLY');
  const [severity, setSeverity] = useState('HIGH');
  const [status, setStatus] = useState('PENDING_INVESTIGATION');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [evidence, setEvidence] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');

  // Detail Modal Edit State
  const [editStatus, setEditStatus] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  const { user } = useAuth();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/violations');
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('Failed to fetch violations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewRecordModal = async () => {
    setFarmId('');
    setAnimalId('');
    setBatchId('');
    setProductType('MILK');
    setType('RESTRICTED_PRODUCT_SUPPLY');
    setSeverity('HIGH');
    setStatus('PENDING_INVESTIGATION');
    setDate(new Date().toISOString().split('T')[0]);
    setEvidence('');
    setAdminRemarks('');
    setIsModalOpen(true);

    try {
      const [farmsData, animalsData] = await Promise.all([
        apiFetch('/farms').catch(() => []),
        apiFetch('/animals').catch(() => []),
      ]);
      setFarms(Array.isArray(farmsData) ? farmsData : []);
      setAnimals(Array.isArray(animalsData) ? animalsData : []);
    } catch (e) {
      console.error('Failed to load farms and animals:', e);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) {
      alert('Please select a Farm / Farmer.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/violations', {
        method: 'POST',
        body: JSON.stringify({
          violationCode: `VIO-${Math.floor(100000 + Math.random() * 900000)}`,
          farmId,
          animalId: animalId || null,
          batchId: batchId.trim() || null,
          productType: productType || null,
          type,
          severity,
          status,
          date: new Date(date).toISOString(),
          evidence: evidence.trim() || null,
          adminRemarks: adminRemarks.trim() || null,
        }),
      });

      setIsModalOpen(false);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to create violation record');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailModal = (record: any) => {
    setSelectedRecord(record);
    setEditStatus(record.status || 'PENDING_INVESTIGATION');
    setEditRemarks(record.adminRemarks || '');
  };

  const handleUpdateViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setUpdatingStatus(true);
    try {
      await apiFetch(`/violations/${selectedRecord.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: editStatus,
          adminRemarks: editRemarks,
          severity: selectedRecord.severity,
          type: selectedRecord.type,
          productType: selectedRecord.productType,
          batchId: selectedRecord.batchId,
          evidence: selectedRecord.evidence,
        }),
      });

      setSelectedRecord(null);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to update violation');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const availableAnimalsForFarm = animals.filter(
    (a: any) => !farmId || a.farmId === farmId
  );

  const filteredData = data.filter((item: any) => {
    const matchSearch =
      (item.violationCode || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.farm?.farmerId || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.farm?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.farm?.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.animal?.animalCode || item.animal?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.batchId || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.type || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter ? item.status === statusFilter : true;
    const matchSeverity = severityFilter ? item.severity === severityFilter : true;
    return matchSearch && matchStatus && matchSeverity;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="text-emerald-600" />
            Violations & Investigations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review restricted product cases, failed tests, and investigation status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 text-gray-500 hover:text-emerald-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={openNewRecordModal}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={16} /> New Record
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by code, farmer, animal, batch, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white transition-shadow"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white min-w-[150px]"
            >
              <option value="">All Statuses</option>
              <option value="PENDING_INVESTIGATION">Pending Investigation</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white min-w-[130px]"
            >
              <option value="">All Severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader /></div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {data.length === 0 ? 'No violation records found.' : 'No violation records matching your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4 font-semibold">Violation Code</th>
                  <th className="px-6 py-4 font-semibold">Farmer / Farm</th>
                  <th className="px-6 py-4 font-semibold">Animal</th>
                  <th className="px-6 py-4 font-semibold">Batch</th>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Severity</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.violationCode || `${item.id.substring(0, 8)}...`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="font-medium text-gray-900">{item.farm?.name || item.farm?.farmerId || 'N/A'}</div>
                      {item.farm?.farmerId && (
                        <div className="text-xs text-gray-500">ID: {item.farm.farmerId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.animal?.animalCode || item.animal?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.batchId || item.milkCollection?.batchId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.productType || item.milkCollection?.productType || 'MILK'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.type?.replace(/_/g, ' ') || 'VIOLATION'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          item.severity === 'CRITICAL'
                            ? 'bg-red-200 text-red-900'
                            : item.severity === 'HIGH'
                            ? 'bg-red-100 text-red-800'
                            : item.severity === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.severity || 'HIGH'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold ${
                          item.status === 'CONFIRMED'
                            ? 'bg-red-100 text-red-800'
                            : item.status === 'RESOLVED'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'DISMISSED'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status === 'RESOLVED' && <CheckCircle2 size={12} />}
                        {item.status === 'CONFIRMED' && <AlertTriangle size={12} />}
                        {item.status === 'PENDING_INVESTIGATION' && <Clock size={12} />}
                        {item.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <button
                        onClick={() => openDetailModal(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md hover:bg-emerald-100 transition-colors"
                      >
                        <Eye size={13} />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Violation Record Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Log Violation / Investigation Report"
          icon={ShieldAlert}
        >
          <form onSubmit={handleCreateRecord} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Farm / Farmer <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={farmId}
                  onChange={(e) => {
                    setFarmId(e.target.value);
                    setAnimalId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                >
                  <option value="">-- Select Farm --</option>
                  {farms.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.farmerId ? `(${f.farmerId})` : ''} - {f.ownerName || 'Owner'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Animal (Optional)
                </label>
                <select
                  value={animalId}
                  onChange={(e) => setAnimalId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                >
                  <option value="">-- None / Batch Level --</option>
                  {availableAnimalsForFarm.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name || a.animalCode || a.tagNumber} ({a.species})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch ID (Optional)
                </label>
                <input
                  type="text"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  placeholder="e.g. BATCH-1001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Type
                </label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                >
                  <option value="MILK">Milk</option>
                  <option value="MEAT">Meat</option>
                  <option value="EGGS">Eggs</option>
                  <option value="HONEY">Honey</option>
                  <option value="DAIRY">Dairy Products</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Violation Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                >
                  <option value="RESTRICTED_PRODUCT_SUPPLY">Restricted Product Supply</option>
                  <option value="FAILED_PRODUCT_TEST">Failed Product Quality / Residue Test</option>
                  <option value="UNAUTHORIZED_ANTIBIOTIC_USE">Unauthorized Antibiotic Usage</option>
                  <option value="WITHDRAWAL_PERIOD_BREACH">Withdrawal Period Breach</option>
                  <option value="MRL_VIOLATION">MRL Limit Violation</option>
                  <option value="UNAUTHORIZED_MOVEMENT">Unauthorized Animal Movement</option>
                  <option value="FAILURE_TO_RECORD_AMU">Failure to Record AMU</option>
                  <option value="OTHER">Other Compliance Breach</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white font-semibold"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Investigation Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                >
                  <option value="PENDING_INVESTIGATION">Pending Investigation</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="CONFIRMED">Confirmed Violation</option>
                  <option value="DISMISSED">Dismissed</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Violation Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evidence & Violation Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  placeholder="Describe the violation, test evidence, or breach details..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action Taken / Admin Remarks
                </label>
                <textarea
                  rows={2}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  placeholder="e.g. Batch quarantined immediately; inspection scheduled."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-70 cursor-pointer flex items-center gap-2"
              >
                {submitting ? 'Saving...' : 'Log Violation'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Review / Status Update Modal */}
      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title={`Violation Details: ${selectedRecord.violationCode || selectedRecord.id.substring(0, 8)}`}
          icon={ShieldAlert}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Violation Code</span>
                <span className="text-sm font-mono text-gray-900 font-bold">{selectedRecord.violationCode || selectedRecord.id}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Farmer / Farm</span>
                <span className="text-sm font-medium text-gray-900">{selectedRecord.farm?.name || selectedRecord.farm?.farmerId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Animal</span>
                <span className="text-sm text-gray-800">{selectedRecord.animal?.name || selectedRecord.animal?.animalCode || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Batch</span>
                <span className="text-sm text-gray-800">{selectedRecord.batchId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Type</span>
                <span className="text-sm font-medium text-gray-800">{selectedRecord.type}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Severity</span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold mt-0.5 ${
                    selectedRecord.severity === 'CRITICAL'
                      ? 'bg-red-200 text-red-900'
                      : selectedRecord.severity === 'HIGH'
                      ? 'bg-red-100 text-red-800'
                      : selectedRecord.severity === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {selectedRecord.severity || 'HIGH'}
                </span>
              </div>
            </div>

            {selectedRecord.evidence && (
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase mb-1">Evidence / Description</span>
                <p className="text-sm text-gray-800 bg-red-50/50 p-3 rounded-lg border border-red-100">
                  {selectedRecord.evidence}
                </p>
              </div>
            )}

            {/* Investigation Status Update Form */}
            <form onSubmit={handleUpdateViolation} className="space-y-3 pt-2 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <FileText size={16} className="text-emerald-600" />
                Update Investigation & Action Taken
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Investigation Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm bg-white font-medium"
                  >
                    <option value="PENDING_INVESTIGATION">Pending Investigation</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="CONFIRMED">Confirmed Violation</option>
                    <option value="DISMISSED">Dismissed</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Investigation Remarks / Resolution</label>
                  <textarea
                    rows={3}
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    placeholder="Enter findings, corrective action taken, or resolution details..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-70 cursor-pointer"
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
