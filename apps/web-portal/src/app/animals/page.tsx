'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/Modal';
import { Eye, PawPrint, Search, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Animals() {
  const { user } = useAuth();
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnimal, setSelectedAnimal] = useState<any | null>(null);

  const [animalSearch, setAnimalSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mrlFilter, setMrlFilter] = useState('');

  useEffect(() => {
    async function loadAnimals() {
      setLoading(true);
      try {
        const res = await apiFetch('/animals');
        setAnimals(res || []);
      } catch (err) {
        console.error('Failed to load animals', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnimals();
  }, []);

  const uniqueSpecies = Array.from(new Set(animals.map(a => a.species).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(animals.map(a => a.status).filter(Boolean)));
  const uniqueMrlStatuses = Array.from(new Set(animals.map(a => a.mrlStatus).filter(Boolean)));

  const filteredAnimals = animals.filter(a => {
    const text = animalSearch.toLowerCase();
    const matchSearch =
      a.tagNumber?.toLowerCase().includes(text) ||
      a.animalCode?.toLowerCase().includes(text) ||
      a.name?.toLowerCase().includes(text) ||
      a.breed?.toLowerCase().includes(text) ||
      a.farm?.farmerId?.toLowerCase().includes(text) ||
      a.farm?.ownerName?.toLowerCase().includes(text);

    const matchSpecies = speciesFilter ? a.species === speciesFilter : true;
    const matchStatus = statusFilter ? a.status === statusFilter : true;
    const matchMrl = mrlFilter ? a.mrlStatus === mrlFilter : true;

    return matchSearch && matchSpecies && matchStatus && matchMrl;
  });

  return (
    <div className="flex flex-col gap-6 w-full pb-8 bg-gray-50 min-h-screen">
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Livestock Registry</h1>
            <p className="text-gray-500 mt-1 text-sm">Track animals, farmers, withdrawal restrictions, and product clearance readiness.</p>
          </div>

          {user?.role !== 'tester' && (
            <Link
              href="/animals/new"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
            >
              <Plus size={18} />
              Register Animal
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-500 font-medium">Total Animals:</span>
            <span className="text-sm font-bold text-gray-900">{animals.length || 0}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-sm text-green-700 font-medium">Healthy:</span>
            <span className="text-sm font-bold text-green-700">{animals.filter(a => a.status === 'HEALTHY').length || 0}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
            <span className="text-sm text-orange-700 font-medium">Under Treatment:</span>
            <span className="text-sm font-bold text-orange-700">{animals.filter(a => a.status === 'UNDER_TREATMENT').length || 0}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm text-red-700 font-medium">Restricted:</span>
            <span className="text-sm font-bold text-red-700">{animals.filter(a => a.mrlStatus !== 'CLEARED').length || 0}</span>
          </div>
        </div>
      </div>

      <div className="px-8 flex-1">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading livestock database...</p>
            </div>
          ) : animals.length === 0 ? (
            <div className="text-center py-12">
              <i className="fa fa-paw text-4xl text-gray-300 mb-3 block"></i>
              <h3 className="text-lg font-bold text-gray-700">No animals registered yet</h3>
              <p className="text-gray-500 text-sm mt-1">Use the "Register Animal" quick action to add your first animal.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col xl:flex-row gap-3 items-center justify-between">
                <div className="relative w-full xl:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by animal, farmer, breed, or tag..."
                    value={animalSearch}
                    onChange={(e) => setAnimalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                  />
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                  <select value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white flex-1 min-w-[120px]">
                    <option value="">All Species</option>
                    {uniqueSpecies.map(sp => <option key={String(sp)} value={String(sp)}>{sp}</option>)}
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white flex-1 min-w-[120px]">
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map(st => <option key={String(st)} value={String(st)}>{st}</option>)}
                  </select>
                  <select value={mrlFilter} onChange={(e) => setMrlFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white flex-1 min-w-[120px]">
                    <option value="">All Clearance</option>
                    {uniqueMrlStatuses.map(mrl => <option key={String(mrl)} value={String(mrl)}>{String(mrl).replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-200">
                      <th className="p-4 font-semibold text-gray-900">Animal ID</th>
                      <th className="p-4 font-semibold text-gray-900">Tag</th>
                      <th className="p-4 font-semibold text-gray-900">Name</th>
                      <th className="p-4 font-semibold text-gray-900">Species</th>
                      <th className="p-4 font-semibold text-gray-900">Farmer ID</th>
                      <th className="p-4 font-semibold text-gray-900">Owner</th>
                      <th className="p-4 font-semibold text-gray-900">Status</th>
                      <th className="p-4 font-semibold text-gray-900">Clearance</th>
                      <th className="p-4 font-semibold text-gray-900 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAnimals.length > 0 ? filteredAnimals.map((a, i) => {
                      const activeWithdrawal = (a.withdrawalRecords || [])[0];
                      return (
                        <tr key={i} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="p-4 font-bold text-gray-900">{a.animalCode || 'N/A'}</td>
                          <td className="p-4">{a.tagNumber}</td>
                          <td className="p-4 text-gray-700">{a.name}</td>
                          <td className="p-4 font-medium text-gray-800">{a.species}</td>
                          <td className="p-4">{a.farm?.farmerId || 'N/A'}</td>
                          <td className="p-4">{a.farm?.ownerName || '-'}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                              a.status === 'HEALTHY' ? 'bg-green-100 text-green-800' :
                              a.status === 'UNDER_TREATMENT' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                                a.mrlStatus === 'CLEARED' ? 'bg-green-100 text-green-800' :
                                a.mrlStatus === 'CLEARING_SOON' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {a.mrlStatus === 'DO_NOT_SELL' ? 'RESTRICTED' : a.mrlStatus.replace('_', ' ')}
                              </span>
                              {activeWithdrawal ? <div className="text-[11px] text-gray-500">Until {new Date(activeWithdrawal.withdrawalEndDate).toLocaleDateString()}</div> : null}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => setSelectedAnimal(a)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors mr-2">
                              <Eye size={14} />
                              Quick View
                            </button>
                            <Link href={`/animals/${a.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-md hover:bg-green-100 transition-colors">
                              <Eye size={14} />
                              Details
                            </Link>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-500">No animals found matching your criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedAnimal && (
        <Modal isOpen={!!selectedAnimal} onClose={() => setSelectedAnimal(null)} title="Animal Details" icon={PawPrint}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
              <div><span className="text-xs text-gray-500 font-semibold block uppercase">Animal ID</span><span className="text-sm font-bold text-gray-900">{selectedAnimal.animalCode || 'N/A'}</span></div>
              <div><span className="text-xs text-gray-500 font-semibold block uppercase">Tag Number</span><span className="text-sm font-bold text-gray-900">{selectedAnimal.tagNumber}</span></div>
              <div><span className="text-xs text-gray-500 font-semibold block uppercase">Farmer ID</span><span className="text-sm text-gray-800">{selectedAnimal.farm?.farmerId || 'N/A'}</span></div>
              <div><span className="text-xs text-gray-500 font-semibold block uppercase">Owner</span><span className="text-sm text-gray-800">{selectedAnimal.farm?.ownerName || 'N/A'}</span></div>
              <div><span className="text-xs text-gray-500 font-semibold block uppercase">Species</span><span className="text-sm text-gray-800">{selectedAnimal.species}</span></div>
              <div><span className="text-xs text-gray-500 font-semibold block uppercase">Breed</span><span className="text-sm text-gray-800">{selectedAnimal.breed}</span></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
