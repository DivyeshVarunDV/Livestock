'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function Dashboard() {
  const [activeTableTab, setActiveTableTab] = useState<'treatments' | 'withdrawal' | 'lab'>('treatments');

  // 12 Months AMU Data
  const monthlyAmuData = [
    { month: 'Aug', amuUnits: 410, treatments: 290 },
    { month: 'Sep', amuUnits: 435, treatments: 310 },
    { month: 'Oct', amuUnits: 390, treatments: 280 },
    { month: 'Nov', amuUnits: 460, treatments: 330 },
    { month: 'Dec', amuUnits: 480, treatments: 350 },
    { month: 'Jan', amuUnits: 420, treatments: 305 },
    { month: 'Feb', amuUnits: 395, treatments: 295 },
    { month: 'Mar', amuUnits: 450, treatments: 325 },
    { month: 'Apr', amuUnits: 380, treatments: 275 },
    { month: 'May', amuUnits: 360, treatments: 260 },
    { month: 'Jun', amuUnits: 340, treatments: 245 },
    { month: 'Jul', amuUnits: 312, treatments: 220 },
  ];

  // Livestock Distribution (5 Species as requested)
  const livestockDistribution = [
    { name: 'Cattle', value: 1840 },
    { name: 'Buffalo', value: 1250 },
    { name: 'Goat', value: 680 },
    { name: 'Sheep', value: 410 },
    { name: 'Pig', value: 210 },
  ];
  const DONUT_COLORS = ['#163A2B', '#2E7D32', '#43A047', '#66BB6A', '#81C784', '#A5D6A7'];

  // Monthly MRL Compliance Rate
  const mrlComplianceData = [
    { month: 'Jan', compliance: 92.4 },
    { month: 'Feb', compliance: 93.1 },
    { month: 'Mar', compliance: 91.8 },
    { month: 'Apr', compliance: 94.2 },
    { month: 'May', compliance: 94.8 },
    { month: 'Jun', compliance: 95.5 },
    { month: 'Jul', compliance: 95.0 },
  ];

  // India Regional AMU Heat Map States Data
  const indiaRegionalData = [
    { state: 'Punjab', amuStatus: 'Very High', color: '#EF4444', score: '82%', violations: 4 },
    { state: 'Haryana', amuStatus: 'High', color: '#F59E0B', score: '87%', violations: 2 },
    { state: 'Uttar Pradesh', amuStatus: 'Medium', color: '#F59E0B', score: '91%', violations: 1 },
    { state: 'Gujarat', amuStatus: 'Low', color: '#22C55E', score: '96%', violations: 0 },
    { state: 'Maharashtra', amuStatus: 'Low', color: '#22C55E', score: '95%', violations: 0 },
  ];

  // Today's Alerts
  const todaysAlerts = [
    { id: 1, type: 'Withdrawal Alerts', count: 23, badge: 'warning', text: 'Active withholding periods in progress' },
    { id: 2, type: 'MRL Violations', count: 2, badge: 'danger', text: 'Lab sample exceeded residue limit' },
    { id: 3, type: 'Pending Prescriptions', count: 14, badge: 'info', text: 'Awaiting veterinary approval' },
    { id: 4, type: 'Lab Reports Pending', count: 8, badge: 'info', text: 'Samples under HPLC analysis' },
  ];

  // Pending Veterinary Approvals
  const pendingApprovals = [
    { id: 'PA-101', vet: 'Dr. Ramesh Kumar', drug: 'Amoxicillin Trihydrate', herd: 'Karnal Dairy #A-12', time: '18 mins ago' },
    { id: 'PA-102', vet: 'Dr. Anita Sharma', drug: 'Oxytetracycline 200 LA', herd: 'Shivalik Farm #B-04', time: '42 mins ago' },
    { id: 'PA-103', vet: 'Dr. Vikram Singh', drug: 'Enrofloxacin Inj', herd: 'Amrit Sarovar #C-09', time: '1 hr ago' },
  ];

  // Upcoming Vaccinations
  const upcomingVaccinations = [
    { id: 'VAC-1', vaccine: 'FMD Booster Schedule', target: '480 Cattle Head', date: '05-Aug-2026', status: 'Due Soon' },
    { id: 'VAC-2', vaccine: 'HS Annual Regimen', target: '310 Buffalo Head', date: '12-Aug-2026', status: 'Scheduled' },
    { id: 'VAC-3', vaccine: 'Brucellosis Primary', target: '95 Heifers', date: '18-Aug-2026', status: 'Scheduled' },
  ];

  // Recent Activity Timeline
  const recentActivities = [
    {
      id: 1,
      title: 'Treatment Recorded',
      desc: 'Oxytetracycline 100ml administered to Cattle #TAG-0042 at Green Valley Farm',
      time: '12 mins ago',
      status: 'Active Withdrawal',
      icon: 'fa fa-medkit',
      color: '#F59E0B',
    },
    {
      id: 2,
      title: 'Veterinary Approval',
      desc: 'Dr. Ramesh Kumar approved Amoxicillin regimen for Herd B-4',
      time: '45 mins ago',
      status: 'Approved',
      icon: 'fa fa-check-circle',
      color: '#22C55E',
    },
    {
      id: 3,
      title: 'Lab Report Uploaded',
      desc: 'NIC Central Vet Lab uploaded sample report #LAB-8819 (Milk Residue)',
      time: '1 hour ago',
      status: 'Compliant (0.02 ppm)',
      icon: 'fa fa-flask',
      color: '#2563EB',
    },
    {
      id: 4,
      title: 'Withdrawal Completed',
      desc: 'Buffalo #TAG-0018 cleared withdrawal period. Safe for milk/meat sale',
      time: '3 hours ago',
      status: 'Cleared',
      icon: 'fa fa-shield',
      color: '#2E7D32',
    },
    {
      id: 5,
      title: 'MRL Alert Generated',
      desc: 'Automated SMS alert sent to Farmer Suresh Patel regarding withdrawal adherence',
      time: '5 hours ago',
      status: 'Alert Sent',
      icon: 'fa fa-bell',
      color: '#F59E0B',
    },
  ];

  // Table 1: Recent Treatment Table (5 realistic rows)
  const treatmentRecords = [
    {
      animalId: '#TAG-0042',
      species: 'Cattle',
      farm: 'Green Meadows Farm',
      drug: 'Oxytetracycline',
      dosage: '100 ml IV',
      vet: 'Dr. Ramesh Kumar',
      date: '31-Jul-2026',
      withdrawalEnd: '07-Aug-2026',
      status: 'Active',
      badge: 'success',
    },
    {
      animalId: '#TAG-0018',
      species: 'Buffalo',
      farm: 'Sunrise Dairies',
      drug: 'Amoxicillin',
      dosage: '50 ml IM',
      vet: 'Dr. Anita Sharma',
      date: '29-Jul-2026',
      withdrawalEnd: '05-Aug-2026',
      status: 'Active',
      badge: 'success',
    },
    {
      animalId: '#TAG-0091',
      species: 'Goat',
      farm: 'Shivalik Goat Farm',
      drug: 'Enrofloxacin',
      dosage: '15 ml SC',
      vet: 'Dr. Vikram Singh',
      date: '28-Jul-2026',
      withdrawalEnd: '08-Aug-2026',
      status: 'Active',
      badge: 'success',
    },
    {
      animalId: '#TAG-0112',
      species: 'Cattle',
      farm: 'Amrit Sarovar Dairy',
      drug: 'Ivermectin',
      dosage: '25 ml SC',
      vet: 'Dr. Ramesh Kumar',
      date: '25-Jul-2026',
      withdrawalEnd: '24-Aug-2026',
      status: 'Active',
      badge: 'success',
    },
    {
      animalId: '#TAG-0065',
      species: 'Sheep',
      farm: 'Himalayan Wool Farm',
      drug: 'Meloxicam Vet',
      dosage: '10 ml IM',
      vet: 'Dr. Anita Sharma',
      date: '22-Jul-2026',
      withdrawalEnd: '26-Jul-2026',
      status: 'Completed',
      badge: 'info',
    },
  ];

  // Table 2: Withdrawal Alert Table (5 realistic rows)
  const withdrawalAlerts = [
    {
      animal: '#TAG-0065 (Sheep)',
      drug: 'Meloxicam Vet',
      ends: '02-Aug-2026',
      daysRemaining: '2 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'High',
      badge: 'danger',
    },
    {
      animal: '#TAG-0042 (Cattle)',
      drug: 'Oxytetracycline',
      ends: '07-Aug-2026',
      daysRemaining: '7 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'High',
      badge: 'danger',
    },
    {
      animal: '#TAG-0018 (Buffalo)',
      drug: 'Amoxicillin',
      ends: '05-Aug-2026',
      daysRemaining: '5 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'Medium',
      badge: 'warning',
    },
    {
      animal: '#TAG-0091 (Goat)',
      drug: 'Enrofloxacin',
      ends: '08-Aug-2026',
      daysRemaining: '8 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'Medium',
      badge: 'warning',
    },
    {
      animal: '#TAG-0134 (Buffalo)',
      drug: 'Tylosin Vet',
      ends: '10-Aug-2026',
      daysRemaining: '10 Days',
      saleAllowed: 'NO (Withheld)',
      priority: 'Medium',
      badge: 'warning',
    },
  ];

  // Table 3: Laboratory Results (5 realistic records)
  const laboratoryResults = [
    {
      sampleId: 'LAB-8819',
      animalId: '#TAG-0018',
      drugTested: 'Oxytetracycline',
      level: '0.02 ppm',
      limit: '0.10 ppm',
      status: 'Compliant',
      badge: 'success',
      lab: 'NIC Central Vet Lab',
      date: '31-Jul-2026',
    },
    {
      sampleId: 'LAB-8814',
      animalId: '#TAG-0034',
      drugTested: 'Enrofloxacin',
      level: '0.14 ppm',
      limit: '0.10 ppm',
      status: 'Non-Compliant',
      badge: 'danger',
      lab: 'State Vet Residue Lab',
      date: '30-Jul-2026',
    },
    {
      sampleId: 'LAB-8810',
      animalId: '#TAG-0055',
      drugTested: 'Amoxicillin',
      level: '0.01 ppm',
      limit: '0.05 ppm',
      status: 'Compliant',
      badge: 'success',
      lab: 'NDRI Food Safety Lab',
      date: '29-Jul-2026',
    },
    {
      sampleId: 'LAB-8809',
      animalId: '#TAG-0042',
      drugTested: 'Tylosin',
      level: '0.03 ppm',
      limit: '0.10 ppm',
      status: 'Compliant',
      badge: 'success',
      lab: 'NIC Central Vet Lab',
      date: '29-Jul-2026',
    },
    {
      sampleId: 'LAB-8805',
      animalId: '#TAG-0082',
      drugTested: 'Sulfadimidine',
      level: '0.02 ppm',
      limit: '0.10 ppm',
      status: 'Compliant',
      badge: 'success',
      lab: 'State Vet Residue Lab',
      date: '28-Jul-2026',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
      {/* Dashboard Header - Exact Specification */}
      <div className="page-header">
        <div>
          <h1>AgriShield Enterprise Dashboard</h1>
          <p className="subtitle">
            Real-time monitoring of antimicrobial usage, livestock health, veterinary treatments, and Maximum Residue Limit (MRL) compliance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              background: '#E8F5E9',
              color: '#2E7D32',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #C8E6C9',
            }}
          >
            <i className="fa fa-check-circle" style={{ marginRight: '6px' }}></i>
            Govt. Digital Service • Live Surveillance
          </span>
          <Link href="/farms" className="btn-primary" style={{ padding: '7px 14px', fontSize: '0.78rem' }}>
            <i className="fa fa-plus"></i> Register Farm / Livestock
          </Link>
        </div>
      </div>

      {/* Top Row of Six Modern Metric KPI Cards */}
      <div className="stats-grid-6">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Registered Farms</span>
            <div className="stat-icon" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
              <i className="fa fa-home"></i>
            </div>
          </div>
          <div className="stat-value">128</div>
          <div className="stat-trend trend-up">
            <i className="fa fa-arrow-up"></i> +4.2% this month
          </div>
          <div className="stat-description">Active production centers</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Livestock Registered</span>
            <div className="stat-icon" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
              <i className="fa fa-paw"></i>
            </div>
          </div>
          <div className="stat-value">4,562</div>
          <div className="stat-trend trend-up">
            <i className="fa fa-arrow-up"></i> +12.8% herd growth
          </div>
          <div className="stat-description">Tagged RFID registry</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Active Treatments</span>
            <div className="stat-icon" style={{ background: '#DBEAFE', color: '#2563EB' }}>
              <i className="fa fa-stethoscope"></i>
            </div>
          </div>
          <div className="stat-value">312</div>
          <div className="stat-trend trend-info">
            <i className="fa fa-arrow-down"></i> -3.5% vs last month
          </div>
          <div className="stat-description">Veterinary regimens</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Withdrawal Alerts</span>
            <div className="stat-icon" style={{ background: '#FEF3C7', color: '#F59E0B' }}>
              <i className="fa fa-bell-o"></i>
            </div>
          </div>
          <div className="stat-value">23</div>
          <div className="stat-trend trend-warning">
            <i className="fa fa-exclamation-triangle"></i> +2 new today
          </div>
          <div className="stat-description">Requires withholding</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">MRL Compliance</span>
            <div className="stat-icon" style={{ background: '#DCFCE7', color: '#22C55E' }}>
              <i className="fa fa-shield"></i>
            </div>
          </div>
          <div className="stat-value" style={{ color: '#2E7D32' }}>95%</div>
          <div className="stat-trend trend-up">
            <i className="fa fa-arrow-up"></i> +1.5% improvement
          </div>
          <div className="stat-description">Below residue limit</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Veterinary Prescriptions</span>
            <div className="stat-icon" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
              <i className="fa fa-file-text-o"></i>
            </div>
          </div>
          <div className="stat-value">256</div>
          <div className="stat-trend trend-up">
            <i className="fa fa-arrow-up"></i> +18.4% this month
          </div>
          <div className="stat-description">Digital e-prescriptions</div>
        </div>
      </div>

      {/* Main Workspace Layout: Main Analytics & Tables (72%) + Right Sidebar Widgets (28%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr', gap: '18px', alignItems: 'start' }}>
        {/* LEFT COLUMN: Main Analytics & Tables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Main Analytics Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            {/* Large Line Chart: Monthly Antimicrobial Usage (Last 12 Months) */}
            <div className="enterprise-card" style={{ height: '280px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.94rem' }}>Monthly Antimicrobial Usage</h3>
                  <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>Last 12 Months • Interactive Green Line</span>
                </div>
                <span className="badge success">Govt. Index</span>
              </div>
              <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyAmuData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: '0.72rem', fill: '#6B7280' }} />
                    <YAxis tickLine={false} axisLine={false} style={{ fontSize: '0.72rem', fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '0.75rem' }} />
                    <Legend verticalAlign="top" height={24} iconType="circle" />
                    <Line type="monotone" dataKey="amuUnits" stroke="#2E7D32" strokeWidth={2.5} name="AMU Units (mg/kg)" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="treatments" stroke="#2563EB" strokeWidth={2} name="Treatments Recorded" dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart: Livestock Distribution */}
            <div className="enterprise-card" style={{ height: '280px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.94rem' }}>Livestock Distribution</h3>
                  <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>Cattle, Buffalo, Goat, Sheep &amp; Pig (5 Species)</span>
                </div>
                <span className="badge info">4,562 Head</span>
              </div>
              <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={livestockDistribution}
                      cx="50%"
                      cy="46%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {livestockDistribution.map((entry, index) => (
                        <Cell key={`cell-live-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '0.75rem' }} />
                    <Legend verticalAlign="bottom" height={28} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: Monthly MRL Compliance Rate */}
            <div className="enterprise-card" style={{ height: '280px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.94rem' }}>Monthly MRL Compliance Rate</h3>
                  <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>Green Enterprise Bars • National Standards</span>
                </div>
                <span className="badge success">95% Goal</span>
              </div>
              <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mrlComplianceData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: '0.72rem', fill: '#6B7280' }} />
                    <YAxis domain={[80, 100]} tickLine={false} axisLine={false} style={{ fontSize: '0.72rem', fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '0.75rem' }} />
                    <Bar dataKey="compliance" fill="#2E7D32" radius={[4, 4, 0, 0]} maxBarSize={32} name="Compliance Rate (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Regional Heat Map: India Map (Color coded by AMU, MRL Compliance, Withdrawal Violations) */}
          <div className="enterprise-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.96rem' }}>Regional Heat Map • India State Surveillance</h3>
                <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>Color Coded by AMU Usage, MRL Compliance &amp; Withdrawal Violations</span>
              </div>
              <Link href="/maps" style={{ fontSize: '0.78rem', color: '#2E7D32', fontWeight: 600 }}>
                Full India Map &rarr;
              </Link>
            </div>

            {/* State Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
              {indiaRegionalData.map((reg) => (
                <div key={reg.state} className="state-pill">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '2px',
                        background: reg.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontWeight: 700, color: '#111827' }}>{reg.state}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>AMU: {reg.amuStatus}</span>
                    <span style={{ fontWeight: 700, color: reg.color }}>{reg.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="enterprise-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.96rem' }}>Recent Activity Timeline</h3>
                <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>Veterinary Regulatory Audit Logs • Real-time Timestamps</span>
              </div>
              <Link href="/audit" style={{ fontSize: '0.78rem', color: '#2E7D32', fontWeight: 600 }}>
                Full Audit Trail &rarr;
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '8px 10px',
                    borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: act.color,
                      flexShrink: 0,
                    }}
                  >
                    <i className={act.icon}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#111827' }}>{act.title}</span>
                      <span style={{ fontSize: '0.68rem', color: '#6B7280' }}>{act.time}</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#4B5563', marginTop: '2px' }}>{act.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3-Column Enterprise Dashboard Layout: Recent Treatment Records | Upcoming Withdrawal Alerts | Latest Laboratory Results */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '16px',
              width: '100%',
              alignItems: 'start',
            }}
          >
            {/* LEFT COLUMN: Recent Treatment Records */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(17, 24, 39, 0.04)',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#111827' }}>Recent Treatment Records</h3>
                  <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>5 Veterinary Regimens</span>
                </div>
                <span className="badge success">Live Feed</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '7px 8px' }}>Animal ID</th>
                      <th style={{ padding: '7px 8px' }}>Species</th>
                      <th style={{ padding: '7px 8px' }}>Farm Name</th>
                      <th style={{ padding: '7px 8px' }}>Drug Used</th>
                      <th style={{ padding: '7px 8px' }}>Dosage</th>
                      <th style={{ padding: '7px 8px' }}>Veterinarian</th>
                      <th style={{ padding: '7px 8px' }}>Treatment Date</th>
                      <th style={{ padding: '7px 8px' }}>Withdrawal End Date</th>
                      <th style={{ padding: '7px 8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatmentRecords.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '7px 8px', fontWeight: 700, color: '#111827' }}>{item.animalId}</td>
                        <td style={{ padding: '7px 8px' }}>{item.species}</td>
                        <td style={{ padding: '7px 8px', color: '#4B5563' }}>{item.farm}</td>
                        <td style={{ padding: '7px 8px', fontWeight: 600, color: '#111827' }}>{item.drug}</td>
                        <td style={{ padding: '7px 8px' }}>{item.dosage}</td>
                        <td style={{ padding: '7px 8px' }}>{item.vet}</td>
                        <td style={{ padding: '7px 8px' }}>{item.date}</td>
                        <td style={{ padding: '7px 8px', fontWeight: 600, color: item.status === 'Active' ? '#F59E0B' : '#6B7280' }}>
                          {item.withdrawalEnd}
                        </td>
                        <td style={{ padding: '7px 8px' }}>
                          <span className={`badge ${item.badge}`}>{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CENTER COLUMN: Upcoming Withdrawal Alerts */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(17, 24, 39, 0.04)',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#111827' }}>Upcoming Withdrawal Alerts</h3>
                  <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>5 Active MRL Alerts</span>
                </div>
                <span className="badge danger">Priority Queue</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '7px 8px' }}>Animal ID</th>
                      <th style={{ padding: '7px 8px' }}>Drug</th>
                      <th style={{ padding: '7px 8px' }}>Withdrawal Ends</th>
                      <th style={{ padding: '7px 8px' }}>Days Remaining</th>
                      <th style={{ padding: '7px 8px' }}>Sale Allowed</th>
                      <th style={{ padding: '7px 8px' }}>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalAlerts.map((w, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '7px 8px', fontWeight: 700, color: '#111827' }}>{w.animal}</td>
                        <td style={{ padding: '7px 8px', fontWeight: 600, color: '#111827' }}>{w.drug}</td>
                        <td style={{ padding: '7px 8px' }}>{w.ends}</td>
                        <td style={{ padding: '7px 8px', fontWeight: 700, color: w.priority === 'High' ? '#EF4444' : '#F59E0B' }}>
                          {w.daysRemaining}
                        </td>
                        <td style={{ padding: '7px 8px' }}>
                          <span className="badge danger">{w.saleAllowed}</span>
                        </td>
                        <td style={{ padding: '7px 8px' }}>
                          <span className={`badge ${w.badge}`}>{w.priority} Priority</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT COLUMN: Latest Laboratory Results */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(17, 24, 39, 0.04)',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#111827' }}>Latest Laboratory Results</h3>
                  <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>5 HPLC Testing Records</span>
                </div>
                <span className="badge success">Verified Labs</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '7px 8px' }}>Sample ID</th>
                      <th style={{ padding: '7px 8px' }}>Animal ID</th>
                      <th style={{ padding: '7px 8px' }}>Drug Tested</th>
                      <th style={{ padding: '7px 8px' }}>Residue Level</th>
                      <th style={{ padding: '7px 8px' }}>MRL Limit</th>
                      <th style={{ padding: '7px 8px' }}>Status</th>
                      <th style={{ padding: '7px 8px' }}>Laboratory</th>
                      <th style={{ padding: '7px 8px' }}>Report Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laboratoryResults.map((l, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '7px 8px', fontWeight: 700, color: '#2563EB' }}>{l.sampleId}</td>
                        <td style={{ padding: '7px 8px', fontWeight: 600 }}>{l.animalId}</td>
                        <td style={{ padding: '7px 8px', color: '#111827' }}>{l.drugTested}</td>
                        <td style={{ padding: '7px 8px', fontWeight: 700, color: l.status === 'Non-Compliant' ? '#EF4444' : '#22C55E' }}>
                          {l.level}
                        </td>
                        <td style={{ padding: '7px 8px' }}>{l.limit}</td>
                        <td style={{ padding: '7px 8px' }}>
                          <span className={`badge ${l.badge}`}>{l.status}</span>
                        </td>
                        <td style={{ padding: '7px 8px', color: '#4B5563' }}>{l.lab}</td>
                        <td style={{ padding: '7px 8px' }}>{l.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Right Sidebar Widgets (Compliance Score, Today's Alerts, Pending Vet Approvals, Notifications, Upcoming Vaccinations, Quick Actions, System Status) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Widget 1: Compliance Score */}
          <div className="widget-card">
            <div className="widget-title">
              <span>Compliance Score</span>
              <span className="badge success">95% Goal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '6px 0' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  border: '6px solid #2E7D32',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  color: '#2E7D32',
                  background: '#E8F5E9',
                  flexShrink: 0,
                }}
              >
                95%
              </div>
              <div>
                <span className="badge success">Excellent Compliance</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.74rem' }}>
                  Below Residue Limit across 128 registered farms.
                </p>
              </div>
            </div>
          </div>

          {/* Widget 2: Quick Actions */}
          <div className="widget-card">
            <div className="widget-title">
              <span>Quick Actions</span>
              <i className="fa fa-flash" style={{ color: '#2E7D32' }}></i>
            </div>
            <div className="quick-actions-grid">
              <Link href="/farms" className="quick-action-btn">
                <div className="quick-action-icon">
                  <i className="fa fa-home"></i>
                </div>
                <span>Add Farm</span>
              </Link>

              <Link href="/farms?tab=registry" className="quick-action-btn">
                <div className="quick-action-icon">
                  <i className="fa fa-paw"></i>
                </div>
                <span>Register Animal</span>
              </Link>

              <Link href="/amu" className="quick-action-btn">
                <div className="quick-action-icon">
                  <i className="fa fa-medkit"></i>
                </div>
                <span>Create Treatment Record</span>
              </Link>

              <Link href="/alerts" className="quick-action-btn">
                <div className="quick-action-icon">
                  <i className="fa fa-flask"></i>
                </div>
                <span>Upload Lab Report</span>
              </Link>

              <Link href="/amu?tab=prescriptions" className="quick-action-btn">
                <div className="quick-action-icon">
                  <i className="fa fa-check-square-o"></i>
                </div>
                <span>Approve Prescription</span>
              </Link>

              <button type="button" onClick={() => alert('Generating National Compliance Report...')} className="quick-action-btn">
                <div className="quick-action-icon">
                  <i className="fa fa-file-pdf-o"></i>
                </div>
                <span>Generate Report</span>
              </button>
            </div>
          </div>

          {/* Widget 3: Today's Alerts */}
          <div className="widget-card">
            <div className="widget-title">
              <span>Today&apos;s Alerts</span>
              <Link href="/alerts" style={{ fontSize: '0.74rem', color: '#2E7D32', fontWeight: 600 }}>
                View All &rarr;
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {todaysAlerts.map((alertItem) => (
                <div
                  key={alertItem.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    background: '#FAFAFA',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#111827' }}>
                      {alertItem.type}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                      {alertItem.text}
                    </div>
                  </div>
                  <span className={`badge ${alertItem.badge}`}>
                    {alertItem.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 4: Pending Veterinary Approvals */}
          <div className="widget-card">
            <div className="widget-title">
              <span>Pending Veterinary Approvals</span>
              <span className="badge info">3 Pending</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingApprovals.map((pa) => (
                <div
                  key={pa.id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    background: '#F9FAFB',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#111827' }}>{pa.vet}</span>
                    <span style={{ fontSize: '0.68rem', color: '#6B7280' }}>{pa.time}</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#2E7D32', marginTop: '2px' }}>
                    {pa.drug}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '1px' }}>
                    Herd: {pa.herd}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 5: Upcoming Vaccinations */}
          <div className="widget-card">
            <div className="widget-title">
              <span>Upcoming Vaccinations</span>
              <Link href="/animals" style={{ fontSize: '0.74rem', color: '#2E7D32', fontWeight: 600 }}>
                Calendar &rarr;
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingVaccinations.map((vac) => (
                <div
                  key={vac.id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    background: '#F9FAFB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#111827' }}>{vac.vaccine}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{vac.target} • {vac.date}</div>
                  </div>
                  <span className="badge success">{vac.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 6: System Status */}
          <div className="widget-card" style={{ background: '#F8FAFC' }}>
            <div className="widget-title">
              <span>System Status</span>
              <span className="badge success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }}></span>
                Operational
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#4B5563' }}>
              AgriShield NIC e-Governance Cloud • 99.98% Uptime • Live RFID Database Sync Active.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
