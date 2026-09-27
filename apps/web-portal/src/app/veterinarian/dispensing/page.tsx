'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, Pill, CheckCircle, Package, User, Calendar, AlertCircle } from 'lucide-react';
import Modal from '@/components/Modal';

export default function MedicineDispensingPage() {
  const { user } = useAuth();
  const [dispensingRecords, setDispensingRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    prescriptionId: '',
    animalId: '',
    medicine: '',
    quantity: '1',
    dispensedDate: new Date().toISOString().substring(0, 10),
    dispensedBy: user?.name || 'Veterinarian',
    batchNumber: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [recordsRes, prescriptionsRes] = await Promise.all([
        apiFetch('/medicine-dispensing').catch(() => []),
        apiFetch('/prescriptions').catch(() => []),
      ]);
      setDispensingRecords(Array.isArray(recordsRes) ? recordsRes : []);
      setPrescriptions(Array.isArray(prescriptionsRes) ? prescriptionsRes : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handlePrescriptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    const p = prescriptions.find((x) => x.id === pId);
    if (p) {
      setFormData({
        ...formData,
        prescriptionId: pId,
        animalId: p.animalId || '',
        medicine: p.medicine || '',
      });
    } else {
      setFormData({ ...formData, prescriptionId: pId, animalId: '', medicine: '' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        quantity: parseFloat(formData.quantity) || 1,
        dispensedDate: new Date(formData.dispensedDate).toISOString(),
      };
      await apiFetch('/medicine-dispensing', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      setFormData({
        prescriptionId: '',
        animalId: '',
        medicine: '',
        quantity: '1',
        dispensedDate: new Date().toISOString().substring(0, 10),
        dispensedBy: user?.name || 'Veterinarian',
        batchNumber: '',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to record dispensing');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = dispensingRecords.filter((r) => {
    const s = search.toLowerCase();
    return (
      (r.dispensingCode || '').toLowerCase().includes(s) ||
      (r.animal?.animalCode || r.animal?.tagNumber || r.animalId || '').toLowerCase().includes(s) ||
      (r.medicine || '').toLowerCase().includes(s) ||
      (r.batchNumber || '').toLowerCase().includes(s) ||
      (r.dispensedBy || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Pill className="text-emerald-700" size={26} /> Medicine Dispensing
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track authorized veterinary drug dispensing linked directly to digital prescriptions.
          </p>
        </div>
        <button
          onClick={() => {
            setError('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-[#064E3B] hover:bg-[#065F46] text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
        >
          <Plus size={18} /> Record Dispensing
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Dispensed</div>
            <div className="text-2xl font-extrabold text-gray-900">{dispensingRecords.length}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-700"><Package size={24} /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Active Prescriptions</div>
            <div className="text-2xl font-extrabold text-gray-900">{prescriptions.filter((p) => p.status === 'ACTIVE').length}</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-700"><Pill size={24} /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Today's Dispensing</div>
            <div className="text-2xl font-extrabold text-gray-900">
              {dispensingRecords.filter((r) => new Date(r.dispensedDate).toDateString() === new Date().toDateString()).length}
            </div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-purple-700"><Calendar size={24} /></div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by code, animal, medicine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
            />
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Showing {filteredRecords.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Animal</th>
                <th className="px-5 py-3.5">Prescription</th>
                <th className="px-5 py-3.5">Medicine</th>
                <th className="px-5 py-3.5 text-center">Qty</th>
                <th className="px-5 py-3.5">Batch / Lot</th>
                <th className="px-5 py-3.5">Dispensed By</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-4 font-bold text-gray-900">{r.dispensingCode || 'DISP-'}</td>
                  <td className="px-5 py-4 font-semibold text-emerald-800">
                    {r.animal?.animalCode || r.animal?.tagNumber || r.animalId}
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-gray-600">
                    {r.prescription?.prescriptionCode || r.prescriptionId?.slice(0, 8)}
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900">{r.medicine}</td>
                  <td className="px-5 py-4 text-center font-bold text-gray-800">{r.quantity}</td>
                  <td className="px-5 py-4 text-xs text-gray-600">{r.batchNumber || '-'}</td>
                  <td className="px-5 py-4 text-gray-700">{r.dispensedBy}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    {r.dispensedDate ? new Date(r.dispensedDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <CheckCircle size={12} /> Dispensed
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-gray-500">
                    No medicine dispensing records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Dispensing Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Medicine Dispensing" icon="fa-medkit">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Prescription *</label>
              <select
                required
                name="prescriptionId"
                value={formData.prescriptionId}
                onChange={handlePrescriptionChange}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
              >
                <option value="">-- Choose Prescription --</option>
                {prescriptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.prescriptionCode || p.id.slice(0, 8)} - {p.medicine} ({p.animal?.animalCode || p.animal?.tagNumber || 'Animal'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Animal ID</label>
                <input
                  readOnly
                  name="animalId"
                  value={formData.animalId}
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-gray-50 text-gray-600"
                  placeholder="Auto-filled from prescription"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Medicine Name</label>
                <input
                  readOnly
                  name="medicine"
                  value={formData.medicine}
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-gray-50 text-gray-600"
                  placeholder="Auto-filled from prescription"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Quantity Dispensed *</label>
                <input
                  required
                  type="number"
                  step="any"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Batch / Lot Number</label>
                <input
                  name="batchNumber"
                  value={formData.batchNumber}
                  onChange={handleChange}
                  placeholder="e.g. LOT-2026-X1"
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Dispensed Date *</label>
                <input
                  required
                  type="date"
                  name="dispensedDate"
                  value={formData.dispensedDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Dispensed By</label>
                <input
                 
                  name="dispensedBy"
                  value={formData.dispensedBy}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none" readOnly aria-readonly="true" title="Recorded automatically from your signed-in account" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notes / Instructions</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Optional dispensing remarks"
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.prescriptionId}
                className="bg-[#064E3B] hover:bg-[#065F46] text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Confirm Dispensing'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
