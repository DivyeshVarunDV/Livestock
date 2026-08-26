const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'apps', 'web-portal', 'src', 'app');

const pages = [
  { dir: 'milk-collection', title: 'Milk Collection Records', apiEndpoint: '/milk-collections', icon: 'Droplets' },
  { dir: 'milk-testing', title: 'Laboratory Milk Tests', apiEndpoint: '/milk-tests', icon: 'FlaskConical' },
  { dir: 'transfers', title: 'Ownership Transfers', apiEndpoint: '/ownership-transfers', icon: 'ArrowRightLeft' },
  { dir: 'violations', title: 'Compliance Violations', apiEndpoint: '/violations', icon: 'ShieldAlert' }
];

pages.forEach(p => {
  const dirPath = path.join(baseDir, p.dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

  const content = `'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';
import { ${p.icon}, Plus, RefreshCw } from 'lucide-react';

export default function ${p.dir.replace('-', '')}Page() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('${p.apiEndpoint}');
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
            <${p.icon} className="text-emerald-600" />
            ${p.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage and view ${p.title.toLowerCase()}.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="p-2 text-gray-500 hover:text-emerald-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all">
            <RefreshCw size={18} />
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
            <Plus size={16} /> New Record
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Loader /></div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4 font-semibold">ID</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Status / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.id.substring(0,8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                      {item.status || item.type || item.result || 'View details'}
                    </td>
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
`;
  fs.writeFileSync(path.join(dirPath, 'page.tsx'), content);
});

console.log('Pages generated!');
