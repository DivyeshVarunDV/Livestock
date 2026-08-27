'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { FlaskConical, Plus, RefreshCw, Search, Eye, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function MilkTestingPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);

  // Form Fields
  const [batchId, setBatchId] = useState('');
  const [sampleId, setSampleId] = useState('');
  const [productType, setProductType] = useState('MILK');
  const [testType, setTestType] = useState('ANTIBIOTIC_RESIDUE');
  const [result, setResult] = useState('PASS');
  const [location, setLocation] = useState('Central Quality Lab');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  const { user } = useAuth();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/milk-tests');
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('Failed to fetch milk tests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewRecordModal = async () => {
    setBatchId('');
    setSampleId(`SMP-${Math.floor(100000 + Math.random() * 900000)}`);
    setProductType('MILK');
    setTestType('ANTIBIOTIC_RESIDUE');
    setResult('PASS');
    setLocation('Central Quality Lab');
    setTestDate(new Date().toISOString().split('T')[0]);
    setRemarks('');
    setIsModalOpen(true);

    try {
      const collections = await apiFetch('/milk-collections');
      if (Array.isArray(collections)) {
        const batches = Array.from(new Set(collections.map((c: any) => c.batchId).filter(Boolean))) as string[];
        setAvailableBatches(batches);
      }
    } catch (e) {
      console.error('Failed to load collections for batch list:', e);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId.trim()) {
      alert('Please enter or select a Batch ID.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/milk-tests', {
        method: 'POST',
        body: JSON.stringify({
          batchId: batchId.trim(),
          sampleId: sampleId.trim() || undefined,
          productType,
          type: testType,
          result,
          location,
          testingLocation: location,
          testDate: new Date(testDate).toISOString(),
          date: new Date(testDate).toISOString(),
          remarks: remarks.trim() || undefined,
          notes: remarks.trim() || undefined,
          recordedById: user?.id,
          recordedByName: user?.name || 'Testing Officer',
        }),
      });

      setIsModalOpen(false);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to create test record');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredData = data.filter((item: any) => {
    const matchSearch =
      (item.batchId || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.sampleId || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.type || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.testingLocation || item.location || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(search.toLowerCase());

    const matchResult = resultFilter ? item.result === resultFilter : true;
    return matchSearch && matchResult;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="text-emerald-600" />
            Product Testing Records
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Record PASS / FAIL / PENDING results and trigger investigations for failed tests.
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
              placeholder="Search by batch, sample, type, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white transition-shadow"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white min-w-[140px]"
            >
              <option value="">All Results</option>
              <option value="PASS">Pass</option>
              <option value="FAIL">Fail</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader /></div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {data.length === 0 ? 'No test records found.' : 'No test records matching your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4 font-semibold">Test ID</th>
                  <th className="px-6 py-4 font-semibold">Batch ID</th>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Test Type</th>
                  <th className="px-6 py-4 font-semibold">Result</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.testCode || `${item.id.substring(0, 8)}...`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                      {item.batchId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.productType || 'MILK'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.type?.replace(/_/g, ' ') || 'ANTIBIOTIC RESIDUE'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold ${
                          item.result === 'PASS'
                            ? 'bg-green-100 text-green-800'
                            : item.result === 'FAIL'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.result === 'PASS' && <CheckCircle2 size={12} />}
                        {item.result === 'FAIL' && <AlertTriangle size={12} />}
                        {item.result === 'PENDING' && <Clock size={12} />}
                        {item.result}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.testingLocation || item.location || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.testDate || item.date || item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md hover:bg-emerald-100 transition-colors"
                      >
                        <Eye size={13} />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Test Record Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="New Product Quality / Residue Test"
          icon={FlaskConical}
        >
          <form onSubmit={handleCreateRecord} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="testing-batch-list"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  placeholder="e.g. BATCH-1001"
                />
                <datalist id="testing-batch-list">
                  {availableBatches.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sample ID
                </label>
                <input
                  type="text"
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  placeholder="e.g. SMP-89212"
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
                  Test Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                >
                  <option value="ANTIBIOTIC_RESIDUE">Antibiotic Residue (MRL)</option>
                  <option value="SOMATIC_CELL_COUNT">Somatic Cell Count (SCC)</option>
                  <option value="AFLATOXIN_M1">Aflatoxin M1 Screening</option>
                  <option value="PESTICIDE_RESIDUE">Pesticide Residue</option>
                  <option value="MICROBIAL_CONTAMINATION">Microbial Contamination</option>
                  <option value="HEAVY_METALS">Heavy Metals Screening</option>
                  <option value="ADULTERATION_CHECK">Adulteration / Quality Check</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Result <span className="text-red-500">*</span>
                </label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm font-semibold ${
                    result === 'PASS'
                      ? 'border-green-300 bg-green-50/50 text-green-800'
                      : result === 'FAIL'
                      ? 'border-red-300 bg-red-50/50 text-red-800'
                      : 'border-amber-300 bg-amber-50/50 text-amber-800'
                  }`}
                >
                  <option value="PASS">PASS (Compliant)</option>
                  <option value="FAIL">FAIL (Non-Compliant / Violation Triggered)</option>
                  <option value="PENDING">PENDING (Under Analysis)</option>
                </select>
                {result === 'FAIL' && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> Saving a FAIL result automatically logs an investigation violation.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Testing Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  placeholder="e.g. Central Quality Lab"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Date
                </label>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes & Analysis Remarks
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  placeholder="e.g. No antibiotic residues detected above safety limits."
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
                {submitting ? 'Saving...' : 'Save Test Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details View Modal */}
      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title="Product Test Details"
          icon={FlaskConical}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Test ID</span>
                <span className="text-sm font-mono text-gray-900">{selectedRecord.id}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Batch ID</span>
                <span className="text-sm font-bold text-gray-900">{selectedRecord.batchId}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Sample ID</span>
                <span className="text-sm text-gray-800">{selectedRecord.sampleId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Product Type</span>
                <span className="text-sm text-gray-800">{selectedRecord.productType || 'MILK'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Test Type</span>
                <span className="text-sm font-medium text-gray-800">{selectedRecord.type}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Result</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold mt-0.5 ${
                    selectedRecord.result === 'PASS'
                      ? 'bg-green-100 text-green-800'
                      : selectedRecord.result === 'FAIL'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedRecord.result}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Testing Location</span>
                <span className="text-sm text-gray-800">{selectedRecord.testingLocation || selectedRecord.location || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Recorded By</span>
                <span className="text-sm text-gray-800">{selectedRecord.recordedByName || 'System Tester'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Test Date</span>
                <span className="text-sm text-gray-800">
                  {new Date(selectedRecord.testDate || selectedRecord.date || selectedRecord.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {selectedRecord.notes && (
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase mb-1">Remarks & Observations</span>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {selectedRecord.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
