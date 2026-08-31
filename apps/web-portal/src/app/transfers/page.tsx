'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import {
  ArrowRightLeft,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  PawPrint,
  Tractor,
  AlertTriangle,
  FileText,
  Syringe,
  Activity,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Info,
  Check,
  X,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

export default function TransfersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isVet = user?.role === 'veterinarian';

  const [transfers, setTransfers] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [fromFarmerId, setFromFarmerId] = useState('');
  const [sourceFarm, setSourceFarm] = useState<any>(null);
  const [sourceAnimals, setSourceAnimals] = useState<any[]>([]);
  const [loadingFarmAnimals, setLoadingFarmAnimals] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
  const [toFarmerId, setToFarmerId] = useState('');
  const [targetFarm, setTargetFarm] = useState<any>(null);
  const [transferReason, setTransferReason] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState<any>(null);

  // Review / Decision Modal State (Admin)
  const [reviewTransfer, setReviewTransfer] = useState<any>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transfersRes, farmsRes] = await Promise.all([
        apiFetch('/ownership-transfers').catch(() => []),
        apiFetch('/farms').catch(() => []),
      ]);
      setTransfers(Array.isArray(transfersRes) ? transfersRes : []);
      setFarms(Array.isArray(farmsRes) ? farmsRes : []);
    } catch (e) {
      console.error('Error loading transfers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When fromFarmerId changes, fetch farm and its animals
  const handleFromFarmerLookup = async (fId: string) => {
    setFromFarmerId(fId);
    setSelectedAnimal(null);
    setRequestError('');
    if (!fId.trim()) {
      setSourceFarm(null);
      setSourceAnimals([]);
      return;
    }

    setLoadingFarmAnimals(true);
    try {
      const res = await apiFetch(`/ownership-transfers/farm-animals/${encodeURIComponent(fId.trim())}`);
      setSourceFarm(res);
      setSourceAnimals(Array.isArray(res.animals) ? res.animals : []);
      if (res.animals && res.animals.length > 0) {
        setSelectedAnimal(res.animals[0]);
      }
    } catch (err: any) {
      setSourceFarm(null);
      setSourceAnimals([]);
      setRequestError(`No farm found for Farmer ID: ${fId}`);
    } finally {
      setLoadingFarmAnimals(false);
    }
  };

  // When toFarmerId changes, lookup target farm
  const handleToFarmerLookup = (tId: string) => {
    setToFarmerId(tId);
    if (!tId.trim()) {
      setTargetFarm(null);
      return;
    }
    const match = farms.find(
      (f) =>
        (f.farmerId || '').toLowerCase() === tId.trim().toLowerCase() ||
        (f.id || '').toLowerCase() === tId.trim().toLowerCase()
    );
    setTargetFarm(match || null);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimal) {
      setRequestError('Please select an animal to transfer.');
      return;
    }
    if (!toFarmerId.trim() || !targetFarm) {
      setRequestError('Please select a valid destination Farmer ID.');
      return;
    }
    if (sourceFarm && targetFarm && sourceFarm.id === targetFarm.id) {
      setRequestError('Source farm and destination farm cannot be the same.');
      return;
    }

    setSubmittingRequest(true);
    setRequestError('');
    try {
      const payload = {
        animalId: selectedAnimal.id,
        fromFarmId: sourceFarm?.id || selectedAnimal.farmId,
        toFarmId: targetFarm.id,
        toFarmerId: targetFarm.farmerId,
        reason: transferReason,
        notes: transferNotes,
        requestedByName: user?.name || 'Veterinarian',
        requestDate: new Date().toISOString(),
      };

      const res = await apiFetch('/ownership-transfers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setRequestSuccess(res);
      loadData();
    } catch (err: any) {
      setRequestError(err?.message || 'Failed to submit ownership transfer request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Admin Approve Action
  const handleApproveTransfer = async (transferId: string) => {
    setDecisionLoading(true);
    try {
      await apiFetch(`/ownership-transfers/${transferId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'APPROVED',
          approvedById: user?.id,
          userName: user?.name || 'System Administrator',
        }),
      });
      setReviewTransfer(null);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve transfer.');
    } finally {
      setDecisionLoading(false);
    }
  };

  // Admin Reject Action
  const handleRejectTransfer = async () => {
    if (!reviewTransfer) return;
    setDecisionLoading(true);
    try {
      await apiFetch(`/ownership-transfers/${reviewTransfer.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: rejectionReason || 'Rejected by System Administrator',
          userName: user?.name || 'System Administrator',
        }),
      });
      setRejectionModalOpen(false);
      setReviewTransfer(null);
      setRejectionReason('');
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to reject transfer.');
    } finally {
      setDecisionLoading(false);
    }
  };

  const resetRequestModal = () => {
    setIsRequestModalOpen(false);
    setFromFarmerId('');
    setSourceFarm(null);
    setSourceAnimals([]);
    setSelectedAnimal(null);
    setToFarmerId('');
    setTargetFarm(null);
    setTransferReason('');
    setTransferNotes('');
    setRequestError('');
    setRequestSuccess(null);
  };

  const filteredTransfers = transfers.filter((t) => {
    const s = search.toLowerCase();
    const matchSearch =
      (t.transferCode || '').toLowerCase().includes(s) ||
      (t.animal?.name || '').toLowerCase().includes(s) ||
      (t.animal?.animalCode || t.animal?.tagNumber || '').toLowerCase().includes(s) ||
      (t.fromFarm?.farmerId || t.fromFarm?.name || '').toLowerCase().includes(s) ||
      (t.toFarm?.farmerId || t.toFarm?.name || '').toLowerCase().includes(s) ||
      (t.reason || '').toLowerCase().includes(s);

    const matchStatus = statusFilter === 'ALL' ? true : t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = transfers.filter((t) => t.status === 'PENDING').length;
  const approvedCount = transfers.filter((t) => t.status === 'APPROVED').length;
  const rejectedCount = transfers.filter((t) => t.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="text-emerald-700" size={26} />
            Livestock Ownership Transfers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Official transfer workflow: Veterinarian initiates animal transfer with complete health verification; Government Admin reviews and approves.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2.5 text-gray-600 hover:text-emerald-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => {
              resetRequestModal();
              setIsRequestModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-[#064E3B] hover:bg-[#065F46] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
          >
            <Plus size={18} /> Initiate Transfer Request
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${
            statusFilter === 'ALL' ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-xs font-bold text-gray-500 uppercase">Total Transfers</div>
          <div className="text-2xl font-extrabold text-gray-900 mt-1">{transfers.length}</div>
        </div>
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-white rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${
            statusFilter === 'PENDING' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1.5">
            <Clock size={14} /> Pending Approval
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{pendingCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`bg-white rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${
            statusFilter === 'APPROVED' ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Approved &amp; Transferred
          </div>
          <div className="text-2xl font-extrabold text-emerald-800 mt-1">{approvedCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`bg-white rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${
            statusFilter === 'REJECTED' ? 'border-red-600 ring-2 ring-red-600/20' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-xs font-bold text-red-600 uppercase flex items-center gap-1.5">
            <XCircle size={14} /> Rejected Requests
          </div>
          <div className="text-2xl font-extrabold text-red-700 mt-1">{rejectedCount}</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search transfers by ID, animal, farmer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
            />
          </div>

          <div className="flex gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  statusFilter === st ? 'bg-[#064E3B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Transfer Code</th>
                <th className="px-5 py-3.5">Animal Details</th>
                <th className="px-5 py-3.5">Source Farmer</th>
                <th className="px-5 py-3.5">Destination Farmer</th>
                <th className="px-5 py-3.5">Reason</th>
                <th className="px-5 py-3.5">Request Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransfers.map((item) => {
                const isPending = item.status === 'PENDING';
                const isApproved = item.status === 'APPROVED';
                const isRejected = item.status === 'REJECTED';

                return (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4 font-bold text-gray-900 font-mono">
                      {item.transferCode || `TRF-${item.id.slice(0, 6)}`}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">
                        <Link href={`/animals/${item.animal?.id || item.animalId}`} className="hover:text-emerald-700 hover:underline">
                          {item.animal?.name || 'Animal'} ({item.animal?.animalCode || item.animal?.tagNumber || 'Tag'})
                        </Link>
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.animal?.species} • {item.animal?.breed}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-800">
                        {item.fromFarm?.farmerId || 'FARM'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.fromFarm?.ownerName || item.fromFarm?.name || 'Source Farm'}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-emerald-800">
                        {item.toFarm?.farmerId || 'FARM'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.toFarm?.ownerName || item.toFarm?.name || 'Destination Farm'}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-700 max-w-[160px] truncate">
                      {item.reason || 'Not specified'}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {new Date(item.requestDate || item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : isRejected
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isApproved ? <CheckCircle2 size={12} /> : isRejected ? <XCircle size={12} /> : <Clock size={12} />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setReviewTransfer(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 shadow-sm"
                      >
                        <Eye size={14} /> Review
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTransfers.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-500">
                    No ownership transfer records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Vet Initiates Transfer Request                                    */}
      {/* ========================================================================= */}
      {isRequestModalOpen && (
        <Modal
          isOpen={isRequestModalOpen}
          onClose={resetRequestModal}
          title="Initiate Livestock Ownership Transfer"
          icon="fa-exchange"
        >
          {requestSuccess ? (
            <div className="text-center py-6 space-y-4 animate-fade-in">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Transfer Request Submitted!</h2>
              <p className="text-sm text-gray-600">
                Transfer Code: <span className="font-mono font-bold text-emerald-800">{requestSuccess.transferCode || requestSuccess.id}</span>
              </p>
              <div className="p-4 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-200">
                The transfer request has been recorded with status <strong className="text-amber-700">PENDING</strong>. It is now awaiting approval from the Government / System Administrator.
              </div>
              <div className="pt-2">
                <button
                  onClick={resetRequestModal}
                  className="bg-[#064E3B] hover:bg-[#065F46] text-white px-6 py-2 rounded-lg text-sm font-bold"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateTransfer} className="space-y-5">
              {requestError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} /> {requestError}
                </div>
              )}

              {/* Step 1: Source Farmer Selection */}
              <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-3">
                <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Step 1: Current Farmer ID (Source Farm) *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      list="source-farmers"
                      required
                      type="text"
                      placeholder="Enter or select Current Farmer ID (e.g. FARM001)..."
                      value={fromFarmerId}
                      onChange={(e) => handleFromFarmerLookup(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
                    />
                    <datalist id="source-farmers">
                      {farms.map((f) => (
                        <option key={f.id} value={f.farmerId || f.name}>
                          {f.ownerName || f.fullName} - {f.name} ({f.district || 'District'})
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                {loadingFarmAnimals && (
                  <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 animate-pulse">
                    <RefreshCw size={12} className="animate-spin" /> Fetching animals for this farmer...
                  </div>
                )}

                {sourceFarm && (
                  <div className="p-3 bg-white rounded-lg border border-emerald-100 text-xs space-y-1">
                    <div className="font-bold text-gray-900">{sourceFarm.name} ({sourceFarm.farmerId})</div>
                    <div className="text-gray-600">Owner: {sourceFarm.ownerName || sourceFarm.fullName} • Phone: {sourceFarm.contactNumber || sourceFarm.mobileNumber || 'N/A'}</div>
                    <div className="text-gray-500">Location: {sourceFarm.village || ''} {sourceFarm.district || sourceFarm.address || ''}</div>
                  </div>
                )}
              </div>

              {/* Step 2: Animal Selection and Full Details Display */}
              {sourceFarm && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Step 2: Select Animal to Transfer *
                  </label>
                  {sourceAnimals.length > 0 ? (
                    <>
                      <select
                        required
                        value={selectedAnimal?.id || ''}
                        onChange={(e) => {
                          const match = sourceAnimals.find((a) => a.id === e.target.value);
                          setSelectedAnimal(match || null);
                        }}
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none bg-white font-medium"
                      >
                        {sourceAnimals.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.animalCode || a.tagNumber} - {a.name} ({a.species} - {a.breed}) [{a.status}]
                          </option>
                        ))}
                      </select>

                      {/* Full Animal Details Submitted to Vet */}
                      {selectedAnimal && (
                        <div className="p-4 bg-white rounded-lg border border-gray-200 text-xs space-y-3 animate-fade-in">
                          <div className="font-bold text-sm text-gray-900 border-b pb-2 flex justify-between items-center">
                            <span>Animal Profile Verification</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                selectedAnimal.mrlStatus === 'CLEARED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              Clearance: {selectedAnimal.mrlStatus || 'CLEARED'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-gray-700">
                            <div><span className="text-gray-400 font-bold block uppercase">Tag / Code</span><span className="font-semibold">{selectedAnimal.animalCode || selectedAnimal.tagNumber}</span></div>
                            <div><span className="text-gray-400 font-bold block uppercase">Species / Breed</span><span className="font-semibold">{selectedAnimal.species} • {selectedAnimal.breed}</span></div>
                            <div><span className="text-gray-400 font-bold block uppercase">Gender / Age</span><span className="font-semibold">{selectedAnimal.gender} • {selectedAnimal.age} months</span></div>
                            <div><span className="text-gray-400 font-bold block uppercase">Weight</span><span className="font-semibold">{selectedAnimal.weight} kg</span></div>
                          </div>

                          {selectedAnimal.withdrawalRecords && selectedAnimal.withdrawalRecords.length > 0 && (
                            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-800 flex items-start gap-2">
                              <AlertTriangle size={16} className="shrink-0 text-red-600 mt-0.5" />
                              <div>
                                <span className="font-bold">Active Withdrawal Notice:</span> This animal has {selectedAnimal.withdrawalRecords.length} active restriction(s). Destination farmer must be informed.
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-4 text-center text-xs text-gray-500 bg-white rounded-lg border">
                      No active animals currently registered on this farm.
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Destination Farmer & Reason */}
              <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-3">
                <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Step 3: Destination Farmer ID *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    list="target-farmers"
                    required
                    type="text"
                    placeholder="Enter or select Destination Farmer ID (e.g. FARM002)..."
                    value={toFarmerId}
                    onChange={(e) => handleToFarmerLookup(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
                  />
                  <datalist id="target-farmers">
                    {farms
                      .filter((f) => !sourceFarm || f.id !== sourceFarm.id)
                      .map((f) => (
                        <option key={f.id} value={f.farmerId || f.name}>
                          {f.ownerName || f.fullName} - {f.name} ({f.district || 'District'})
                        </option>
                      ))}
                  </datalist>
                </div>

                {targetFarm && (
                  <div className="p-3 bg-white rounded-lg border border-emerald-100 text-xs space-y-1 animate-fade-in">
                    <div className="font-bold text-emerald-900">{targetFarm.name} ({targetFarm.farmerId})</div>
                    <div className="text-gray-600">Owner: {targetFarm.ownerName || targetFarm.fullName} • Phone: {targetFarm.contactNumber || targetFarm.mobileNumber || 'N/A'}</div>
                    <div className="text-gray-500">Location: {targetFarm.village || ''} {targetFarm.district || targetFarm.address || ''}</div>
                  </div>
                )}
              </div>

              {/* Transfer Reason & Remarks */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Reason for Transfer *</label>
                  <select
                    required
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
                  >
                    <option value="">-- Select Reason --</option>
                    <option value="Commercial Sale / Purchase">Commercial Sale / Purchase</option>
                    <option value="Breeding Relocation">Breeding Relocation</option>
                    <option value="Ownership Succession / Inheritance">Ownership Succession / Inheritance</option>
                    <option value="Farm Consolidation">Farm Consolidation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Veterinarian Notes / Verification Remarks</label>
                  <textarea
                    rows={2}
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="e.g. Animal physically inspected, ear tag verified intact, health card submitted."
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetRequestModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest || !selectedAnimal || !targetFarm}
                  className="bg-[#064E3B] hover:bg-[#065F46] text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm disabled:opacity-50"
                >
                  {submittingRequest ? 'Submitting Request...' : 'Submit to Admin for Approval'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Admin Reviews Transfer & Approves/Rejects                        */}
      {/* ========================================================================= */}
      {reviewTransfer && (
        <Modal
          isOpen={!!reviewTransfer}
          onClose={() => setReviewTransfer(null)}
          title="Review Ownership Transfer Request"
          icon="fa-shield"
        >
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex justify-between items-start pb-4 border-b">
              <div>
                <span className="font-mono text-xs font-bold text-gray-500">
                  {reviewTransfer.transferCode || reviewTransfer.id}
                </span>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                  Transfer of {reviewTransfer.animal?.name || 'Animal'}
                </h2>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  reviewTransfer.status === 'APPROVED'
                    ? 'bg-green-100 text-green-800'
                    : reviewTransfer.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {reviewTransfer.status}
              </span>
            </div>

            {/* From vs To Farm Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                <div className="font-bold text-gray-500 uppercase flex items-center gap-1.5">
                  <Tractor size={14} /> Source Farm (Current)
                </div>
                <div className="text-sm font-bold text-gray-900">{reviewTransfer.fromFarm?.name}</div>
                <div className="text-gray-600">Farmer ID: <strong>{reviewTransfer.fromFarm?.farmerId || 'N/A'}</strong></div>
                <div className="text-gray-600">Owner: {reviewTransfer.fromFarm?.ownerName || reviewTransfer.currentOwner?.name}</div>
                <div className="text-gray-500">{reviewTransfer.fromFarm?.district || reviewTransfer.fromFarm?.address}</div>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs space-y-2">
                <div className="font-bold text-emerald-800 uppercase flex items-center gap-1.5">
                  <Tractor size={14} className="text-emerald-700" /> Destination Farm (Target)
                </div>
                <div className="text-sm font-bold text-gray-900">{reviewTransfer.toFarm?.name}</div>
                <div className="text-gray-600">Farmer ID: <strong>{reviewTransfer.toFarm?.farmerId || 'N/A'}</strong></div>
                <div className="text-gray-600">New Owner: {reviewTransfer.toFarm?.ownerName || reviewTransfer.newOwner?.name}</div>
                <div className="text-gray-500">{reviewTransfer.toFarm?.district || reviewTransfer.toFarm?.address}</div>
              </div>
            </div>

            {/* Animal Verified Information */}
            <div className="p-4 bg-white rounded-xl border border-gray-200 text-xs space-y-3">
              <div className="font-bold text-gray-800 uppercase flex items-center gap-1.5">
                <PawPrint size={14} className="text-emerald-700" /> Animal Profile &amp; Health State
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-gray-700">
                <div><span className="text-gray-400 font-bold block uppercase">Tag Code</span><span className="font-semibold">{reviewTransfer.animal?.animalCode || reviewTransfer.animal?.tagNumber}</span></div>
                <div><span className="text-gray-400 font-bold block uppercase">Species</span><span className="font-semibold">{reviewTransfer.animal?.species}</span></div>
                <div><span className="text-gray-400 font-bold block uppercase">Breed</span><span className="font-semibold">{reviewTransfer.animal?.breed}</span></div>
                <div><span className="text-gray-400 font-bold block uppercase">Clearance</span><span className="font-bold text-emerald-800">{reviewTransfer.animal?.mrlStatus || 'CLEARED'}</span></div>
              </div>
            </div>

            {/* Reason & Notes */}
            <div className="p-3 bg-gray-50 rounded-lg border text-xs space-y-1">
              <span className="font-bold text-gray-700 uppercase">Transfer Reason:</span>
              <p className="text-gray-900">{reviewTransfer.reason || 'None specified'}</p>
              {reviewTransfer.notes && (
                <>
                  <span className="font-bold text-gray-700 uppercase block pt-2">Notes:</span>
                  <p className="text-gray-700">{reviewTransfer.notes}</p>
                </>
              )}
              {reviewTransfer.rejectionReason && (
                <>
                  <span className="font-bold text-red-700 uppercase block pt-2">Rejection Reason:</span>
                  <p className="text-red-800 font-medium">{reviewTransfer.rejectionReason}</p>
                </>
              )}
            </div>

            {/* Admin Decision Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setReviewTransfer(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>

              {isAdmin && reviewTransfer.status === 'PENDING' && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={decisionLoading}
                    onClick={() => setRejectionModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors"
                  >
                    <X size={14} /> Reject Transfer
                  </button>
                  <button
                    type="button"
                    disabled={decisionLoading}
                    onClick={() => handleApproveTransfer(reviewTransfer.id)}
                    className="inline-flex items-center gap-1.5 bg-[#064E3B] hover:bg-[#065F46] text-white px-5 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors"
                  >
                    <Check size={14} /> Approve &amp; Complete Transfer
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Rejection Reason Confirmation Modal                              */}
      {/* ========================================================================= */}
      {rejectionModalOpen && (
        <Modal
          isOpen={rejectionModalOpen}
          onClose={() => setRejectionModalOpen(false)}
          title="Reject Ownership Transfer"
          icon="fa-times-circle"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Please enter the official reason for rejecting this ownership transfer request. The animal will remain on the source farm.
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Rejection Reason *</label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Unverified destination farmer ID, documentation incomplete, or quarantine restriction active..."
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={decisionLoading || !rejectionReason.trim()}
                onClick={handleRejectTransfer}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {decisionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
