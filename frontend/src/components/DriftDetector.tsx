'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Terminal, Eye, Code, Copy } from 'lucide-react';

interface DriftRule {
  id: string;
  name: string;
  baseline: string;
  actual: string;
  diffBefore: string;
  diffAfter: string;
  remediation: string;
}

const driftRules: Record<string, DriftRule> = {
  S3_ENCRYPTION: {
    id: 'S3_ENCRYPTION',
    name: 'S3 Bucket Server-Side Encryption (ISO A.8.24 / SOC2 CC6.1)',
    baseline: `{
  "Bucket": "audittrail-compliance-logs",
  "ServerSideEncryptionConfiguration": {
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms"
        }
      }
    ]
  }
}`,
    actual: `{
  "Bucket": "audittrail-compliance-logs",
  "ServerSideEncryptionConfiguration": {}
}`,
    diffBefore: `-   "ServerSideEncryptionConfiguration": {}`,
    diffAfter: `+   "ServerSideEncryptionConfiguration": {
+     "Rules": [
+       {
+         "ApplyServerSideEncryptionByDefault": {
+           "SSEAlgorithm": "aws:kms"
+         }
+       }
+     ]
+   }`,
    remediation:
      'aws s3api put-bucket-encryption --bucket audittrail-compliance-logs --server-side-encryption-configuration \'{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms"}}]}\'',
  },
  SG_PORT22: {
    id: 'SG_PORT22',
    name: 'VPC Security Group Open SSH Port 22 (SOC2 CC7.1)',
    baseline: `{
  "SecurityGroup": "web-sg",
  "IpPermissions": [
    {
      "IpProtocol": "tcp",
      "FromPort": 22,
      "ToPort": 22,
      "IpRanges": [
        {
          "CidrIp": "10.0.0.0/8",
          "Description": "Allow SSH from Corporate VPN only"
        }
      ]
    }
  ]
}`,
    actual: `{
  "SecurityGroup": "web-sg",
  "IpPermissions": [
    {
      "IpProtocol": "tcp",
      "FromPort": 22,
      "ToPort": 22,
      "IpRanges": [
        {
          "CidrIp": "0.0.0.0/0",
          "Description": "Allow SSH from Anywhere"
        }
      ]
    }
  ]
}`,
    diffBefore: `-         "CidrIp": "0.0.0.0/0",
-         "Description": "Allow SSH from Anywhere"`,
    diffAfter: `+         "CidrIp": "10.0.0.0/8",
+         "Description": "Allow SSH from Corporate VPN only"`,
    remediation:
      'aws ec2 revoke-security-group-ingress --group-id sg-0c98f82163b --protocol tcp --port 22 --cidr 0.0.0.0/0; aws ec2 authorize-security-group-ingress --group-id sg-0c98f82163b --protocol tcp --port 22 --cidr 10.0.0.0/8',
  },
  IAM_WILDCARD: {
    id: 'IAM_WILDCARD',
    name: 'IAM Least Privilege - No Wildcard Admin Roles (SOC2 CC6.3 / ISO A.5.15)',
    baseline: `{
  "PolicyName": "AuditTrailAppPolicy",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "dynamodb:PutItem",
        "dynamodb:GetItem"
      ],
      "Resource": "*"
    }
  ]
}`,
    actual: `{
  "PolicyName": "AuditTrailAppPolicy",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}`,
    diffBefore: `-       "Action": "*"`,
    diffAfter: `+       "Action": [
+         "s3:GetObject",
+         "s3:PutObject",
+         "dynamodb:PutItem",
+         "dynamodb:GetItem"
+       ]`,
    remediation:
      'aws iam create-policy-version --policy-arn arn:aws:iam::123456789012:policy/AuditTrailAppPolicy --policy-document file://baseline-policy.json --set-as-default',
  },
};

