'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { Droplets, Plus, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Mirrors api-services/src/common/products.ts, which enforces the same rule.
const PRODUCT_SOURCES: Record<string, { species: string[]; femaleOnly: boolean }> = {
  MILK: { species: ['CATTLE', 'BUFFALO', 'GOAT', 'SHEEP'], femaleOnly: true },
  MEAT: { species: ['CATTLE', 'BUFFALO', 'GOAT', 'SHEEP', 'PIG', 'POULTRY'], femaleOnly: false },
  EGGS: { species: ['POULTRY'], femaleOnly: true },
};

const canProduce = (animal: any, productType: string) => {
  const source = PRODUCT_SOURCES[productType];
  if (!source) return true;
  if (!source.species.includes(String(animal.species ?? '').toUpperCase())) return false;
  return !(source.femaleOnly && String(animal.gender ?? '').toUpperCase() === 'MALE');
};

const BATCH_PREFIX = 'BATCH-';

export default function milkcollectionPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Step 1 state
  const [step, setStep] = useState(1);
  const [searchFarmerId, setSearchFarmerId] = useState('');
  const [fetchingAnimals, setFetchingAnimals] = useState(false);
  const [farmerAnimals, setFarmerAnimals] = useState<any[]>([]);
  const [availableFarmers, setAvailableFarmers] = useState<string[]>([]);
  
  // Step 2 state
  // animalId -> quantity (may be blank)
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [batchId, setBatchId] = useState('');
  const [openBatches, setOpenBatches] = useState<any[]>([]);
  const [collectionCenter, setCollectionCenter] = useState('');
  const [productType, setProductType] = useState('MILK');

  const { user } = useAuth();
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  // One row per batch; collections recorded without a batch keep their own lot ID.
  const groups = Object.values(
    data.reduce((acc: Record<string, { key: string; batchCode: string; status?: string; items: any[] }>, item: any) => {
      const key = item.collectionBatch?.id ?? `lot:${item.batchId ?? item.id}`;
      acc[key] ??= { key, batchCode: item.collectionBatch?.batchCode ?? item.batchId ?? item.collectionCode, status: item.collectionBatch?.status, items: [] };
      acc[key].items.push(item);
      return acc;
    }, {}),
  ) as { key: string; batchCode: string; status?: string; items: any[] }[];

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/milk-collections');
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchFarmerId) return;
    
    // Check if farm actually exists
    const farmExists = availableFarmers.some(fId => fId.toLowerCase().includes(searchFarmerId.toLowerCase()));
    if (!farmExists) {
      alert(`No farm exists matching: ${searchFarmerId}`);
      return;
    }

    setFetchingAnimals(true);
    try {
      const allAnimals = await apiFetch('/animals');
      const filtered = allAnimals.filter((a: any) => 
        a.farm?.farmerId?.toLowerCase().includes(searchFarmerId.toLowerCase())
      );
      setFarmerAnimals(filtered);
      setStep(2);
    } catch (e: any) {
      alert(e.message || 'Failed to fetch animals');
    } finally {
      setFetchingAnimals(false);
    }
  };

  const selectedIds = Object.keys(selected);
  const batchesForProduct = openBatches.filter((b) => b.productType === productType);
  const eligibleAnimals = farmerAnimals.filter((a) => canProduce(a, productType));
  const hiddenCount = farmerAnimals.length - eligibleAnimals.length;
  const matchedBatch = openBatches.find((b) => b.batchCode === batchId.trim().toUpperCase());

  const suggestBatchId = async (prefix: string) => {
    try {
      const res = await apiFetch(`/collection-batches/next-code?prefix=${encodeURIComponent(prefix)}`);
      setBatchId(res.batchCode);
    } catch {
      setBatchId(`${prefix.toUpperCase()}0001`);
    }
  };

  const changeProduct = (next: string) => {
    setProductType(next);
    // Drop animals that cannot produce the newly chosen product.
    setSelected((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => canProduce(farmerAnimals.find((a) => a.id === id), next))),
    );
  };

  const toggleAnimal = (animalId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (animalId in next) delete next[animalId];
      else next[animalId] = '';
      return next;
    });
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      alert('Please select at least one animal.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch('/milk-collections/bulk', {
        method: 'POST',
        body: JSON.stringify({
          batchId,
          productType,
          collectionCenter,
          animals: selectedIds.map((animalId) => ({ animalId, quantity: selected[animalId] })),
        }),
      });
      alert(`${res.count} collection(s) added to batch ${res.batchCode}.`);
      setIsModalOpen(false);
      setStep(1);
      setSearchFarmerId('');
      setFarmerAnimals([]);
      setSelected({});
      setBatchId('');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to create record');
    } finally {
      setSubmitting(false);
    }
  };

  const openNewRecordModal = async () => {
    setStep(1);
    setSearchFarmerId('');
    setFarmerAnimals([]);
    setSelected({});
    setCollectionCenter('');
    setProductType('MILK');
    setIsModalOpen(true);
    setBatchId('');
    suggestBatchId(BATCH_PREFIX);

    apiFetch('/collection-batches')
      .then((res) => setOpenBatches(Array.isArray(res) ? res.filter((b: any) => b.status === 'CREATED' || b.status === 'COLLECTED') : []))
      .catch(() => setOpenBatches([]));

    try {
      const farms = await apiFetch('/farms');
      const uniqueFarmerIds = Array.from(new Set(
        farms
          .map((f: any) => f.farmerId)
          .filter((id: any) => id)
      )) as string[];
      setAvailableFarmers(uniqueFarmerIds);
    } catch (e) {
      console.error('Failed to load farms', e);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Droplets className="text-emerald-600" />
            Product Collection Records
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage collection batches and verify product restriction status before intake.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="p-2 text-gray-500 hover:text-emerald-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all"><RefreshCw size={18} /></button>
          <button 
            onClick={openNewRecordModal}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> New Record
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Loader /></div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4 font-semibold">Batch ID</th>
                  <th className="px-6 py-4 font-semibold">Farmer ID</th>
                  <th className="px-6 py-4 font-semibold">Animals</th>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Total Quantity</th>
                  <th className="px-6 py-4 font-semibold">Collection Date</th>
                  <th className="px-6 py-4 font-semibold">Batch Status</th>
                  <th className="px-6 py-4 font-semibold">Restriction Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups.map((g) => {
                  const restricted = g.items.some((i) => i.animal?.mrlStatus && i.animal.mrlStatus !== 'CLEARED');
                  const farmers = Array.from(new Set(g.items.map((i) => i.farm?.farmerId).filter(Boolean)));
                  const total = g.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
                  const expanded = expandedBatch === g.key;
                  return (
                    <React.Fragment key={g.key}>
                      <tr onClick={() => setExpandedBatch(expanded ? null : g.key)} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          <span className="inline-flex items-center gap-1">
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {g.batchCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{farmers.join(', ') || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{g.items.length}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{g.items[0].productType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{total > 0 ? total : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(g.items[0].collectionDate || g.items[0].date || g.items[0].createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-600">{g.status || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          {restricted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800"><AlertTriangle size={12} /> Restricted</span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">Cleared</span>
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-emerald-50/30">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {g.items.map((i) => (
                                <div key={i.id} className="p-3 bg-white rounded-lg border border-emerald-100 text-xs">
                                  <div className="font-bold text-gray-900">{i.animal?.name || i.animal?.animalCode || 'Unknown animal'}</div>
                                  <div className="text-gray-600 mt-0.5">{i.animal?.animalCode} • Farmer {i.farm?.farmerId || 'N/A'}</div>
                                  <div className="text-gray-500 mt-0.5">Quantity: {i.quantity ?? '-'} • {i.collectionCode}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Product Collection" icon={Droplets}>
          {step === 1 ? (
            <form onSubmit={handleSearchFarmer} className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">First, identify the farmer to view their animals and clearance status.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Farmer ID</label>
                <input 
                  type="text"
                  required
                  list="modal-farmer-list"
                  value={searchFarmerId} 
                  onChange={(e) => setSearchFarmerId(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  placeholder="Type to search or select a Farmer ID..."
                />
                <datalist id="modal-farmer-list">
                  {availableFarmers.map(fId => (
                    <option key={fId} value={fId} />
                  ))}
                </datalist>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={fetchingAnimals} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-70">
                  {fetchingAnimals ? 'Searching...' : 'Next'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateRecord} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                <select value={productType} onChange={(e) => changeProduct(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm">
                  <option value="MILK">Milk</option>
                  <option value="MEAT">Meat</option>
                  <option value="EGGS">Eggs</option>
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Select Animals for Collection
                    {selectedIds.length > 0 && <span className="ml-1 text-emerald-700">({selectedIds.length} selected)</span>}
                  </h3>
                  <button type="button" onClick={() => setStep(1)} className="text-xs text-emerald-600 hover:underline">Change Farmer</button>
                </div>
                
                {farmerAnimals.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">No animals found for Farmer ID: <strong>{searchFarmerId}</strong></p>
                ) : eligibleAnimals.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">None of this farmer&apos;s animals can produce {productType.toLowerCase()}.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {eligibleAnimals.map(animal => {
                      const restricted = animal.mrlStatus && animal.mrlStatus !== 'CLEARED';
                      const isSelected = animal.id in selected;
                      return (
                        <label key={animal.id} className={`flex items-start gap-3 p-2 rounded border transition-colors ${restricted ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            className="mt-1 cursor-pointer"
                            disabled={restricted}
                            checked={isSelected}
                            onChange={() => toggleAnimal(animal.id)}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-sm text-gray-900">{animal.name || animal.animalCode}</span>
                              {restricted ? (
                                <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Restricted</span>
                              ) : (
                                <span className="text-[10px] uppercase font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Cleared</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{animal.species} • Status: {animal.status}</div>
                            {restricted && (
                              <div className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle size={10} /> Active withdrawal period</div>
                            )}
                            {isSelected && (
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="Quantity (optional)"
                                value={selected[animal.id]}
                                onChange={(e) => setSelected((prev) => ({ ...prev, [animal.id]: e.target.value }))}
                                className="mt-2 w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                {hiddenCount > 0 && (
                  <p className="text-xs text-gray-500 mt-2">{hiddenCount} animal(s) hidden — they cannot produce {productType.toLowerCase()}.</p>
                )}
              </div>

              {eligibleAnimals.length > 0 && (
                <>
                  <div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batch ID</label>
                      <input
                        type="text"
                        required
                        list="open-batch-list"
                        value={batchId}
                        onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        placeholder="e.g. BATCH-0001"
                      />
                      <datalist id="open-batch-list">
                        {batchesForProduct.map((b) => (
                          <option key={b.id} value={b.batchCode}>{`${b.collectionCenter || 'No centre'} (${b.collections?.length || 0} collections)`}</option>
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <p className="text-xs -mt-2 text-gray-500">
                    {matchedBatch
                      ? matchedBatch.productType === productType
                        ? `Adds to open batch ${matchedBatch.batchCode} (${matchedBatch.collections?.length || 0} collections so far).`
                        : `Batch ${matchedBatch.batchCode} is for ${matchedBatch.productType} and cannot take ${productType}.`
                      : 'A new batch will be opened with this ID.'}
                  </p>
                  {!matchedBatch && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Collection Center</label>
                      <input type="text" value={collectionCenter} onChange={(e) => setCollectionCenter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm" placeholder="e.g. Village Bulk Milk Cooler 04" />
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={submitting || selectedIds.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-70">
                  {submitting ? 'Saving...' : selectedIds.length > 1 ? `Save ${selectedIds.length} Collections` : 'Save Collection'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
