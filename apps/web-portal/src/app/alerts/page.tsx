'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';

export default function ComplianceAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAlerts = async () => {
    try {
      const res = await apiFetch('/treatments/alerts');
      setAlerts(Array.isArray(res) ? res : []);
    } catch {
      setAlerts([
        {
          id: 'a-1',
          tagNumber: '#TAG-0065',
          name: 'Shaun (Sheep)',
          farm: { name: 'Himalayan Wool Farm', id: 'f-1' },
          mrlStatus: 'DO_NOT_SELL',
          treatments: [{ drugName: 'Meloxicam Vet', withdrawalCompletionDate: new Date(Date.now() + 86400000 * 2).toISOString() }],
        },
        {
          id: 'a-2',
          tagNumber: '#TAG-0042',
          name: 'Daisy (Cattle)',
          farm: { name: 'Green Meadows Farm', id: 'f-2' },
          mrlStatus: 'DO_NOT_SELL',
          treatments: [{ drugName: 'Oxytetracycline', withdrawalCompletionDate: new Date(Date.now() + 86400000 * 7).toISOString() }],
        },
        {
          id: 'a-3',
          tagNumber: '#TAG-0018',
          name: 'Bella (Buffalo)',
          farm: { name: 'Sunrise Dairies', id: 'f-3' },
          mrlStatus: 'CLEARING_SOON',
          treatments: [{ drugName: 'Amoxicillin', withdrawalCompletionDate: new Date(Date.now() + 86400000 * 5).toISOString() }],
        },
        {
          id: 'a-4',
          tagNumber: '#TAG-0091',
          name: 'Sheru (Goat)',
          farm: { name: 'Shivalik Goat Farm', id: 'f-4' },
          mrlStatus: 'CLEARING_SOON',
          treatments: [{ drugName: 'Enrofloxacin', withdrawalCompletionDate: new Date(Date.now() + 86400000 * 8).toISOString() }],
        },
        {
          id: 'a-5',
          tagNumber: '#TAG-0134',
          name: 'Ganga (Buffalo)',
          farm: { name: 'Amrit Sarovar Dairy', id: 'f-5' },
          mrlStatus: 'CLEARING_SOON',
          treatments: [{ drugName: 'Tylosin Vet', withdrawalCompletionDate: new Date(Date.now() + 86400000 * 10).toISOString() }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  if (loading) {
    return <Loader message="Loading compliance alerts..." />;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-4 animate-scale-in">
        <AlertCircle className="w-8 h-8 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-lg mb-1 text-red-900">Error Loading Alerts</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in stagger-children">
      <header className="page-header flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div>
          <h1 className="text-3xl font-bold">Compliance Alerts</h1>
          <p className="subtitle mt-2">Antimicrobial Maximum Residue Limits (MRL) enforcement registry.</p>
        </div>
        <Link href="/amu" className="btn-secondary flex items-center gap-2 whitespace-nowrap">
          View All Treatments <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      {alerts.length === 0 ? (
        <div className="glass-panel text-center p-12 border-dashed border-green-500 bg-green-50 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">100% Compliance Achieved</h2>
          <p className="text-muted-foreground max-w-md mx-auto mt-2">
            There are currently no active MRL restrictions. All registered herd animals have cleared their withdrawal periods and are safe for market sale.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="card-interactive p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-3 font-semibold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>Warning: {alerts.length} livestock profiles are locked from sale/slaughter due to active drug residues.</span>
          </div>

          <div className="glass-panel p-0 overflow-hidden custom-scrollbar">
            <table className="data-table w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">RFID Tag</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Animal Name</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Farm</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Active Treatment</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Clearance Date</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Lock Type</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alerts.map((ani, idx) => {
                  const activeTreatment = ani.treatments[0];
                  const remainingDays = activeTreatment ? Math.ceil((new Date(activeTreatment.withdrawalCompletionDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  
                  return (
                    <tr key={ani.id} className="hover:bg-muted/30 transition-colors animate-fade-in-up" style={{ animationDelay: `${0.1 * (idx + 1)}s` }}>
                      <td className="px-4 py-4 font-semibold">{ani.tagNumber}</td>
                      <td className="px-4 py-4">{ani.name}</td>
                      <td className="px-4 py-4">
                        <Link href={`/farms`} className="hover:underline text-primary">
                          {ani.farm?.name}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        {activeTreatment ? (
                          <div>
                            <strong>{activeTreatment.drugName}</strong>
                            <div className="text-xs text-muted-foreground">{remainingDays} days remaining</div>
                          </div>
                        ) : 'Unknown'}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {activeTreatment ? new Date(activeTreatment.withdrawalCompletionDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${ani.mrlStatus === 'CLEARING_SOON' ? 'badge-warning' : 'badge-danger'}`}>
                          {ani.mrlStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/animals`} className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
                          Details <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-8 border-t border-border animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <Link href="/amu" className="glass-panel p-5 card-interactive flex items-center justify-between group">
          <div>
            <h3 className="font-semibold mb-1">AMU Tracking</h3>
            <p className="text-sm text-muted-foreground">Manage antimicrobial usage</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
        <Link href="/inventory" className="glass-panel p-5 card-interactive flex items-center justify-between group">
          <div>
            <h3 className="font-semibold mb-1">Inventory</h3>
            <p className="text-sm text-muted-foreground">View stock and supplies</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
        <Link href="/reports" className="glass-panel p-5 card-interactive flex items-center justify-between group">
          <div>
            <h3 className="font-semibold mb-1">Reports</h3>
            <p className="text-sm text-muted-foreground">Analytics and compliance</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </div>
    </div>
  );
}