export function DriftDetector() {
  const [activeRuleId, setActiveRuleId] = useState<string>('S3_ENCRYPTION');
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanned, setScanned] = useState<boolean>(false);
  const [driftDetected, setDriftDetected] = useState<boolean>(false);

  const activeRule = driftRules[activeRuleId];

  const handleScan = () => {
    setScanning(true);
    setScanned(false);
    setDriftDetected(false);

    setTimeout(() => {
      setScanning(false);
      setScanned(true);
      setDriftDetected(true);
    }, 1500);
  };

  const handleCopyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    alert('Remediation command copied to clipboard!');
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 md:p-6 shadow-xl flex flex-col space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center">
          <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
          AI-Powered Cloud Infrastructure Drift Detector
        </h2>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
          Compares active AWS resource configurations against declared framework baseline policies.
          Detects gaps in target parameters and generates copy-pasteable CLI commands to align
          systems back to compliance.
        </p>
      </div>

      {/* Select Rule & Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-950 p-4 border border-zinc-800/80 rounded-xl">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
            Select Cloud Configuration Rule
          </label>
          <select
            value={activeRuleId}
            onChange={(e) => {
              setActiveRuleId(e.target.value);
              setScanned(false);
              setDriftDetected(false);
            }}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-3 py-2 focus:outline-none focus:border-zinc-700 font-semibold"
          >
            {Object.values(driftRules).map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition duration-200 shadow-md cursor-pointer self-end"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Detecting Gaps...' : 'Scan for Drift Gaps'}</span>
        </button>
      </div>

      {/* Output Comparison Panel */}
      {scanning && (
        <div className="flex flex-col items-center justify-center py-20 border border-zinc-800 border-dashed rounded-xl bg-zinc-950/20">
          <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mb-3" />
          <p className="text-xs font-mono text-zinc-500">
            Querying AWS config state & checking baseline diff...
          </p>
        </div>
      )}

      {scanned && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
          {/* Baseline Compliant vs Live Configuration */}
          <div className="flex flex-col space-y-4">
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col min-h-[220px]">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono flex items-center">
                <Code className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                Declared Compliance Target (Baseline)
              </span>
              <pre className="flex-1 text-[11px] text-emerald-400/90 font-mono overflow-auto bg-zinc-950 p-2 rounded max-h-[160px] leading-relaxed">
                {activeRule.baseline}
              </pre>
            </div>
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col min-h-[220px]">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono flex items-center">
                <Code className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                Active Configuration State (Live)
              </span>
              <pre className="flex-1 text-[11px] text-rose-400/90 font-mono overflow-auto bg-zinc-950 p-2 rounded max-h-[160px] leading-relaxed">
                {activeRule.actual}
              </pre>
            </div>
          </div>

          {/* Drift Analysis & Remediation Console */}
          <div className="flex flex-col space-y-4">
            {/* Drift Status Card */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-3">
                <span className="text-xs font-bold text-zinc-400 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                  Drift Check Report
                </span>
                {driftDetected ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded-full animate-pulse">
                    DRIFT DETECTED
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">
                    IN COMPLIANCE
                  </span>
                )}
              </div>

              {/* Code diff segment */}
              <div className="flex-1 bg-zinc-900/40 border border-zinc-800/80 p-3 rounded-lg font-mono text-[11px] overflow-auto leading-relaxed max-h-[160px]">
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Detected Gaps
                </div>
                <div className="text-rose-400 bg-rose-500/5 p-1.5 rounded border border-rose-500/10 mb-2 whitespace-pre">
                  {activeRule.diffBefore}
                </div>
                <div className="text-emerald-400 bg-emerald-500/5 p-1.5 rounded border border-emerald-500/10 whitespace-pre">
                  {activeRule.diffAfter}
                </div>
              </div>
            </div>

            {/* Remediation execution CLI block */}
            <div className="bg-zinc-950 border border-zinc-805 rounded-xl p-4 flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono flex items-center">
                <Terminal className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                CLI Remediation Command
              </span>
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex items-center justify-between font-mono text-[11px] text-zinc-300">
                <span className="truncate pr-4 break-all select-all">{activeRule.remediation}</span>
                <button
                  onClick={() => handleCopyCmd(activeRule.remediation)}
                  className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition shrink-0"
                  title="Copy Remediation Command"
                >
                  <Copy className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Untouched empty state */}
      {!scanning && !scanned && (
        <div className="flex flex-col items-center justify-center py-20 border border-zinc-800 border-dashed rounded-xl bg-zinc-950/10 text-zinc-600">
          <Eye className="w-12 h-12 mb-3 text-zinc-800" />
          <p className="text-xs font-mono text-center">
            Click Scan above to execute AI-driven configuration comparison.
          </p>
        </div>
      )}
    </div>
  );
}
