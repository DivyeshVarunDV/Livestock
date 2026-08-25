'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import { MapPin, Plus, Search, Building2, User, Hash } from 'lucide-react';

interface Farm {
  id: string;
  name: string;
  location: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    animals: number;
  };
}

export default function FarmsPage() {
  const { user, loading: authLoading } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const data = await apiFetch('/farms');
        setFarms(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch farms');
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading && user) {
      fetchFarms();
    }
  }, [user, authLoading]);

  if (authLoading || loading) return <Loader />;

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  const filteredFarms = farms.filter((farm) => {
    const q = searchQuery.toLowerCase();
    return (
      farm.name.toLowerCase().includes(q) ||
      (farm.owner?.name || '').toLowerCase().includes(q) ||
      farm.location.toLowerCase().includes(q)
    );
  });

  const totalFarms = farms.length;
  const totalLivestock = farms.reduce((sum, f) => sum + (f._count?.animals || 0), 0);
  const avgHerdSize = totalFarms > 0 ? Math.round(totalLivestock / totalFarms) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Farms</h1>
          <p className="text-sm text-gray-500">Registered farm properties and locations.</p>
        </div>
        <Link
          href="/farms/new"
          className="inline-flex items-center px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Farm
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Farms</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{totalFarms}</p>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-700" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Livestock</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{totalLivestock}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Hash className="w-5 h-5 text-blue-700" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Average Herd Size</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{avgHerdSize}</p>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
              <Hash className="w-5 h-5 text-purple-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by farm name, owner, or location..."
          className="flex-1 outline-none text-sm text-gray-700"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFarms.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500">No farms found matching your search.</div>
        ) : (
          filteredFarms.map((farm) => (
            <div
              key={farm.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition p-5 flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-gray-900 truncate pr-2">{farm.name}</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">
                  {farm._count?.animals || 0} animals
                </span>
              </div>
              
              <div className="space-y-2 mb-6 flex-1">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                  <span className="truncate">{farm.owner?.name || 'Unknown Owner'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                  <span className="truncate">{farm.location || 'Unknown Location'}</span>
                </div>
              </div>

              <Link
                href={`/farms/${farm.id}`}
                className="w-full text-center py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                View Details
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
