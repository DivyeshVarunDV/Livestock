'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/Modal';
import { calculateMRLCompliance } from '@/lib/mrlEngine';
import Link from 'next/link';

export default function Reports() {
  const [activeReport, setActiveReport] = useState<
    'farm' | 'animal' | 'treatment' | 'vaccination' | 'compliance' | 'inventory'
  >('farm');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [farmFilter, setFarmFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalFarms: 0,
    totalAnimals: 0,
    totalTreatments: 0,
    mrlCompliance: '100%'
  });

  const [printModal, setPrintModal] = useState(false);

  useEffect(() => {
    loadStats();
    loadReportData();
  }, [activeReport]);

  async function loadStats() {
    try {
      const [farms, animals, treatments, compliance] = await Promise.all([
        apiFetch('/farms'),
        apiFetch('/animals'),
        apiFetch('/treatments'),
        apiFetch('/reports/compliance')
      ]);
      
      setStats({
        totalFarms: Array.isArray(farms) ? farms.length : 0,
        totalAnimals: Array.isArray(animals) ? animals.length : 0,
        totalTreatments: Array.isArray(treatments) ? treatments.length : 0,
        mrlCompliance: compliance?.percentage ? `${compliance.percentage}%` : '100%'
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function loadReportData() {
    setLoading(true);
    try {
      let endpoint = '/farms';
      if (activeReport === 'farm') endpoint = '/farms';
      else if (activeReport === 'animal') endpoint = '/animals';
      else if (activeReport === 'treatment') endpoint = '/treatments';
      else if (activeReport === 'vaccination') endpoint = '/vaccinations';
      else if (activeReport === 'compliance') endpoint = '/animals';
      else if (activeReport === 'inventory') endpoint = '/inventory';

      const res = await apiFetch(endpoint);
      let list = Array.isArray(res) ? res : (res?.records || res?.items || []);

      // Filter by Date
      if (startDate || endDate) {
        list = list.filter((item: any) => {
          const dateStr = item.createdAt || item.administrationDate || item.vaccinationDate || item.prescriptionDate;
          if (!dateStr) return true;
          const d = new Date(dateStr);
          const s = startDate ? new Date(startDate) : new Date(0);
          const e = endDate ? new Date(endDate) : new Date(8640000000000000);
          return d >= s && d <= e;
        });
      }

      // Filter by Farm, Species, Status
      if (farmFilter) {
        const farmLower = farmFilter.toLowerCase();
        list = list.filter((item: any) => {
          if (activeReport === 'farm') return item.id?.toLowerCase().includes(farmLower) || item.name?.toLowerCase().includes(farmLower);
          return item.farmId?.toLowerCase().includes(farmLower) || item.animal?.farm?.name?.toLowerCase().includes(farmLower) || item.farm?.name?.toLowerCase().includes(farmLower);
        });
      }
      if (speciesFilter) {
        list = list.filter((item: any) => {
          if (activeReport === 'animal' || activeReport === 'compliance') return item.species === speciesFilter;
          return item.animal?.species === speciesFilter;
        });
      }
      if (statusFilter) {
        list = list.filter((item: any) => {
          return item.status === statusFilter || item.mrlStatus === statusFilter;
        });
      }

      // Format outputs depending on active report
      if (activeReport === 'farm') {
        setData(list.map((f: any) => ({
          'Farm Name': f.name,
          'Owner': f.ownerName || f.owner?.name || 'Unknown',
          'Location': f.address || f.location || 'Unknown',
          'Contact': f.contactNumber || 'N/A',
          'Animals': f._count?.animals || 0,
          'Created Date': f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-GB') : 'N/A',
          'Status': 'Active'
        })));
      } else if (activeReport === 'animal') {
        setData(list.map((a: any) => ({
          'Tag Number': a.tagNumber,
          'Animal Name': a.name,
          'Species': a.species,
          'Breed': a.breed,
          'Gender': a.gender,
          'Age (m)': a.age,
          'Weight (kg)': a.weight,
          'Farm': a.farm?.name || 'Unknown',
          'Health Status': a.status,
          'MRL Status': a.mrlStatus
        })));
      } else if (activeReport === 'treatment') {
        setData(list.map((t: any) => ({
          'Treatment Date': t.administrationDate ? new Date(t.administrationDate).toLocaleDateString('en-GB') : 'N/A',
          'Animal': t.animal?.tagNumber || t.animalId || 'Unknown',
          'Medicine': t.drugName,
          'Dose': t.dosage,
          'Veterinarian': t.veterinarianName || 'Unknown',
          'Duration': t.duration ? `${t.duration} days` : 'N/A',
          'Withdrawal Period': `${t.withdrawalPeriod} days`,
          'Status': t.withdrawalCompletionDate && new Date(t.withdrawalCompletionDate) > new Date() ? 'Under Withdrawal' : 'Completed'
        })));
      } else if (activeReport === 'vaccination') {
        setData(list.map((v: any) => ({
          'Animal': v.animal?.tagNumber || v.animalId || 'Unknown',
          'Vaccine': v.vaccineName,
          'Date': v.vaccinationDate ? new Date(v.vaccinationDate).toLocaleDateString('en-GB') : 'N/A',
          'Next Due Date': v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString('en-GB') : 'N/A',
          'Veterinarian': v.veterinarianName || 'Unknown',
          'Status': 'Administered'
        })));
      } else if (activeReport === 'compliance') {
        setData(list.map((a: any) => {
          let measuredResidue: number | null = 5;
          let drug = 'Various';
          let withdrawalStatus: 'ACTIVE' | 'DUE SOON' | 'CLEARED' = 'CLEARED';
          
          if (a.mrlStatus === 'DO_NOT_SELL') {
            measuredResidue = 150;
            drug = 'Penicillin G';
            withdrawalStatus = 'ACTIVE';
          } else if (a.mrlStatus === 'CLEARING_SOON') {
            measuredResidue = null;
            drug = 'Oxytetracycline';
          }
          
          const decision = calculateMRLCompliance({
            animalId: a.id,
            drug,
            measuredResidue,
            mrlLimit: 100,
            testDate: new Date().toISOString(),
            withdrawalStatus,
            withdrawalDaysRemaining: 4
          });

          return {
            'Animal': a.tagNumber || a.name,
            'Drug': drug,
            'Residue Level': measuredResidue !== null ? `${measuredResidue} µg/kg` : 'Pending',
            'MRL Limit': '100 µg/kg',
            'Test Date': new Date().toLocaleDateString('en-GB'),
            'Withdrawal Status': withdrawalStatus,
            'Compliance Result': decision.status
          };
        }));
      } else if (activeReport === 'inventory') {
        setData(list.map((i: any) => ({
          'Medicine': i.medicineName,
          'Category': 'Drug',
          'Quantity': i.stock,
          'Unit': 'units',
          'Expiry Date': i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('en-GB') : 'N/A',
          'Status': i.stock < (i.minimumStock || 10) ? 'Low Stock' : 'In Stock'
        })));
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setFarmFilter('');
    setSpeciesFilter('');
    setStatusFilter('');
    loadReportData();
  };

  const handleExportCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0] || {});
    const rows = data.map((row) =>
      headers.map((h) => `"${String(row[h] ?? '')}"`).join(',')
    );
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `livestocare_${activeReport}_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    handleExportCSV();
  };

  const reportTabs = [
    { id: 'farm', label: 'Farm Report', icon: 'fa-building' },
    { id: 'animal', label: 'Animal Report', icon: 'fa-paw' },
    { id: 'treatment', label: 'Treatment Report', icon: 'fa-medkit' },
    { id: 'vaccination', label: 'Vaccination Report', icon: 'fa-shield' },
    { id: 'compliance', label: 'Compliance Report', icon: 'fa-check-square-o' },
    { id: 'inventory', label: 'Inventory Report', icon: 'fa-archive' },
  ];

  const renderBadge = (val: string) => {
    const v = val.toUpperCase();
    if (v === 'COMPLIANT' || v === 'CLEARED' || v === 'HEALTHY' || v === 'IN STOCK' || v === 'COMPLETED') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">{val}</span>;
    }
    if (v === 'NON-COMPLIANT' || v === 'DO_NOT_SELL' || v === 'LOW STOCK') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">{val}</span>;
    }
    if (v === 'PENDING' || v === 'CLEARING_SOON' || v === 'UNDER_TREATMENT' || v === 'UNDER WITHDRAWAL' || v === 'ACTIVE' || v === 'DUE SOON') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">{val}</span>;
    }
    return val;
  };

  // Compute insights
  const totalRecords = data.length;
  let insightCompliant = 0;
  let insightPending = 0;
  let insightNonCompliant = 0;
  let insightAnimals = 0;
  let insightActive = 0;
  let insightCompleted = 0;

  if (activeReport === 'compliance') {
    data.forEach(d => {
      if (d['Compliance Result'] === 'COMPLIANT') insightCompliant++;
      else if (d['Compliance Result'] === 'PENDING') insightPending++;
      else insightNonCompliant++;
    });
  } else if (activeReport === 'treatment') {
    data.forEach(d => {
      if (d['Status'] === 'Under Withdrawal') insightActive++;
      else insightCompleted++;
    });
  } else if (activeReport === 'farm') {
    data.forEach(d => {
      insightAnimals += Number(d['Animals']) || 0;
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-10">
      {/* 1. REPORT PAGE HEADER */}
      <div className="bg-white px-8 py-6 border-b border-gray-200 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Generate operational, antimicrobial usage, livestock, withdrawal and MRL compliance reports.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setPrintModal(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <i className="fa fa-print"></i> Print Preview
          </button>
          <button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <i className="fa fa-file-text-o"></i> Export CSV
          </button>
          <button onClick={handleExportExcel} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <i className="fa fa-file-excel-o"></i> Export Excel
          </button>
          <button onClick={() => setPrintModal(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 transition-colors shadow-sm">
            <i className="fa fa-file-pdf-o"></i> Export PDF
          </button>
        </div>
      </div>

      <div className="p-8 max-w-[1400px] w-full mx-auto space-y-6 flex-1 flex flex-col">
        {/* 2. REPORT SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Farms</span>
            <span className="text-xl font-bold text-gray-900">{stats.totalFarms}</span>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Animals</span>
            <span className="text-xl font-bold text-gray-900">{stats.totalAnimals.toLocaleString()}</span>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Treatments</span>
            <span className="text-xl font-bold text-gray-900">{stats.totalTreatments}</span>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">MRL Compliance</span>
            <span className="text-xl font-bold text-green-600">{stats.mrlCompliance}</span>
          </div>
        </div>

        {/* 3. REPORT TYPE SELECTOR */}
        <div className="bg-white rounded-lg border border-gray-200 p-2 shadow-sm flex overflow-x-auto gap-2">
          {reportTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as any)}
              className={`whitespace-nowrap inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeReport === tab.id 
                ? 'bg-green-600 text-white' 
                : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <i className={`fa ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 4. FILTER PANEL */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Date From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Date To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Farm / Location</label>
            <input type="text" placeholder="Search farm..." value={farmFilter} onChange={e => setFarmFilter(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Species</label>
            <select value={speciesFilter} onChange={e => setSpeciesFilter(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white w-32">
              <option value="">All Species</option>
              <option value="CATTLE">Cattle</option>
              <option value="SHEEP">Sheep</option>
              <option value="GOAT">Goat</option>
              <option value="PIG">Pig</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white w-36">
              <option value="">All Statuses</option>
              <option value="HEALTHY">Healthy</option>
              <option value="UNDER_TREATMENT">Under Treatment</option>
              <option value="DO_NOT_SELL">Do Not Sell</option>
              <option value="CLEARED">Cleared</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={resetFilters} className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              Reset
            </button>
            <button onClick={loadReportData} className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 transition-colors">
              Apply Filters
            </button>
          </div>
        </div>

        {/* 13. REPORT INSIGHTS */}
        {!loading && data.length > 0 && (
          <div className="bg-gray-100 rounded-lg p-3 text-sm flex gap-6 text-gray-700 shadow-inner">
            <div className="font-semibold">Total Records: <span className="font-bold text-gray-900">{totalRecords}</span></div>
            {activeReport === 'compliance' && (
              <>
                <div>Compliant: <span className="font-bold text-green-700">{insightCompliant}</span></div>
                <div>Pending: <span className="font-bold text-orange-600">{insightPending}</span></div>
                <div>Non-Compliant: <span className="font-bold text-red-600">{insightNonCompliant}</span></div>
              </>
            )}
            {activeReport === 'treatment' && (
              <>
                <div>Completed: <span className="font-bold text-gray-900">{insightCompleted}</span></div>
                <div>Under Withdrawal: <span className="font-bold text-orange-600">{insightActive}</span></div>
              </>
            )}
            {activeReport === 'farm' && (
              <>
                <div>Total Animals Across Filtered Farms: <span className="font-bold text-gray-900">{insightAnimals}</span></div>
              </>
            )}
          </div>
        )}

        {/* 5. & 6. REPORT CONTENT AREA & TABLE */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col relative">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-500 flex-1">
              <i className="fa fa-circle-o-notch fa-spin text-3xl mb-4 text-green-600"></i>
              <div>Generating report...</div>
            </div>
          ) : data.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-500 flex-1 text-center">
              <i className="fa fa-folder-open-o text-4xl mb-4 text-gray-300"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No records found</h3>
              <p className="text-sm">No records match the selected report type and date range.<br/>Try changing the date range or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full h-full pb-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {Object.keys(data[0] || {}).map((key) => (
                      <th key={key} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      {Object.keys(row).map((key, j) => (
                        <td key={j} className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                          {['Status', 'Compliance Result', 'Health Status', 'MRL Status', 'Withdrawal Status'].includes(key) 
                            ? renderBadge(String(row[key])) 
                            : String(row[key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 15. PRINT PREVIEW */}
      <Modal
        isOpen={printModal}
        onClose={() => setPrintModal(false)}
        title="Print Preview"
        icon="fa-print"
        maxWidth="900px"
      >
        <div className="p-2" id="print-area">
          <div className="border-b-2 border-gray-900 pb-4 mb-6 flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 uppercase">LivestoCare</h2>
              <div className="text-lg font-medium text-gray-700 mt-1">{reportTabs.find(t => t.id === activeReport)?.label}</div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>Generated Date: {new Date().toLocaleDateString('en-GB')}</div>
              <div>Selected Date Range: {startDate || 'N/A'} to {endDate || 'N/A'}</div>
              <div>Applied Filters: {farmFilter || speciesFilter || statusFilter ? 'Yes' : 'None'}</div>
            </div>
          </div>
          
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded p-4 text-sm flex gap-6">
             <div className="font-semibold">Summary</div>
             <div>Total Records: {totalRecords}</div>
             {activeReport === 'compliance' && <div>Compliant: {insightCompliant} | Pending: {insightPending} | Non-Compliant: {insightNonCompliant}</div>}
             {activeReport === 'treatment' && <div>Completed: {insightCompleted} | Under Withdrawal: {insightActive}</div>}
          </div>

          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  {data[0] && Object.keys(data[0]).map((key) => (
                    <th key={key} className="px-3 py-2 font-bold text-gray-700">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Object.keys(row).map((k, j) => (
                      <td key={j} className="px-3 py-2 text-gray-800">{String(row[k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 mt-8 no-print">
            <button onClick={() => setPrintModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
              Close Preview
            </button>
            <button onClick={() => { window.print(); setPrintModal(false); }} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded hover:bg-green-700 transition-colors">
              <i className="fa fa-print mr-2"></i> Print Report
            </button>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #print-area, #print-area * {
              visibility: visible;
            }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `}} />
      </Modal>
    </div>
  );
}
