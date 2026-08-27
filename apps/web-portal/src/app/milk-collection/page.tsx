'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import { Droplets, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function getProductsForSpecies(species?: string) {
  const s = (species || '').trim().toUpperCase();
  if (['CATTLE', 'COW', 'BOVINE', 'DAIRY_COW', 'BULL', 'CALF'].includes(s)) {
    return [
      { value: 'MILK', label: 'Milk (Cow / Bovine Milk)' },
      { value: 'MEAT', label: 'Meat (Beef / Veal)' },
    ];
  }
  if (['BUFFALO', 'WATER_BUFFALO'].includes(s)) {
    return [
      { value: 'MILK', label: 'Buffalo Milk' },
      { value: 'MEAT', label: 'Meat' },
    ];
  }
  if (['GOAT', 'CAPRINE'].includes(s)) {
    return [
      { value: 'MILK', label: 'Goat Milk' },
      { value: 'MEAT', label: 'Chevon / Goat Meat' },
    ];
  }
  if (['SHEEP', 'OVINE', 'LAMB'].includes(s)) {
    return [
      { value: 'MILK', label: 'Sheep Milk' },
      { value: 'MEAT', label: 'Mutton / Lamb Meat' },
      { value: 'WOOL', label: 'Wool' },
    ];
  }
  if (['POULTRY', 'CHICKEN', 'HEN', 'DUCK', 'TURKEY', 'QUAIL', 'GOOSE', 'AVIAN'].includes(s)) {
    return [
      { value: 'EGGS', label: 'Eggs' },
      { value: 'MEAT', label: 'Poultry / Chicken Meat' },
    ];
  }
  if (['PIG', 'SWINE', 'HOG', 'PORCINE'].includes(s)) {
    return [
      { value: 'MEAT', label: 'Pork / Meat' },
    ];
  }
  if (['BEE', 'BEES', 'HONEYBEE', 'APICULTURE'].includes(s)) {
    return [
      { value: 'HONEY', label: 'Honey' },
      { value: 'BEESWAX', label: 'Beeswax' },
    ];
  }
  if (['CAMEL', 'CAMELID'].includes(s)) {
    return [
      { value: 'MILK', label: 'Camel Milk' },
      { value: 'MEAT', label: 'Camel Meat' },
    ];
  }
  // Default fallback for generic livestock
  return [
    { value: 'MILK', label: 'Milk' },
    { value: 'MEAT', label: 'Meat' },
  ];
}

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
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [productType, setProductType] = useState('MILK');

  const { user } = useAuth();

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
      if (filtered.length > 0) {
        setSelectedAnimalId(filtered[0].id);
        setSelectedFarmId(filtered[0].farmId || '');
        const validProds = getProductsForSpecies(filtered[0].species);
        setProductType(validProds[0]?.value || 'MILK');
      } else {
        setSelectedAnimalId('');
        setSelectedFarmId('');
      }
      setStep(2);
    } catch (e: any) {
      alert(e.message || 'Failed to fetch animals');
    } finally {
      setFetchingAnimals(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role === 'tester') {
      alert('Tester role is not permitted to create new records.');
      return;
    }
    if (!selectedAnimalId) {
      alert('Please select an animal first.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/milk-collections', {
        method: 'POST',
        body: JSON.stringify({ animalId: selectedAnimalId, farmId: selectedFarmId, batchId, productType })
      });
      setIsModalOpen(false);
      setStep(1);
      setSearchFarmerId('');
      setFarmerAnimals([]);
      setSelectedAnimalId('');
      setSelectedFarmId('');
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
    setSelectedAnimalId('');
    setSelectedFarmId('');
    setBatchId('');
    setProductType('MILK');
    setIsModalOpen(true);
    
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
                  <th className="px-6 py-4 font-semibold">Collection ID</th>
                  <th className="px-6 py-4 font-semibold">Farmer ID</th>
                  <th className="px-6 py-4 font-semibold">Animal</th>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Batch</th>
                  <th className="px-6 py-4 font-semibold">Collection Date</th>
                  <th className="px-6 py-4 font-semibold">Restriction Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item: any) => {
                  const restricted = item.animal?.mrlStatus && item.animal.mrlStatus !== 'CLEARED';
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.collectionCode || `${item.id.substring(0, 8)}...`}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.farm?.farmerId || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.animal?.animalCode || item.animal?.name || 'Pooled/Batch'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.productType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.batchId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.collectionDate || item.date || item.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">
                        {restricted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800"><AlertTriangle size={12} /> Restricted</span>
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">Cleared</span>
                        )}
                      </td>
                    </tr>
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
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Select Animal for Collection</h3>
                  <button type="button" onClick={() => setStep(1)} className="text-xs text-emerald-600 hover:underline">Change Farmer</button>
                </div>
                
                {farmerAnimals.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">No animals found for Farmer ID: <strong>{searchFarmerId}</strong></p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {farmerAnimals.map(animal => {
                      const restricted = animal.mrlStatus && animal.mrlStatus !== 'CLEARED';
                      return (
                        <label key={animal.id} className={`flex items-start gap-3 p-2 rounded border cursor-pointer transition-colors ${selectedAnimalId === animal.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'} ${restricted ? 'opacity-70' : ''}`}>
                          <input 
                            type="radio" 
                            name="animal_select"
                            className="mt-1 cursor-pointer"
                            checked={selectedAnimalId === animal.id}
                            onChange={() => {
                              setSelectedAnimalId(animal.id);
                              setSelectedFarmId(animal.farmId || '');
                              const validProds = getProductsForSpecies(animal.species);
                              if (!validProds.some(p => p.value === productType)) {
                                setProductType(validProds[0]?.value || 'MILK');
                              }
                            }}
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
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {farmerAnimals.length > 0 && (() => {
                const selectedAnimal = farmerAnimals.find((a) => a.id === selectedAnimalId);
                const availableProducts = selectedAnimal
                  ? getProductsForSpecies(selectedAnimal.species)
                  : [
                      { value: 'MILK', label: 'Milk' },
                      { value: 'MEAT', label: 'Meat' },
                    ];

                return (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batch ID</label>
                      <input type="text" required value={batchId} onChange={(e) => setBatchId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm" placeholder="e.g. BATCH-001" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Type {selectedAnimal && <span className="text-xs font-normal text-emerald-700">({selectedAnimal.species} products)</span>}
                      </label>
                      <select
                        value={productType}
                        onChange={(e) => setProductType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                      >
                        {availableProducts.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                );
              })()}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={submitting || !selectedAnimalId} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-70">
                  {submitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
