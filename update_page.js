const fs = require('fs');
const path = require('path');

const filePath = path.join('E:', 'Code', 'Livestock', 'apps', 'web-portal', 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
content = content.replace(/import React from 'react';/, "import React, { useEffect, useState } from 'react';\nimport { apiFetch } from '@/lib/api';");

// 2. Remove static data
content = content.replace(/const amuData = \[[\s\S]*?\];\s*const livestockData = \[[\s\S]*?\];\s*const recentTreatments = \[[\s\S]*?\];\s*const withdrawalAlerts = \[[\s\S]*?\];/, '');

// 3. Update component body
const componentStart = 'export default function Dashboard() {';
const componentBody = `
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalFarms: 0,
      totalAnimals: 0,
      underTreatment: 0,
      vaccinationsDue: 0,
      activeMrlAlerts: 0,
      veterinaryPrescriptions: 0
    },
    amuData: [] as any[],
    livestockData: [] as any[],
    recentTreatments: [] as any[],
    withdrawalAlerts: [] as any[],
    mrlCompliance: { total: 0, compliant: 0, nonCompliant: 0, pending: 0, percentage: 100 }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardStats, compliance, treatments, alerts] = await Promise.all([
          apiFetch('/reports/dashboard'),
          apiFetch('/reports/compliance'),
          apiFetch('/treatments'),
          apiFetch('/treatments/alerts')
        ]);

        const amuData = (dashboardStats.monthlyTreatments || []).map((m: any) => ({
          month: m.month.split(' ')[0],
          amu: Math.round(m.count * 1.5),
          treatments: m.count
        }));

        const colors: Record<string, string> = {
          'CATTLE': '#14532D',
          'BUFFALO': '#2563EB',
          'GOAT': '#F59E0B',
          'SHEEP': '#8B5CF6',
          'PIG': '#EF4444',
          'POULTRY': '#06B6D4'
        };
        const livestockData = (dashboardStats.speciesDistribution || []).map((s: any) => ({
          name: s.name.charAt(0).toUpperCase() + s.name.slice(1).toLowerCase(),
          value: s.value,
          color: colors[s.name.toUpperCase()] || '#8884d8'
        }));

        const mrlTotal = compliance.total || 0;
        const mrlCompliant = compliance.cleared || 0;
        const mrlNonCompliant = compliance.doNotSell || 0;
        const mrlPending = compliance.clearingSoon || 0;
        const mrlPercentage = mrlTotal === 0 ? 100 : Math.round((mrlCompliant / mrlTotal) * 100);

        const recentT = (treatments || []).slice(0, 5).map((t: any) => ({
          id: t.animal?.tagNumber || t.animalId.substring(0, 8),
          animalId: t.animalId,
          medicine: t.drugName,
          vet: t.veterinarianName,
          date: new Date(t.administrationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          status: new Date(t.withdrawalCompletionDate) > new Date() ? 'Active' : 'Completed'
        }));

        const wAlerts = (alerts || []).map((a: any) => {
          const latestTreatment = a.treatments?.[0];
          let daysLeft = 0;
          if (latestTreatment) {
            const diff = new Date(latestTreatment.withdrawalCompletionDate).getTime() - new Date().getTime();
            daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
          }
          return {
            id: a.tagNumber,
            animalId: a.id,
            drug: latestTreatment?.drugName || 'Unknown',
            days: \`\${daysLeft} Days\`,
            priority: daysLeft <= 3 ? 'High' : (daysLeft <= 7 ? 'Medium' : 'Low')
          };
        });

        setDashboardData({
          stats: {
            ...dashboardStats.stats,
            veterinaryPrescriptions: 0
          },
          amuData,
          livestockData,
          recentTreatments: recentT,
          withdrawalAlerts: wAlerts,
          mrlCompliance: {
            total: mrlTotal,
            compliant: mrlCompliant,
            nonCompliant: mrlNonCompliant,
            pending: mrlPending,
            percentage: mrlPercentage
          }
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-gray-900 text-lg font-bold">LivestoCare</h2>
          <p className="text-gray-500 text-sm mt-1">Loading Dashboard...</p>
        </div>
      </div>
    );
  }
`;

content = content.replace(componentStart, componentStart + '\n' + componentBody);

// 4. Update KPI links
content = content.replace(/<div key=\{idx\} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">/g, 
  '<Link href={kpi.link || "#"} key={idx} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between hover:border-green-300 transition-colors cursor-pointer block">');
content = content.replace(/<\/div>\s*\}\)\)/g, '</Link>\n        ))}');

