'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { calculateWithdrawal } from '@/lib/withdrawalEngine';

export default function NewTreatment() {
  const router = useRouter();
  const [animals, setAnimals] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    animalId: '',
    drugName: '',
    dosage: '',
    administrationDate: new Date().toISOString().substring(0, 10),
    withdrawalPeriod: '',
    veterinarianName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [medicineWithdrawals, setMedicineWithdrawals] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([apiFetch('/animals'), apiFetch('/treatments')])
      .then(([animalsData, treatmentsData]) => {
        setAnimals(animalsData || []);
        if (animalsData && animalsData.length > 0) {
          setFormData(prev => ({ ...prev, animalId: animalsData[0].id }));
        }
        
        // Extract existing medicine withdrawal periods
        if (treatmentsData && treatmentsData.length > 0) {
          const medMap: Record<string, string> = {};
          treatmentsData.forEach((t: any) => {
            if (t.drugName && t.withdrawalPeriod > 0 && !medMap[t.drugName]) {
              medMap[t.drugName] = String(t.withdrawalPeriod);
            }
          });
          setMedicineWithdrawals(medMap);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const nextState = { ...prev, [name]: value };
      
      // Auto-fill withdrawal period if medicine exists
      if (name === 'drugName' && medicineWithdrawals[value] !== undefined) {
        nextState.withdrawalPeriod = medicineWithdrawals[value];
      }
      return nextState;
    });
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

      const payload = {
        ...formData,
        withdrawalPeriod: withdrawalDays,
        administrationDate: new Date(adminDate).toISOString(),
        withdrawalCompletionDate: completionDate,
      };

      await apiFetch('/treatments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push('/treatments');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to record treatment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Record Treatment</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Animal</label>
              <select required name="animalId" value={formData.animalId} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2 bg-white">
                <option value="">Select an Animal...</option>
                {animals.map(a => (
                  <option key={a.id} value={a.id}>{a.tagNumber} - {a.name} ({a.species})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Medicine / Drug</label>
              <input required type="text" name="drugName" value={formData.drugName} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dosage</label>
              <input required type="text" name="dosage" value={formData.dosage} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Treatment Date</label>
              <input required type="date" name="administrationDate" value={formData.administrationDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Withdrawal Period (Days)</label>
              <input required type="number" min="0" name="withdrawalPeriod" value={formData.withdrawalPeriod} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Veterinarian Name</label>
              <input required type="text" name="veterinarianName" value={formData.veterinarianName} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
          </div>
          <div className="pt-4 flex gap-4">
            <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Record Treatment'}
            </button>
            <button type="button" onClick={() => router.back()} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
