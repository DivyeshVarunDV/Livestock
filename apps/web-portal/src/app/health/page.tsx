'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { calculateWithdrawal } from '@/lib/withdrawalEngine';
import Loader from '@/components/Loader';
import { 
  Syringe, 
  FileText, 
  Calendar, 
  Package, 
  Search, 
  Plus, 
  Pill 
} from 'lucide-react';

export default function HealthPage() {
  const { token } = useAuth();
  
  const [activeTab, setActiveTab] = useState('treatments');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [treatments, setTreatments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    
    async function fetchData() {
      try {
        setLoading(true);
        const [tRes, pRes, vRes, iRes] = await Promise.all([
          apiFetch('/treatments', { token }),
          apiFetch('/prescriptions', { token }),
          apiFetch('/vaccinations/upcoming', { token }),
          apiFetch('/inventory', { token })
        ]);
        
        if (isMounted) {
          setTreatments(tRes.data || []);
          setPrescriptions(pRes.data || []);
          setVaccinations(vRes.data || []);
          setInventory(iRes.data || []);
        }
      } catch (error) {
        console.error('Error fetching health data', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    fetchData();
    return () => { isMounted = false; };
  }, [token]);

  const tabs = [
    { id: 'treatments', label: 'Treatments', icon: Syringe },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
    { id: 'vaccinations', label: 'Vaccinations', icon: Calendar },
    { id: 'inventory', label: 'Inventory', icon: Package },
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getVaccineDueStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', classes: 'bg-red-100 text-red-800' };
    if (diffDays <= 7) return { label: 'Due Soon', classes: 'bg-amber-100 text-amber-800' };
    return { label: 'Upcoming', classes: 'bg-green-100 text-green-800' };
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays > 0 && diffDays <= 30;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="bg-green-100 p-3 rounded-full animate-pulse">
          <Pill className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Health & Treatment</h1>
          <p className="text-sm text-gray-500 mt-1">Manage treatments, prescriptions, vaccines, and medical inventory</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-gray-100 p-1 rounded-lg inline-flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-md text-sm transition-all duration-200 ${
                isActive 
                  ? 'bg-white shadow-sm text-green-700 font-semibold' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        
        {/* Actions Row */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm transition-shadow"
            />
          </div>
          
          {activeTab === 'treatments' && (
            <Link 
              href="/treatments/new" 
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Treatment
            </Link>
          )}
          
          {activeTab === 'prescriptions' && (
            <Link 
              href="/prescriptions/new" 
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Prescription
            </Link>
          )}
        </div>

        {/* Tables */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {activeTab === 'treatments' && (
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Animal</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drug / Dosage</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Withdrawal Status</th>
                </tr>
              )}
              {activeTab === 'prescriptions' && (
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Animal</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicine / Dosage</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veterinarian</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              )}
              {activeTab === 'vaccinations' && (
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Animal</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farm</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vaccine</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Given</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Due</th>
                </tr>
              )}
              {activeTab === 'inventory' && (
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicine</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer / Batch#</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                </tr>
              )}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              
              {activeTab === 'treatments' && treatments
                .filter(t => 
                  t.drug?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  t.animal?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.animal?.tagNumber?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((t, idx) => {
                  const wd = calculateWithdrawal(t.administrationDate, t.withdrawalPeriod);
                  return (
                    <tr key={t.id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{t.animal?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{t.animal?.tagNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{t.drug}</div>
                        <div className="text-xs text-gray-500">{t.dosage}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(t.administrationDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          wd.isActive ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {wd.isActive ? 'Active' : 'Clear'}
                        </span>
                      </td>
                    </tr>
                  );
              })}

              {activeTab === 'prescriptions' && prescriptions
                .filter(p => 
                  p.medicine?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  p.animal?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{p.animal?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{p.animal?.tagNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{p.medicine}</div>
                      <div className="text-xs text-gray-500">{p.dosage}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.duration || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.veterinarian || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {p.status || 'UNKNOWN'}
                      </span>
                    </td>
                  </tr>
              ))}

              {activeTab === 'vaccinations' && vaccinations
                .filter(v => 
                  v.vaccineName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  v.animal?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((v, idx) => {
                  const status = getVaccineDueStatus(v.nextDueDate);
                  return (
                    <tr key={v.id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{v.animal?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{v.animal?.tagNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {v.animal?.farm?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {v.vaccineName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(v.dateGiven)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 mb-1">{formatDate(v.nextDueDate)}</div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.classes}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
              })}

              {activeTab === 'inventory' && inventory
                .filter(i => i.medicineName?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item, idx) => {
                  const isLowStock = item.stock < (item.minimumStock || 0);
                  const expiring = isExpiringSoon(item.expiryDate);
                  
                  return (
                    <tr 
                      key={item.id || idx} 
                      className={`hover:bg-gray-50 transition-colors ${isLowStock ? 'bg-red-50/50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{item.medicineName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.manufacturer || '-'}</div>
                        <div className="text-xs text-gray-500">Batch: {item.batchNumber || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.stock} units
                        </div>
                        <div className="text-xs text-gray-500">Min: {item.minimumStock || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${expiring ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                          {formatDate(item.expiryDate)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.supplier || '-'}
                      </td>
                    </tr>
                  );
              })}
              
            </tbody>
          </table>
          
          {/* Empty States */}
          {activeTab === 'treatments' && treatments.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">No treatments found.</div>
          )}
          {activeTab === 'prescriptions' && prescriptions.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">No prescriptions found.</div>
          )}
          {activeTab === 'vaccinations' && vaccinations.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">No upcoming vaccinations found.</div>
          )}
          {activeTab === 'inventory' && inventory.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">No inventory items found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