// Replace KPI data array
content = content.replace(/\{\[\s*\{\s*label:\s*'Registered Farms'[\s\S]*?\]\.map/m, 
`{[
          { label: 'Registered Farms', value: dashboardData.stats.totalFarms.toString(), icon: Tractor, trend: 'Total', up: true, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/farms' },
          { label: 'Registered Animals', value: dashboardData.stats.totalAnimals.toString(), icon: PawPrint, trend: 'Total', up: true, color: 'text-blue-600', bg: 'bg-blue-50', link: '/animals' },
          { label: 'Active Treatments', value: dashboardData.stats.underTreatment.toString(), icon: Syringe, trend: 'Currently Active', up: false, color: 'text-indigo-600', bg: 'bg-indigo-50', link: '/treatments' },
          { label: 'Animals Under Withdrawal', value: dashboardData.stats.activeMrlAlerts.toString(), icon: AlertTriangle, trend: 'Active Alerts', up: false, color: 'text-amber-600', bg: 'bg-amber-50', link: '/withdrawal' },
          { label: 'MRL Compliance', value: \`\${dashboardData.mrlCompliance.percentage}%\`, icon: ShieldCheck, trend: 'Overall', up: true, color: 'text-green-600', bg: 'bg-green-50', link: '/reports' },
          { label: 'Veterinary Prescriptions', value: dashboardData.stats.veterinaryPrescriptions.toString(), icon: FileText, trend: 'Total', up: true, color: 'text-purple-600', bg: 'bg-purple-50', link: '/reports' }
        ].map`);

// 5. Update charts data variables
content = content.replace(/data=\{amuData\}/g, 'data={dashboardData.amuData}');
content = content.replace(/data=\{livestockData\}/g, 'data={dashboardData.livestockData}');
content = content.replace(/\{livestockData\.map/g, '{dashboardData.livestockData.map');

// 6. Fix pie chart tooltip and total
content = content.replace(/<PieChart>/, '<PieChart>\n                <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} formatter={(value: any, name: string) => [\`\${value} (\${Math.round((value as number) / dashboardData.stats.totalAnimals * 100)}%)\`, name]} />');
content = content.replace(/<div className="text-lg font-bold text-gray-900 leading-none">4,562<\/div>/, '<div className="text-lg font-bold text-gray-900 leading-none">{dashboardData.stats.totalAnimals}</div>');

// 7. Fix MRL Compliance SVG
content = content.replace(/<circle className="text-green-600 progress-ring stroke-current" strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset="12.56" transform="rotate\(-90 50 50\)"><\/circle>/, 
  '<circle className="text-green-600 progress-ring stroke-current" strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 * ((100 - dashboardData.mrlCompliance.percentage) / 100)} transform="rotate(-90 50 50)"></circle>');
content = content.replace(/<span className="text-2xl font-bold text-gray-900">95%<\/span>/, '<span className="text-2xl font-bold text-gray-900">{dashboardData.mrlCompliance.percentage}%</span>');
content = content.replace(/<span className="text-gray-900 font-bold">123<\/span>/, '<span className="text-gray-900 font-bold">{dashboardData.mrlCompliance.compliant}</span>');
content = content.replace(/<span className="text-gray-900 font-bold">3<\/span>/, '<span className="text-gray-900 font-bold">{dashboardData.mrlCompliance.nonCompliant}</span>');
content = content.replace(/<span className="text-gray-900 font-bold">2<\/span>/, '<span className="text-gray-900 font-bold">{dashboardData.mrlCompliance.pending}</span>');

// 8. Update tables data variables
content = content.replace(/\{recentTreatments\.map/g, '{dashboardData.recentTreatments.map');
content = content.replace(/\{withdrawalAlerts\.map/g, '{dashboardData.withdrawalAlerts.map');

// 9. Fix table Animal ID linking
content = content.replace(/<td className="px-4 py-3 font-semibold text-gray-900">\{t\.id\}<\/td>/, 
  '<td className="px-4 py-3 font-semibold text-gray-900"><Link href={`/animals?id=${t.animalId}`} className="hover:text-green-700 hover:underline">{t.id}</Link></td>');
content = content.replace(/<td className="px-4 py-3 font-semibold text-gray-900">\{w\.id\}<\/td>/, 
  '<td className="px-4 py-3 font-semibold text-gray-900"><Link href={`/animals?id=${w.animalId}`} className="hover:text-green-700 hover:underline">{w.id}</Link></td>');

fs.writeFileSync(filePath, content, 'utf8');
