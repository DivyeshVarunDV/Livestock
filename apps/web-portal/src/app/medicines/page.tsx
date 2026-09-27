'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/Modal';
import { Pill, Plus, Search, Edit, Clock } from 'lucide-react';

const CATEGORIES = ['ANTIBIOTIC', 'ANTIPARASITIC', 'NSAID', 'HORMONE', 'VACCINE', 'VITAMIN', 'OTHER'];
const DOSAGE_FORMS = ['INJECTABLE', 'ORAL', 'POUR_ON', 'INTRAMAMMARY', 'TOPICAL', 'OTHER'];

const EMPTY = { name: '', activeIngredient: '', category: 'ANTIBIOTIC', dosageForm: 'INJECTABLE', withdrawalPeriod: '0', notes: '', status: 'ACTIVE' };

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [list, inventory] = await Promise.all([apiFetch('/medicines'), apiFetch('/inventory').catch(() => [])]);
      setMedicines(Array.isArray(list) ? list : []);
      setStock(Array.isArray(inventory) ? inventory : []);
    } catch (err: any) {
      alert(`Unable to load medicines: ${err?.message || 'server unavailable'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (m?: any) => {
    setEditing(m ?? null);
    setForm(
      m
        ? {
            name: m.name,
            activeIngredient: m.activeIngredient ?? '',
            category: m.category ?? 'OTHER',
            dosageForm: m.dosageForm ?? 'OTHER',
            withdrawalPeriod: String(m.withdrawalPeriod ?? 0),
            notes: m.notes ?? '',
            status: m.status ?? 'ACTIVE',
          }
        : EMPTY,
    );
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing && Number(form.withdrawalPeriod) !== editing.withdrawalPeriod) {
      const ok = confirm(
        `Change the withdrawal period of ${editing.name} from ${editing.withdrawalPeriod} to ${form.withdrawalPeriod} day(s)?\n\n` +
          'Stock of this medicine will use the new period for future treatments. Treatments already given keep their original period.',
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const body = JSON.stringify({ ...form, withdrawalPeriod: Number(form.withdrawalPeriod) });
      if (editing) await apiFetch(`/medicines/${editing.id}`, { method: 'PUT', body });
      else await apiFetch('/medicines', { method: 'POST', body });
      setModalOpen(false);
      load();
    } catch (err: any) {
      alert(err?.message || 'Could not save the medicine.');
    } finally {
      setSaving(false);
    }
  };

  const unitsInStock = (name: string) =>
    stock.filter((s) => s.medicineName?.toLowerCase() === name.toLowerCase()).reduce((sum, s) => sum + (s.stock || 0), 0);

  const q = search.toLowerCase();
  const filtered = medicines.filter(
    (m) => !q || m.name.toLowerCase().includes(q) || (m.activeIngredient ?? '').toLowerCase().includes(q) || (m.category ?? '').toLowerCase().includes(q),
  );

  const field = 'w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm';

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Pill className="text-green-700" size={26} /> Medicines
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Approved medicine list. The withdrawal period set here applies to all stock of the medicine and to new treatments.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors"
        >
          <Plus size={18} /> Add Medicine
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search name, ingredient or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
            />
          </div>
          <span className="text-xs font-semibold text-gray-500">{filtered.length} medicine(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Medicine</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Form</th>
                <th className="px-5 py-3.5">Withdrawal Period</th>
                <th className="px-5 py-3.5">In Stock</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-500">Loading medicines...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-500">No medicines found.</td></tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">{m.name}</div>
                      {m.activeIngredient && <div className="text-xs text-gray-500 mt-0.5">{m.activeIngredient}</div>}
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-gray-700">{m.category ?? '-'}</td>
                    <td className="px-5 py-4 text-xs text-gray-600">{m.dosageForm?.replace('_', ' ') ?? '-'}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-100">
                        <Clock size={12} /> {m.withdrawalPeriod} day(s)
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-800">{unitsInStock(m.name)} units</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${m.status === 'INACTIVE' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-800'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openModal(m)}
                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                      >
                        <Edit size={13} /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.name}` : 'Add Medicine'} icon={Pill}>
          <form onSubmit={save} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Medicine Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Oxytetracycline 200mg/ml" className={field} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Active Ingredient</label>
              <input value={form.activeIngredient} onChange={(e) => setForm({ ...form, activeIngredient: e.target.value })} placeholder="e.g. Oxytetracycline" className={field} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={field}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Dosage Form</label>
                <select value={form.dosageForm} onChange={(e) => setForm({ ...form, dosageForm: e.target.value })} className={field}>
                  {DOSAGE_FORMS.map((d) => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Withdrawal Period (days) *</label>
                <input type="number" min="0" max="3650" step="1" required value={form.withdrawalPeriod} onChange={(e) => setForm({ ...form, withdrawalPeriod: e.target.value })} className={field} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={field}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE (hidden when adding stock)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional: species restrictions, source of the withdrawal period..." className={field} />
            </div>
            <p className="text-xs text-gray-500 -mt-1">
              Treatments always use the longest of this period, the MRL rule and the vet&apos;s entry, so a shorter value here can never shorten a legal minimum.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-70">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Medicine'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
