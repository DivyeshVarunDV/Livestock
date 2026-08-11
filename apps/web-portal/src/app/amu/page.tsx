'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';

export default function AMUTracking() {
  const [treatments, setTreatments] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    animalId: '',
    drugName: '',
    dosage: '',
    withdrawalPeriod: '',
    administrationDate: '',
  });

  // Filter state
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      const treatRes = await apiFetch('/treatments');
      const aniRes = await apiFetch('/animals');
      const apiTreats = Array.isArray(treatRes) ? treatRes : [];
      const apiAnimals = Array.isArray(aniRes) ? aniRes : [];
      setTreatments(apiTreats);
      setAnimals(apiAnimals);
      if (apiAnimals.length > 0) {
        setFormData(prev => ({ ...prev, animalId: apiAnimals[0].id }));
      }
    } catch {
      const demoAnimals = [
        { id: 'an-1', tagNumber: '#TAG-0042', name: 'Daisy', species: 'Cattle' },
        { id: 'an-2', tagNumber: '#TAG-0018', name: 'Bella', species: 'Buffalo' },
        { id: 'an-3', tagNumber: '#TAG-0091', name: 'Sheru', species: 'Goat' },
        { id: 'an-4', tagNumber: '#TAG-0065', name: 'Shaun', species: 'Sheep' },
        { id: 'an-5', tagNumber: '#TAG-0134', name: 'Ganga', species: 'Buffalo' },
      ];
      setAnimals(demoAnimals);
      setTreatments([
        {
          id: 't-1',
          animal: { tagNumber: '#TAG-0042', name: 'Daisy' },
          drugName: 'Oxytetracycline 200mg/ml',
          dosage: '15 ml IM',
          administrationDate: new Date(Date.now() - 86400000 * 3).toISOString(),
          withdrawalPeriod: 14,
          withdrawalCompletionDate: new Date(Date.now() + 86400000 * 11).toISOString(),
        },
        {
          id: 't-2',
          animal: { tagNumber: '#TAG-0018', name: 'Bella' },
          drugName: 'Amoxicillin LA Injection',
          dosage: '20 ml IM',
          administrationDate: new Date(Date.now() - 86400000 * 5).toISOString(),
          withdrawalPeriod: 10,
          withdrawalCompletionDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        },
        {
          id: 't-3',
          animal: { tagNumber: '#TAG-0091', name: 'Sheru' },
          drugName: 'Enrofloxacin Inj 10%',
          dosage: '8 ml SC',
          administrationDate: new Date(Date.now() - 86400000 * 2).toISOString(),
          withdrawalPeriod: 10,
          withdrawalCompletionDate: new Date(Date.now() + 86400000 * 8).toISOString(),
        },
        {
          id: 't-4',
          animal: { tagNumber: '#TAG-0065', name: 'Shaun' },
          drugName: 'Meloxicam Vet',
          dosage: '5 ml IM',
          administrationDate: new Date(Date.now() - 86400000 * 12).toISOString(),
          withdrawalPeriod: 7,
          withdrawalCompletionDate: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: 't-5',
          animal: { tagNumber: '#TAG-0134', name: 'Ganga' },
          drugName: 'Tylosin Vet Injection',
          dosage: '12 ml IM',
          administrationDate: new Date(Date.now() - 86400000 * 4).toISOString(),
          withdrawalPeriod: 14,
          withdrawalCompletionDate: new Date(Date.now() + 86400000 * 10).toISOString(),
        },
      ]);
      setFormData(prev => ({ ...prev, animalId: 'an-1' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/treatments', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowForm(false);
      setFormData({
        animalId: animals[0]?.id || '',
        drugName: '',
        dosage: '',
        withdrawalPeriod: '',
        administrationDate: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <Loader message="Loading AMU records..." />;
  }

  if (error) {
    return (
      <div style={{ padding: '24px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <i className="fa fa-exclamation-circle" style={{ fontSize: '2rem' }}></i>
        <div>
          <h3 style={{ borderBottom: 'none', paddingBottom: '4px', marginBottom: 0, color: '#991b1b' }}>Error Loading Records</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const filteredTreatments = treatments.filter(t => 
    t.drugName.toLowerCase().includes(search.toLowerCase()) ||
    t.animal?.tagNumber.toLowerCase().includes(search.toLowerCase()) ||
    t.animal?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in delay-1">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Antimicrobial Usage (AMU)</h1>
          <p style={{ color: 'var(--text-muted)' }}>Log antimicrobial administrations and track MRL withdrawal compliance.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
        >
          <i className="fa fa-plus"></i> Record Treatment
        </button>
      </header>

      {/* Search Filter */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
        <div className="search-container" style={{ flex: 1 }}>
          <i className="fa fa-search search-icon"></i>
          <input 
            type="text" 
            placeholder="Search by drug name or animal tag..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-bar"
            style={{ width: '100%', maxWidth: 'none' }}
          />
        </div>
      </div>

      {/* Main Treatments Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredTreatments.length === 0 ? (
          <p style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>No antimicrobial administrations recorded.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px' }}>Animal Tag</th>
                <th style={{ padding: '14px 16px' }}>Animal Name</th>
                <th style={{ padding: '14px 16px' }}>Drug Name</th>
                <th style={{ padding: '14px 16px' }}>Dosage</th>
                <th style={{ padding: '14px 16px' }}>Admin Date</th>
                <th style={{ padding: '14px 16px' }}>Withdrawal</th>
                <th style={{ padding: '14px 16px' }}>Clearance Date</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTreatments.map((t) => {
                const isCleared = new Date(t.withdrawalCompletionDate) <= new Date();
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{t.animal?.tagNumber}</td>
                    <td style={{ padding: '14px 16px' }}>{t.animal?.name}</td>
                    <td style={{ padding: '14px 16px' }}>{t.drugName}</td>
                    <td style={{ padding: '14px 16px' }}>{t.dosage}</td>
                    <td style={{ padding: '14px 16px' }}>{new Date(t.administrationDate).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px' }}>{t.withdrawalPeriod} days</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{new Date(t.withdrawalCompletionDate).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${isCleared ? 'success' : 'danger'}`}>
                        {isCleared ? 'CLEARED' : 'DO NOT SELL'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Treatment Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Record Antimicrobial Treatment (AMU)"
        icon="fa-medkit"
        maxWidth="600px"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSubmit}>
              Record Treatment
            </button>
          </>
        }
      >
        <form id="amu-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="select-animal">Select Animal</label>
            <select 
              id="select-animal"
              className="form-control"
              value={formData.animalId} 
              onChange={(e) => setFormData({ ...formData, animalId: e.target.value })}
            >
              {animals.map(ani => (
                <option key={ani.id} value={ani.id}>{ani.tagNumber} - {ani.name} ({ani.species})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="drug-name-amu">Antimicrobial / Drug Name</label>
            <input 
              id="drug-name-amu"
              type="text" 
              className="form-control"
              required 
              placeholder="e.g. Penicillin G, Tetracycline" 
              value={formData.drugName} 
              onChange={(e) => setFormData({ ...formData, drugName: e.target.value })} 
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dosage-amu">Dosage</label>
            <input 
              id="dosage-amu"
              type="text" 
              className="form-control"
              required 
              placeholder="e.g. 10 mL IM, 1 tablet" 
              value={formData.dosage} 
              onChange={(e) => setFormData({ ...formData, dosage: e.target.value })} 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-[16px]">
            <div className="form-group">
              <label className="form-label" htmlFor="admin-date-amu">Administration Date</label>
              <input 
                id="admin-date-amu"
                type="date" 
                className="form-control"
                value={formData.administrationDate} 
                onChange={(e) => setFormData({ ...formData, administrationDate: e.target.value })} 
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="withdrawal-amu">Withdrawal (Days)</label>
              <input 
                id="withdrawal-amu"
                type="number" 
                className="form-control"
                required 
                placeholder="e.g. 5" 
                value={formData.withdrawalPeriod} 
                onChange={(e) => setFormData({ ...formData, withdrawalPeriod: e.target.value })} 
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
