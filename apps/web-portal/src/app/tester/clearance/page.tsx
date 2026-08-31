'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { Search, Shield, ShieldCheck, ShieldAlert, AlertTriangle, User, Plus, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

export default function TesterClearancePage() {
  const [farmerId, setFarmerId] = useState('');
  const [animalSearch, setAnimalSearch] = useState('');
  const [farms, setFarms] = useState<any[]>([]);
  const [farmerData, setFarmerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/farms').then((res) => {
      setFarms(Array.isArray(res) ? res : []);
    }).catch(() => {});
  }, []);

  const handleSearch = async (targetFarmerId?: string) => {
    const q = (targetFarmerId || farmerId).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/product-clearances/farmer/${encodeURIComponent(q)}`);
      setFarmerData(res);
    } catch (err: any) {
      setError(err?.message || `No active farm found with ID "${q}"`);
      setFarmerData(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnimals = (farmerData?.animals || []).filter((a: any) => {
    if (!animalSearch) return true;
    const s = animalSearch.toLowerCase();
    return (
      (a.animalCode || '').toLowerCase().includes(s) ||
      (a.tagNumber || '').toLowerCase().includes(s) ||
      (a.name || '').toLowerCase().includes(s)
    );
  });

  const totalAnimals = farmerData?.animals?.length || 0;
  const clearedAnimals = (farmerData?.animals || []).filter((a: any) => a.mrlStatus === 'CLEARED').length;
  const restrictedAnimals = totalAnimals - clearedAnimals;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="text-emerald-700" size={26} /> Product Clearance Verification
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Verify withdrawal status and product-specific clearance (Milk, Meat, Eggs) before accepting collection.
        </p>
      </div>

      {/* Search Box */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              list="farm-ids"
              type="text"
              placeholder="Enter or select Farmer ID (e.g. FARM001)..."
              value={farmerId}
              onChange={(e) => setFarmerId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
            />
            <datalist id="farm-ids">
              {farms.map((f) => (
                <option key={f.id} value={f.farmerId || f.name}>
                  {f.ownerName || f.fullName} - {f.name}
                </option>
              ))}
            </datalist>
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading || !farmerId}
            className="bg-[#064E3B] hover:bg-[#065F46] text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying...' : 'Check Clearance'}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle size={15} /> {error}
          </div>
        )}
      </div>

      {/* Farmer Summary & Animals List */}
      {farmerData && (
        <div className="space-y-6 animate-fade-in">
          {/* Farmer Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                  {farmerData.farm?.farmerId || 'FARM'}
                </span>
                <h2 className="text-xl font-bold text-gray-900">{farmerData.farm?.ownerName || farmerData.farm?.name}</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Farm: {farmerData.farm?.name} • Address: {farmerData.farm?.address || 'N/A'}
              </p>
            </div>

            <div className="flex gap-4">
              <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                <div className="text-[10px] font-bold uppercase text-emerald-700">Cleared Animals</div>
                <div className="text-xl font-extrabold text-emerald-800">{clearedAnimals}</div>
              </div>
              <div className="px-4 py-2 bg-red-50 border border-red-100 rounded-lg text-center">
                <div className="text-[10px] font-bold uppercase text-red-700">Restricted</div>
                <div className="text-xl font-extrabold text-red-800">{restrictedAnimals}</div>
              </div>
            </div>
          </div>

          {/* Animals Grid */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Filter animals in this farm..."
                  value={animalSearch}
                  onChange={(e) => setAnimalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
                />
              </div>
              <span className="text-xs font-semibold text-gray-500">
                Showing {filteredAnimals.length} of {totalAnimals} animals
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredAnimals.map((animal: any) => {
                const isCleared = animal.mrlStatus === 'CLEARED';
                return (
                  <div key={animal.id} className="p-5 hover:bg-gray-50/60 transition-colors">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900">
                            <Link href={`/animals/${animal.id}`} className="hover:text-emerald-700 hover:underline">
                              {animal.name} ({animal.animalCode || animal.tagNumber})
                            </Link>
                          </h3>
                          <span className="text-xs font-medium text-gray-500">
                            {animal.species} • {animal.breed}
                          </span>
                        </div>

                        {/* Product Specific Clearances */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {Object.entries(animal.clearances || {}).map(([productType, cData]: [string, any]) => {
                            const cleared = cData.status === 'CLEARED';
                            return (
                              <div
                                key={productType}
                                className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
                                  cleared
                                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                                    : 'bg-red-50/80 border-red-200 text-red-800'
                                }`}
                              >
                                {cleared ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-red-600" />}
                                <span className="font-bold">{productType}:</span>
                                <span>{cData.status}</span>
                                {cData.restrictionEnd && !cleared && (
                                  <span className="text-[10px] text-red-600 font-medium">
                                    (Until {new Date(cData.restrictionEnd).toLocaleDateString()})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        {isCleared ? (
                          <Link
                            href={`/milk-collection?animalId=${animal.id}&farmId=${farmerData.farm?.id}`}
                            className="inline-flex items-center gap-1.5 bg-[#064E3B] hover:bg-[#065F46] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                          >
                            <Plus size={14} /> Record Collection
                          </Link>
                        ) : (
                          <div className="px-3 py-1.5 rounded-lg bg-red-100 text-red-800 text-xs font-bold flex items-center gap-1.5">
                            <ShieldAlert size={14} /> RESTRICTED — DO NOT COLLECT
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredAnimals.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No animals found for this farm.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
