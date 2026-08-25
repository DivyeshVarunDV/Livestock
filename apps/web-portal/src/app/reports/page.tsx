'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Download } from 'lucide-react';
import Loader from '@/components/Loader';

interface HealthData {
  totalAnimals: number;
  healthRecordsCount: number;
  statusCounts: {
    HEALTHY?: number;
    UNDER_TREATMENT?: number;
    QUARANTINED?: number;
    [key: string]: number | undefined;
  };
}

interface VaccinationData {
  totalVaccinations: number;
  upcomingCount: number;
  vaccineCounts: { vaccineName: string; _count: number }[];
}

interface TreatmentData {
  totalTreatments: number;
  drugCounts: { drugName: string; _count: number }[];
  monthlyData: { month: string; count: number }[];
}

interface ComplianceData {
  total: number;
  cleared: number;
  clearingSoon: number;
  doNotSell: number;
}

export default function ReportsPage() {
  const { token, loading: authLoading } = useAuth();
  
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [vaccinationData, setVaccinationData] = useState<VaccinationData | null>(null);
  const [treatmentData, setTreatmentData] = useState<TreatmentData | null>(null);
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const [healthRes, vacRes, treatRes, compRes] = await Promise.all([
          apiFetch('/reports/health', { token }),
          apiFetch('/reports/vaccinations', { token }),
          apiFetch('/reports/treatments', { token }),
          apiFetch('/reports/compliance', { token }),
        ]);

        if (healthRes.error) throw new Error(healthRes.error);
        if (vacRes.error) throw new Error(vacRes.error);
        if (treatRes.error) throw new Error(treatRes.error);
        if (compRes.error) throw new Error(compRes.error);

        setHealthData(healthRes);
        setVaccinationData(vacRes);
        setTreatmentData(treatRes);
        setComplianceData(compRes);
      } catch (err: any) {
        console.error('Failed to fetch reports:', err);
        setError(err.message || 'Failed to load report data.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [token]);

  if (authLoading || loading) {
    return <div className="p-8 flex justify-center"><Loader /></div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  // Health calculations
  const hHealthy = healthData?.statusCounts?.HEALTHY || 0;
  const hTreatment = healthData?.statusCounts?.UNDER_TREATMENT || 0;
  const hQuarantine = healthData?.statusCounts?.QUARANTINED || 0;
  const hTotal = hHealthy + hTreatment + hQuarantine || 1; // avoid div by 0

  // Compliance calculations
  const compTotal = complianceData?.total || 0;
  const compCleared = complianceData?.cleared || 0;
  const compPercent = compTotal > 0 ? (compCleared / compTotal) * 100 : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
        <p className="text-gray-600">Generate and export compliance and operational reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Animal Health Report */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Animal Health Report</h2>
              <p className="text-sm text-gray-500 mt-1">Overview of animal health status across all farms.</p>
            </div>
          </div>
          
          <div className="flex-grow">
            <div className="flex gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg flex-1">
                <div className="text-xs text-gray-500 uppercase font-medium">Total Animals</div>
                <div className="text-2xl font-semibold text-gray-900">{healthData?.totalAnimals || 0}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg flex-1">
                <div className="text-xs text-gray-500 uppercase font-medium">Health Records</div>
                <div className="text-2xl font-semibold text-gray-900">{healthData?.healthRecordsCount || 0}</div>
              </div>
            </div>

            <div className="mb-2 text-sm font-medium text-gray-700">Health Status Distribution</div>
            <div className="h-4 w-full bg-gray-100 rounded-full flex overflow-hidden mb-2">
              <div style={{ width: `${(hHealthy / hTotal) * 100}%` }} className="bg-green-500 h-full"></div>
              <div style={{ width: `${(hTreatment / hTotal) * 100}%` }} className="bg-yellow-500 h-full"></div>
              <div style={{ width: `${(hQuarantine / hTotal) * 100}%` }} className="bg-red-500 h-full"></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Healthy ({hHealthy})</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Treatment ({hTreatment})</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Quarantined ({hQuarantine})</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Vaccination Report */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Vaccination Report</h2>
              <p className="text-sm text-gray-500 mt-1">Summary of vaccination records and upcoming schedules.</p>
            </div>
          </div>
          
          <div className="flex-grow">
            <div className="flex gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg flex-1">
                <div className="text-xs text-gray-500 uppercase font-medium">Total Vaccinations</div>
                <div className="text-2xl font-semibold text-gray-900">{vaccinationData?.totalVaccinations || 0}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg flex-1">
                <div className="text-xs text-gray-500 uppercase font-medium">Upcoming Due</div>
                <div className="text-2xl font-semibold text-gray-900">{vaccinationData?.upcomingCount || 0}</div>
              </div>
            </div>

            <div className="mb-2 text-sm font-medium text-gray-700">Top Vaccines</div>
            <ul className="space-y-2">
              {vaccinationData?.vaccineCounts?.slice(0, 3).map((v, idx) => (
                <li key={idx} className="flex justify-between text-sm items-center bg-gray-50 px-3 py-2 rounded-md">
                  <span className="text-gray-700">{v.vaccineName}</span>
                  <span className="font-semibold text-gray-900">{v._count}</span>
                </li>
              ))}
              {(!vaccinationData?.vaccineCounts || vaccinationData.vaccineCounts.length === 0) && (
                <li className="text-sm text-gray-500 italic py-2">No vaccination data available</li>
              )}
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Treatment Report */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Treatment Report</h2>
              <p className="text-sm text-gray-500 mt-1">Overview of medication treatments and drug usage.</p>
            </div>
          </div>
          
          <div className="flex-grow">
            <div className="bg-gray-50 p-3 rounded-lg w-full mb-6 inline-block">
              <div className="text-xs text-gray-500 uppercase font-medium">Total Treatments</div>
              <div className="text-2xl font-semibold text-gray-900">{treatmentData?.totalTreatments || 0}</div>
            </div>

            <div className="mb-2 text-sm font-medium text-gray-700">Top Drugs Used</div>
            <ul className="space-y-2">
              {treatmentData?.drugCounts?.slice(0, 3).map((d, idx) => (
                <li key={idx} className="flex justify-between text-sm items-center bg-gray-50 px-3 py-2 rounded-md">
                  <span className="text-gray-700">{d.drugName}</span>
                  <span className="font-semibold text-gray-900">{d._count}</span>
                </li>
              ))}
              {(!treatmentData?.drugCounts || treatmentData.drugCounts.length === 0) && (
                <li className="text-sm text-gray-500 italic py-2">No treatment data available</li>
              )}
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* MRL Compliance Report */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">MRL Compliance Report</h2>
              <p className="text-sm text-gray-500 mt-1">Maximum Residue Limit clearance and sale eligibility.</p>
            </div>
          </div>
          
          <div className="flex-grow">
            <div className="flex gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg flex-1">
                <div className="text-xs text-gray-500 uppercase font-medium">Total Animals</div>
                <div className="text-2xl font-semibold text-gray-900">{complianceData?.total || 0}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg flex-1 border border-green-100">
                <div className="text-xs text-green-700 uppercase font-medium">Cleared</div>
                <div className="text-2xl font-semibold text-green-900">{complianceData?.cleared || 0}</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg flex-1 border border-red-100">
                <div className="text-xs text-red-700 uppercase font-medium">Do Not Sell</div>
                <div className="text-2xl font-semibold text-red-900">{complianceData?.doNotSell || 0}</div>
              </div>
            </div>

            <div className="mb-2 flex justify-between items-center text-sm font-medium text-gray-700">
              <span>Overall Compliance</span>
              <span className="text-green-600 font-semibold">{compPercent.toFixed(1)}%</span>
            </div>
            <div className="h-3 w-full bg-gray-100 rounded-full flex overflow-hidden">
              <div style={{ width: `${compPercent}%` }} className="bg-green-600 h-full"></div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
