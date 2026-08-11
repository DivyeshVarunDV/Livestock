'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function NewAnimal() {
  const router = useRouter();
  const [farms, setFarms] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    tagNumber: '',
    name: '',
    species: 'CATTLE',
    breed: '',
    gender: 'FEMALE',
    age: '',
    weight: '',
    status: 'HEALTHY',
    mrlStatus: 'CLEARED',
    farmId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/farms').then(data => {
      setFarms(data || []);
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, farmId: data[0].id }));
      }
    }).catch(err => console.error(err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...formData,
        age: parseInt(formData.age),
        weight: parseFloat(formData.weight),
      };
      await apiFetch('/animals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push('/animals');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to register animal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Register Animal</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tag Number</label>
              <input required type="text" name="tagNumber" value={formData.tagNumber} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Species</label>
              <select name="species" value={formData.species} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2 bg-white">
                <option value="CATTLE">Cattle</option>
                <option value="BUFFALO">Buffalo</option>
                <option value="GOAT">Goat</option>
                <option value="SHEEP">Sheep</option>
                <option value="PIG">Pig</option>
                <option value="POULTRY">Poultry</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Breed</label>
              <input required type="text" name="breed" value={formData.breed} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2 bg-white">
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Age (months)</label>
              <input required type="number" name="age" value={formData.age} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
              <input required type="number" step="0.1" name="weight" value={formData.weight} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Farm</label>
              <select required name="farmId" value={formData.farmId} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2 bg-white">
                <option value="">Select a Farm...</option>
                {farms.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-4 flex gap-4">
            <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Register Animal'}
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
