'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function NewFarm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    farmerId: 'Loading...',
    name: '',
    ownerName: '',
    address: '',
    contactNumber: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNextId = async () => {
      try {
        const farms = await apiFetch('/farms');
        let nextNum = 1001;
        
        // Find the farm with the highest FARM-xxxx ID
        const farmIds = farms
          .map((f: any) => f.farmerId)
          .filter((id: string) => id && id.startsWith('FARM-'))
          .map((id: string) => parseInt(id.replace('FARM-', ''), 10))
          .filter((n: number) => !isNaN(n));
          
        if (farmIds.length > 0) {
          nextNum = Math.max(...farmIds) + 1;
        } else {
          nextNum = farms.length + 1001;
        }
        
        setFormData(prev => ({ ...prev, farmerId: `FARM-${nextNum}` }));
      } catch (err) {
        setFormData(prev => ({ ...prev, farmerId: '' }));
      }
    };
    fetchNextId();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiFetch('/farms', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      router.push('/farms');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create farm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Farm</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Farm Tag / Farmer ID</label>
            <input 
              required 
              type="text" 
              name="farmerId" 
              value={formData.farmerId} 
              onChange={handleChange} 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2 bg-gray-50" 
            />
            <p className="text-xs text-gray-500 mt-1">Auto-generated sequentially, but you can override it if needed.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Farm Name</label>
            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner Name</label>
            <input required type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input required type="text" name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Number</label>
            <input required type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input required type="text" name="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" />
          </div>
          <div className="pt-4 flex gap-4">
            <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Farm'}
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
