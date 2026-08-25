'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import { ArrowLeft, MapPin, User, Phone } from 'lucide-react';

interface Animal {
  id: string;
  tagId: string;
  name: string;
  species: string;
  status: string;
  mrlStatus: string;
}

interface Farm {
  id: string;
  name: string;
  location: string;
  contactNumber?: string;
  registrationDate?: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  animals: Animal[];
}

interface Treatment {
  id: string;
  date: string;
  drug: { name: string; withdrawalPeriodMeat?: number; withdrawalPeriodMilk?: number };
  animal: { id: string; tagId: string; farm: { name: string } };
  status: string;
}

type TabType = 'overview' | 'livestock' | 'treatments' | 'compliance';

export default function FarmDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  
  const [farm, setFarm] = useState<Farm | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [farmData, treatmentsData] = await Promise.all([
          apiFetch(`/farms/${id}`),
          apiFetch('/treatments')
        ]);
        
        setFarm(farmData);
        // Filter treatments client-side based on farm name
        if (farmData && farmData.name) {
          const farmTreatments = treatmentsData.filter((t: Treatment) => t.animal?.farm?.name === farmData.name);
          setTreatments(farmTreatments);
        } else {
          setTreatments([]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch farm details');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user && id) {
      fetchData();
    }
  }, [id, user, authLoading]);

  if (authLoading || loading) return <Loader />;
  if (error || !farm) return <div className="p-6 text-red-500">Error: {error || 'Farm not found'}</div>;

  const animalsCount = farm.animals?.length || 0;

  // Compliance summary
  let cleared = 0, clearingSoon = 0, doNotSell = 0;
  farm.animals?.forEach((a) => {
    if (a.mrlStatus === 'CLEARED') cleared++;
    else if (a.mrlStatus === 'CLEARING_SOON') clearingSoon++;
    else doNotSell++; // DO_NOT_SELL or other
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Link href="/farms" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Farms
      </Link>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{farm.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center"><User className="w-4 h-4 mr-1.5" />{farm.owner?.name}</span>
              <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" />{farm.location}</span>
              {farm.contactNumber && <span className="flex items-center"><Phone className="w-4 h-4 mr-1.5" />{farm.contactNumber}</span>}
            </div>
          </div>
          <div className="bg-green-50 text-green-800 px-4 py-2 rounded-lg text-center shrink-0 border border-green-100">
            <p className="text-xs font-semibold uppercase tracking-wide">Registered Animals</p>
            <p className="text-2xl font-bold mt-1">{animalsCount}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['overview', 'livestock', 'treatments', 'compliance'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize
                ${activeTab === tab
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Farm Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Farm Name</label>
                <div className="text-sm text-gray-900">{farm.name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Owner</label>
                <div className="text-sm text-gray-900">{farm.owner?.name} ({farm.owner?.email})</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Location</label>
                <div className="text-sm text-gray-900">{farm.location}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Contact Number</label>
                <div className="text-sm text-gray-900">{farm.contactNumber || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Registered Animals Count</label>
                <div className="text-sm text-gray-900">{animalsCount}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Registration Date</label>
                <div className="text-sm text-gray-900">{farm.registrationDate ? new Date(farm.registrationDate).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'livestock' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Species</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MRL Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {farm.animals?.map((animal) => (
                  <tr key={animal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{animal.tagId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{animal.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{animal.species}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {animal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        animal.mrlStatus === 'CLEARED' ? 'bg-green-100 text-green-800' :
                        animal.mrlStatus === 'CLEARING_SOON' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {animal.mrlStatus?.replace('_', ' ') || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/livestock/${animal.id}`} className="text-green-600 hover:text-green-900">View</Link>
                    </td>
                  </tr>
                ))}
                {farm.animals?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                      No livestock found in this farm.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'treatments' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Animal Tag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {treatments.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.animal?.tagId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.drug?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        t.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {treatments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                      No treatments found for animals in this farm.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">MRL Compliance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="text-green-800 font-medium mb-1">Cleared</div>
                <div className="text-3xl font-bold text-green-900">{cleared}</div>
                <p className="text-sm text-green-700 mt-2">Safe for human consumption</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="text-amber-800 font-medium mb-1">Clearing Soon</div>
                <div className="text-3xl font-bold text-amber-900">{clearingSoon}</div>
                <p className="text-sm text-amber-700 mt-2">Nearing end of withdrawal period</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <div className="text-red-800 font-medium mb-1">Do Not Sell</div>
                <div className="text-3xl font-bold text-red-900">{doNotSell}</div>
                <p className="text-sm text-red-700 mt-2">Within withdrawal period limits</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
