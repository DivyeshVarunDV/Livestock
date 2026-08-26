'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import { FlaskConical, Plus, RefreshCw } from 'lucide-react';

export default function milktestingPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/milk-tests');
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="text-emerald-600" />
            Product Testing Records
          </h1>
          <p className="text-sm text-gray-500 mt-1">Record PASS / FAIL / PENDING results and trigger investigations for failed tests.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="p-2 text-gray-500 hover:text-emerald-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all"><RefreshCw size={18} /></button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"><Plus size={16} /> New Record</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Loader /></div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4 font-semibold">Test ID</th>
                  <th className="px-6 py-4 font-semibold">Batch ID</th>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Test Type</th>
                  <th className="px-6 py-4 font-semibold">Result</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.batchId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.productType || 'MILK'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${item.result === 'PASS' ? 'bg-green-100 text-green-800' : item.result === 'FAIL' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{item.result}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.testingLocation || item.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.testDate || item.date || item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
