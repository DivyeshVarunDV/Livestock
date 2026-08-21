'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/Modal';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, LOW, EXPIRING
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);

  // Form states
  const [medicineName, setMedicineName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [stock, setStock] = useState('50');
  const [minimumStock, setMinimumStock] = useState('10');
  const [supplier, setSupplier] = useState('');
  const [cost, setCost] = useState('25');
  const [storageLocation, setStorageLocation] = useState('Cabinet A');



  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/inventory');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // Enterprise default inventory list if offline/empty
      setItems([
        {
          id: 'inv-1',
          medicineName: 'Oxytetracycline 200mg/ml',
          manufacturer: 'AgroVet Pharma Ltd.',
          batchNumber: 'OXY-2026-884',
          expiryDate: '2027-12-31',
          stock: 45,
          minimumStock: 15,
          supplier: 'Global Vet Supply Co.',
          cost: 32.5,
          storageLocation: 'Cold Storage Room B',
        },
        {
          id: 'inv-2',
          medicineName: 'Amoxicillin 150mg/ml LA',
          manufacturer: 'Pfizer Animal Health',
          batchNumber: 'AMX-2025-012',
          expiryDate: '2026-08-15',
          stock: 6,
          minimumStock: 10,
          supplier: 'AgriShield Logistics',
          cost: 45.0,
          storageLocation: 'Main Pharmacy Rack 2',
        },
        {
          id: 'inv-3',
          medicineName: 'FMD Polyvalent Vaccine',
          manufacturer: 'Biovet Global',
          batchNumber: 'FMD-VAC-991',
          expiryDate: '2027-03-20',
          stock: 120,
          minimumStock: 30,
          supplier: 'Biovet Direct',
          cost: 18.0,
          storageLocation: 'Cold Storage Refrigerator 1',
        },
        {
          id: 'inv-4',
          medicineName: 'Ivermectin 1% Injectable',
          manufacturer: 'Bayer Animal Ltd.',
          batchNumber: 'IVM-2026-441',
          expiryDate: '2028-01-10',
          stock: 8,
          minimumStock: 15,
          supplier: 'Global Vet Supply Co.',
          cost: 28.0,
          storageLocation: 'Main Pharmacy Rack 1',
        },
        {
          id: 'inv-5',
          medicineName: 'Enrofloxacin Inj 10%',
          manufacturer: 'Virbac Animal Health',
          batchNumber: 'ENR-2026-302',
          expiryDate: '2027-09-15',
          stock: 24,
          minimumStock: 10,
          supplier: 'AgriShield Logistics',
          cost: 38.0,
          storageLocation: 'Main Pharmacy Rack 3',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditItem(item);
      setMedicineName(item.medicineName || '');
      setManufacturer(item.manufacturer || '');
      setBatchNumber(item.batchNumber || '');
      setExpiryDate(item.expiryDate ? item.expiryDate.split('T')[0] : '');
      setStock(String(item.stock || '0'));
      setMinimumStock(String(item.minimumStock || '10'));
      setSupplier(item.supplier || '');
      setCost(String(item.cost || '0'));
      setStorageLocation(item.storageLocation || '');
    } else {
      setEditItem(null);
      setMedicineName('');
      setManufacturer('');
      setBatchNumber(`BATCH-${Math.floor(1000 + Math.random() * 9000)}`);
      setExpiryDate('2028-06-30');
      setStock('50');
      setMinimumStock('10');
      setSupplier('AgriShield Global Supply');
      setCost('30');
      setStorageLocation('Main Pharmacy Room');
    }
    setModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      medicineName,
      manufacturer,
      batchNumber,
      expiryDate,
      stock: Number(stock),
      minimumStock: Number(minimumStock),
      supplier,
      cost: Number(cost),
      storageLocation,
    };
    try {
      if (editItem) {
        await apiFetch(`/inventory/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/inventory', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      loadInventory();
    } catch {
      // offline fallback update state
      if (editItem) {
        setItems(
          items.map((i) =>
            i.id === editItem.id ? { ...i, ...payload } : i,
          ),
        );
      } else {
        setItems([
          ...items,
          { id: `inv-${Date.now()}`, ...payload },
        ]);
      }
      setModalOpen(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medicine record?')) return;
    try {
      await apiFetch(`/inventory/${id}`, { method: 'DELETE' });
    } catch {}
    setItems(items.filter((i) => i.id !== id));
  };

  const filteredItems = items.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = item.medicineName?.toLowerCase().includes(q);
      const batchMatch = item.batchNumber?.toLowerCase().includes(q);
      const mfgMatch = item.manufacturer?.toLowerCase().includes(q);
      if (!nameMatch && !batchMatch && !mfgMatch) return false;
    }
    if (statusFilter === 'LOW') {
      return item.stock <= item.minimumStock;
    }
    if (statusFilter === 'EXPIRING') {
      const daysLeft =
         
        (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      return daysLeft < 90;
    }
    return true;
  });

  const lowStockCount = items.filter((i) => i.stock <= i.minimumStock).length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Medicine & Veterinary Inventory</h1>
          <p className="subtitle">
            Enterprise batch tracking, expiry monitoring, minimum threshold alerts, and supplier cost management
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleOpenModal()}
        >
          <i className="fa fa-plus" style={{ marginRight: '6px' }}></i>
          Add New Medicine
        </button>
      </div>

      {/* Reference Stats Pill Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa fa-medkit" style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }}></i>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total SKU Types</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{items.length}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa fa-exclamation-triangle" style={{ color: '#ef4444', fontSize: '1.2rem' }}></i>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Low Stock Alerts</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: lowStockCount > 0 ? '#ef4444' : 'inherit' }}>
              {lowStockCount}
            </div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa fa-archive" style={{ color: '#0284c7', fontSize: '1.2rem' }}></i>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Stock Units</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {items.reduce((acc, cur) => acc + (cur.stock || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
          <i className="fa fa-search" style={{ color: 'var(--text-muted)' }}></i>
          <input
            type="text"
            placeholder="Search medicine name, manufacturer, or batch number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.9rem',
              color: 'var(--text-main)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <i className="fa fa-times"></i>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ALL', label: 'All Inventory' },
            { id: 'LOW', label: 'Low Stock Alerts' },
            { id: 'EXPIRING', label: 'Expiring Soon' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: statusFilter === st.id ? 'var(--accent-primary)' : 'transparent',
                color: statusFilter === st.id ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-panel" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>MEDICINE & MANUFACTURER</th>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>BATCH NO.</th>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>EXPIRY DATE</th>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>STOCK LEVEL</th>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>STORAGE & SUPPLIER</th>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700 }}>UNIT COST</th>
              <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading inventory catalog...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No medicines matching criteria
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isLowStock = item.stock <= item.minimumStock;
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      transition: 'background 0.15s',
                    }}
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                        {item.medicineName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {item.manufacturer}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>
                      {item.batchNumber}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>
                      <i className="fa fa-calendar-o" style={{ marginRight: '6px', color: 'var(--text-muted)' }}></i>
                      {new Date(item.expiryDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            color: isLowStock ? '#dc2626' : '#059669',
                          }}
                        >
                          {item.stock} units
                        </span>
                        {isLowStock && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            LOW STOCK (Min: {item.minimumStock})
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>
                      <div>{item.storageLocation}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.supplier}</div>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 700, fontSize: '0.9rem' }}>
                      ${Number(item.cost).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenModal(item)}
                        style={{
                          background: '#f1f5f9',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          color: '#334155',
                          cursor: 'pointer',
                          marginRight: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        <i className="fa fa-pencil" style={{ marginRight: '4px' }}></i>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        style={{
                          background: '#fee2e2',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          color: '#dc2626',
                          cursor: 'pointer',
                        }}
                      >
                        <i className="fa fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Medicine SKU' : 'Add New Medicine SKU'}
        icon="fa-archive"
      >
        <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Medicine / Drug Name
            </label>
            <input
              type="text"
              required
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              placeholder="e.g. Oxytetracycline 200mg/ml"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Manufacturer
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="AgroVet Pharma Ltd."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Batch Number
              </label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="BATCH-001"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Current Stock (Units)
              </label>
              <input
                type="number"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Minimum Stock
              </label>
              <input
                type="number"
                required
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Unit Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Expiry Date
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Storage Location
              </label>
              <input
                type="text"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="Cold Storage Room A"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Supplier / Distributor
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="AgriShield Global Supply Co."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              <i className="fa fa-save" style={{ marginRight: '6px' }}></i>
              {editItem ? 'Save Changes' : 'Add to Catalog'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
