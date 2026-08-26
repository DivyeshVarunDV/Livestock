'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { ArrowLeft, Clock, ShieldCheck, Syringe, FileText, Activity, Calendar, CheckCircle, BookOpen, User, History, FlaskConical, AlertTriangle } from 'lucide-react';

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
    return <div className="p-8 flex justify-center items-center h-64 text-gray-500">Loading profile...</div>;
  }

  if (!animal) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-64">
        <div className="text-gray-500 mb-4">Animal not found.</div>
        <Link href="/animals" className="text-green-600 font-medium hover:underline">Return to animals list</Link>
      </div>
    );
  }

  const activeWithdrawal = (animal.withdrawalRecords || []).find((record: any) => record.status === 'RESTRICTED');
  const relevantAuditLogs = auditLogs.filter((log) => log.entityId === animal.id || (animal.treatments || []).some((t: any) => t.id === log.entityId));

  const events: any[] = [];
  (animal.treatments || []).forEach((t: any) => events.push({ date: t.administrationDate, type: 'Treatment recorded', detail: `${t.drugName} • ${t.dosage}`, icon: Syringe, color: 'text-blue-500', bg: 'bg-blue-100' }));
  (animal.vaccinations || []).forEach((v: any) => events.push({ date: v.vaccinationDate, type: 'Vaccination recorded', detail: v.vaccineName, icon: Syringe, color: 'text-purple-500', bg: 'bg-purple-100' }));
  (animal.healthRecords || []).forEach((h: any) => events.push({ date: h.date, type: 'Health record', detail: h.diagnosis, icon: Activity, color: 'text-green-500', bg: 'bg-green-100' }));
  (animal.ownershipTransfers || []).forEach((t: any) => events.push({ date: t.requestDate, type: 'Ownership transfer', detail: `${t.fromFarm?.farmerId || '-'} → ${t.toFarm?.farmerId || '-'}`, icon: History, color: 'text-indigo-500', bg: 'bg-indigo-100' }));
  relevantAuditLogs.forEach((log) => events.push({ date: log.createdAt, type: `Audit: ${log.action}`, detail: log.newValue || log.oldValue || 'Updated', icon: BookOpen, color: 'text-gray-500', bg: 'bg-gray-100' }));
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <Link href="/animals" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={16} />
        Back to Animals
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{animal.name}</h1>
            <span className="px-2.5 py-0.5 rounded-md text-sm font-semibold bg-gray-100 text-gray-800">{animal.animalCode || animal.tagNumber}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-600 leading-relaxed">
            <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Species / Breed</span><span className="font-medium text-gray-800">{animal.species} • {animal.breed}</span></div>
            <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Gender / Age</span><span className="font-medium text-gray-800">{animal.gender} • {animal.age} months</span></div>
            <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Weight</span><span className="font-medium text-gray-800">{animal.weight} kg</span></div>
            <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Farmer</span><span className="font-medium text-gray-800">{animal.farm?.farmerId || animal.farm?.name}</span></div>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[220px]">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100"><span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1.5">Health Status</span><span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold whitespace-nowrap bg-green-100 text-green-800">{animal.status}</span></div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100"><span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1.5">Clearance</span><span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${animal.mrlStatus === 'CLEARED' ? 'bg-green-100 text-green-800' : animal.mrlStatus === 'CLEARING_SOON' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>{animal.mrlStatus === 'DO_NOT_SELL' ? 'RESTRICTED' : animal.mrlStatus.replace('_', ' ')}</span></div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center gap-4 justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">Animal QR Code</span>
              <span className="text-xs text-gray-400">Scan for Profile</span>
            </div>
            <div className="bg-white p-1 rounded-md shadow-sm border border-gray-100">{typeof window !== 'undefined' && <QRCode value={`${window.location.origin}/animals/${animal.id}`} size={48} />}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><ShieldCheck className="text-emerald-600" /> Product Clearance</h2>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${animal.mrlStatus === 'CLEARED' ? 'bg-green-100 text-green-800' : animal.mrlStatus === 'CLEARING_SOON' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>{animal.mrlStatus === 'DO_NOT_SELL' ? 'RESTRICTED' : animal.mrlStatus.replace('_', ' ')}</span>
            </div>
            {activeWithdrawal ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Product</span><span className="font-medium text-gray-800">{activeWithdrawal.productType}</span></div>
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Medicine</span><span className="font-medium text-gray-800">{activeWithdrawal.medicine}</span></div>
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Withdrawal End</span><span className="font-medium text-gray-800">{new Date(activeWithdrawal.withdrawalEndDate).toLocaleDateString()}</span></div>
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Status</span><span className="font-medium text-red-700">RESTRICTED</span></div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-100 text-green-800"><CheckCircle size={20} className="text-green-600" /><div><p className="font-semibold text-sm">Clear for Sale or Collection</p><p className="text-xs opacity-90 mt-0.5">No active product withdrawal restriction.</p></div></div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50"><h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><User size={16} className="text-emerald-600" /> Owner Information</h2></div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Farmer ID</span><span className="font-medium text-gray-800">{animal.farm?.farmerId || 'N/A'}</span></div>
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Owner</span><span className="font-medium text-gray-800">{animal.farm?.fullName || animal.farm?.ownerName || 'N/A'}</span></div>
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Mobile</span><span className="font-medium text-gray-800">{animal.farm?.mobileNumber || 'N/A'}</span></div>
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">District</span><span className="font-medium text-gray-800">{animal.farm?.district || 'N/A'}</span></div>
                <div className="sm:col-span-2"><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Address</span><span className="font-medium text-gray-800">{animal.farm?.address || 'N/A'}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50"><h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Activity size={16} className="text-green-600" /> Basic Information</h2></div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Animal ID</span><span className="font-medium text-gray-800">{animal.animalCode || 'N/A'}</span></div>
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Tag</span><span className="font-medium text-gray-800">{animal.tagNumber}</span></div>
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Color</span><span className="font-medium text-gray-800">{animal.color || 'N/A'}</span></div>
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Mark</span><span className="font-medium text-gray-800">{animal.identificationMark || 'N/A'}</span></div>
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Current Status</span><span className="font-medium text-gray-800">{animal.currentStatus || 'ACTIVE'}</span></div>
                <div><span className="block text-xs uppercase font-bold text-gray-400 mb-1">Registered</span><span className="font-medium text-gray-800">{animal.registrationDate ? new Date(animal.registrationDate).toLocaleDateString() : 'N/A'}</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[{ title: 'Health History', rows: animal.healthRecords || [], icon: Activity, color: 'text-green-500', render: (row: any) => `${row.diagnosis}${row.symptoms ? ` • ${row.symptoms}` : ''}` },
              { title: 'Vaccination History', rows: animal.vaccinations || [], icon: Syringe, color: 'text-purple-500', render: (row: any) => `${row.vaccineName}${row.nextDueDate ? ` • Next due ${new Date(row.nextDueDate).toLocaleDateString()}` : ''}` },
              { title: 'Treatment History', rows: animal.treatments || [], icon: Clock, color: 'text-blue-500', render: (row: any) => `${row.drugName} • ${row.dosage} • ${row.withdrawalPeriod} days` },
              { title: 'AMU History', rows: animal.amuRecords || [], icon: FlaskConical, color: 'text-amber-500', render: (row: any) => `${row.medicine} • ${row.dosage}${row.route ? ` • ${row.route}` : ''}` },
              { title: 'Withdrawal Status', rows: animal.withdrawalRecords || [], icon: AlertTriangle, color: 'text-red-500', render: (row: any) => `${row.productType} • ${row.status} • Ends ${new Date(row.withdrawalEndDate).toLocaleDateString()}` },
              { title: 'Ownership History', rows: animal.ownershipTransfers || [], icon: History, color: 'text-indigo-500', render: (row: any) => `${row.fromFarm?.farmerId || '-'} → ${row.toFarm?.farmerId || '-'} • ${row.status}` },
            ].map((section) => (
              <div key={section.title} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50"><h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><section.icon size={16} className={section.color} /> {section.title}</h2></div>
                <div className="divide-y divide-gray-100 max-h-[280px] overflow-y-auto">
                  {section.rows.length > 0 ? section.rows.map((row: any, idx: number) => (
                    <div key={idx} className="p-4 text-sm text-gray-700">
                      <div className="font-medium text-gray-900">{section.render(row)}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(row.date || row.createdAt || row.requestDate || row.vaccinationDate || row.administrationDate || row.withdrawalEndDate).toLocaleDateString()}</div>
                    </div>
                  )) : <div className="p-6 text-center text-sm text-gray-500">No records available.</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6 overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-8"><Calendar size={20} className="text-emerald-600" /> Complete Timeline</h2>
            <div className="relative border-l-2 border-emerald-100 ml-4 space-y-8 pb-4 max-h-[700px] overflow-y-auto">
              {events.length > 0 ? events.map((ev, i) => (
                <div key={i} className="relative pl-8">
                  <div className={`absolute -left-[20px] top-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white ${ev.bg} ${ev.color} shadow-sm z-10`}><ev.icon size={18} /></div>
                  <div className="flex flex-col gap-1 mb-1">
                    <span className="text-base font-bold text-gray-900">{ev.type}</span>
                    <span className="text-xs font-semibold text-gray-500">{new Date(ev.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3 mt-2 inline-block max-w-full break-words">{ev.detail}</div>
                </div>
              )) : <div className="pl-8 text-sm text-gray-500">No timeline events available.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
