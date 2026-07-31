'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const [expandedSection, setExpandedSection] = useState<string | null>('farm');

  const toggleSection = (key: string) => {
    setExpandedSection(expandedSection === key ? null : key);
  };

  const isPathActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Government Logo - Shield + Leaf + Cow Silhouette Concept */}
        <div className="sidebar-brand">
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: '#2E7D32',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '1.25rem',
              flexShrink: 0,
              border: '1.5px solid rgba(255,255,255,0.2)',
            }}
            title="AgriShield Enterprise - Shield, Leaf & Livestock"
          >
            <i className="fa fa-shield"></i>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
              AgriShield
            </div>
            <div style={{ fontSize: '0.66rem', color: '#A7F3D0', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Enterprise v2.1
            </div>
          </div>
        </div>

        {/* Dark Professional Navigation */}
        <nav className="sidebar-nav">
          <Link href="/" className={`sidebar-item ${pathname === '/' ? 'active' : ''}`}>
            <i className="fa fa-dashboard"></i>
            <span>Dashboard</span>
          </Link>

          <div className="sidebar-section-title">Farm &amp; Livestock</div>
          <Link href="/farms" className={`sidebar-item ${isPathActive('/farms') && !pathname.includes('registry') ? 'active' : ''}`}>
            <i className="fa fa-home"></i>
            <span>Farm Management</span>
          </Link>
          <Link href="/farms?tab=registry" className={`sidebar-item ${pathname.includes('animals') || pathname.includes('registry') ? 'active' : ''}`}>
            <i className="fa fa-paw"></i>
            <span>Animal Registry</span>
          </Link>

          <div className="sidebar-section-title">Antimicrobial &amp; Clinical</div>
          <Link href="/amu" className={`sidebar-item ${isPathActive('/amu') && !pathname.includes('prescriptions') && !pathname.includes('treatments') ? 'active' : ''}`}>
            <i className="fa fa-medkit"></i>
            <span>AMU Management</span>
          </Link>
          <Link href="/amu?tab=prescriptions" className="sidebar-item">
            <i className="fa fa-file-text-o"></i>
            <span>Veterinary Prescriptions</span>
          </Link>
          <Link href="/amu?tab=treatments" className="sidebar-item">
            <i className="fa fa-history"></i>
            <span>Treatment History</span>
          </Link>

          <div className="sidebar-section-title">MRL &amp; Withdrawal</div>
          <Link href="/alerts" className={`sidebar-item ${isPathActive('/alerts') && !pathname.includes('standards') ? 'active' : ''}`}>
            <i className="fa fa-clock-o"></i>
            <span>Withdrawal Monitoring</span>
          </Link>
          <Link href="/alerts?tab=standards" className="sidebar-item">
            <i className="fa fa-check-square-o"></i>
            <span>MRL Compliance</span>
          </Link>

          <div className="sidebar-section-title">Analytics &amp; Alerts</div>
          <Link href="/reports" className={`sidebar-item ${isPathActive('/reports') ? 'active' : ''}`}>
            <i className="fa fa-file-pdf-o"></i>
            <span>Reports</span>
          </Link>
          <Link href="/notifications" className={`sidebar-item ${isPathActive('/notifications') ? 'active' : ''}`}>
            <i className="fa fa-bell-o"></i>
            <span>Notifications</span>
          </Link>

          <div className="sidebar-section-title">Administration</div>
          <Link href="/users" className={`sidebar-item ${isPathActive('/users') ? 'active' : ''}`}>
            <i className="fa fa-users"></i>
            <span>Users</span>
          </Link>
          <Link href="/inventory" className={`sidebar-item ${isPathActive('/inventory') ? 'active' : ''}`}>
            <i className="fa fa-cog"></i>
            <span>Settings</span>
          </Link>
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#A7F3D0', fontWeight: 600 }}>
          <i className="fa fa-check-circle" style={{ color: '#6EE7B7' }}></i>
          <span>NIC e-Governance Ready</span>
        </div>
        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: '4px' }}>
          Govt. of India • DAH&amp;D
        </div>
      </div>
    </aside>
  );
}
