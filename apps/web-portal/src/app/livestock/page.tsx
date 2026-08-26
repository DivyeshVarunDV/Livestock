'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { 
  PawPrint, Search, Plus, Filter, Eye, 
  ChevronRight, Heart, AlertTriangle, ShieldCheck 
} from 'lucide-react';

type Animal = {
  id: string;
  tagNumber: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  age: number;
  weight: number;
  status: string;
  mrlStatus: string;
  farm: {
    id: string;
    name: string;
  };
};

export default function LivestockPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [mrlFilter, setMrlFilter] = useState('All');

  useEffect(() => {
    async function loadAnimals() {
      try {
        setLoading(true);
        const data = await apiFetch('/animals');
        setAnimals(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load livestock');
      } finally {
        setLoading(false);
      }
    }
    loadAnimals();
  }, []);

  const filteredAnimals = useMemo(() => {
    return animals.filter(animal => {
      const matchesSearch = 
        animal.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        animal.tagNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        animal.breed?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSpecies = speciesFilter === 'All' || animal.species === speciesFilter;
      const matchesStatus = statusFilter === 'All' || animal.status === statusFilter;
      const matchesMrl = mrlFilter === 'All' || animal.mrlStatus === mrlFilter;

      return matchesSearch && matchesSpecies && matchesStatus && matchesMrl;
    });
  }, [animals, searchQuery, speciesFilter, statusFilter, mrlFilter]);

  // Derived stats
  const totalAnimals = animals.length;
  const healthyCount = animals.filter(a => a.status === 'HEALTHY').length;
  const underTreatmentCount = animals.filter(a => a.status === 'UNDER_TREATMENT').length;
  const mrlIssuesCount = animals.filter(a => a.mrlStatus === 'DO_NOT_SELL').length;

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64 animate-fade-in">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <PawPrint className="w-6 h-6 text-green-700" />
            Livestock Registry
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor all registered animals across farms.</p>
        </div>
        <Link 
          href="/animals/new"
          className="inline-flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Register Animal
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Animals</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalAnimals}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <PawPrint className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Healthy</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{healthyCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Heart className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400" />
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Under Treatment</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{underTreatmentCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-400" />
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">MRL Issues</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{mrlIssuesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search tag, name, or breed..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-shadow"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50/50">
              <Filter className="w-4 h-4 text-gray-400" />
              <select 
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
                className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none w-full sm:w-28"
              >
                <option value="All">All Species</option>
                <option value="CATTLE">Cattle</option>
                <option value="SHEEP">Sheep</option>
                <option value="PIG">Pig</option>
                <option value="GOAT">Goat</option>
                <option value="POULTRY">Poultry</option>
              </select>
            </div>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600/20 w-full sm:w-36"
            >
              <option value="All">All Status</option>
              <option value="HEALTHY">Healthy</option>
              <option value="UNDER_TREATMENT">Under Treatment</option>
              <option value="QUARANTINED">Quarantined</option>
            </select>

            <select 
              value={mrlFilter}
              onChange={(e) => setMrlFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600/20 w-full sm:w-36"
            >
              <option value="All">All MRL</option>
              <option value="CLEARED">Cleared</option>
              <option value="CLEARING_SOON">Clearing Soon</option>
              <option value="DO_NOT_SELL">Do Not Sell</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Tag #</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Species</th>
                <th className="py-3 px-4">Breed</th>
                <th className="py-3 px-4">Farm</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">MRL</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAnimals.map((animal) => (
                <tr key={animal.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-3 px-4 font-medium text-gray-900">{animal.tagNumber}</td>
                  <td className="py-3 px-4">{animal.name || '-'}</td>
                  <td className="py-3 px-4 capitalize">{animal.species.toLowerCase()}</td>
                  <td className="py-3 px-4">{animal.breed}</td>
                  <td className="py-3 px-4">{animal.farm?.name || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      animal.status === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      animal.status === 'UNDER_TREATMENT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      animal.status === 'QUARANTINED' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {animal.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      animal.mrlStatus === 'CLEARED' ? 'bg-green-50 text-green-700' :
                      animal.mrlStatus === 'CLEARING_SOON' ? 'bg-amber-50 text-amber-700' :
                      animal.mrlStatus === 'DO_NOT_SELL' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {animal.mrlStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/livestock/${animal.id}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-green-700 hover:bg-green-50 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              
              {filteredAnimals.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <PawPrint className="w-12 h-12 mb-3 text-gray-200" />
                      <p className="text-base font-medium text-gray-900">No animals found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
