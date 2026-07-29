'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';

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
      setTreatments(treatRes);
      setAnimals(aniRes);
      if (aniRes.length > 0) {
        setFormData(prev => ({ ...prev, animalId: aniRes[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Error loading treatments');
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
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleSubmit} className="glass-panel" style={{ width: '90%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>Log Antimicrobial Administration</h3>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Select Animal</label>
              <select 
                value={formData.animalId} 
                onChange={(e) => setFormData({ ...formData, animalId: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }}
              >
                {animals.map(ani => (
                  <option key={ani.id} value={ani.id}>{ani.tagNumber} - {ani.name} ({ani.species})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Antimicrobial / Drug Name</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Penicillin G, Tetracycline" 
                value={formData.drugName} 
                onChange={(e) => setFormData({ ...formData, drugName: e.target.value })} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Dosage</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. 10 mL IM, 1 tablet" 
                value={formData.dosage} 
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })} 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} 
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Administration Date</label>
                <input 
                  type="date" 
                  value={formData.administrationDate} 
                  onChange={(e) => setFormData({ ...formData, administrationDate: e.target.value })} 
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Withdrawal (Days)</label>
                <input 
                  type="number" 
                  required 
                  placeholder="e.g. 5" 
                  value={formData.withdrawalPeriod} 
                  onChange={(e) => setFormData({ ...formData, withdrawalPeriod: e.target.value })} 
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} 
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border-light)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Record Log</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
