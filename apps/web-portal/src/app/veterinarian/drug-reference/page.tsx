'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Search, Pill, Plus, Filter } from 'lucide-react';
import Modal from '@/components/Modal';

export default function DrugReferencePage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    drugName: '',
    species: 'CATTLE',
    withdrawalPeriod: '',
    mrlLimit: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    try {
      const res = await apiFetch('/treatments/rules');
      setRules(res || []);
    } catch (err) {
      console.error('Failed to load rules', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredRules = rules.filter(r => 
    r.drugName?.toLowerCase().includes(search.toLowerCase()) || 
    r.species?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/treatments/rules', {
        method: 'POST',
        body: JSON.stringify({
          drugName: formData.drugName,
          species: formData.species,
          withdrawalPeriod: parseInt(formData.withdrawalPeriod, 10),
          mrlLimit: formData.mrlLimit
        })
      });
      setIsAddModalOpen(false);
      setFormData({ drugName: '', species: 'CATTLE', withdrawalPeriod: '', mrlLimit: '' });
      loadRules();
    } catch (err) {
      console.error('Failed to add rule', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityColor = (days: number) => {
    if (days <= 7) return 'bg-green-500';
    if (days <= 21) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-8 bg-gray-50 min-h-screen">
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Pill className="text-emerald-600" />
              Drug Reference & MRL Rules
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Look up withdrawal periods and MRL limits for veterinary drugs.</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Add Rule
          </button>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by drug name or species..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Filter size={16} />
            Filters
          </button>
        </div>
      </div>

      <div className="px-8">
        {loading ? (
          <div className="text-center py-10">
            <div className="w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading rules...</p>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Pill className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-gray-700">No drug rules found</h3>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your search or add a new rule.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRules.map((rule, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col relative">
                <div className={`h-1.5 w-full ${getSeverityColor(rule.withdrawalPeriod)}`} />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{rule.drugName}</h3>
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-md uppercase">
                      {rule.species}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <span className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Withdrawal</span>
                      <span className="font-semibold text-gray-900">{rule.withdrawalPeriod} days</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <span className="block text-[10px] uppercase font-bold text-gray-500 mb-1">MRL Limit</span>
                      <span className="font-semibold text-gray-900">{rule.mrlLimit}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add MRL Rule" icon="fa-pill">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Drug Name</label>
            <input
              type="text"
              required
              value={formData.drugName}
              onChange={(e) => setFormData({...formData, drugName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              placeholder="e.g. Oxytetracycline"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
            <select
              value={formData.species}
              onChange={(e) => setFormData({...formData, species: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            >
              <option value="CATTLE">Cattle</option>
              <option value="SHEEP">Sheep</option>
              <option value="PIG">Pig</option>
              <option value="GOAT">Goat</option>
              <option value="POULTRY">Poultry</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Period (Days)</label>
            <input
              type="number"
              required
              min="0"
              value={formData.withdrawalPeriod}
              onChange={(e) => setFormData({...formData, withdrawalPeriod: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MRL Limit</label>
            <input
              type="text"
              required
              value={formData.mrlLimit}
              onChange={(e) => setFormData({...formData, mrlLimit: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              placeholder="e.g. 100 µg/kg"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
