'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch, API_BASE_URL, getHeaders } from '@/lib/api';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [loadError, setLoadError] = useState('');
  const [integrity, setIntegrity] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);



  async function loadAuditLogs() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (roleFilter !== 'ALL') q.append('role', roleFilter);
      if (entityFilter !== 'ALL') q.append('entity', entityFilter);
      if (actionFilter !== 'ALL') q.append('action', actionFilter);

      setLoadError('');
      const data = await apiFetch(`/audit-logs?${q.toString()}`);
      setLogs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      // Never substitute sample data for an official audit trail.
      setLogs([]);
      setLoadError(e?.message || 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuditLogs();
  }, [roleFilter, entityFilter, actionFilter]);

  const handleExportCSV = async () => {
    const q = new URLSearchParams();
    if (roleFilter !== 'ALL') q.append('role', roleFilter);
    if (entityFilter !== 'ALL') q.append('entity', entityFilter);
    if (actionFilter !== 'ALL') q.append('action', actionFilter);
    try {
      const res = await fetch(`${API_BASE_URL}/audit-logs/export?${q.toString()}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `livestocare_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Export failed');
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      setIntegrity(await apiFetch('/audit-logs/verify'));
    } catch (e: any) {
      setIntegrity({ valid: false, reason: e?.message || 'Verification failed' });
    } finally {
      setVerifying(false);
    }
  };

  const getActionBadge = (act: string) => {
    const a = act || '';
    if (/(DELETED|FAILED|LOCKED|BLOCKED|REJECTED|CANCELLED)/.test(a)) return { label: a, color: '#dc2626', bg: '#fee2e2' };
    if (/(CREATED|ADDED|REGISTERED|RECORDED|REPORTED|DISPENSED|COLLECTED|APPROVED|LOGIN$)/.test(a)) return { label: a, color: '#059669', bg: '#d1fae5' };
    if (/(UPDATED|CHANGED|ADJUSTED|EDITED|AMENDED|RESET|UNLOCKED|RESOLVED|DISMISSED|REOPENED)/.test(a)) return { label: a, color: '#0284c7', bg: '#e0f2fe' };
    return { label: a, color: '#475569', bg: '#f1f5f9' };
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Enterprise Security Audit & Ledger Logs</h1>
          <p className="subtitle">
            Tamper-evident record of user actions, compliance modifications, entity changes, and IP addresses
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadAuditLogs}
            className="btn-secondary"
          >
            <i className="fa fa-refresh" style={{ marginRight: '6px' }}></i>
            Refresh Logs
          </button>
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="btn-secondary"
          >
            <i className="fa fa-shield" style={{ marginRight: '6px' }}></i>
            {verifying ? 'Verifying…' : 'Verify Integrity'}
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-primary"
          >
            <i className="fa fa-download" style={{ marginRight: '6px' }}></i>
            Export CSV / Excel
          </button>
        </div>
      </div>

      {integrity && (
        <div
          role="status"
          style={{
            padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem',
            background: integrity.valid ? '#ecfdf5' : '#fef2f2',
            color: integrity.valid ? '#065f46' : '#991b1b',
            border: `1px solid ${integrity.valid ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {integrity.valid
            ? `Audit chain verified: ${integrity.checked} entries intact (head ${String(integrity.headHash || '').slice(0, 16)}…).`
            : `INTEGRITY FAILURE${integrity.brokenAtSequence ? ` at entry #${integrity.brokenAtSequence}` : ''}: ${integrity.reason}`}
        </div>
      )}
      {loadError && (
        <div role="alert" style={{ padding: '12px 16px', borderRadius: '8px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
          {loadError}
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-light)',
              fontSize: '0.85rem',
            }}
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Administrator</option>
            <option value="VETERINARIAN">Veterinarian</option>
            <option value="TESTER">Testing Officer</option>
            <option value="FARMER">Farmer</option>
            <option value="SYSTEM">System</option>
            <option value="ANONYMOUS">Anonymous</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Entity:</span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-light)',
              fontSize: '0.85rem',
            }}
          >
            <option value="ALL">All Entities</option>
            <option value="FARM">Farm</option>
            <option value="ANIMAL">Animal</option>
            <option value="TREATMENT">Treatment</option>
            <option value="VACCINATION">Vaccination</option>
            <option value="INVENTORY">Inventory</option>
            <option value="USER">User</option>
            <option value="AUTH">Sign-in / Sessions</option>
            <option value="PRESCRIPTION">Prescription</option>
            <option value="HEALTH_RECORD">Health Record</option>
            <option value="AMU_RECORD">AMU Record</option>
            <option value="MEDICINE_DISPENSING">Dispensing</option>
            <option value="MRL_RULE">MRL Rule</option>
            <option value="OWNERSHIP_TRANSFER">Ownership Transfer</option>
            <option value="MILK_COLLECTION">Collection</option>
            <option value="COLLECTION_BATCH">Batch</option>
            <option value="PRODUCT_TEST">Lab Result</option>
            <option value="VIOLATION">Violation</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-light)',
              fontSize: '0.85rem',
            }}
          >
            <option value="ALL">All Actions</option>
            <option value="LOGIN">Sign-in</option>
            <option value="LOGIN_FAILED">Failed sign-in</option>
            <option value="ACCOUNT_LOCKED">Account locked</option>
            <option value="USER_ROLE_CHANGED">Role changed</option>
            <option value="USER_PASSWORD_RESET">Password reset</option>
            <option value="TREATMENT_CREATED">Treatment recorded</option>
            <option value="PRESCRIPTION_CREATED">Prescription issued</option>
            <option value="MRL_STATUS_CHANGED">MRL status changed</option>
            <option value="WITHDRAWAL_CLEARED">Withdrawal cleared</option>
            <option value="RESTRICTED_SUPPLY_BLOCKED">Restricted supply blocked</option>
            <option value="LAB_RESULT_RECORDED">Lab result recorded</option>
            <option value="BATCH_STATUS_CHANGED">Batch status changed</option>
            <option value="OWNERSHIP_TRANSFER_APPROVED">Transfer approved</option>
            <option value="VIOLATION_RESOLVED">Case resolved</option>
            <option value="VIOLATION_DISMISSED">Case dismissed</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>TIMESTAMP</th>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>USER & ROLE</th>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>ACTION</th>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>ENTITY & ID</th>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>OLD VALUE</th>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>NEW VALUE</th>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>IP ADDRESS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading security audit trail...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No audit logs matching selected filters
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const badge = getActionBadge(log.action);
                return (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                    }}
                  >
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                        {log.userName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {log.userEmail} &bull; <strong>{log.role}</strong>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: badge.bg,
                          color: badge.color,
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.entity}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.entityId || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: '#64748b', maxWidth: '200px' }}>
                      {log.oldValue || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: '#0f172a', fontWeight: 500, maxWidth: '220px' }}>
                      {log.newValue || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '0.8rem', fontFamily: 'monospace', color: '#475569' }}>
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
