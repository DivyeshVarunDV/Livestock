'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Plus, Check, X, Search, Package, Droplets, Calendar, Building, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import Modal from '@/components/Modal';

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    productType: 'MILK',
    collectionDate: new Date().toISOString().substring(0, 10),
    collectionCenter: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiFetch('/collection-batches').catch(() => []);
      setBatches(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
      case 'RELEASED':
        return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">PASSED</span>;
      case 'FAILED':
      case 'REJECTED':
        return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">FAILED</span>;
      case 'UNDER_INVESTIGATION':
        return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">INVESTIGATION</span>;
      case 'TESTING':
        return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">TESTING</span>;
      case 'COLLECTED':
        return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">COLLECTED</span>;
      default:
        return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">{status || 'CREATED'}</span>;
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/collection-batches/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/collection-batches', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          collectionDate: new Date(formData.collectionDate).toISOString(),
        }),
      });
      setIsModalOpen(false);
      setFormData({
        productType: 'MILK',
        collectionDate: new Date().toISOString().substring(0, 10),
        collectionCenter: '',
        notes: '',
      });
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBatches = batches.filter((b) => {
    const s = search.toLowerCase();
    return (
      (b.batchCode || '').toLowerCase().includes(s) ||
      (b.productType || '').toLowerCase().includes(s) ||
      (b.collectionCenter || '').toLowerCase().includes(s) ||
      (b.status || '').toLowerCase().includes(s)
    );
  });

  const totalBatches = batches.length;
  const testingCount = batches.filter((b) => b.status === 'TESTING').length;
  const passedCount = batches.filter((b) => b.status === 'PASSED' || b.status === 'RELEASED').length;
  const failedCount = batches.filter((b) => b.status === 'FAILED' || b.status === 'REJECTED' || b.status === 'UNDER_INVESTIGATION').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-emerald-700" size={26} /> Collection Batches
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Aggregate individual product collections into traceable batches for laboratory compliance testing.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[#064E3B] hover:bg-[#065F46] text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
        >
          <Plus size={18} /> Create Batch
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Batches</div>
          <div className="text-3xl font-extrabold text-gray-900">{totalBatches}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">In Testing</div>
          <div className="text-3xl font-extrabold text-blue-700">{testingCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Passed / Cleared</div>
          <div className="text-3xl font-extrabold text-emerald-700">{passedCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Failed / Alert</div>
          <div className="text-3xl font-extrabold text-red-700">{failedCount}</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search batches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
            />
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Showing {filteredBatches.length} batches
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Batch Code</th>
                <th className="px-5 py-3.5">Product</th>
                <th className="px-5 py-3.5">Collection Date</th>
                <th className="px-5 py-3.5">Center</th>
                <th className="px-5 py-3.5 text-center">Collections</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Quick Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBatches.map((b) => (
                <React.Fragment key={b.id}>
                  <tr className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setExpandedBatchId(expandedBatchId === b.id ? null : b.id)}
                        className="font-bold text-gray-900 hover:text-emerald-700 flex items-center gap-1.5"
                      >
                        {b.batchCode || b.id}
                        {expandedBatchId === b.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-800">{b.productType}</td>
                    <td className="px-5 py-4 text-xs text-gray-600">
                      {b.collectionDate ? new Date(b.collectionDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-700">{b.collectionCenter || 'Main Center'}</td>
                    <td className="px-5 py-4 text-center font-bold text-gray-800">{b.collections?.length || 0}</td>
                    <td className="px-5 py-4">{getStatusBadge(b.status)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => updateStatus(b.id, 'PASSED')}
                          title="Mark Passed"
                          className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-700 transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => updateStatus(b.id, 'FAILED')}
                          title="Flag as Failed"
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedBatchId === b.id && (
                    <tr className="bg-emerald-50/30">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
                          Traceability: Pooled Collections in {b.batchCode}
                        </div>
                        {b.collections && b.collections.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {b.collections.map((c: any) => (
                              <div key={c.id} className="p-3 bg-white rounded-lg border border-emerald-100 text-xs">
                                <div className="font-bold text-gray-900">{c.farm?.farmerId || 'Farmer'} ({c.farm?.name})</div>
                                <div className="text-gray-600 mt-1">Animal: {c.animal?.animalCode || c.animal?.tagNumber || 'Unknown'}</div>
                                <div className="text-gray-500 text-[11px] mt-0.5">Quantity: {c.quantity || 'N/A'} L</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 italic">No collections currently linked to this batch.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredBatches.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                    No collection batches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Batch Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Collection Batch" icon="fa-plus">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product Type *</label>
              <select
                required
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
              >
                <option value="MILK">MILK</option>
                <option value="MEAT">MEAT</option>
                <option value="EGGS">EGGS</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Collection Date *</label>
              <input
                type="date"
                required
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                value={formData.collectionDate}
                onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Collection Center *</label>
              <input
                required
                placeholder="e.g. Village Bulk Milk Cooler 04"
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                value={formData.collectionCenter}
                onChange={(e) => setFormData({ ...formData, collectionCenter: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notes / Target Lab</label>
              <textarea
                rows={2}
                placeholder="Optional notes or destination lab"
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                disabled={submitting}
                className="bg-[#064E3B] hover:bg-[#065F46] text-white px-5 py-2 rounded-lg text-sm font-bold"
              >
                {submitting ? 'Creating...' : 'Create Batch'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
