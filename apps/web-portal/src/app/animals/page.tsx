'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/Modal';
import { Eye, PawPrint, Search, Plus, Filter } from 'lucide-react';
import Link from 'next/link';

export default function Animals() {
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
    const matchSearch = 
      a.tagNumber?.toLowerCase().includes(animalSearch.toLowerCase()) || 
      a.name?.toLowerCase().includes(animalSearch.toLowerCase()) ||
      a.breed?.toLowerCase().includes(animalSearch.toLowerCase());
    
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
            <p className="text-gray-500 mt-1 text-sm">Track individual animals, their health status, tags, and MRL compliance.</p>
          </div>
          
          <Link 
            href="/animals/new" 
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
          >
            <Plus size={18} />
            Register Animal
          </Link>
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
            <span className="text-sm text-red-700 font-medium">MRL Issues:</span>
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
                    placeholder="Search by tag, name, or breed..."
                    value={animalSearch}
                    onChange={(e) => setAnimalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                  />
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                  <select
                    value={speciesFilter}
                    onChange={(e) => setSpeciesFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white flex-1 min-w-[120px]"
                  >
                    <option value="">All Species</option>
                    {uniqueSpecies.map(sp => (
                      <option key={String(sp)} value={String(sp)}>{sp}</option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white flex-1 min-w-[120px]"
                  >
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map(st => (
                      <option key={String(st)} value={String(st)}>{st}</option>
                    ))}
                  </select>
                  <select
                    value={mrlFilter}
                    onChange={(e) => setMrlFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white flex-1 min-w-[120px]"
                  >
                    <option value="">All MRL Statuses</option>
                    {uniqueMrlStatuses.map(mrl => (
                      <option key={String(mrl)} value={String(mrl)}>{String(mrl).replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-200">
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Tag Number</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Name</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Species</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Breed</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Gender</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Age (m)</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Weight (kg)</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Status</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">MRL Status</th>
                      <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Farm</th>
                      <th className="p-4 font-semibold text-gray-900 text-right align-middle whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAnimals.length > 0 ? (
                      filteredAnimals.map((a, i) => (
                        <tr key={i} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="p-4 font-bold text-gray-900 align-middle">{a.tagNumber}</td>
                          <td className="p-4 align-middle text-gray-700">{a.name}</td>
                          <td className="p-4 font-medium text-gray-800 align-middle">{a.species}</td>
                          <td className="p-4 align-middle text-gray-700">{a.breed}</td>
                          <td className="p-4 align-middle text-gray-700">{a.gender}</td>
                          <td className="p-4 align-middle text-gray-700">{a.age}</td>
                          <td className="p-4 align-middle text-gray-700">{a.weight}</td>
                          <td className="p-4 align-middle">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                              a.status === 'HEALTHY' ? 'bg-green-100 text-green-800' : 
                              a.status === 'UNDER_TREATMENT' ? 'bg-orange-100 text-orange-800' : 
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="p-4 align-middle">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                              a.mrlStatus === 'CLEARED' ? 'bg-green-100 text-green-800' : 
                              a.mrlStatus === 'CLEARING_SOON' ? 'bg-orange-100 text-orange-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {a.mrlStatus === 'DO_NOT_SELL' ? 'DO NOT SELL' : a.mrlStatus.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-gray-700 align-middle">{a.farm?.name}</td>
                          <td className="p-4 text-right align-middle">
                            <Link 
                              href={`/animals/${a.id}`} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-md hover:bg-green-100 transition-colors"
                            >
                              <Eye size={14} />
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-gray-500">
                          No animals found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500 flex justify-between items-center">
                <span>Showing {filteredAnimals.length} animal(s)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Animal Detail Modal */}
      {selectedAnimal && (
        <Modal isOpen={!!selectedAnimal} onClose={() => setSelectedAnimal(null)} title="Animal Details" icon={PawPrint}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Tag Number</span>
                <span className="text-sm font-bold text-gray-900">{selectedAnimal.tagNumber}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Name</span>
                <span className="text-sm text-gray-800">{selectedAnimal.name}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Species</span>
                <span className="text-sm text-gray-800">{selectedAnimal.species}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Breed</span>
                <span className="text-sm text-gray-800">{selectedAnimal.breed}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Gender</span>
                <span className="text-sm text-gray-800">{selectedAnimal.gender}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Age</span>
                <span className="text-sm text-gray-800">{selectedAnimal.age} months</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Weight</span>
                <span className="text-sm text-gray-800">{selectedAnimal.weight} kg</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Status</span>
                <span className="text-sm text-gray-800">{selectedAnimal.status}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">MRL Status</span>
                <span className="text-sm font-semibold">{selectedAnimal.mrlStatus}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Associated Farm</span>
                <span className="text-sm font-semibold text-gray-900">{selectedAnimal.farm?.name || 'N/A'}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
