'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function NewPrescription() {
  const router = useRouter();
  const [animals, setAnimals] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    animalId: '',
    medicine: '',
    dosage: '',
    duration: '',
    instructions: '',
    prescriptionDate: new Date().toISOString().substring(0, 10),
    veterinarianName: '',
    status: 'ACTIVE'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/animals').then(data => {
      setAnimals(data || []);
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, animalId: data[0].id }));
      }
    }).catch(err => console.error(err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...formData,
        duration: parseInt(formData.duration) || 0,
        prescriptionDate: new Date(formData.prescriptionDate).toISOString(),
      };

      await apiFetch('/prescriptions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push('/reports'); // Navigate to reports or prescriptions list based on dashboard link
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Prescription</h1>
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
              <label className="block text-sm font-medium text-gray-700">Medicine</label>
              <input required type="text" name="medicine" value={formData.medicine} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dosage</label>
              <input required type="text" name="dosage" value={formData.dosage} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Prescription Date</label>
              <input required type="date" name="prescriptionDate" value={formData.prescriptionDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Duration (Days)</label>
              <input required type="number" min="0" name="duration" value={formData.duration} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Instructions</label>
              <textarea required name="instructions" value={formData.instructions} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" rows={3}></textarea>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Veterinarian Name</label>
              <input required type="text" name="veterinarianName" value={formData.veterinarianName} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
          </div>
          <div className="pt-4 flex gap-4">
            <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Add Prescription'}
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
