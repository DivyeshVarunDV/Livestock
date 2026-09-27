'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { calculateWithdrawal } from '@/lib/withdrawalEngine';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, Info, Syringe, Search, PawPrint, ArrowLeft } from 'lucide-react';

export default function NewTreatment() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [animals, setAnimals] = useState<any[]>([]);
  // Step 1: farmer, step 2: pick an animal, step 3: treatment form.
  const [step, setStep] = useState<'farmer' | 'animal' | 'form'>('farmer');
  const [farmerIds, setFarmerIds] = useState<string[]>([]);
  const [farmerId, setFarmerId] = useState('');
  const [farmerAnimals, setFarmerAnimals] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [mrlRules, setMrlRules] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    animalId: '',
    inventoryId: '',
    drugName: '',
    dosage: '',
    administrationDate: new Date().toISOString().substring(0, 10),
    withdrawalPeriod: '',
    veterinarianName: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mrlInfo, setMrlInfo] = useState<{ limit: number; ruleDays: number } | null>(null);

  // Pre-fill vet info
  useEffect(() => {
    if (user && user.name) {
      setFormData(prev => ({ ...prev, veterinarianName: user.name }));
    }
  }, [user]);

  useEffect(() => {
    Promise.all([
      apiFetch('/animals'),
      apiFetch('/inventory').catch(() => []),
      apiFetch('/treatments/rules').catch(() => []),
      apiFetch('/farms').catch(() => []),
    ])
      .then(([animalsData, invData, rulesData, farmsData]) => {
        const list = animalsData || [];
        setAnimals(list);
        setInventory(invData || []);
        setMrlRules(rulesData || []);
        setFarmerIds(Array.from(new Set((farmsData || []).map((f: any) => f.farmerId).filter(Boolean))) as string[]);

        // Opened from "Treat" on an animal: skip straight to the form.
        const preset = new URLSearchParams(window.location.search).get('animalId');
        const animal = preset && list.find((a: any) => a.id === preset);
        if (animal) {
          const fid = animal.farm?.farmerId || '';
          setFarmerId(fid);
          setFarmerAnimals(list.filter((a: any) => a.farm?.farmerId === fid));
          setFormData(prev => ({ ...prev, animalId: animal.id }));
          setStep('form');
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Effect to handle MRL lookup when animal or drugName changes
  useEffect(() => {
    if (formData.animalId && formData.drugName) {
      const selectedAnimal = animals.find(a => a.id === formData.animalId);
      if (selectedAnimal) {
        const species = selectedAnimal.species;
        const drug = formData.drugName;
        // Search MRL Rules
        const rule = mrlRules.find(r => 
          r.drugName.toLowerCase() === drug.toLowerCase() && 
          r.species.toLowerCase() === species.toLowerCase()
        );
        if (rule) {
          setMrlInfo({ limit: rule.mrlLimit, ruleDays: rule.withdrawalPeriod });
          setFormData(prev => ({ ...prev, withdrawalPeriod: String(rule.withdrawalPeriod) }));
        } else {
          setMrlInfo(null);
        }
      }
    } else {
      setMrlInfo(null);
    }
  }, [formData.animalId, formData.drugName, animals, mrlRules]);

  const findFarmer = (e: React.FormEvent) => {
    e.preventDefault();
    const q = farmerId.trim().toLowerCase();
    if (!q) return;
    const exact = farmerIds.find((f) => f.toLowerCase() === q);
    const matchId = exact ?? farmerIds.find((f) => f.toLowerCase().includes(q));
    if (!matchId) {
      setError(`No farmer found with ID "${farmerId}".`);
      return;
    }
    setError('');
    setFarmerId(matchId);
    setFarmerAnimals(animals.filter((a) => a.farm?.farmerId === matchId));
    setStep('animal');
  };

  const pickAnimal = (animal: any) => {
    setFormData(prev => ({ ...prev, animalId: animal.id }));
    setError('');
    setStep('form');
  };

  const selectedAnimal = animals.find((a) => a.id === formData.animalId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'inventoryId') {
      const selectedItem = inventory.find(i => i.id === value);
      if (selectedItem) {
        setFormData(prev => ({
          ...prev,
          inventoryId: value,
          drugName: selectedItem.medicineName,
          dosage: '10ml', // Auto-fill standard dosage as requested
          withdrawalPeriod: String(selectedItem.withdrawalPeriod || '0'),
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          inventoryId: '',
          drugName: '',
          dosage: '',
          withdrawalPeriod: '',
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const withdrawalDays = parseInt(formData.withdrawalPeriod) || 0;
      const adminDate = formData.administrationDate;
      const calc = calculateWithdrawal(adminDate, withdrawalDays);
      const completionDate = calc.endDate ? calc.endDate.toISOString() : new Date(adminDate).toISOString();

      const payload: any = {
        animalId: formData.animalId,
        drugName: formData.drugName,
        dosage: formData.dosage,
        veterinarianName: formData.veterinarianName,
        withdrawalPeriod: withdrawalDays,
        administrationDate: new Date(adminDate).toISOString(),
        withdrawalCompletionDate: completionDate,
      };
      
      if (formData.inventoryId) {
        payload.inventoryId = formData.inventoryId;
      }

      const saved = await apiFetch('/treatments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (Array.isArray(saved?.complianceNotes) && saved.complianceNotes.length > 0) {
        alert(`Treatment recorded.\n\n${saved.complianceNotes.join('\n')}`);
      }
      
      router.push(user?.role?.toLowerCase() === 'veterinarian' ? '/veterinarian/treatments' : '/treatments');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to record treatment');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate preview data
  const withdrawalDays = parseInt(formData.withdrawalPeriod) || 0;
  const adminDate = formData.administrationDate;
  const calc = calculateWithdrawal(adminDate, withdrawalDays);
  const completionDateFmt = calc.endDate ? calc.endDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : new Date(adminDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const adminDateFmt = new Date(adminDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <Syringe className="text-emerald-600 w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Record Treatment</h1>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 flex items-start gap-2"><AlertCircle className="w-5 h-5 flex-shrink-0" /><span>{error}</span></div>}
        
        {step === 'farmer' && (
          <form onSubmit={findFarmer} className="space-y-4">
            <p className="text-sm text-gray-600">Enter the farmer ID to see their animals.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700">Farmer ID</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  autoFocus
                  required
                  list="treatment-farmer-list"
                  value={farmerId}
                  onChange={(e) => setFarmerId(e.target.value)}
                  placeholder="Type or select a Farmer ID..."
                  className="block w-full rounded-md border border-gray-300 pl-9 p-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
                <datalist id="treatment-farmer-list">
                  {farmerIds.map((f) => <option key={f} value={f} />)}
                </datalist>
              </div>
            </div>
            <div className="pt-2 flex gap-4">
              <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700">Show Animals</button>
              <button type="button" onClick={() => router.back()} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200">Cancel</button>
            </div>
          </form>
        )}

        {step === 'animal' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Animals of farmer <strong>{farmerId}</strong>. Click the animal to treat.
              </p>
              <button type="button" onClick={() => setStep('farmer')} className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1">
                <ArrowLeft size={12} /> Change farmer
              </button>
            </div>
            {farmerAnimals.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No animals registered for this farmer.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[28rem] overflow-y-auto pr-1">
                {farmerAnimals.map((a) => {
                  const inactive = a.currentStatus && a.currentStatus !== 'ACTIVE';
                  const restricted = a.mrlStatus && a.mrlStatus !== 'CLEARED';
                  return (
                    <button
                      key={a.id}
                      type="button"
                      disabled={inactive}
                      onClick={() => pickAnimal(a)}
                      className={`text-left p-3 rounded-lg border transition-colors ${inactive ? 'opacity-50 cursor-not-allowed border-gray-200' : 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                          <PawPrint size={14} className="text-emerald-600" /> {a.name || a.animalCode}
                        </span>
                        {restricted ? (
                          <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">In withdrawal</span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Cleared</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {a.tagNumber || a.animalCode} • {a.species}{a.gender ? ` • ${a.gender}` : ''}{a.breed ? ` • ${a.breed}` : ''}
                      </div>
                      {inactive && <div className="text-xs text-gray-500 mt-1">Status: {a.currentStatus} (cannot be treated)</div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div>
                <div className="text-xs font-semibold text-emerald-800 uppercase">Treating</div>
                <div className="text-sm font-bold text-gray-900">
                  {selectedAnimal ? `${selectedAnimal.name || selectedAnimal.animalCode} (${selectedAnimal.tagNumber || selectedAnimal.animalCode})` : 'No animal selected'}
                </div>
                <div className="text-xs text-gray-600">
                  {selectedAnimal?.species}{selectedAnimal?.gender ? ` • ${selectedAnimal.gender}` : ''} • Farmer {farmerId}
                </div>
              </div>
              <button type="button" onClick={() => setStep('animal')} className="text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap">
                Change animal
              </button>
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Medicine / Drug (from Inventory)</label>
              <select required name="inventoryId" value={formData.inventoryId} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2 bg-white">
                <option value="">-- Select Drug --</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id} disabled={item.stock <= 0}>
                    {item.medicineName} ({item.stock} in stock)
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Dosage</label>
              <input required type="text" name="dosage" value={formData.dosage} onChange={handleChange} placeholder="e.g. 10ml" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2" />
            </div>
            
            {mrlInfo && formData.animalId && (
              <div className="col-span-2 bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg flex gap-3 text-sm">
                <Info className="w-5 h-5 flex-shrink-0 text-blue-500 mt-0.5" />
                <div>
                  <strong>Based on MRL rules:</strong> {formData.drugName} for {animals.find(a => a.id === formData.animalId)?.species} has a {mrlInfo.ruleDays} day withdrawal period (MRL limit: {mrlInfo.limit}).
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Treatment Date</label>
              <input required type="date" name="administrationDate" value={formData.administrationDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Withdrawal Period (Days)</label>
              <input required type="number" min="0" name="withdrawalPeriod" value={formData.withdrawalPeriod} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2" />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Veterinarian Name</label>
              <input type="text" name="veterinarianName" value={formData.veterinarianName} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2" readOnly aria-readonly="true" title="Recorded automatically from your signed-in account" />
            </div>
          </div>
          
          {formData.drugName && formData.withdrawalPeriod && withdrawalDays > 0 && (
            <div className="mt-6 bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Withdrawal Preview
              </h3>
              <div className="text-sm text-amber-800 space-y-1 ml-6">
                <p><strong>Administration Date:</strong> {adminDateFmt}</p>
                <p><strong>Withdrawal Period:</strong> {withdrawalDays} days</p>
                <p><strong>Estimated Clearance:</strong> {completionDateFmt}</p>
                <p className="mt-2 font-medium">Animal will be flagged as DO NOT SELL until clearance</p>
              </div>
            </div>
          )}
          
          <div className="pt-4 flex gap-4">
            <button type="submit" disabled={loading} className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Record Treatment'}
            </button>
            <button type="button" onClick={() => router.back()} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
