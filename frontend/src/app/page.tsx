'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Key,
  AlertTriangle,
  Terminal,
  ArrowRight,
  Cpu,
  Layers,
  CheckCircle,
  Sparkles,
  Lock,
  FileCode,
  Copy,
  Check,
} from 'lucide-react';
import { OidcSimulator } from '@/components/OidcSimulator';
import { DriftDetector } from '@/components/DriftDetector';
import { AuditTerminal } from '@/components/AuditTerminal';

export default function LandingPage() {
  const router = useRouter();
  const [tenantInput, setTenantInput] = useState('');
  const [activeTab, setActiveTab] = useState<'oidc' | 'drift' | 'bedrock'>('oidc');
  const [copiedSample, setCopiedSample] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tenantInput.trim()) {
      const normalizedTenant = tenantInput.trim().toLowerCase().replace(/\s+/g, '-');
      router.push(`/${normalizedTenant}/dashboard`);
    }
  };

  const samplePolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}`;

  const copySamplePolicy = () => {
    navigator.clipboard.writeText(samplePolicy);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08)_0,transparent_60%)] pointer-events-none" />
      <div className="absolute top-[800px] right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0,transparent_70%)] pointer-events-none" />

      {/* Header / Navigation */}
      <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              AuditTrail Compliance Hub
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="#sandbox"
              className="text-xs font-semibold text-zinc-400 hover:text-white transition duration-200"
            >
              Interactive Sandbox
            </a>
            <span className="text-zinc-800">|</span>
            <a
              href="#features"
              className="text-xs font-semibold text-zinc-400 hover:text-white transition duration-200"
            >
              Features
            </a>
            <a
              href="#console-access"
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-200 transition duration-200"
            >
              Console Access
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 md:py-20 w-full relative z-10 flex flex-col space-y-24">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Continuous SOC 2 & ISO 27001 Audit Automation</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Continuous Cloud Security{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Audited by AI
            </span>
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base md:text-lg leading-relaxed font-sans">
            Ditch static AWS access keys and legacy compliance spreadsheets. AuditTrail automates
            trust relationships through secure OIDC federation, monitors live cloud configuration
            drift, and validates infrastructure states using Claude 3.5 Sonnet on Amazon Bedrock.
          </p>

          {/* Tenant Login Form */}
          <div
            id="console-access"
            className="max-w-md mx-auto p-1.5 bg-zinc-900/50 border border-zinc-850 rounded-2xl shadow-2xl backdrop-blur-sm"
          >
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  placeholder="Enter Workspace ID (e.g. acme-corp)"
                  value={tenantInput}
                  onChange={(e) => setTenantInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-zinc-100 rounded-xl px-4 py-3 text-sm focus:outline-none placeholder:text-zinc-600 font-semibold"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl px-5 py-3 text-xs font-bold transition duration-250 flex items-center justify-center space-x-2 shrink-0 cursor-pointer shadow-lg shadow-emerald-950/20"
              >
                <span>Launch Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
          <p className="text-zinc-600 text-[11px] font-mono">
            Pro tip: Try entering <code className="text-zinc-500 font-bold">acme-corp</code> to
            explore our demo dashboard.
          </p>
        </section>

        {/* Sandbox Showcase Selector */}
        <section id="sandbox" className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Interactive Compliance Sandbox
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm">
              Interact with the core building blocks of the AuditTrail engine. Live, client-side,
              and zero setup required.
            </p>
          </div>

          {/* Tab Controls */}
          <div className="flex justify-center">
            <div className="bg-zinc-900 border border-zinc-850 p-1.5 rounded-xl flex space-x-1">
              <button
                onClick={() => setActiveTab('oidc')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition duration-200 flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'oidc'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>OIDC Simulation</span>
              </button>
              <button
                onClick={() => setActiveTab('drift')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition duration-200 flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'drift'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Drift Detection</span>
              </button>
              <button
                onClick={() => setActiveTab('bedrock')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition duration-200 flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'bedrock'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Bedrock AI Scan</span>
              </button>
            </div>
          </div>

          {/* Interactive Panels */}
          <div className="max-w-5xl mx-auto">
            {activeTab === 'oidc' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl text-center max-w-xl mx-auto">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Static credentials leak. Learn how our{' '}
                    <span className="font-semibold text-emerald-400">AWS OIDC Integration</span>{' '}
                    uses short-lived tokens, verifying Vercel identity endpoints directly against
                    AWS STS.
                  </p>
                </div>
                <OidcSimulator />
              </div>
            )}

            {activeTab === 'drift' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl text-center max-w-xl mx-auto">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Cloud state slips over time. Try the{' '}
                    <span className="font-semibold text-amber-400">Drift Detector</span> to identify
                    live resource changes vs baselines, and receive ready-to-run remediation
                    patches.
                  </p>
                </div>
                <DriftDetector />
              </div>
            )}

            {activeTab === 'bedrock' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Info Panel */}
                  <div className="bg-zinc-900 border border-zinc-850 p-5 rounded-xl flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Core Compliance Control
                      </span>
                      <h3 className="text-lg font-bold text-white tracking-tight mt-1">
                        Amazon Bedrock Policy Auditor
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                        Upload cloud templates (IAM JSON, Terraform configurations, Kubernetes
                        YAMLs). Claude 3.5 Sonnet performs real-time parsing, extracts vulnerability
                        gaps, and aligns findings with SOC 2 & ISO frameworks.
                      </p>
                    </div>

                    {/* Copy Sample Box */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold">
                          Sample Vulnerable IAM
                        </span>
                        <button
                          onClick={copySamplePolicy}
                          className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 transition cursor-pointer"
                        >
                          {copiedSample ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Sample</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="text-[10px] text-rose-400/90 font-mono overflow-x-auto max-h-[80px] leading-relaxed p-1.5 bg-zinc-900 rounded border border-zinc-850">
                        {samplePolicy}
                      </pre>
                      <p className="text-[9px] text-zinc-500 leading-normal">
                        Save this block to a file (e.g.{' '}
                        <code className="text-zinc-400">policy.json</code>) and upload it in the
                        terminal on the right.
                      </p>
                    </div>
                  </div>

                  {/* Terminal Display */}
                  <div className="lg:col-span-2">
                    <AuditTerminal
                      tenantId="demo-sandbox"
                      onAuditComplete={(score, passed) => {
                        console.log(
                          `Landing Page Sandbox Audit Complete: Score ${score}%, Compliant: ${passed}`
                        );
                      }}
                      onScanAttempt={() => true}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section id="features" className="space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Enterprise Grade Compliance Controls
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm">
              Continuous posture assessment built for modern Engineering and Security organizations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Control 1 */}
            <div className="bg-zinc-900/30 border border-zinc-900 p-6 rounded-2xl space-y-4 hover:border-zinc-850 hover:bg-zinc-900/50 transition duration-300">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl w-fit">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">SOC 2 & ISO Scope</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Continual mappings of dynamic architecture states against Trust Services Criteria
                and Annex A. Generates comprehensive audit evidence logs on the fly.
              </p>
            </div>

            {/* Control 2 */}
            <div className="bg-zinc-900/30 border border-zinc-900 p-6 rounded-2xl space-y-4 hover:border-zinc-850 hover:bg-zinc-900/50 transition duration-300">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl w-fit">
                <Cpu className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Bedrock Scanning Core</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Leverages specialized Anthropic Claude reasoning via secure AWS Bedrock runtime to
                check complex JSON files, Terraform templates, and logs with semantic understanding.
              </p>
            </div>

            {/* Control 3 */}
            <div className="bg-zinc-900/30 border border-zinc-900 p-6 rounded-2xl space-y-4 hover:border-zinc-850 hover:bg-zinc-900/50 transition duration-300">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl w-fit">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Automated Remediation</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Detects infrastructure configurations that fall out of baseline. Automatically
                outputs clean, runnable AWS CLI code or JSON configs to re-enable security
                standards.
              </p>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-850 rounded-3xl p-8 md:p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.03)_0,transparent_50%)] pointer-events-none" />
          <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">
            Ready to secure your cloud posture?
          </h2>
          <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
            Enter your organization's Workspace ID above or explore standard configurations.
            Integrate with your CI/CD pipelines and clouds in under 15 minutes.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => {
                document.getElementById('console-access')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-3 rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              Get Started for Free
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8 text-center text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} AuditTrail Compliance Hub. All rights reserved.</p>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-zinc-400 transition">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="#" className="hover:text-zinc-400 transition">
              Terms of Service
            </a>
            <span>•</span>
            <a href="#" className="hover:text-zinc-400 transition">
              Security Disclosure
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
