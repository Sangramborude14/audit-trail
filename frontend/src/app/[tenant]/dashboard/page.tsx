'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Server,
  Layers,
  ChevronRight,
  Key,
  Code,
  Terminal,
  Settings,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AuditTerminal } from '@/components/AuditTerminal';
import { OidcSimulator } from '@/components/OidcSimulator';
import { DriftDetector } from '@/components/DriftDetector';
import { PolicyGuard } from '@/components/PolicyGuard';
import { getTenantUsage, isQuotaExhausted, type BillingUsage } from '@/lib/billing';
import { UpgradeModal } from '@/components/UpgradeModal';

// Mock trend history
const initialTrendData = [
  { month: 'Jan', score: 62 },
  { month: 'Feb', score: 65 },
  { month: 'Mar', score: 71 },
  { month: 'Apr', score: 75 },
  { month: 'May', score: 78 },
  { month: 'Jun', score: 86 },
];

interface ControlItem {
  id: string;
  title: string;
  status: 'PASSED' | 'FAILED' | 'NOT_APPLICABLE';
  severity?: 'Low' | 'Medium' | 'High';
}

interface Framework {
  id: string;
  name: string;
  description: string;
  controlsCount: number;
  passedCount: number;
  failingCount: number;
  controls: ControlItem[];
}

