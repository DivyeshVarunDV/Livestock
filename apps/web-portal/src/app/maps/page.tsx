'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function MapsPage() {
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedPin, setSelectedPin] = useState<any | null>(null);
  const [category, setCategory] = useState('ALL'); // ALL, FARM, CLINIC, CENTER
  const [zoom, setZoom] = useState(1);
  const [directionsMode, setDirectionsMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPins();
  }, []);

  const loadPins = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/farms');
      const apiFarms = Array.isArray(data) ? data : [];
      setFarms(apiFarms);
    } catch {
      setFarms([]);
    } finally {
      setLoading(false);
    }
  };

  const defaultPins = [
    {
      id: 'frm-1',
      title: 'Green Valley Livestock Farm',
      type: 'FARM',
      owner: 'Robert Miller',
      contact: '+1 (555) 019-8833',
      address: '142 Valley Rd, Meadowville',
      status: 'CLEARED (100% MRL Compliance)',
      animalsCount: 142,
      lat: 42,
      lng: 35,
      description: 'Registered Holstein Cattle & Sheep breeding facility',
    },
    {
      id: 'frm-2',
      title: 'Sunset Ridge Dairy',
      type: 'FARM',
      owner: 'John Doe',
      contact: '+1 (555) 018-7722',
      address: '88 Hilltop Hwy, Westford',
      status: 'UNDER_TREATMENT (2 animals)',
      animalsCount: 65,
      lat: 68,
      lng: 55,
      description: 'Commercial dairy production with automated AMU tracking',
    },
    {
      id: 'cl-1',
      title: 'AgriShield Veterinary Diagnostic Clinic #1',
      type: 'CLINIC',
      owner: 'Dr. Sarah Jenkins, DVM',
      contact: '+1 (555) 001-9988',
      address: '400 North County Line, Suite 4',
      status: 'ACTIVE CLINIC (24/7 ER)',
      animalsCount: 0,
      lat: 50,
      lng: 70,
      description: 'Regional veterinary emergency & residue testing lab',
    },
    {
      id: 'sc-1',
      title: 'AgriShield Regional Service & Supply Center',
      type: 'CENTER',
      owner: 'Supply Operations',
      contact: '+1 (800) 555-AGRI',
      address: '12 Industrial Parkway, Meadowville',
      status: 'OPEN (08:00 - 18:00)',
      animalsCount: 0,
      lat: 28,
      lng: 60,
      description: 'Veterinary pharmaceuticals, RFID ear tags, and feed supplements depot',
    },
    {
      id: 'frm-3',
      title: 'Sunrise Dairies (Amritsar Hub)',
      type: 'FARM',
      owner: 'Sardar Harbhajan Singh',
      contact: '+91 98140-55912',
      address: '45 River Rd, Amritsar',
      status: 'CLEARED (100% MRL Compliance)',
      animalsCount: 180,
      lat: 55,
      lng: 38,
      description: 'Integrated dairy farm and breeding center',
    },
  ];

  // Merge backend farms if present
  const allPins = [
    ...defaultPins,
    ...farms.map((f, i) => ({
      id: f.id,
      title: f.name,
      type: 'FARM',
      owner: f.ownerName || 'Unknown Owner',
      contact: f.contactNumber || 'No phone',
      address: f.address || 'Unknown Address',
      status: 'REGISTERED FARM',
      animalsCount: f._count?.animals || f.animals?.length || 0,
      lat: 30 + (i * 15) % 60,
      lng: 25 + (i * 20) % 70,
      description: 'Integrated livestock farm',
    })),
  ];

  const filteredPins = allPins.filter((pin) => {
    if (category !== 'ALL' && pin.type !== category) return false;
    return true;
  });

  const getPinColor = (type: string) => {
    switch (type) {
      case 'FARM':
        return '#059669';
      case 'CLINIC':
        return '#0284c7';
      case 'CENTER':
        return '#9333ea';
      default:
        return '#475569';
    }
  };

  const getPinIcon = (type: string) => {
    switch (type) {
      case 'FARM':
        return 'fa-paw';
      case 'CLINIC':
        return 'fa-medkit';
      case 'CENTER':
        return 'fa-building';
      default:
        return 'fa-map-marker';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Interactive GIS & Livestock Mapping</h1>
          <p className="subtitle">
            Enterprise spatial visualization of livestock farms, veterinary clinics, service depots, and herd distributions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setZoom(Math.min(zoom + 0.25, 2))}
            className="btn-secondary"
            title="Zoom In"
          >
            <i className="fa fa-search-plus"></i>
          </button>
          <button
            type="button"
            onClick={() => setZoom(Math.max(zoom - 0.25, 0.75))}
            className="btn-secondary"
            title="Zoom Out"
          >
            <i className="fa fa-search-minus"></i>
          </button>
          <button
            type="button"
            onClick={() => { setZoom(1); setSelectedPin(null); setDirectionsMode(false); }}
            className="btn-secondary"
          >
            <i className="fa fa-arrows-alt" style={{ marginRight: '6px' }}></i>
            Reset View
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Spatial Layers', icon: 'fa-map' },
            { id: 'FARM', label: 'Livestock Farms', icon: 'fa-paw' },
            { id: 'CLINIC', label: 'Veterinary Clinics', icon: 'fa-medkit' },
            { id: 'CENTER', label: 'Service & Support Centers', icon: 'fa-building' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setCategory(item.id); setSelectedPin(null); }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: category === item.id ? 'var(--accent-primary)' : '#ffffff',
                color: category === item.id ? '#ffffff' : '#475569',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s',
              }}
            >
              <i className={`fa ${item.icon}`}></i>
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredPins.length}</strong> active GIS markers
        </div>
      </div>

      {/* GIS Interactive Vector / SVG Map */}
      <div
        className="glass-panel"
        style={{
          padding: 0,
          position: 'relative',
          height: '420px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 50%, #f1f5f9 100%)',
          border: '1px solid var(--border-light)',
          borderRadius: '10px',
        }}
      >
        {/* Map Grid Pattern background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(#94a3b8 1px, transparent 1px), linear-gradient(to right, rgba(203,213,225,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(203,213,225,0.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px, 120px 120px, 120px 120px',
            opacity: 0.6,
          }}
        />

        {/* GIS Map Content Area with Zoom scale */}
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.25s ease',
          }}
        >
          {/* Simulated highways / regional roads */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <path
              d="M 50,100 Q 300,250 800,180 T 1400,400"
              stroke="rgba(148,163,184,0.4)"
              strokeWidth="10"
              fill="none"
            />
            <path
              d="M 200,500 C 450,400 600,100 1100,80"
              stroke="rgba(148,163,184,0.35)"
              strokeWidth="8"
              fill="none"
            />
            {/* If Directions mode active, show simulated GPS route */}
            {directionsMode && selectedPin && (
              <path
                d={`M 180,480 L ${selectedPin.lng * 10},${selectedPin.lat * 6}`}
                stroke="#0284c7"
                strokeWidth="4"
                strokeDasharray="10,6"
                fill="none"
              />
            )}
          </svg>

          {/* Render GIS Marker Pins */}
          {filteredPins.map((pin) => {
            const isSelected = selectedPin?.id === pin.id;
            const color = getPinColor(pin.type);
            const icon = getPinIcon(pin.type);
            return (
              <div
                key={pin.id}
                onClick={() => { setSelectedPin(pin); setDirectionsMode(false); }}
                style={{
                  position: 'absolute',
                  top: `${pin.lat}%`,
                  left: `${pin.lng}%`,
                  transform: 'translate(-50%, -100%)',
                  cursor: 'pointer',
                  zIndex: isSelected ? 100 : 10,
                  transition: 'all 0.2s',
                }}
              >
                {/* Marker Pin Icon */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      background: isSelected ? '#0f172a' : color,
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '20px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                      border: isSelected ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.8)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <i className={`fa ${icon}`}></i>
                    <span>{pin.title}</span>
                  </div>
                  {/* Pin Pointer triangle */}
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '7px solid transparent',
                      borderRight: '7px solid transparent',
                      borderTop: `9px solid ${isSelected ? '#0f172a' : color}`,
                      marginTop: '-2px',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Marker Popup Panel */}
        {selectedPin && (
          <div
            className="animate-fade-in"
            style={{
              position: 'absolute',
              bottom: '24px',
              right: '24px',
              width: '380px',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid var(--border-light)',
              padding: '24px',
              zIndex: 1000,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: getPinColor(selectedPin.type),
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedPin.type}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '8px', color: '#0f172a' }}>
                  {selectedPin.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPin(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                <i className="fa fa-times"></i>
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '16px' }}>
              {selectedPin.description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Contact Owner:</span>
                <strong style={{ color: '#0f172a' }}>{selectedPin.owner}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phone Number:</span>
                <strong style={{ color: '#0f172a' }}>{selectedPin.contact}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Address:</span>
                <strong style={{ color: '#0f172a', textAlign: 'right' }}>{selectedPin.address}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <strong style={{ color: '#059669' }}>{selectedPin.status}</strong>
              </div>
              {selectedPin.type === 'FARM' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Livestock Head Count:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedPin.animalsCount} animals</strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                onClick={() => setDirectionsMode(true)}
                className="btn-primary"
                style={{ flex: 1, padding: '10px' }}
              >
                <i className="fa fa-location-arrow" style={{ marginRight: '6px' }}></i>
                {directionsMode ? 'Directions Active (4.2 mi)' : 'Get Directions'}
              </button>
              <button
                type="button"
                onClick={() => alert(`Initiating contact with ${selectedPin.owner} (${selectedPin.contact})...`)}
                className="btn-secondary"
                style={{ padding: '10px 14px' }}
              >
                <i className="fa fa-phone"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
