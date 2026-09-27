'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  PawPrint,
  Syringe,
  AlertTriangle,
  Activity,
  Search,
  User,
  Tractor,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  Plus,
  ArrowRight,
  ShieldCheck,
  Building,
  RefreshCw,
} from 'lucide-react';

export default function VetFarmerCentricDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
  const [selectedFarm, setSelectedFarm] = useState<any>(null);
  const [farmerAnimals, setFarmerAnimals] = useState<any[]>([]);
  const [farmerTreatments, setFarmerTreatments] = useState<any[]>([]);
  const [farmerTransfers, setFarmerTransfers] = useState<any[]>([]);
  const [farmerLoading, setFarmerLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ANIMALS' | 'WITHDRAWALS' | 'TREATMENTS' | 'TRANSFERS'>('ANIMALS');
  const [farmerSearch, setFarmerSearch] = useState('');

  // Load initial list of all farms
  useEffect(() => {
    async function loadFarms() {
      setLoading(true);
      try {
        const res = await apiFetch('/farms').catch(() => []);
        const list = Array.isArray(res) ? res : [];
        setFarms(list);
        // Default to first farmer if available or check localStorage
        const storedFarmerId = typeof window !== 'undefined' ? localStorage.getItem('vet_selected_farmer') : null;
        const initial = list.find((f: any) => f.farmerId === storedFarmerId || f.id === storedFarmerId) || list[0];
        if (initial) {
          selectFarmer(initial.farmerId || initial.id, initial);
        }
      } catch (err) {
        console.error('Failed to load farms:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFarms();
  }, []);

  // When farmer is selected, fetch all specific data for this farmer
  const selectFarmer = async (farmerId: string, farmObj?: any) => {
    setSelectedFarmerId(farmerId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vet_selected_farmer', farmerId);
    }
    setFarmerLoading(true);
    try {
      const targetFarm = farmObj || farms.find((f) => f.farmerId === farmerId || f.id === farmerId);
      setSelectedFarm(targetFarm || null);

      if (targetFarm) {
        const [animalsRes, treatmentsRes, transfersRes] = await Promise.all([
          apiFetch(`/animals?farmId=${targetFarm.id}`).catch(() => []),
          apiFetch('/treatments').catch(() => []),
          apiFetch('/ownership-transfers').catch(() => []),
        ]);

        const animalsList = Array.isArray(animalsRes) ? animalsRes : [];
        const animalIds = new Set(animalsList.map((a: any) => a.id));

        setFarmerAnimals(animalsList);
        setFarmerTreatments((Array.isArray(treatmentsRes) ? treatmentsRes : []).filter((t: any) => animalIds.has(t.animalId)));
        setFarmerTransfers(
          (Array.isArray(transfersRes) ? transfersRes : []).filter(
            (tr: any) => tr.fromFarmId === targetFarm.id || tr.toFarmId === targetFarm.id || animalIds.has(tr.animalId)
          )
        );
      }
    } catch (err) {
      console.error('Error fetching farmer data:', err);
    } finally {
      setFarmerLoading(false);
    }
  };

  const activeWithdrawals = farmerAnimals.filter((a) => a.mrlStatus === 'RESTRICTED' || a.mrlStatus === 'DO_NOT_SELL');
  const underTreatmentCount = farmerAnimals.filter((a) => a.status === 'UNDER_TREATMENT' || a.currentStatus === 'UNDER_TREATMENT').length;
  const clearedCount = farmerAnimals.filter((a) => a.mrlStatus === 'CLEARED').length;

  const filteredFarms = farms.filter((f) => {
    const s = farmerSearch.toLowerCase();
    return (
      (f.farmerId || '').toLowerCase().includes(s) ||
      (f.ownerName || f.fullName || '').toLowerCase().includes(s) ||
      (f.name || '').toLowerCase().includes(s) ||
      (f.contactNumber || f.mobileNumber || '').toLowerCase().includes(s) ||
      (f.district || '').toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500 font-medium">
        <RefreshCw size={24} className="animate-spin text-emerald-700 mr-2" /> Loading Veterinarian Portal...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Veterinarian Header + Farmer Consultation Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
              <Activity size={15} /> Clinical Consultation Portal
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {user?.name || 'Dr. Veterinarian'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Select or search a specific farmer below to review clinical dossier, animal health, active withdrawals, and issue treatments.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/treatments/new"
              className="inline-flex items-center gap-1.5 bg-[#064E3B] hover:bg-[#065F46] text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <Syringe size={14} /> Record Treatment
            </Link>
            <Link
              href="/transfers"
              className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <ArrowRightLeft size={14} /> Transfer Animal
            </Link>
          </div>
        </div>

        {/* Farmer Selector Search Bar */}
        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              list="vet-farmers-list"
              type="text"
              placeholder="Search or Select Farmer ID / Name / Mobile (e.g. FARM001, John Miller)..."
              value={farmerSearch}
              onChange={(e) => {
                setFarmerSearch(e.target.value);
                const matched = farms.find(
                  (f) =>
                    f.farmerId?.toLowerCase() === e.target.value.trim().toLowerCase() ||
                    f.name?.toLowerCase() === e.target.value.trim().toLowerCase() ||
                    f.ownerName?.toLowerCase() === e.target.value.trim().toLowerCase()
                );
                if (matched) {
                  selectFarmer(matched.farmerId || matched.id, matched);
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none bg-gray-50/50"
            />
            <datalist id="vet-farmers-list">
              {farms.map((f) => (
                <option key={f.id} value={f.farmerId || f.name}>
                  {f.ownerName || f.fullName} - {f.name} ({f.district || 'District'}) - {f.contactNumber || f.mobileNumber || ''}
                </option>
              ))}
            </datalist>
          </div>

          <div className="flex gap-2 shrink-0">
            <select
              value={selectedFarmerId}
              onChange={(e) => {
                const target = farms.find((f) => f.farmerId === e.target.value || f.id === e.target.value);
                if (target) selectFarmer(target.farmerId || target.id, target);
              }}
              className="px-3 py-2 text-xs font-bold border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
            >
              <option value="">-- Choose Registered Farmer --</option>
              {farms.map((f) => (
                <option key={f.id} value={f.farmerId || f.id}>
                  {f.farmerId || 'FARM'} - {f.ownerName || f.fullName} ({f.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Selected Farmer Profile Dossier Banner */}
      {selectedFarm ? (
        <div className="space-y-6 animate-fade-in">
          {/* Farmer Card */}
          <div className="bg-gradient-to-r from-[#064E3B] to-[#065F46] text-white rounded-xl shadow-sm p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-emerald-400 text-emerald-950">
                  {selectedFarm.farmerId || 'FARM'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-white/20 text-white">
                  STATUS: {selectedFarm.farmStatus || 'ACTIVE'}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold mt-2 tracking-tight">
                {selectedFarm.ownerName || selectedFarm.fullName || selectedFarm.name}
              </h2>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-emerald-100/90 mt-2 font-medium">
                <span className="flex items-center gap-1.5"><Building size={14} /> Farm: <strong>{selectedFarm.name}</strong></span>
                <span className="flex items-center gap-1.5"><Phone size={14} /> Contact: <strong>{selectedFarm.contactNumber || selectedFarm.mobileNumber || 'N/A'}</strong></span>
                <span className="flex items-center gap-1.5"><MapPin size={14} /> Location: <strong>{selectedFarm.village ? `${selectedFarm.village}, ` : ''}{selectedFarm.district || selectedFarm.address || 'N/A'}</strong></span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <Link
                href={`/transfers`}
                className="bg-emerald-900/60 hover:bg-emerald-900 text-white border border-emerald-400/30 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <ArrowRightLeft size={14} /> Transfer an Animal
              </Link>
            </div>
          </div>

          {/* Farmer Specific KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Farmer's Livestock</div>
              <div className="text-3xl font-extrabold text-gray-900">{farmerAnimals.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Under Treatment</div>
              <div className="text-3xl font-extrabold text-blue-700">{underTreatmentCount}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Withdrawal Restricted</div>
              <div className="text-3xl font-extrabold text-red-700">{activeWithdrawals.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Cleared for Market</div>
              <div className="text-3xl font-extrabold text-emerald-700">{clearedCount}</div>
            </div>
          </div>

          {/* Tab Navigation for Selected Farmer */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200 bg-gray-50/70 overflow-x-auto">
              <button
                onClick={() => setActiveTab('ANIMALS')}
                className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'ANIMALS'
                    ? 'border-[#064E3B] text-[#064E3B] bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <PawPrint size={14} /> Registered Livestock ({farmerAnimals.length})
              </button>
              <button
                onClick={() => setActiveTab('WITHDRAWALS')}
                className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'WITHDRAWALS'
                    ? 'border-red-600 text-red-700 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <AlertTriangle size={14} className={activeWithdrawals.length > 0 ? 'text-red-600' : ''} />
                Withdrawal Restrictions ({activeWithdrawals.length})
              </button>
              <button
                onClick={() => setActiveTab('TREATMENTS')}
                className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'TREATMENTS'
                    ? 'border-[#064E3B] text-[#064E3B] bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Syringe size={14} /> Treatments &amp; AMU ({farmerTreatments.length})
              </button>
              <button
                onClick={() => setActiveTab('TRANSFERS')}
                className={`px-5 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'TRANSFERS'
                    ? 'border-[#064E3B] text-[#064E3B] bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowRightLeft size={14} /> Ownership Transfers ({farmerTransfers.length})
              </button>
            </div>

            {/* TAB CONTENT 1: Registered Animals */}
            {activeTab === 'ANIMALS' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Animal Code / Tag</th>
                      <th className="px-5 py-3.5">Name</th>
                      <th className="px-5 py-3.5">Species / Breed</th>
                      <th className="px-5 py-3.5">Age &amp; Weight</th>
                      <th className="px-5 py-3.5">Health Status</th>
                      <th className="px-5 py-3.5">MRL Clearance</th>
                      <th className="px-5 py-3.5 text-right">Clinical Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {farmerAnimals.map((animal) => {
                      const isRestricted = animal.mrlStatus === 'RESTRICTED' || animal.mrlStatus === 'DO_NOT_SELL';
                      return (
                        <tr key={animal.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-4 font-mono font-bold text-gray-900">
                            {animal.animalCode || animal.tagNumber}
                          </td>
                          <td className="px-5 py-4 font-semibold text-gray-900">
                            <Link href={`/animals/${animal.id}`} className="hover:text-emerald-700 hover:underline">
                              {animal.name}
                            </Link>
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-600">
                            {animal.species} • {animal.breed}
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-600">
                            {animal.age ? `${animal.age} mos` : 'N/A'} • {animal.weight ? `${animal.weight} kg` : 'N/A'}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                animal.status === 'HEALTHY'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {animal.status || 'HEALTHY'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isRestricted ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isRestricted ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                              {animal.mrlStatus || 'CLEARED'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Link
                                href={`/treatments/new?animalId=${animal.id}`}
                                title="Treat Animal"
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-bold transition-colors"
                              >
                                Treat
                              </Link>
                              <Link
                                href={`/animals/${animal.id}`}
                                title="View Dossier"
                                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs font-bold transition-colors"
                              >
                                Dossier
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {farmerAnimals.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                          No animals registered for this farmer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT 2: Active Withdrawal Restrictions */}
            {activeTab === 'WITHDRAWALS' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Animal Code / Tag</th>
                      <th className="px-5 py-3.5">Animal Name</th>
                      <th className="px-5 py-3.5">Restricted Products</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Clinical Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeWithdrawals.map((animal) => (
                      <tr key={animal.id} className="hover:bg-red-50/40 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-gray-900">{animal.animalCode || animal.tagNumber}</td>
                        <td className="px-5 py-4 font-semibold text-gray-900">{animal.name}</td>
                        <td className="px-5 py-4 text-xs font-bold text-red-700">MILK, MEAT (Under Active Withdrawal)</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                            DO NOT COLLECT / SELL
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/animals/${animal.id}`}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Inspect History
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {activeWithdrawals.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-emerald-700 font-semibold">
                          <CheckCircle2 size={24} className="mx-auto mb-2" />
                          All animals for this farmer are cleared from withdrawal restrictions.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT 3: Treatments & AMU */}
            {activeTab === 'TREATMENTS' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Animal</th>
                      <th className="px-5 py-3.5">Drug Administered</th>
                      <th className="px-5 py-3.5">Dosage</th>
                      <th className="px-5 py-3.5">Withdrawal Period</th>
                      <th className="px-5 py-3.5">Administration Date</th>
                      <th className="px-5 py-3.5 text-right">Clearance Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {farmerTreatments.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 font-bold text-gray-900">{t.animal?.animalCode || t.animal?.tagNumber || t.animalId}</td>
                        <td className="px-5 py-4 font-semibold text-emerald-800">{t.drugName}</td>
                        <td className="px-5 py-4 text-xs text-gray-700">{t.dosage}</td>
                        <td className="px-5 py-4 text-xs text-gray-700">{t.withdrawalPeriod} days</td>
                        <td className="px-5 py-4 text-xs text-gray-500">{new Date(t.administrationDate).toLocaleDateString()}</td>
                        <td className="px-5 py-4 text-right font-bold text-amber-700 text-xs">
                          {t.withdrawalCompletionDate ? new Date(t.withdrawalCompletionDate).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                    {farmerTreatments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                          No treatment records for this farmer's animals.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT 5: Ownership Transfers */}
            {activeTab === 'TRANSFERS' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Code</th>
                      <th className="px-5 py-3.5">Animal</th>
                      <th className="px-5 py-3.5">From</th>
                      <th className="px-5 py-3.5">To</th>
                      <th className="px-5 py-3.5">Reason</th>
                      <th className="px-5 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {farmerTransfers.map((tr) => (
                      <tr key={tr.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-gray-900">{tr.transferCode || tr.id.slice(0, 8)}</td>
                        <td className="px-5 py-4 font-semibold text-gray-900">{tr.animal?.name || tr.animal?.animalCode}</td>
                        <td className="px-5 py-4 text-xs text-gray-600">{tr.fromFarm?.farmerId || tr.fromFarm?.name}</td>
                        <td className="px-5 py-4 text-xs text-emerald-800 font-semibold">{tr.toFarm?.farmerId || tr.toFarm?.name}</td>
                        <td className="px-5 py-4 text-xs text-gray-700">{tr.reason || 'N/A'}</td>
                        <td className="px-5 py-4 text-right">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              tr.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tr.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {farmerTransfers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                          No transfer records involving this farmer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* When no farmer is selected, display the complete registered farmers directory */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Tractor size={20} className="text-emerald-700" /> Select a Registered Farmer to Begin Consultation
          </h2>
          <p className="text-xs text-gray-500">
            Click on any farmer to open their specific livestock registry, health cards, active withdrawal timers, and treatment history.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredFarms.map((farm) => (
              <div
                key={farm.id}
                onClick={() => selectFarmer(farm.farmerId || farm.id, farm)}
                className="p-5 bg-gray-50 hover:bg-emerald-50/70 border border-gray-200 hover:border-emerald-500 rounded-xl cursor-pointer transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-emerald-100 text-emerald-800">
                      {farm.farmerId || 'FARM'}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">{farm.district || 'District'}</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mt-2">{farm.ownerName || farm.fullName || farm.name}</h3>
                  <p className="text-xs text-gray-600 mt-0.5 font-medium">{farm.name}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Phone size={12} /> {farm.contactNumber || farm.mobileNumber || 'No phone'}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between items-center text-xs font-bold text-[#064E3B]">
                  <span>Select Farmer Dossier</span>
                  <ArrowRight size={15} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
