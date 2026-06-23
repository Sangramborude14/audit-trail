'use client';

import React, { useState } from 'react';
import {
  Shield,
  Play,
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileCode,
  Check,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface Violation {
  line: number;
  message: string;
  severity: 'Low' | 'Medium' | 'High';
  remediation: string;
}

const PRESET_POLICIES = {
  WILDCARD_ADMIN: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}`,
  UNENCRYPTED_S3: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicReads",
      "Effect": "Allow",
      "Principal": "*",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::audittrail-compliance-logs/*"
    }
  ]
}`,
  IAM_ESCATION: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iam:*",
      "Resource": "*"
    }
  ]
}`,
  SECURE_BASELINE: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "IsolatedAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::audittrail-compliance-logs/*"
    }
  ]
}`,
};

export function PolicyGuard({ tenantId }: { tenantId: string }) {
  const [policyText, setPolicyText] = useState<string>(PRESET_POLICIES.WILDCARD_ADMIN);
  const [score, setScore] = useState<number | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [remediatedPolicy, setRemediatedPolicy] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedRemediated, setCopiedRemediated] = useState<boolean>(false);

  const lineCount = policyText.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, idx) => idx + 1);

  const handlePresetSelect = (presetKey: keyof typeof PRESET_POLICIES) => {
    setPolicyText(PRESET_POLICIES[presetKey]);
    setScore(null);
    setViolations([]);
    setRemediatedPolicy('');
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/audit/lint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ policyText }),
      });
      if (response.ok) {
        const data = await response.json();
        setScore(data.score);
        setViolations(data.violations || []);
        setRemediatedPolicy(data.remediatedPolicy || '');
      } else {
        const data = await response.json();
        alert(`Verification failed: ${data.error || 'Server Error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Verification request failed. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFix = () => {
    if (remediatedPolicy) {
      setPolicyText(remediatedPolicy);
      setScore(100);
      setViolations([]);
      setRemediatedPolicy('');
    }
  };

  const handleCopyRemediation = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleCopyRemediatedPolicy = () => {
    if (remediatedPolicy) {
      navigator.clipboard.writeText(remediatedPolicy);
      setCopiedRemediated(true);
      setTimeout(() => setCopiedRemediated(false), 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Details */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-900 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center">
            <Shield className="w-5 h-5 text-indigo-400 mr-2" />
            IAM Policy Guard & Linter
          </h2>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Validate permissions policies, scan for wildcard vulnerabilities, and apply automated
            remediations.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
            Load Preset:
          </span>
          <select
            onChange={(e) => handlePresetSelect(e.target.value as keyof typeof PRESET_POLICIES)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 px-3 py-1.5 focus:outline-none focus:border-zinc-700 font-medium cursor-pointer"
          >
            <option value="WILDCARD_ADMIN">Wildcard Admin Policy</option>
            <option value="UNENCRYPTED_S3">Unencrypted Public S3 Policy</option>
            <option value="IAM_ESCATION">Privilege Escalation Policy</option>
            <option value="SECURE_BASELINE">Secure Baseline Policy</option>
          </select>
        </div>
      </div>

      {/* Editor & Validation Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: Code Editor Container */}
        <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden flex flex-col min-h-[480px]">
          <div className="bg-zinc-950 border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center">
              <FileCode className="w-4 h-4 mr-2 text-zinc-500" />
              Policy Document Editor (JSON)
            </span>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition duration-205 cursor-pointer shadow-md"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{loading ? 'Analyzing...' : 'Lint Policy with AI'}</span>
            </button>
          </div>

          {/* Editor Body */}
          <div className="flex-1 flex font-mono text-xs overflow-hidden leading-relaxed select-text p-2">
            {/* Line numbers column */}
            <div className="text-zinc-600 text-right pr-3 pl-1 select-none border-r border-zinc-850 flex flex-col font-mono text-[11px] leading-[19px]">
              {lineNumbers.map((num) => (
                <div key={num} className="h-[19px]">
                  {num}
                </div>
              ))}
            </div>

            {/* Input Textarea */}
            <textarea
              value={policyText}
              onChange={(e) => setPolicyText(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none text-zinc-200 pl-4 resize-none min-h-[440px] focus:ring-0 font-mono text-[11px] leading-[19px] overflow-y-auto"
              spellCheck="false"
              placeholder="Paste AWS IAM policy here..."
            />
          </div>
        </div>

        {/* Right Side: AI Compliance feedback panel */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Default Unverified State */}
          {score === null && !loading && (
            <div className="flex-1 bg-zinc-900/20 border border-zinc-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <Shield className="w-12 h-12 text-zinc-800 mb-3" />
              <p className="text-sm font-semibold text-zinc-300">Awaiting AI Policy Analysis</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                Click "Lint Policy with AI" in the editor header to trigger AWS Bedrock security
                scanning on this policy document.
              </p>
            </div>
          )}

          {/* Loading state panel */}
          {loading && (
            <div className="flex-1 bg-zinc-900/20 border border-zinc-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
              <p className="text-sm font-semibold text-zinc-300">Auditing Policy Security</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed font-mono">
                Calling Amazon Bedrock Claude ... analyzing roles for credential leakage and
                privilege escalation.
              </p>
            </div>
          )}

          {/* Verified feedback panel */}
          {score !== null && !loading && (
            <div className="flex-1 flex flex-col space-y-6">
              {/* Score header */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                    Security Score
                  </span>
                  <h3 className="text-2xl font-extrabold text-white tracking-tight flex items-center">
                    {score}/100
                    <span className="text-xs text-zinc-500 font-normal ml-2">Rating</span>
                  </h3>
                </div>

                {/* Score Status Badge */}
                <div>
                  {score >= 90 ? (
                    <span className="inline-flex items-center px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      SECURE
                    </span>
                  ) : score >= 70 ? (
                    <span className="inline-flex items-center px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                      WARNING
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-rose-400 animate-pulse" />
                      HIGH RISK
                    </span>
                  )}
                </div>
              </div>

              {/* Violations checklist card */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex-1 flex flex-col shadow-lg max-h-[300px]">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono mb-3 block">
                  Security Violations ({violations.length})
                </span>

                {violations.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-zinc-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                    <p className="text-xs font-semibold">Zero vulnerabilities detected</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {violations.map((violation, idx) => (
                      <div
                        key={idx}
                        className="bg-zinc-950 border border-zinc-850 p-3 rounded-lg text-xs flex flex-col space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 font-mono font-bold">
                            Line {violation.line}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              violation.severity === 'High'
                                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                                : violation.severity === 'Medium'
                                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                  : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                            }`}
                          >
                            {violation.severity} Severity
                          </span>
                        </div>
                        <p className="text-zinc-300 leading-relaxed font-medium">
                          {violation.message}
                        </p>

                        {/* Remediation code block */}
                        <div className="bg-zinc-900/60 border border-zinc-850 p-2.5 rounded flex items-center justify-between font-mono text-[10px] text-zinc-400">
                          <span className="truncate pr-4 leading-normal select-all">
                            {violation.remediation}
                          </span>
                          <button
                            onClick={() => handleCopyRemediation(violation.remediation, idx)}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition shrink-0"
                            title="Copy Fix"
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remediation Action Panel */}
              {remediatedPolicy && (
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        Auto-Remediate Policy
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-normal">
                        AWS Bedrock has generated a secure version of this policy.
                      </p>
                    </div>
                    <button
                      onClick={handleCopyRemediatedPolicy}
                      className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition shrink-0"
                      title="Copy Remediated Policy"
                    >
                      {copiedRemediated ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={handleApplyFix}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border-0 shadow-md"
                  >
                    <span>Apply AI Remediations</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