const initialFrameworks: Framework[] = [
  {
    id: 'SOC2',
    name: 'SOC 2 Type II',
    description:
      'Trust Services Criteria for Security, Availability, Processing Integrity, and Confidentiality.',
    controlsCount: 12,
    passedCount: 9,
    failingCount: 3,
    controls: [
      { id: 'CC6.1', title: 'Logical Access Controls', status: 'PASSED' },
      {
        id: 'CC6.2',
        title: 'User Registration and Access Modification',
        status: 'PASSED',
      },
      {
        id: 'CC6.3',
        title: 'Credential Access Authorization',
        status: 'PASSED',
      },
      {
        id: 'CC7.1',
        title: 'Vulnerability Management System',
        status: 'FAILED',
        severity: 'High',
      },
      {
        id: 'CC7.2',
        title: 'Intrusion Detection and Mitigation',
        status: 'FAILED',
        severity: 'Medium',
      },
      { id: 'CC7.3', title: 'Incident Response Playbook', status: 'PASSED' },
      { id: 'CC8.1', title: 'Change Management Procedures', status: 'PASSED' },
      {
        id: 'CC9.1',
        title: 'Business Continuity Planning',
        status: 'FAILED',
        severity: 'Low',
      },
    ],
  },
  {
    id: 'ISO27001',
    name: 'ISO/IEC 27001:2022',
    description: 'International standard for Information Security Management Systems (ISMS).',
    controlsCount: 14,
    passedCount: 11,
    failingCount: 3,
    controls: [
      { id: 'A.5.15', title: 'Access Control Policy', status: 'PASSED' },
      { id: 'A.8.12', title: 'Data Leakage Prevention', status: 'PASSED' },
      {
        id: 'A.8.15',
        title: 'Logging and Monitoring Logs',
        status: 'FAILED',
        severity: 'High',
      },
      { id: 'A.8.20', title: 'Network Security Management', status: 'PASSED' },
      {
        id: 'A.8.24',
        title: 'Use of Cryptographic Controls',
        status: 'FAILED',
        severity: 'Medium',
      },
      {
        id: 'A.8.31',
        title: 'Securing Software Development',
        status: 'PASSED',
      },
    ],
  },
  {
    id: 'HIPAA',
    name: 'HIPAA Security Rule',
    description:
      "National standards to protect individuals' electronic personal health information (ePHI).",
    controlsCount: 8,
    passedCount: 8,
    failingCount: 0,
    controls: [
      {
        id: '164.308(a)(1)',
        title: 'Security Management Process',
        status: 'PASSED',
      },
      {
        id: '164.308(a)(3)',
        title: 'Workforce Security Controls',
        status: 'PASSED',
      },
      {
        id: '164.308(a)(4)',
        title: 'Information Access Isolation',
        status: 'PASSED',
      },
      { id: '164.312(a)(1)', title: 'Unique Access Controls', status: 'PASSED' },
      {
        id: '164.312(b)',
        title: 'Audit Controls Implementation',
        status: 'PASSED',
      },
    ],
  },
];

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = (params?.tenant as string) || 'acme-corp';

  // Navigation menu selection
  const [activeMenu, setActiveMenu] = useState<
    'overview' | 'policy-guard' | 'oidc-sandbox' | 'drift-detector'
  >('overview');

  // Overview dashboard state
  const [score, setScore] = useState(86);
  const [passed, setPassed] = useState(true);
  const [trendData, setTrendData] = useState(initialTrendData);
  const [frameworks, setFrameworks] = useState<Framework[]>(initialFrameworks);
  const [activeFrameworkId, setActiveFrameworkId] = useState('SOC2');

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null);

  React.useEffect(() => {
    getTenantUsage(tenantId).then((usage) => {
      setBillingUsage(usage);
    });
  }, [tenantId]);

  const handleScanAttempt = (): boolean => {
    if (billingUsage && isQuotaExhausted(billingUsage)) {
      setIsUpgradeModalOpen(true);
      return false;
    }
    return true;
  };

  const activeFramework = frameworks.find((f) => f.id === activeFrameworkId) || frameworks[0];

  const handleAuditComplete = (newScore: number, hasPassed: boolean) => {
    setScore(newScore);
    setPassed(hasPassed);

    // Append new score to trend data
    setTrendData((prev) => [...prev, { month: 'Jul', score: newScore }]);

    // If audit passed, update all framework controls to PASSED
    if (hasPassed) {
      setFrameworks((prevFrameworks) =>
        prevFrameworks.map((f) => ({
          ...f,
          passedCount: f.controlsCount,
          failingCount: 0,
          controls: f.controls.map((c) => ({ ...c, status: 'PASSED' })),
        }))
      );
    } else {
      // If audit failed, inject failure logs into the active framework
      setFrameworks((prevFrameworks) =>
        prevFrameworks.map((f) => {
          if (f.id === activeFrameworkId) {
            return {
              ...f,
              passedCount: Math.max(0, f.passedCount - 1),
              failingCount: f.failingCount + 1,
              controls: [
                {
                  id: 'NEW.FAIL',
                  title: 'Unencrypted volume storage detected in configuration',
                  status: 'FAILED',
                  severity: 'High',
                },
                ...f.controls,
              ],
            };
          }
          return f;
        })
      );
    }
  };

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/${e.target.value}/dashboard`);
  };

  // SVG circular dial parameters
  const radius = 48;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30 selection:text-indigo-300 antialiased">
      {/* 1. Left Sidebar Navigation (Render.com Style) */}
      <aside className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between md:sticky md:top-0 md:h-screen shrink-0 z-20">
        <div className="flex flex-col">
          {/* Logo & Platform Title */}
          <div className="h-16 px-6 border-b border-zinc-850 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-indigo-650 rounded-lg text-white">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white uppercase">
                AuditTrail
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 font-semibold rounded">
              v1.0
            </span>
          </div>

          {/* Workspace Switcher */}
          <div className="p-4 border-b border-zinc-850">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 font-mono">
              Workspace Context
            </label>
            <select
              value={tenantId}
              onChange={handleWorkspaceChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-3 py-2 focus:outline-none focus:border-zinc-700 font-semibold cursor-pointer"
            >
              <option value="acme-corp">acme-corp (Premium)</option>
              <option value="acme-free">acme-free (Free)</option>
            </select>
          </div>

          {/* Sidebar Menu Options */}
          <nav className="p-3 space-y-1.5">
            <button
              onClick={() => setActiveMenu('overview')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeMenu === 'overview'
                  ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 rounded-l-none pl-2.5'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveMenu('policy-guard')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeMenu === 'policy-guard'
                  ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 rounded-l-none pl-2.5'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/50'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>IAM Policy Guard</span>
            </button>
            <button
              onClick={() => setActiveMenu('oidc-sandbox')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeMenu === 'oidc-sandbox'
                  ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 rounded-l-none pl-2.5'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/50'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>OIDC Trust Sandbox</span>
            </button>
            <button
              onClick={() => setActiveMenu('drift-detector')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeMenu === 'drift-detector'
                  ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 rounded-l-none pl-2.5'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Cloud Drift Detector</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Billing & Limits */}
        <div className="p-4 border-t border-zinc-850 bg-zinc-950/20">
          <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl flex flex-col space-y-2 text-[11px] leading-relaxed">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] font-mono">
                Scan Quota
              </span>
              <span className="text-zinc-300 font-bold font-mono">
                {billingUsage ? `${billingUsage.scanCount}/${billingUsage.scanLimit}` : '0/0'}
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-305 ${
                  billingUsage && isQuotaExhausted(billingUsage) ? 'bg-rose-500' : 'bg-indigo-500'
                }`}
                style={{
                  width: billingUsage
                    ? `${(billingUsage.scanCount / billingUsage.scanLimit) * 100}%`
                    : '0%',
                }}
              />
            </div>
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="w-full mt-1.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold rounded-lg text-[10px] transition cursor-pointer"
            >
              Manage Billing Plan
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Area (Render.com Style Workspace) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Top Header */}
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-semibold select-none font-mono">
            <span>Workspaces</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-zinc-300 font-bold">{tenantId}</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-indigo-400 capitalize">{activeMenu.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 bg-zinc-900/50 border border-zinc-850 px-3.5 py-1.5 rounded-lg text-xs">
              <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse" />
              <span className="text-zinc-400 font-medium font-mono">
                AWS OIDC Connection Active
              </span>
            </div>
            <HelpCircle className="w-5 h-5 text-zinc-500 hover:text-zinc-300 transition cursor-pointer" />
          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {(() => {
            switch (activeMenu) {
              case 'overview':
                return (
                  <div className="space-y-6">
                    {/* Primary Dashboard Overview Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                      {/* Left Column: Health Score Ring & Trend Chart */}
                      <div className="lg:col-span-8 flex flex-col space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          {/* Compliance Health Score Card */}
                          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center relative shadow-sm min-h-[220px]">
                            <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-4 self-start font-mono">
                              Posture Health Score
                            </h3>
                            <div className="relative w-32 h-32 flex items-center justify-center">
                              <svg className="absolute w-full h-full transform -rotate-90">
                                <circle
                                  cx="64"
                                  cy="64"
                                  r={radius}
                                  className="stroke-zinc-800 fill-none"
                                  strokeWidth={strokeWidth}
                                />
                                <circle
                                  cx="64"
                                  cy="64"
                                  r={radius}
                                  className="stroke-indigo-500 fill-none transition-all duration-1000 ease-out"
                                  strokeWidth={strokeWidth}
                                  strokeDasharray={circumference}
                                  strokeDashoffset={strokeDashoffset}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="flex flex-col items-center">
                                <span
                                  id="health-score-indicator"
                                  className="text-3xl font-extrabold tracking-tight text-white font-mono"
                                >
                                  {score}%
                                </span>
                                <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider mt-0.5">
                                  Score
                                </span>
                              </div>
                            </div>
                            <div className="mt-3">
                              {passed ? (
                                <span
                                  id="compliance-status-badge"
                                  className="inline-flex items-center px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full"
                                >
                                  COMPLIANT
                                </span>
                              ) : (
                                <span
                                  id="compliance-status-badge"
                                  className="inline-flex items-center px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded-full"
                                >
                                  NON-COMPLIANT
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Historical Compliance Trend Chart */}
                          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 sm:col-span-2 flex flex-col justify-between shadow-sm min-h-[220px]">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider font-mono">
                                6-Month Posture Trend
                              </h3>
                              <span className="text-zinc-400 text-xs font-mono flex items-center">
                                <TrendingUp className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                                {score - trendData[0].score}% Growth
                              </span>
                            </div>
                            <div className="flex-1 min-h-[120px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                  data={trendData}
                                  margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                                >
                                  <defs>
                                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1f1f23"
                                    vertical={false}
                                  />
                                  <XAxis
                                    dataKey="month"
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                  />
                                  <YAxis
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    domain={[50, 100]}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: '#09090b',
                                      border: '1px solid #1f1f23',
                                      borderRadius: '8px',
                                    }}
                                    labelStyle={{ color: '#71717a', fontSize: '11px' }}
                                    itemStyle={{ color: '#fff', fontSize: '11px' }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#scoreGradient)"
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>

                        {/* Audit Terminal Console */}
                        <div className="w-full">
                          <AuditTerminal
                            tenantId={tenantId}
                            onAuditComplete={handleAuditComplete}
                            onScanAttempt={handleScanAttempt}
                          />
                        </div>
                      </div>

                      {/* Right Column: Framework checklist inspector */}
                      <div className="lg:col-span-4 bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col min-h-[480px]">
                        <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">
                          Security Framework Coverage
                        </h3>
                        <p className="text-[11px] text-zinc-500 mb-5 leading-normal">
                          Select framework standard to trace compliance items.
                        </p>

                        {/* Framework select buttons */}
                        <div className="space-y-2 mb-4">
                          {frameworks.map((fw) => {
                            const isActive = fw.id === activeFrameworkId;
                            const hasFailing = fw.failingCount > 0;
                            return (
                              <button
                                key={fw.id}
                                onClick={() => setActiveFrameworkId(fw.id)}
                                className={`w-full text-left p-3 border rounded-xl flex items-center justify-between transition duration-200 cursor-pointer ${
                                  isActive
                                    ? 'bg-zinc-950 border-zinc-850 shadow-sm'
                                    : 'bg-transparent border-zinc-850/60 hover:bg-zinc-900/40 hover:border-zinc-800'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="p-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-indigo-400">
                                    <Server className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-zinc-200">{fw.name}</h4>
                                    <p className="text-[10px] text-zinc-500 font-mono">
                                      {fw.passedCount}/{fw.controlsCount} Passed
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  {hasFailing ? (
                                    <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-bold rounded">
                                      {fw.failingCount} FAILING
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded">
                                      PASSED
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Controls breakdown viewport */}
                        <div className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl p-4 overflow-y-auto max-h-[300px]">
                          <div className="mb-4">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                              {activeFramework.name} BREAKDOWN
                            </span>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                              {activeFramework.description}
                            </p>
                          </div>
                          <div className="space-y-2">
                            {activeFramework.controls.map((control) => (
                              <div
                                key={control.id}
                                className="flex items-start justify-between p-2.5 bg-zinc-900/30 border border-zinc-850 rounded-lg text-xs"
                              >
                                <div className="space-y-0.5 pr-2">
                                  <span className="font-mono font-bold text-zinc-500 text-[10px]">
                                    {control.id}
                                  </span>
                                  <p className="text-zinc-300 font-medium leading-normal">
                                    {control.title}
                                  </p>
                                </div>
                                <div className="shrink-0">
                                  {control.status === 'PASSED' ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">
                                      Passed
                                    </span>
                                  ) : (
                                    <div className="flex flex-col items-end space-y-1">
                                      <span className="inline-flex items-center px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded">
                                        Failed
                                      </span>
                                      {control.severity && (
                                        <span className="text-[8px] text-zinc-500 font-bold uppercase flex items-center">
                                          <AlertTriangle className="w-2.5 h-2.5 mr-0.5 text-amber-500" />
                                          {control.severity}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              case 'policy-guard':
                return <PolicyGuard tenantId={tenantId} />;
              case 'oidc-sandbox':
                return <OidcSimulator />;
              case 'drift-detector':
                return <DriftDetector />;
              default:
                return null;
            }
          })()}
        </main>
      </div>

      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
    </div>
  );
}
