'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function FarmsDirectoryPage() {
  const [farms, setFarms] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'farms' | 'animals'>('farms');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [farmsRes, animalsRes] = await Promise.all([
          apiFetch('/farms'),
          apiFetch('/animals'),
        ]);
        setFarms(farmsRes || []);
        setAnimals(animalsRes || []);
      } catch (err) {
        console.error('Failed to load records', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 5 Realistic Treatment Records for Left Column
  const recentTreatments = [
    {
      animalId: '#TAG-0042',
      species: 'Cattle',
      farm: 'Green Meadows Farm',
      drug: 'Oxytetracycline',
      dosage: '100 ml IV',
      vet: 'Dr. Ramesh Kumar',
      date: '31-Jul-2026',
      withdrawalEnd: '07-Aug-2026',
      status: 'Active',
      badge: 'success', // Active (Green) as requested
    },
    {
      animalId: '#TAG-0018',
      species: 'Buffalo',
      farm: 'Sunrise Dairies',
      drug: 'Amoxicillin',
      dosage: '50 ml IM',
      vet: 'Dr. Anita Sharma',
      date: '29-Jul-2026',
      withdrawalEnd: '05-Aug-2026',
      status: 'Active',
      badge: 'success',
    },
    {
      animalId: '#TAG-0091',
      species: 'Goat',
      farm: 'Shivalik Goat Farm',
      drug: 'Enrofloxacin',
      dosage: '15 ml SC',
      vet: 'Dr. Vikram Singh',
      date: '28-Jul-2026',
      withdrawalEnd: '08-Aug-2026',
      status: 'Active',
      badge: 'success',
    },
    {
      animalId: '#TAG-0112',
      species: 'Cattle',
      farm: 'Amrit Sarovar Dairy',
      drug: 'Ivermectin',
      dosage: '25 ml SC',
      vet: 'Dr. Ramesh Kumar',
      date: '25-Jul-2026',
      withdrawalEnd: '24-Aug-2026',
      status: 'Active',
      badge: 'success',
    },
    {
      animalId: '#TAG-0065',
      species: 'Sheep',
      farm: 'Himalayan Wool Farm',
      drug: 'Meloxicam Vet',
      dosage: '10 ml IM',
      vet: 'Dr. Anita Sharma',
      date: '22-Jul-2026',
      withdrawalEnd: '26-Jul-2026',
      status: 'Completed',
      badge: 'info', // Completed (Blue)
    },
  ];

  // 5 Realistic Withdrawal Alerts for Center Column
  const withdrawalAlerts = [
    {
      animalId: '#TAG-0065 (Sheep)',
      drug: 'Meloxicam Vet',
      ends: '02-Aug-2026',
      daysRemaining: '2 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'High',
      badge: 'danger', // High (Red)
    },
    {
      animalId: '#TAG-0042 (Cattle)',
      drug: 'Oxytetracycline',
      ends: '07-Aug-2026',
      daysRemaining: '7 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'High',
      badge: 'danger',
    },
    {
      animalId: '#TAG-0018 (Buffalo)',
      drug: 'Amoxicillin',
      ends: '05-Aug-2026',
      daysRemaining: '5 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'Medium',
      badge: 'warning', // Medium (Orange)
    },
    {
      animalId: '#TAG-0091 (Goat)',
      drug: 'Enrofloxacin',
      ends: '08-Aug-2026',
      daysRemaining: '8 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'Medium',
      badge: 'warning',
    },
    {
      animalId: '#TAG-0134 (Buffalo)',
      drug: 'Tylosin Vet',
      ends: '10-Aug-2026',
      daysRemaining: '10 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'Medium',
      badge: 'warning',
    },
  ];

  // 5 Realistic Laboratory Results for Right Column
  const labResults = [
    {
      sampleId: 'LAB-8819',
      animalId: '#TAG-0018',
      drugTested: 'Oxytetracycline',
      level: '0.02 ppm',
      limit: '0.10 ppm',
      status: 'Compliant',
      badge: 'success', // Compliant (Green)
      lab: 'NIC Central Vet Lab',
      date: '31-Jul-2026',
    },
    {
      sampleId: 'LAB-8814',
      animalId: '#TAG-0034',
      drugTested: 'Enrofloxacin',
      level: '0.14 ppm',
      limit: '0.10 ppm',
      status: 'Non-Compliant',
      badge: 'danger', // Non-Compliant (Red)
      lab: 'State Vet Residue Lab',
      date: '30-Jul-2026',
    },
    {
      sampleId: 'LAB-8810',
      animalId: '#TAG-0055',
      drugTested: 'Amoxicillin',
      level: '0.01 ppm',
      limit: '0.05 ppm',
      status: 'Compliant',
      badge: 'success',
      lab: 'NDRI Food Safety Lab',
      date: '29-Jul-2026',
    },
    {
      sampleId: 'LAB-8809',
      animalId: '#TAG-0042',
      drugTested: 'Tylosin',
      level: '0.03 ppm',
      limit: '0.10 ppm',
      status: 'Compliant',
      badge: 'success',
      lab: 'NIC Central Vet Lab',
      date: '29-Jul-2026',
    },
    {
      sampleId: 'LAB-8805',
      animalId: '#TAG-0082',
      drugTested: 'Sulfadimidine',
      level: '0.02 ppm',
      limit: '0.10 ppm',
      status: 'Compliant',
      badge: 'success',
      lab: 'State Vet Residue Lab',
      date: '28-Jul-2026',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
      {/* 1. KEEP EXACT TOP HEADER FROM EXISTING DESIGN */}
      <div className="page-header">
        <div>
          <h1>Enterprise Livestock &amp; Farm Registry</h1>
          <p className="subtitle">
            Full-screen livestock tracking, RFID registry, and antimicrobial compliance management
          </p>
        </div>

        {/* Small Reference Stat Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: '16px', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Farms:</span>
            <strong style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{farms.length || 128}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: '16px', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total Livestock:</span>
            <strong style={{ color: '#3b82f6', fontSize: '0.9rem' }}>{animals.length || 4562}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', fontSize: '0.8rem' }}>
            <span style={{ color: '#166534', fontWeight: 600 }}>Healthy:</span>
            <strong style={{ color: '#16a34a', fontSize: '0.9rem' }}>{animals.filter(a => a.status === 'HEALTHY').length || 4320}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: '16px', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>MRL Compliance:</span>
            <strong style={{ color: '#7c3aed', fontSize: '0.9rem' }}>95%</strong>
          </div>
        </div>
      </div>

      {/* 2. KEEP "Farms Directory / Livestock Registry" SECTION HEADER EXACTLY AS IS */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button"
            onClick={() => setActiveTab('farms')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              background: activeTab === 'farms' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'farms' ? '#ffffff' : 'var(--text-main)',
              border: activeTab === 'farms' ? 'none' : '1px solid var(--border-light)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa fa-home"></i> Farms Directory ({farms.length || 128})
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('animals'); }}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              background: activeTab === 'animals' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'animals' ? '#ffffff' : 'var(--text-main)',
              border: activeTab === 'animals' ? 'none' : '1px solid var(--border-light)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa fa-paw"></i> Livestock Registry ({animals.length || 4562})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 600 }}>
            <i className="fa fa-shield" style={{ color: '#2E7D32', marginRight: '6px' }}></i>
            Government Enterprise Live Regulatory Monitoring
          </span>
        </div>
      </div>

      {/* 3. NEW THREE-COLUMN ENTERPRISE DASHBOARD LAYOUT (REPLACES REMOVED SECTION) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '18px',
          width: '100%',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Recent Treatment Records */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(17, 24, 39, 0.04)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#111827' }}>Recent Treatment Records</h3>
              <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>5 Active &amp; Completed Veterinary Regimens</span>
            </div>
            <span className="badge success">Live Feed</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 10px' }}>Animal ID</th>
                  <th style={{ padding: '8px 10px' }}>Species</th>
                  <th style={{ padding: '8px 10px' }}>Farm Name</th>
                  <th style={{ padding: '8px 10px' }}>Drug Used</th>
                  <th style={{ padding: '8px 10px' }}>Dosage</th>
                  <th style={{ padding: '8px 10px' }}>Veterinarian</th>
                  <th style={{ padding: '8px 10px' }}>Treatment Date</th>
                  <th style={{ padding: '8px 10px' }}>Withdrawal End Date</th>
                  <th style={{ padding: '8px 10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTreatments.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#111827' }}>{item.animalId}</td>
                    <td style={{ padding: '8px 10px' }}>{item.species}</td>
                    <td style={{ padding: '8px 10px', color: '#4B5563' }}>{item.farm}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#111827' }}>{item.drug}</td>
                    <td style={{ padding: '8px 10px' }}>{item.dosage}</td>
                    <td style={{ padding: '8px 10px' }}>{item.vet}</td>
                    <td style={{ padding: '8px 10px' }}>{item.date}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: item.status === 'Active' ? '#F59E0B' : '#6B7280' }}>
                      {item.withdrawalEnd}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span className={`badge ${item.badge}`}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CENTER COLUMN: Upcoming Withdrawal Alerts */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(17, 24, 39, 0.04)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#111827' }}>Upcoming Withdrawal Alerts</h3>
              <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>5 Active MRL Withholding Notifications</span>
            </div>
            <span className="badge danger">Priority Queue</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 10px' }}>Animal ID</th>
                  <th style={{ padding: '8px 10px' }}>Drug</th>
                  <th style={{ padding: '8px 10px' }}>Withdrawal Ends</th>
                  <th style={{ padding: '8px 10px' }}>Days Remaining</th>
                  <th style={{ padding: '8px 10px' }}>Sale Allowed</th>
                  <th style={{ padding: '8px 10px' }}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalAlerts.map((w, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#111827' }}>{w.animalId}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#111827' }}>{w.drug}</td>
                    <td style={{ padding: '8px 10px' }}>{w.ends}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: w.priority === 'High' ? '#EF4444' : '#F59E0B' }}>
                      {w.daysRemaining}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span className="badge danger">{w.saleAllowed}</span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span className={`badge ${w.badge}`}>{w.priority} Priority</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Latest Laboratory Results */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(17, 24, 39, 0.04)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#111827' }}>Latest Laboratory Results</h3>
              <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>5 HPLC Residue Testing Records</span>
            </div>
            <span className="badge success">Verified Labs</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 10px' }}>Sample ID</th>
                  <th style={{ padding: '8px 10px' }}>Animal ID</th>
                  <th style={{ padding: '8px 10px' }}>Drug Tested</th>
                  <th style={{ padding: '8px 10px' }}>Residue Level</th>
                  <th style={{ padding: '8px 10px' }}>MRL Limit</th>
                  <th style={{ padding: '8px 10px' }}>Status</th>
                  <th style={{ padding: '8px 10px' }}>Laboratory</th>
                  <th style={{ padding: '8px 10px' }}>Report Date</th>
                </tr>
              </thead>
              <tbody>
                {labResults.map((l, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2563EB' }}>{l.sampleId}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{l.animalId}</td>
                    <td style={{ padding: '8px 10px', color: '#111827' }}>{l.drugTested}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: l.status === 'Non-Compliant' ? '#EF4444' : '#22C55E' }}>
                      {l.level}
                    </td>
                    <td style={{ padding: '8px 10px' }}>{l.limit}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span className={`badge ${l.badge}`}>{l.status}</span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#4B5563' }}>{l.lab}</td>
                    <td style={{ padding: '8px 10px' }}>{l.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
