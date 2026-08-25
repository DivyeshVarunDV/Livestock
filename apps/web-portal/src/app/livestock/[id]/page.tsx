'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Activity, Info, Shield, Syringe, FileText, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import { calculateWithdrawal, calculateOverallWithdrawal } from '@/lib/withdrawalEngine';

export default function LivestockProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const { token } = useAuth();
  
  const [animal, setAnimal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function fetchAnimal() {
      if (!token) return;
      try {
        setLoading(true);
        const data = await apiFetch(`/animals/${id}`, { token });
        setAnimal(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch animal details');
      } finally {
        setLoading(false);
      }
    }
    fetchAnimal();
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader />
      </div>
    );
  }

  if (error || !animal) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          {error || 'Animal not found'}
        </div>
        <Link href="/livestock" className="mt-4 inline-flex items-center text-green-700 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Livestock
        </Link>
      </div>
    );
  }

  // Derived compliance
  const treatmentsForWithdrawal = (animal.treatments || []).map((t: any) => ({
    treatmentDate: t.administrationDate,
    withdrawalPeriodDays: t.withdrawalPeriod
  }));
  const overallWithdrawal = calculateOverallWithdrawal(treatmentsForWithdrawal);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Link href="/livestock" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Livestock
      </Link>

      {/* Profile Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{animal.name}</h1>
                <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md border border-gray-200">
                  #{animal.tagNumber}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Info className="w-4 h-4" /> {animal.species}</span>
                <span>&bull;</span>
                <span>{animal.breed}</span>
                <span>&bull;</span>
                <span>{animal.gender}</span>
                <span>&bull;</span>
                <span>{animal.ageMonths} months</span>
                <span>&bull;</span>
                <span>{animal.weight} kg</span>
                <span>&bull;</span>
                <span>Farm: {animal.farm?.name || 'N/A'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-start md:items-end">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                animal.status === 'HEALTHY' ? 'bg-green-50 text-green-700 border-green-200' :
                animal.status === 'SICK' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {animal.status}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                animal.mrlStatus === 'COMPLIANT' ? 'bg-green-50 text-green-700 border-green-200' :
                animal.mrlStatus === 'NON_COMPLIANT' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                MRL: {animal.mrlStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Info },
            { id: 'health', label: 'Health', icon: Activity },
            { id: 'vaccinations', label: 'Vaccinations', icon: Syringe },
            { id: 'treatments', label: 'Treatments', icon: FileText },
            { id: 'compliance', label: 'Compliance', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-green-700 text-green-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Species" value={animal.species} />
            <InfoItem label="Breed" value={animal.breed} />
            <InfoItem label="Gender" value={animal.gender} />
            <InfoItem label="Age" value={`${animal.ageMonths} months`} />
            <InfoItem label="Weight" value={`${animal.weight} kg`} />
            <InfoItem label="Farm" value={animal.farm?.name || 'N/A'} />
            <InfoItem label="Status" value={animal.status} />
            <InfoItem label="MRL Status" value={animal.mrlStatus} />
            <InfoItem label="Registered Date" value={new Date(animal.createdAt).toLocaleDateString()} />
          </div>
        )}

        {activeTab === 'health' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Health Records</h3>
            {animal.healthRecords?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diagnosis</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diseases</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veterinarian</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {animal.healthRecords.map((hr: any) => (
                      <tr key={hr.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(hr.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{hr.diagnosis}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{hr.diseases}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{hr.veterinarianName}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{hr.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No health records" description="This animal has no recorded health issues." icon={Activity} />
            )}
          </div>
        )}

        {activeTab === 'vaccinations' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vaccinations</h3>
            {animal.vaccinations?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vaccine</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Given</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Due</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veterinarian</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {animal.vaccinations.map((v: any) => {
                      const dueDate = new Date(v.nextDueDate);
                      const today = new Date();
                      const diffTime = dueDate.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      let dueBadge = 'bg-green-100 text-green-800';
                      if (diffDays < 0) dueBadge = 'bg-red-100 text-red-800';
                      else if (diffDays <= 7) dueBadge = 'bg-amber-100 text-amber-800';

                      return (
                        <tr key={v.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{v.vaccineName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(v.dateAdministered).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${dueBadge}`}>
                              {new Date(v.nextDueDate).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{v.administeredBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
               <EmptyState title="No vaccinations" description="No vaccination records found." icon={Syringe} />
            )}
          </div>
        )}

        {activeTab === 'treatments' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Treatments</h3>
            {animal.treatments?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drug</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dosage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Withdrawal (Days)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {animal.treatments.map((t: any) => {
                      const wStatus = calculateWithdrawal(t.administrationDate, t.withdrawalPeriod);
                      let statusBadge = 'bg-gray-100 text-gray-800';
                      if (wStatus.status === 'CLEARED') statusBadge = 'bg-green-100 text-green-800';
                      else if (wStatus.status === 'ACTIVE') statusBadge = 'bg-amber-100 text-amber-800';
                      else if (wStatus.status === 'DUE SOON') statusBadge = 'bg-red-100 text-red-800';

                      return (
                        <tr key={t.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.drugName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.dosage}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(t.administrationDate).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.withdrawalPeriod}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {wStatus.endDate ? new Date(wStatus.endDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge}`}>
                              {wStatus.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
               <EmptyState title="No treatments" description="No medical treatments recorded." icon={FileText} />
            )}
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 flex flex-col items-center text-center">
              <Clock className={`w-12 h-12 mb-4 ${overallWithdrawal.isCleared ? 'text-green-500' : 'text-amber-500'}`} />
              <h4 className="text-lg font-semibold text-gray-900 mb-1">Withdrawal Status</h4>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border mb-4 ${
                overallWithdrawal.isCleared 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}>
                {overallWithdrawal.isCleared ? 'CLEARED' : 'ACTIVE'}
              </span>
              
              {!overallWithdrawal.isCleared && overallWithdrawal.endDate && (
                <div className="text-sm text-gray-600">
                  <p>Clearance expected on:</p>
                  <p className="font-semibold text-gray-900 mt-1">{new Date(overallWithdrawal.endDate).toLocaleDateString()}</p>
                  <p className="mt-1">({overallWithdrawal.daysRemaining} days remaining)</p>
                </div>
              )}
              {overallWithdrawal.isCleared && (
                <p className="text-sm text-gray-600">Safe for consumption / products.</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 flex flex-col items-center text-center">
              <Shield className={`w-12 h-12 mb-4 ${
                animal.mrlStatus === 'COMPLIANT' ? 'text-green-500' : 
                animal.mrlStatus === 'NON_COMPLIANT' ? 'text-red-500' : 'text-amber-500'
              }`} />
              <h4 className="text-lg font-semibold text-gray-900 mb-1">MRL Compliance</h4>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border mb-4 ${
                animal.mrlStatus === 'COMPLIANT' ? 'bg-green-100 text-green-800 border-green-200' :
                animal.mrlStatus === 'NON_COMPLIANT' ? 'bg-red-100 text-red-800 border-red-200' :
                'bg-amber-100 text-amber-800 border-amber-200'
              }`}>
                {animal.mrlStatus}
              </span>
              <p className="text-sm text-gray-600">
                {animal.mrlStatus === 'COMPLIANT' 
                  ? 'All recent treatments fall within acceptable Maximum Residue Limits.'
                  : animal.mrlStatus === 'NON_COMPLIANT'
                  ? 'Warning: Residue levels exceed acceptable limits.'
                  : 'Pending testing or evaluation.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function EmptyState({ title, description, icon: Icon }: { title: string, description: string, icon: any }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg border border-gray-100">
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <h4 className="text-base font-medium text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
