'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Search, FlaskConical, ShieldAlert, Droplets, ClipboardList, AlertTriangle, ArrowRight } from 'lucide-react';

export default function TesterDashboard() {
  const [loading, setLoading] = useState(true);
  const [farmerId, setFarmerId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [animalId, setAnimalId] = useState('');
  const [animals, setAnimals] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [animalsData, collectionsData, testsData, violationsData] = await Promise.all([
          apiFetch('/animals').catch(() => []),
          apiFetch('/milk-collections').catch(() => []),
          apiFetch('/milk-tests').catch(() => []),
          apiFetch('/violations').catch(() => []),
        ]);
        setAnimals(Array.isArray(animalsData) ? animalsData : []);
        setCollections(Array.isArray(collectionsData) ? collectionsData : []);
        setTests(Array.isArray(testsData) ? testsData : []);
        setViolations(Array.isArray(violationsData) ? violationsData : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredAnimals = useMemo(() => {
    return animals.filter((animal) => {
      const matchFarmer = farmerId ? animal.farm?.farmerId?.toLowerCase().includes(farmerId.toLowerCase()) : true;
      const matchAnimal = animalId ? (animal.animalCode || animal.tagNumber || '').toLowerCase().includes(animalId.toLowerCase()) : true;
      return matchFarmer && matchAnimal;
    });
  }, [animals, farmerId, animalId]);

  const filteredCollections = useMemo(() => {
    return collections.filter((item) => {
      const matchFarmer = farmerId ? item.farm?.farmerId?.toLowerCase().includes(farmerId.toLowerCase()) : true;
      const matchBatch = batchId ? item.batchId?.toLowerCase().includes(batchId.toLowerCase()) : true;
      return matchFarmer && matchBatch;
    });
  }, [collections, farmerId, batchId]);

  const uniqueFarmers = useMemo(() => {
    const farmers = new Set<string>();
    animals.forEach(a => {
      if (a.farm?.farmerId) farmers.add(a.farm.farmerId);
    });
    collections.forEach(c => {
      if (c.farm?.farmerId) farmers.add(c.farm.farmerId);
    });
    return Array.from(farmers).sort();
  }, [animals, collections]);

  const farmExists = useMemo(() => {
    if (!farmerId) return true;
    return uniqueFarmers.some(fId => fId.toLowerCase().includes(farmerId.toLowerCase()));
  }, [farmerId, uniqueFarmers]);

  const todayCollections = collections.filter((item) => new Date(item.collectionDate || item.date).toDateString() === new Date().toDateString()).length;
  const pendingTests = tests.filter((item) => item.result === 'PENDING').length;
  const failedTests = tests.filter((item) => item.result === 'FAIL').length;
  const activeRestrictions = animals.filter((item) => item.mrlStatus !== 'CLEARED').length;
  const activeInvestigations = violations.filter((item) => ['PENDING_INVESTIGATION', 'UNDER_REVIEW'].includes(item.status)).length;

  if (loading) {
    return <div className="p-8 text-gray-500">Loading tester dashboard...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tester Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Search farmer, animal, and batch records for product clearance, collection, testing, and traceability.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: "Today's Collections", value: todayCollections, icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Tests', value: pendingTests, icon: FlaskConical, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Failed Tests', value: failedTests, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Active Restrictions', value: activeRestrictions, icon: ShieldAlert, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Investigations', value: activeInvestigations, icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase">{card.label}</span>
              <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}><card.icon size={16} /></div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                list="farmer-list"
                value={farmerId} 
                onChange={(e) => setFarmerId(e.target.value)} 
                placeholder="Search or Select Farmer ID"
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white ${!farmExists ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
              />
              <datalist id="farmer-list">
                {uniqueFarmers.map(fId => (
                  <option key={fId} value={fId} />
                ))}
              </datalist>
            </div>
            {!farmExists && (
              <p className="text-xs text-red-500 font-medium mt-1 ml-1">No farm exists with this ID.</p>
            )}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={animalId} onChange={(e) => setAnimalId(e.target.value)} placeholder="Search Animal ID" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg" />
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Search Batch ID" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Product Clearance Report</h2>
            <Link href="/milk-collection" className="text-xs font-semibold text-emerald-700 flex items-center gap-1">Collections <ArrowRight size={12} /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="border-b border-gray-200 bg-white">
                <tr>
                  <th className="p-4 font-semibold text-gray-900">Farmer</th>
                  <th className="p-4 font-semibold text-gray-900">Animal</th>
                  <th className="p-4 font-semibold text-gray-900">Product</th>
                  <th className="p-4 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAnimals.slice(0, 12).map((animal) => {
                  const activeRecord = (animal.withdrawalRecords || [])[0];
                  const restricted = animal.mrlStatus !== 'CLEARED';
                  return (
                    <tr key={animal.id} className="hover:bg-gray-50/50">
                      <td className="p-4">{animal.farm?.farmerId || 'N/A'}</td>
                      <td className="p-4 font-medium text-gray-900">{animal.animalCode || animal.tagNumber}</td>
                      <td className="p-4">{activeRecord?.productType || 'MILK'}</td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${restricted ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {restricted ? 'RESTRICTED' : 'CLEARED'}
                          </span>
                          {restricted && activeRecord ? (
                            <div className="text-[11px] text-gray-500">Until {new Date(activeRecord.withdrawalEndDate).toLocaleDateString()}</div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Batch & Investigation Watch</h2>
            <Link href="/violations" className="text-xs font-semibold text-emerald-700 flex items-center gap-1">Violations <ArrowRight size={12} /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="border-b border-gray-200 bg-white">
                <tr>
                  <th className="p-4 font-semibold text-gray-900">Batch</th>
                  <th className="p-4 font-semibold text-gray-900">Farmer</th>
                  <th className="p-4 font-semibold text-gray-900">Product</th>
                  <th className="p-4 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCollections.slice(0, 12).map((item) => {
                  const linkedTest = tests.find((test) => test.batchId === item.batchId);
                  const linkedViolation = violations.find((violation) => violation.batchId === item.batchId);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-medium text-gray-900">{item.batchId}</td>
                      <td className="p-4">{item.farm?.farmerId || 'N/A'}</td>
                      <td className="p-4">{item.productType}</td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${linkedTest?.result === 'FAIL' ? 'bg-red-100 text-red-800' : linkedTest?.result === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                            {linkedViolation ? linkedViolation.status : linkedTest?.result || 'COLLECTED'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
