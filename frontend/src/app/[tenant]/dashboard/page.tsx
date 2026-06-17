'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Server,
  Layers,
  ChevronRight,
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
  const tenantId = (params?.tenant as string) || 'acme-corp';

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

  // SVG circular dial parameters
  const radius = 55;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-8 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Upper Navigation Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 mb-8">
        <div>
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>B2B Compliance Hub</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-zinc-500">Workspace</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            {tenantId.toUpperCase()} Compliance Dashboard
          </h1>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse" />
            <span className="text-zinc-300 font-medium">AWS OIDC Connected</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-sm font-semibold flex items-center">
            <Shield className="w-4 h-4 mr-2 text-emerald-400" />
            <span>SOC 2 & ISO Scope</span>
          </div>
        </div>
      </header>

      {/* Primary Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column: Health score and Trends */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Compliance Overview Ring Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center relative shadow-lg">
              <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-4 self-start">
                Overall Posture Score
              </h3>
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="absolute w-full h-full transform -rotate-90">
                  {/* Track ring */}
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-zinc-800 fill-none"
                    strokeWidth={strokeWidth}
                  />
                  {/* Score ring */}
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-emerald-500 fill-none transition-all duration-1000 ease-out"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="flex flex-col items-center">
                  <span
                    id="health-score-indicator"
                    className="text-4xl font-extrabold tracking-tight"
                  >
                    {score}%
                  </span>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                    Health
                  </span>
                </div>
              </div>
              {/* Dynamic compliance status badge */}
              <div className="mt-4">
                {passed ? (
                  <span
                    id="compliance-status-badge"
                    className="inline-flex items-center px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    COMPLIANT
                  </span>
                ) : (
                  <span
                    id="compliance-status-badge"
                    className="inline-flex items-center px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-full"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    NON-COMPLIANT
                  </span>
                )}
              </div>
            </div>

            {/* Posture Trend Metric Line/Area Chart */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 md:col-span-2 flex flex-col shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                  6-Month Compliance Trend
                </h3>
                <span className="text-zinc-400 text-xs font-mono flex items-center">
                  <Activity className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Posture Trend +{score - trendData[0].score}%
                </span>
              </div>
              <div className="flex-1 min-h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} domain={[50, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#a1a1aa', fontSize: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#scoreGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Audit Playback Terminal Integration */}
          <div className="w-full">
            <AuditTerminal
              tenantId={tenantId}
              onAuditComplete={handleAuditComplete}
              onScanAttempt={handleScanAttempt}
            />
          </div>
        </div>

        {/* Right Column: Framework checklist inspector */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col">
          <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-4">
            Security Framework Coverage
          </h3>
          <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
            Select a compliance framework below to inspect active controls, gaps, and audit
            remediation steps.
          </p>

          {/* Framework tabs list */}
          <div className="space-y-3 mb-6">
            {frameworks.map((fw) => {
              const isActive = fw.id === activeFrameworkId;
              const hasFailing = fw.failingCount > 0;
              return (
                <button
                  key={fw.id}
                  onClick={() => setActiveFrameworkId(fw.id)}
                  className={`w-full text-left p-4 border rounded-xl flex items-center justify-between transition duration-200 ${
                    isActive
                      ? 'bg-zinc-800/50 border-zinc-700 shadow-md'
                      : 'bg-zinc-900 border-zinc-800/80 hover:bg-zinc-800/20 hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-zinc-800' : 'bg-zinc-950'}`}>
                      {fw.id === 'HIPAA' ? (
                        <Server className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Layers className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-200">{fw.name}</h4>
                      <p className="text-[11px] text-zinc-500">
                        {fw.passedCount}/{fw.controlsCount} Controls Passed
                      </p>
                    </div>
                  </div>
                  <div>
                    {hasFailing ? (
                      <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded">
                        {fw.failingCount} FAILING
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">
                        PASSED
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active framework checklist inspector */}
          <div className="flex-1 bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 overflow-y-auto max-h-[350px]">
            <div className="mb-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                {activeFramework.name} Control Breakdown
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                {activeFramework.description}
              </p>
            </div>
            <div className="space-y-2">
              {activeFramework.controls.map((control) => (
                <div
                  key={control.id}
                  className="flex items-start justify-between p-3 bg-zinc-900/40 border border-zinc-800/50 rounded-lg text-xs"
                >
                  <div className="space-y-1 pr-2">
                    <span className="font-mono font-bold text-zinc-400">{control.id}</span>
                    <p className="text-zinc-300 font-medium leading-relaxed">{control.title}</p>
                  </div>
                  <div>
                    {control.status === 'PASSED' ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">
                        Passed
                      </span>
                    ) : (
                      <div className="flex flex-col items-end space-y-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded">
                          Failed
                        </span>
                        {control.severity && (
                          <span className="text-[10px] text-zinc-500 font-semibold flex items-center uppercase">
                            <AlertTriangle className="w-2.5 h-2.5 mr-1 text-amber-500" />
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
      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
    </div>
  );
}
