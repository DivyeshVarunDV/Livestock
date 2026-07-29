'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';

export default function Reports() {
  const [activeReport, setActiveReport] = useState<'health' | 'vaccination' | 'amu' | 'mrl' | 'blockchain'>('health');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReportData = async (reportType: string) => {
    setLoading(true);
    setError('');
    try {
      let endpoint = '';
      if (reportType === 'health') endpoint = '/reports/health';
      else if (reportType === 'vaccination') endpoint = '/reports/vaccinations';
      else if (reportType === 'amu') endpoint = '/reports/treatments';
      else if (reportType === 'mrl') endpoint = '/reports/compliance';
      else if (reportType === 'blockchain') endpoint = '/ledger/verify';

      const res = await apiFetch(endpoint);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Error loading report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData(activeReport);
  }, [activeReport]);

  if (loading && !data) {
    return <Loader message="Loading report data..." />;
  }

  return (
    <div className="animate-fade-in delay-1">
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Regulatory Compliance & Health Reports</h1>
        <p style={{ color: 'var(--text-muted)' }}>Generate and audit livestock health registries, AMU compliance records, and vaccination schedules.</p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-light)', marginBottom: '24px', paddingBottom: '12px' }}>
        {[
          { id: 'health', name: 'Health & Diagnosis', icon: 'fa fa-stethoscope' },
          { id: 'vaccination', name: 'Vaccination Schedule', icon: 'fa fa-shield' },
          { id: 'amu', name: 'Antimicrobial Usage', icon: 'fa fa-medkit' },
          { id: 'mrl', name: 'MRL Compliance', icon: 'fa fa-exclamation-triangle' },
          { id: 'blockchain', name: 'Ledger Audit (Blockchain)', icon: 'fa fa-link' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveReport(tab.id as any); setData(null); }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeReport === tab.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)',
              background: activeReport === tab.id ? 'var(--accent-primary-light)' : 'var(--bg-panel)',
              color: activeReport === tab.id ? 'var(--accent-primary-hover)' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className={tab.icon}></i> {tab.name}
          </button>
        ))}
      </div>

      {loading && data && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Fetching record audits...
        </div>
      )}

      {error && (
        <div style={{ padding: '24px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <i className="fa fa-exclamation-circle" style={{ fontSize: '2rem' }}></i>
          <div>
            <h3 style={{ borderBottom: 'none', paddingBottom: '4px', marginBottom: 0, color: '#991b1b' }}>Error Loading Report</h3>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Report Panel */}
      {data && !loading && (
        <div className="glass-panel animate-fade-in">
          {activeReport === 'health' && (
            <div>
              <h3 style={{ border: 'none', padding: 0 }}>Livestock Herd Health Audit</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '20px' }}>
                <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Herd Registered</span>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{data.totalAnimals} animals</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Diagnosed Health Incidents (Total)</span>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{data.healthRecordsCount} logs</div>
                  </div>
                </div>

                <div>
                  <h4>Current Status Breakdown</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                      <span>Healthy Herd:</span>
                      <strong style={{ color: 'var(--success)' }}>{data.statusCounts?.HEALTHY || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                      <span>Under Active Treatment:</span>
                      <strong style={{ color: 'var(--warning)' }}>{data.statusCounts?.UNDER_TREATMENT || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px' }}>
                      <span>Quarantined / Isolated:</span>
                      <strong style={{ color: 'var(--danger)' }}>{data.statusCounts?.QUARANTINED || 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'vaccination' && (
            <div>
              <h3 style={{ border: 'none', padding: 0 }}>Vaccination Audit Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', marginTop: '20px' }}>
                <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vaccinations Administered</span>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{data.totalVaccinations} treatments</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upcoming Immunizations (Active Schedules)</span>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--warning)' }}>{data.upcomingCount} due</div>
                  </div>
                </div>

                <div>
                  <h4>Distribution by Vaccine Formulation</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    {data.vaccineCounts.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No vaccine counts registered.</p>
                    ) : (
                      data.vaccineCounts.map((v: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                          <span>{v.name}:</span>
                          <strong>{v.count} dosed</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'amu' && (
            <div>
              <h3 style={{ border: 'none', padding: 0 }}>Antimicrobial Usage Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', marginTop: '20px' }}>
                <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Antimicrobials Logged (Total)</span>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--danger)' }}>{data.totalTreatments} records</div>
                  </div>
                </div>

                <div>
                  <h4>Distribution by Drug Family</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    {data.drugCounts.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No treatments logged.</p>
                    ) : (
                      data.drugCounts.map((d: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                          <span>{d.name}:</span>
                          <strong>{d.count} treatments</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'mrl' && (
            <div>
              <h3 style={{ border: 'none', padding: 0 }}>Maximum Residue Limits (MRL) Enforcement Report</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', marginTop: '20px' }}>
                <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Food Safety Clearance Rate</span>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success)' }}>
                      {data.total > 0 ? Math.round(((data.cleared) / data.total) * 100) : 100}%
                    </div>
                  </div>
                </div>

                <div>
                  <h4>State Audit Registry</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="badge success" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>CLEARED</span> Safe for Consumption:</span>
                      <strong>{data.cleared}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="badge warning" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>CLEARING SOON</span> Approaching Limit:</span>
                      <strong>{data.clearingSoon}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="badge danger" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>DO NOT SELL</span> Active Lockdown:</span>
                      <strong style={{ color: 'var(--danger)' }}>{data.doNotSell}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeReport === 'blockchain' && (
            <div>
              <h3 style={{ border: 'none', padding: 0 }}>Cryptographic Ledger Verification</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', marginTop: '20px' }}>
                <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chain Integrity Status</span>
                    {data.isValid ? (
                      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success)' }}>
                        <i className="fa fa-check-circle"></i> SECURE
                      </div>
                    ) : (
                      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--danger)' }}>
                        <i className="fa fa-times-circle"></i> COMPROMISED
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4>Cryptographic Audit Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
                      <span>Verified Ledger Blocks:</span>
                      <strong>{data.blockCount ?? 'N/A'}</strong>
                    </div>
                    {!data.isValid && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px', color: 'var(--danger)' }}>
                        <span>Tampering Detected at Block ID:</span>
                        <strong>{data.tamperedBlockId}</strong>
                      </div>
                    )}
                    {!data.isValid && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', color: 'var(--danger)' }}>
                        <span>Failure Reason:</span>
                        <strong>{data.reason}</strong>
                      </div>
                    )}
                    {data.isValid && (
                      <div style={{ padding: '12px', background: '#f0fdf4', color: '#15803d', borderRadius: '6px', fontSize: '0.85rem', marginTop: '12px', border: '1px solid #bbf7d0' }}>
                        <i className="fa fa-shield"></i> SHA-256 Hash Chain verification passed. All historical health and treatment records are cryptographically secure and untampered.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
