'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

const BREEDS_BY_SPECIES: Record<string, string[]> = {
  CATTLE: ['Holstein Friesian', 'Jersey', 'Angus', 'Hereford', 'Brahman', 'Charolais', 'Simmental', 'Gir', 'Sahiwal', 'Red Sindhi', 'Mixed/Crossbreed', 'Other'],
  BUFFALO: ['Murrah', 'Nili-Ravi', 'Surti', 'Jaffarabadi', 'Mehsana', 'Anatolian', 'Mixed/Crossbreed', 'Other'],
  GOAT: ['Boer', 'Nubian', 'Saanen', 'Alpine', 'Jamnapari', 'Beetal', 'Black Bengal', 'Mixed/Crossbreed', 'Other'],
  SHEEP: ['Merino', 'Dorper', 'Suffolk', 'Rambouillet', 'Corriedale', 'Hampshire', 'Mixed/Crossbreed', 'Other'],
  PIG: ['Yorkshire', 'Duroc', 'Berkshire', 'Hampshire', 'Landrace', 'Chester White', 'Mixed/Crossbreed', 'Other'],
  POULTRY: ['Leghorn', 'Rhode Island Red', 'Sussex', 'Plymouth Rock', 'Cornish', 'Brahma', 'Mixed/Crossbreed', 'Other']
};

export default function NewAnimal() {
  const router = useRouter();
  const [farms, setFarms] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    tagNumber: '',
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
    Promise.all([
      apiFetch('/farms'),
      apiFetch('/animals')
    ]).then(([farmsData, animalsData]) => {
      setFarms(farmsData || []);
      setAnimals(animalsData || []);
      
      let initialFarmId = '';
      if (farmsData && farmsData.length > 0) {
        initialFarmId = farmsData[0].id;
      }

      // Generate tag for default species
      const tag = generateNextTag('CATTLE', animalsData || []);
      setFormData(prev => ({ ...prev, farmId: initialFarmId, tagNumber: tag }));
    }).catch(err => console.error(err));
  }, []);

  const generateNextTag = (species: string, allAnimals: any[]) => {
    let prefix = 'CTL';
    if (species === 'BUFFALO') prefix = 'BUF';
    else if (species === 'GOAT') prefix = 'GOT';
    else if (species === 'SHEEP') prefix = 'SHP';
    else if (species === 'PIG') prefix = 'PIG';
    else if (species === 'POULTRY') prefix = 'PLT';
    else if (species !== 'CATTLE') prefix = species.substring(0, 3).toUpperCase();

    const existingTags = allAnimals
      .map(a => a.tagNumber)
      .filter(t => t?.startsWith(prefix + '-'));
    
    if (existingTags.length === 0) return `${prefix}-1001`;

    const numbers = existingTags
      .map(t => parseInt(t.split('-')[1], 10))
      .filter(n => !isNaN(n));
    
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 1000;
    return `${prefix}-${maxNum + 1}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'species') {
      const nextTag = generateNextTag(value, animals);
      setFormData(prev => ({ ...prev, species: value, tagNumber: nextTag }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...formData,
        name: formData.tagNumber, // Use tagNumber as name for backend validation
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
              <label className="block text-sm font-medium text-gray-700">Auto-Generated Tag Number</label>
              <input readOnly type="text" name="tagNumber" value={formData.tagNumber} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 bg-gray-50 text-gray-600 font-mono font-semibold" />
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
              <select required name="breed" value={formData.breed} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2 bg-white">
                <option value="">Select a Breed...</option>
                {(BREEDS_BY_SPECIES[formData.species] || ['Other']).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
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
