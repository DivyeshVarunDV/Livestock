'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Picks a medicine from the master list (/medicines) for a stock entry.
 * The withdrawal period is shown read-only: it is managed on the Medicines page.
 */
export default function MedicineSelect({
  medicines,
  value,
  onChange,
}: {
  medicines: any[];
  value: string;
  onChange: (name: string) => void;
}) {
  const active = medicines.filter((m) => m.status !== 'INACTIVE');
  const selected = medicines.find((m) => m.name.toLowerCase() === value.toLowerCase());
  // Keep an existing stock item's name selectable even if it is not in the list.
  const showLegacy = value && !active.some((m) => m.name.toLowerCase() === value.toLowerCase());

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">Medicine</label>
      <select
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="">Select a medicine...</option>
        {showLegacy && <option value={value}>{value}</option>}
        {active.map((m) => (
          <option key={m.id} value={m.name}>
            {m.name}
            {m.category ? ` (${m.category.toLowerCase()})` : ''}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 mt-1">
        {selected
          ? `Withdrawal period: ${selected.withdrawalPeriod} day(s), set on the Medicines page.`
          : 'Not listed? '}
        {!selected && (
          <Link href="/medicines" className="text-green-700 font-semibold hover:underline">
            Add it on the Medicines page
          </Link>
        )}
      </p>
    </div>
  );
}
