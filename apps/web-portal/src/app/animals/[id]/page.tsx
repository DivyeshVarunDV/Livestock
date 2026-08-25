'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { calculateOverallWithdrawal } from '@/lib/withdrawalEngine';
import { calculateMRLCompliance } from '@/lib/mrlEngine';
import { ArrowLeft, Clock, ShieldCheck, Syringe, FileText, Activity, AlertTriangle, Calendar, CheckCircle, BookOpen } from 'lucide-react';

export default function AnimalProfile() {
  const { id } = useParams() as { id: string };
  const [animal, setAnimal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const loadAnimal = async () => {
      try {
        const [data, audit] = await Promise.all([
          apiFetch(`/animals/${id}`),
          apiFetch(`/audit-logs`).catch(() => [])
        ]);
        setAnimal(data);
        setAuditLogs(Array.isArray(audit) ? audit : []);
      } catch (e) {
        console.error('Error loading animal:', e);
      } finally {
        setLoading(false);
      }
    };
    loadAnimal();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-64 text-gray-500">
        Loading profile...
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-64">
        <div className="text-gray-500 mb-4">Animal not found.</div>
        <Link href="/animals" className="text-green-600 font-medium hover:underline">
          Return to animals list
        </Link>
      </div>
    );
  }

  // Calculate Health Summary
  const totalTreatments = animal.treatments?.length || 0;
  
  // Withdrawal calculation
  let activeWithdrawal = false;
  let withdrawalDrug = '';
  let withdrawalStart: string | null = null;
  let withdrawalEnd: string | null = null;
  let withdrawalDaysLeft = 0;
  
  const mappedTreatments = (animal.treatments || []).map((t: any) => ({
    animalId: animal.id,
    treatmentDate: t.administrationDate,
    medicine: t.drugName,
    withdrawalPeriodDays: t.withdrawalPeriod,
    ...t
  }));

  const calc = calculateOverallWithdrawal(mappedTreatments);
  if (calc.status !== 'CLEARED' && calc.endDate && calc.treatment) {
    activeWithdrawal = true;
    withdrawalDrug = calc.treatment.medicine;
    withdrawalStart = calc.treatment.treatmentDate;
    withdrawalEnd = calc.endDate.toISOString();
    withdrawalDaysLeft = calc.daysRemaining;
  }

  const activeTreatments = activeWithdrawal ? 1 : (animal.status === 'UNDER_TREATMENT' ? 1 : 0);
  const lastTreatment = animal.treatments?.[0]?.administrationDate;

  // Timeline merging
  const events: any[] = [];
  (animal.treatments || []).forEach((t: any) => {
    events.push({ date: t.administrationDate, type: 'Treatment recorded', detail: t.drugName, icon: Syringe, color: 'text-blue-500', bg: 'bg-blue-100' });
    
    if (t.withdrawalCompletionDate) {
      events.push({ 
        date: t.administrationDate, 
        type: 'Withdrawal active', 
        detail: `${t.withdrawalPeriod} days remaining`, 
        icon: Clock, 
        color: 'text-amber-500', 
        bg: 'bg-amber-100' 
      });
    }
  });
  (animal.vaccinations || []).forEach((v: any) => {
    events.push({ date: v.vaccinationDate, type: 'Vaccination recorded', detail: v.vaccineName, icon: Syringe, color: 'text-purple-500', bg: 'bg-purple-100' });
  });
  (animal.healthRecords || []).forEach((h: any) => {
    events.push({ date: h.date, type: 'Health record', detail: h.diagnosis, icon: Activity, color: 'text-green-500', bg: 'bg-green-100' });
  });
  (animal.prescriptions || []).forEach((p: any) => {
    events.push({ date: p.prescriptionDate, type: 'Prescription recorded', detail: p.medicine, icon: FileText, color: 'text-orange-500', bg: 'bg-orange-100' });
  });

  const treatmentIds = new Set((animal.treatments || []).map((t: any) => t.id));
  const relevantAuditLogs = auditLogs.filter(log => 
    (log.entity === 'ANIMAL' && log.entityId === animal.id) ||
    (log.entity === 'TREATMENT' && treatmentIds.has(log.entityId)) ||
    (log.entity === 'PRESCRIPTION' && (animal.prescriptions || []).some((p: any) => p.id === log.entityId))
  );

  relevantAuditLogs.forEach((log) => {
    let icon = BookOpen;
    let color = 'text-gray-500';
    let bg = 'bg-gray-100';

    if (log.action.includes('Created')) { color = 'text-blue-600'; bg = 'bg-blue-100'; icon = FileText; }
    if (log.action.includes('Withdrawal Started')) { color = 'text-amber-500'; bg = 'bg-amber-100'; icon = Clock; }
    if (log.action.includes('Withdrawal Cleared')) { color = 'text-green-600'; bg = 'bg-green-100'; icon = CheckCircle; }

    let detail = '';
    if (log.newValue) {
      try {
        const parsed = JSON.parse(log.newValue);
        detail = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ');
      } catch {
        detail = log.newValue;
      }
    }

    events.push({
      date: log.createdAt,
      type: `Audit: ${log.action}`,
      detail: `${detail ? detail + ' | ' : ''}User: ${log.userName || log.userEmail || 'System'}`,
      icon,
      color,
      bg
    });
  });

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let measuredResidue = 5;
  const mrlLimit = 100;
  let drug = 'Various';
  
  if (animal.mrlStatus === 'DO_NOT_SELL') {
    measuredResidue = 150;
    drug = 'Penicillin G';
  } else if (animal.mrlStatus === 'CLEARING_SOON') {
    measuredResidue = null as any;
    drug = 'Oxytetracycline';
  }
  
  const mrlDecision = calculateMRLCompliance({
    animalId: animal.id,
    drug,
    measuredResidue,
    mrlLimit,
    testDate: new Date().toISOString(),
    withdrawalStatus: calc.status,
    withdrawalDaysRemaining: calc.daysRemaining
  });

  const currentMrlStatus = mrlDecision.status;

  const formatMrl = (status: string) => {
    if (!status) return '';
    if (status === 'DO_NOT_SELL') return 'Do Not Sell';
    return status.split('-').join(' ').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };
  
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/animals" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={16} />
        Back to Animals
      </Link>

      {/* HEADER */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{animal.name}</h1>
            <span className="px-2.5 py-0.5 rounded-md text-sm font-semibold bg-gray-100 text-gray-800">
              {animal.tagNumber}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-600 leading-relaxed">
            <div>
              <span className="block text-xs uppercase font-bold text-gray-400 mb-1">Species / Breed</span>
              <span className="font-medium text-gray-800">{animal.species} • {animal.breed}</span>
            </div>
            <div>
              <span className="block text-xs uppercase font-bold text-gray-400 mb-1">Gender / Age</span>
              <span className="font-medium text-gray-800">{animal.gender} • {animal.age} months</span>
            </div>
            <div>
              <span className="block text-xs uppercase font-bold text-gray-400 mb-1">Weight</span>
              <span className="font-medium text-gray-800">{animal.weight} kg</span>
            </div>
            <div>
              <span className="block text-xs uppercase font-bold text-gray-400 mb-1">Farm</span>
              <span className="font-medium text-gray-800">{animal.farm?.name}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3 w-full md:w-auto md:min-w-[200px]">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 w-full">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1.5">Health Status</span>
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${animal.status === 'HEALTHY' ? 'bg-green-100 text-green-800' : animal.status === 'UNDER_TREATMENT' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'}`}>
              {animal.status}
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 w-full">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1.5">MRL Status</span>
            <div className="group relative inline-block">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${currentMrlStatus === 'COMPLIANT' ? 'bg-green-100 text-green-800' : currentMrlStatus === 'PENDING' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>
                {formatMrl(currentMrlStatus)}
              </span>
              <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 text-white text-xs rounded p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {mrlDecision.reason}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ENHANCED STATUS CARD */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" />
            Clearance Status
          </h2>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
            currentMrlStatus === 'COMPLIANT' ? 'bg-green-100 text-green-800' : 
            currentMrlStatus === 'PENDING' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
          }`}>
            {formatMrl(currentMrlStatus)}
          </span>
        </div>

        {activeWithdrawal ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-gray-500 font-semibold block uppercase mb-1">Active Drug</span>
                <span className="text-sm font-bold text-gray-900">{withdrawalDrug}</span>
                <span className="text-xs text-gray-500 ml-2">({calc.treatment?.withdrawalPeriodDays} days withdrawal)</span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-gray-500 font-semibold block uppercase mb-1">Time Remaining</span>
                <span className="text-lg font-bold text-amber-600">{withdrawalDaysLeft} Days</span>
              </div>
            </div>
            
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div 
                className="bg-amber-500 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.max(0, Math.min(100, ((calc.treatment?.withdrawalPeriodDays || 0) - withdrawalDaysLeft) / (calc.treatment?.withdrawalPeriodDays || 1) * 100))}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 font-medium">
              <span>Administered: {withdrawalStart ? new Date(withdrawalStart).toLocaleDateString() : 'N/A'}</span>
              <span>Clears: {withdrawalEnd ? new Date(withdrawalEnd).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-100 text-green-800">
            <CheckCircle size={20} className="text-green-600" />
            <div>
              <p className="font-semibold text-sm">Clear for Sale or Consumption</p>
              <p className="text-xs opacity-90 mt-0.5">No active withdrawal periods or MRL issues.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* TOP SECTION: Summary & Tables */}
        <div className="space-y-6">
          
          {/* Health Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <span className="text-xs text-gray-500 font-semibold block uppercase">Total Treatments</span>
              <span className="text-lg font-bold text-gray-900 mt-1">{totalTreatments}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-semibold block uppercase">Active Treatments</span>
              <span className="text-lg font-bold text-gray-900 mt-1">{activeTreatments}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-semibold block uppercase">Last Treatment</span>
              <span className="text-sm font-semibold text-gray-900 mt-1 block">
                {lastTreatment ? new Date(lastTreatment).toLocaleDateString() : 'None'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Treatment History */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Syringe size={16} className="text-blue-500" />
                  Treatment History
                </h2>
              </div>
              <div className="overflow-x-auto w-full max-h-[300px]">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-white border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="p-4 font-semibold text-gray-900 whitespace-nowrap">Date</th>
                      <th className="p-4 font-semibold text-gray-900 whitespace-nowrap">Medicine</th>
                      <th className="p-4 font-semibold text-gray-900 whitespace-nowrap">Withdrawal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {animal.treatments?.length > 0 ? (
                      animal.treatments.map((t: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="p-4 whitespace-nowrap align-middle">{new Date(t.administrationDate).toLocaleDateString()}</td>
                          <td className="p-4 font-medium text-gray-800 whitespace-nowrap align-middle">{t.drugName}</td>
                          <td className="p-4 whitespace-nowrap align-middle">{t.withdrawalPeriod} days</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="p-6 text-center text-gray-500">No treatment history available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Prescription History */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FileText size={16} className="text-orange-500" />
                  Prescription History
                </h2>
              </div>
              <div className="overflow-x-auto w-full max-h-[300px]">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-white border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="p-4 font-semibold text-gray-900 whitespace-nowrap">Date</th>
                      <th className="p-4 font-semibold text-gray-900 whitespace-nowrap">Medicine</th>
                      <th className="p-4 font-semibold text-gray-900 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {animal.prescriptions?.length > 0 ? (
                      animal.prescriptions.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="p-4 whitespace-nowrap align-middle">{new Date(p.prescriptionDate).toLocaleDateString()}</td>
                          <td className="p-4 font-medium text-gray-800 whitespace-nowrap align-middle">{p.medicine}</td>
                          <td className="p-4 whitespace-nowrap align-middle">
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">{p.status}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="p-6 text-center text-gray-500">No prescription history available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6 overflow-hidden mt-2">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-8">
            <Calendar size={20} className="text-emerald-600" />
            Complete Health Timeline
          </h2>
          <div className="relative border-l-2 border-emerald-100 ml-4 space-y-8 pb-4">
            {events.length > 0 ? (
              events.map((ev, i) => (
                <div key={i} className="relative pl-8">
                  <div className={`absolute -left-[20px] top-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white ${ev.bg} ${ev.color} shadow-sm z-10`}>
                    <ev.icon size={18} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-1">
                    <span className="text-base font-bold text-gray-900">{ev.type}</span>
                    <span className="text-xs font-semibold text-gray-500">{new Date(ev.date).toLocaleDateString()} at {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3 mt-2 inline-block max-w-full break-words">
                    {ev.detail}
                  </div>
                </div>
              ))
            ) : (
              <div className="pl-8 text-sm text-gray-500">No timeline events available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
