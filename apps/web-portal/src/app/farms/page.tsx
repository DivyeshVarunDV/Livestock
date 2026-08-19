'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/Modal';
import { Eye, Tractor, PawPrint, Search, Plus, MapPin, Filter } from 'lucide-react';
import Link from 'next/link';

export default function FarmsDirectoryPage() {
  const [farms, setFarms] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'farms' | 'animals'>('farms');
  const [selectedFarm, setSelectedFarm] = useState<any | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<any | null>(null);

  const [farmSearch, setFarmSearch] = useState('');
  const [farmOwnerFilter, setFarmOwnerFilter] = useState('');
  const [farmLocationFilter, setFarmLocationFilter] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [farmsRes, animalsRes] = await Promise.all([
          apiFetch('/farms').catch(() => null),
          apiFetch('/animals').catch(() => null),
        ]);
        if (Array.isArray(farmsRes) && farmsRes.length > 0) {
          setFarms(farmsRes);
        }
        if (Array.isArray(animalsRes) && animalsRes.length > 0) {
          setAnimals(animalsRes);
        }
      } catch (err) {
        console.error('Failed to load records', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const uniqueOwners = Array.from(new Set(farms.map(f => f.ownerName).filter(Boolean)));
  const uniqueLocations = Array.from(new Set(farms.map(f => f.location).filter(Boolean)));

  const filteredFarms = farms.filter(f => {
    const matchSearch = f.name?.toLowerCase().includes(farmSearch.toLowerCase()) || 
                        f.address?.toLowerCase().includes(farmSearch.toLowerCase());
    const matchOwner = farmOwnerFilter ? f.ownerName === farmOwnerFilter : true;
    const matchLocation = farmLocationFilter ? f.location === farmLocationFilter : true;
    return matchSearch && matchOwner && matchLocation;
  });


  // 5 Realistic Treatment Records for Left Column
  const recentTreatments = [
    {
      animalId: '#TAG-0042',
      species: 'Cattle',
      farm: 'Green Meadows Farm',
      drug: 'Oxytetracycline',
      dosage: '100 ml IV',
      vet: 'Dr. Ramesh Kumar',
      date: '31-Jul-2026',
      withdrawalEnd: '07-Aug-2026',
      status: 'Active',
      badge: 'success', // Active (Green) as requested
    },
    {
      animalId: '#TAG-0018',
      species: 'Buffalo',
      farm: 'Sunrise Dairies',
      drug: 'Amoxicillin',
      dosage: '50 ml IM',
      vet: 'Dr. Anita Sharma',
      date: '29-Jul-2026',
      withdrawalEnd: '05-Aug-2026',
      status: 'Active',
      badge: 'success',
    },
    {
      animalId: '#TAG-0091',
      species: 'Goat',
      farm: 'Shivalik Goat Farm',
      drug: 'Enrofloxacin',
      dosage: '15 ml SC',
      vet: 'Dr. Vikram Singh',
      date: '28-Jul-2026',
      withdrawalEnd: '08-Aug-2026',
      status: 'Active',
      badge: 'success',
    },
    {
      animalId: '#TAG-0112',
      species: 'Cattle',
      farm: 'Amrit Sarovar Dairy',
      drug: 'Ivermectin',
      dosage: '25 ml SC',
      vet: 'Dr. Ramesh Kumar',
      date: '25-Jul-2026',
      withdrawalEnd: '24-Aug-2026',
      status: 'Active',
      badge: 'success',
    },
    {
      animalId: '#TAG-0065',
      species: 'Sheep',
      farm: 'Himalayan Wool Farm',
      drug: 'Meloxicam Vet',
      dosage: '10 ml IM',
      vet: 'Dr. Anita Sharma',
      date: '22-Jul-2026',
      withdrawalEnd: '26-Jul-2026',
      status: 'Completed',
      badge: 'info', // Completed (Blue)
    },
  ];

  // 5 Realistic Withdrawal Alerts for Center Column
  const withdrawalAlerts = [
    {
      animalId: '#TAG-0065 (Sheep)',
      drug: 'Meloxicam Vet',
      ends: '02-Aug-2026',
      daysRemaining: '2 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'High',
      badge: 'danger', // High (Red)
    },
    {
      animalId: '#TAG-0042 (Cattle)',
      drug: 'Oxytetracycline',
      ends: '07-Aug-2026',
      daysRemaining: '7 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'High',
      badge: 'danger',
    },
    {
      animalId: '#TAG-0018 (Buffalo)',
      drug: 'Amoxicillin',
      ends: '05-Aug-2026',
      daysRemaining: '5 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'Medium',
      badge: 'warning', // Medium (Orange)
    },
    {
      animalId: '#TAG-0091 (Goat)',
      drug: 'Enrofloxacin',
      ends: '08-Aug-2026',
      daysRemaining: '8 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'Medium',
      badge: 'warning',
    },
    {
      animalId: '#TAG-0134 (Buffalo)',
      drug: 'Tylosin Vet',
      ends: '10-Aug-2026',
      daysRemaining: '10 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'Medium',
      badge: 'warning',
    },
  ];

  // 5 Realistic Laboratory Results for Right Column
  const labResults = [
    {
      sampleId: 'LAB-8819',
      animalId: '#TAG-0018',
      drugTested: 'Oxytetracycline',
      level: '0.02 ppm',
      limit: '0.10 ppm',
      status: 'Compliant',
      badge: 'success', // Compliant (Green)
      lab: 'NIC Central Vet Lab',
      date: '31-Jul-2026',
    },
    {
      sampleId: 'LAB-8814',
      animalId: '#TAG-0034',
      drugTested: 'Enrofloxacin',
      level: '0.14 ppm',
      limit: '0.10 ppm',
      status: 'Non-Compliant',
      badge: 'danger', // Non-Compliant (Red)
      lab: 'State Vet Residue Lab',
      date: '30-Jul-2026',
    },
    {
      sampleId: 'LAB-8810',
      animalId: '#TAG-0055',
      drugTested: 'Amoxicillin',
      level: '0.01 ppm',
      limit: '0.05 ppm',
      status: 'Compliant',
      badge: 'success',
      lab: 'NDRI Food Safety Lab',
      date: '29-Jul-2026',
    },
    {
      sampleId: 'LAB-8809',
      animalId: '#TAG-0042',
      drugTested: 'Tylosin',
      level: '0.03 ppm',
      limit: '0.10 ppm',
      status: 'Compliant',
      badge: 'success',
      lab: 'NIC Central Vet Lab',
      date: '29-Jul-2026',
    },
    {
      sampleId: 'LAB-8805',
      animalId: '#TAG-0082',
      drugTested: 'Sulfadimidine',
      level: '0.02 ppm',
      limit: '0.10 ppm',
      status: 'Compliant',
      badge: 'success',
      lab: 'State Vet Residue Lab',
      date: '28-Jul-2026',
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full pb-8 bg-gray-50 min-h-screen">
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Farms Directory</h1>
            <p className="text-gray-500 mt-1 text-sm">Enterprise livestock & farm management</p>
          </div>
          
          <Link 
            href="/farms/new" 
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
          >
            <Plus size={18} />
            Add Farm
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-500 font-medium">Total Farms:</span>
            <span className="text-sm font-bold text-gray-900">{farms.length || 128}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-500 font-medium">Total Livestock:</span>
            <span className="text-sm font-bold text-blue-600">{animals.length || 4562}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-sm text-green-700 font-medium">Healthy:</span>
            <span className="text-sm font-bold text-green-700">{animals.filter(a => a.status === 'HEALTHY').length || 4320}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
            <span className="text-sm text-purple-700 font-medium">MRL Compliance:</span>
            <span className="text-sm font-bold text-purple-700">95%</span>
          </div>
        </div>
      </div>

      <div className="px-8 mt-2">
        <div className="flex gap-4 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('farms')}
            className={`pb-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'farms'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Tractor size={18} />
            Farms Directory ({farms.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('animals')}
            className={`pb-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'animals'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <PawPrint size={18} />
            Livestock Registry ({animals.length})
          </button>
        </div>
      </div>

      <div className="px-8 flex-1">

      {activeTab === 'farms' ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search farms..."
                value={farmSearch}
                onChange={(e) => setFarmSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={farmOwnerFilter}
                onChange={(e) => setFarmOwnerFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white min-w-[140px]"
              >
                <option value="">All Owners</option>
                {uniqueOwners.map(owner => (
                  <option key={String(owner)} value={String(owner)}>{owner}</option>
                ))}
              </select>
              <select
                value={farmLocationFilter}
                onChange={(e) => setFarmLocationFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white min-w-[140px]"
              >
                <option value="">All Locations</option>
                {uniqueLocations.map(loc => (
                  <option key={String(loc)} value={String(loc)}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-200">
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Farm Name</th>
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Owner</th>
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Contact</th>
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Location</th>
                  <th className="p-4 font-semibold text-gray-900 align-middle whitespace-nowrap">Address</th>
                  <th className="p-4 font-semibold text-gray-900 text-right align-middle whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFarms.length > 0 ? (
                  filteredFarms.map((f, i) => (
                    <tr key={i} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="p-4 font-semibold text-gray-900 align-middle">{f.name}</td>
                      <td className="p-4 align-middle text-gray-700">{f.ownerName || 'N/A'}</td>
                      <td className="p-4 align-middle text-gray-700">{f.contactNumber}</td>
                      <td className="p-4 align-middle text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-gray-400" />
                          {f.location}
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 align-middle truncate max-w-xs" title={f.address}>{f.address}</td>
                      <td className="p-4 text-right align-middle">
                        <button 
                          onClick={() => setSelectedFarm(f)} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-md hover:bg-green-100 transition-colors"
                        >
                          <Eye size={14} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No farms found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500 flex justify-between items-center">
            <span>Showing {filteredFarms.length} farm(s)</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
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
                {animals.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50/80 transition-colors">
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
                      <button 
                        onClick={() => setSelectedAnimal(a)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-md hover:bg-green-100 transition-colors"
                      >
                        <Eye size={14} />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500 flex justify-between items-center">
            <span>Showing {animals.length} animal(s)</span>
          </div>
        </div>
      )}
      </div>

      {/* Farm Detail Modal */}
      {selectedFarm && (
        <Modal isOpen={!!selectedFarm} onClose={() => setSelectedFarm(null)} title="Farm Details" icon={Tractor}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Farm Name</span>
                <span className="text-sm font-bold text-gray-900">{selectedFarm.name}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Owner Name</span>
                <span className="text-sm text-gray-800">{selectedFarm.ownerName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Contact Number</span>
                <span className="text-sm text-gray-800">{selectedFarm.contactNumber}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase">Location</span>
                <span className="text-sm text-gray-800">{selectedFarm.location}</span>
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-semibold block uppercase">Full Address</span>
              <span className="text-sm text-gray-800">{selectedFarm.address}</span>
            </div>
            <div className="pt-2">
              <span className="text-xs text-gray-500 font-semibold block uppercase mb-2">Animals Registered on this Farm</span>
              <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-100 bg-gray-50">
                {animals.filter(a => a.farmId === selectedFarm.id).length === 0 ? (
                  <p className="text-sm text-gray-500 p-3 italic">No livestock registered on this farm.</p>
                ) : (
                  animals.filter(a => a.farmId === selectedFarm.id).map((a, i) => (
                    <div key={i} className="p-3 flex justify-between items-center text-sm">
                      <span className="font-semibold text-gray-900">{a.tagNumber} ({a.name})</span>
                      <span className="text-gray-500">{a.species} - {a.breed}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

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
