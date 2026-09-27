'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import QRCode from 'react-qr-code';
import { FileText, ArrowLeft, CheckCircle2, QrCode, AlertCircle, Syringe, Clock } from 'lucide-react';
import Link from 'next/link';

export default function EnhancedNewPrescription() {
  const router = useRouter();
  const { user } = useAuth();
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdPrescription, setCreatedPrescription] = useState<any>(null);

  const [formData, setFormData] = useState({
    animalId: '',
    farmerId: '',
    medicine: '',
    activeIngredient: '',
    dosage: '',
    route: 'Oral',
    frequency: 'Once daily',
    duration: '5',
    startDate: new Date().toISOString().substring(0, 10),
    applicableWithdrawalPeriod: '7',
    instructions: '',
    veterinarianName: user?.name || 'Dr. Veterinarian',
    status: 'ACTIVE',
  });

  useEffect(() => {
    apiFetch('/animals')
      .then((data) => {
        setAnimals(Array.isArray(data) ? data : []);
        if (data && data.length > 0) {
          const first = data[0];
          setFormData((prev) => ({
            ...prev,
            animalId: first.id,
            farmerId: first.farm?.farmerId || '',
          }));
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleAnimalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const aId = e.target.value;
    const selected = animals.find((a) => a.id === aId);
    setFormData({
      ...formData,
      animalId: aId,
      farmerId: selected?.farm?.farmerId || '',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const durationNum = parseInt(formData.duration) || 0;
      const start = new Date(formData.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + durationNum);

      const payload = {
        animalId: formData.animalId,
        farmerId: formData.farmerId,
        medicine: formData.medicine,
        activeIngredient: formData.activeIngredient,
        dosage: formData.dosage,
        route: formData.route,
        frequency: formData.frequency,
        duration: durationNum,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        applicableWithdrawalPeriod: parseInt(formData.applicableWithdrawalPeriod) || 0,
        instructions: formData.instructions,
        prescriptionDate: new Date().toISOString(),
        veterinarianName: formData.veterinarianName || user?.name || 'Dr. Veterinarian',
        status: formData.status,
      };

      const res = await apiFetch('/prescriptions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreatedPrescription(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/veterinarian/prescriptions" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={16} /> Back to Prescriptions
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Digital Veterinary Prescription</h1>
            <p className="text-xs text-gray-500 mt-0.5">Issue an authenticated digital prescription with withdrawal timing and QR tracking.</p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {createdPrescription ? (
          <div className="text-center py-8 space-y-6 animate-fade-in">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Prescription Issued Successfully!</h2>
              <p className="text-sm text-gray-500 mt-1">
                Prescription Code: <span className="font-mono font-bold text-emerald-800">{createdPrescription.prescriptionCode || createdPrescription.id}</span>
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 inline-block">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 inline-block">
                <QRCode
                  value={`PRESCRIPTION:${createdPrescription.prescriptionCode || createdPrescription.id}|ANIMAL:${createdPrescription.animalId}|MED:${createdPrescription.medicine}`}
                  size={160}
                />
              </div>
              <p className="text-xs text-gray-500 mt-3 font-mono">Scan for prescription authentication</p>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setCreatedPrescription(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Issue Another
              </button>
              <Link
                href="/veterinarian/dispensing"
                className="bg-[#064E3B] hover:bg-[#065F46] text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm"
              >
                Proceed to Dispensing →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Target Animal *</label>
                <select
                  required
                  name="animalId"
                  value={formData.animalId}
                  onChange={handleAnimalChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
                >
                  <option value="">-- Choose Animal --</option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.animalCode || a.tagNumber} - {a.name} ({a.species}) - Farm: {a.farm?.farmerId || a.farm?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Medicine Name *</label>
                <input
                  required
                  type="text"
                  name="medicine"
                  value={formData.medicine}
                  onChange={handleChange}
                  placeholder="e.g. Oxytetracycline 20%"
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Active Ingredient</label>
                <input
                  type="text"
                  name="activeIngredient"
                  value={formData.activeIngredient}
                  onChange={handleChange}
                  placeholder="e.g. Oxytetracycline"
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Dosage *</label>
                <input
                  required
                  type="text"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleChange}
                  placeholder="e.g. 10 ml/100kg"
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Route</label>
                <select
                  name="route"
                  value={formData.route}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
                >
                  <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                  <option value="Intravenous (IV)">Intravenous (IV)</option>
                  <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                  <option value="Oral">Oral</option>
                  <option value="Intramammary">Intramammary</option>
                  <option value="Topical">Topical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Frequency</label>
                <select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
                >
                  <option value="Once daily">Once daily (SID)</option>
                  <option value="Twice daily">Twice daily (BID)</option>
                  <option value="Three times daily">Three times daily (TID)</option>
                  <option value="Single dose">Single dose</option>
                  <option value="As needed">As needed (PRN)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Duration (Days) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Start Date *</label>
                <input
                  required
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Applicable Withdrawal (Days) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  name="applicableWithdrawalPeriod"
                  value={formData.applicableWithdrawalPeriod}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Clinical Instructions *</label>
                <textarea
                  required
                  rows={2}
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleChange}
                  placeholder="Special dietary directions or administration precautions..."
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Prescribing Veterinarian</label>
                <input
                 
                  type="text"
                  name="veterinarianName"
                  value={formData.veterinarianName}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-emerald-600 outline-none" readOnly aria-readonly="true" title="Recorded automatically from your signed-in account" />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#064E3B] hover:bg-[#065F46] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm disabled:opacity-50"
              >
                {loading ? 'Issuing...' : 'Issue Prescription'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
