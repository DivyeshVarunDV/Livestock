import React from 'react';
import { Stethoscope } from 'lucide-react';

export default function HealthRecordsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Stethoscope className="text-emerald-600" size={24} />
        <h1 className="text-2xl font-bold text-gray-900">Health Records</h1>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-sm">Select an animal to view detailed health records.</p>
      </div>
    </div>
  );
}
