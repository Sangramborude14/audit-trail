'use client';

import React from 'react';
import { Shield, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  if (!isOpen) return null;

  const handleUpgrade = () => {
    alert('Thank you for choosing AuditTrail! Connecting to Stripe Billing sandbox...');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
        {/* Sparkle badge */}
        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full w-fit mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PREMIUM UPGRADE AVAILABLE</span>
        </div>

        {/* Modal Title */}
        <div className="flex items-start space-x-4 mb-6">
          <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-emerald-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Upgrade to AuditTrail Premium
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              You have exhausted the 1-scan limit of the Free tier. Unlock the full B2B compliance
              scope for your team.
            </p>
          </div>
        </div>

        {/* Features Checklist */}
        <div className="space-y-3 mb-8 bg-zinc-950 p-4 border border-zinc-800/80 rounded-xl">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
            Unlocks infinite B2B compliance scanning
          </h4>
          <div className="flex items-start space-x-2 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span className="text-zinc-300 font-medium leading-relaxed">
              Unlimited on-demand security configuration parsing.
            </span>
          </div>
          <div className="flex items-start space-x-2 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span className="text-zinc-300 font-medium leading-relaxed">
              Full coverage of ISO 27001, SOC 2 Type II, and HIPAA Security Rules.
            </span>
          </div>
          <div className="flex items-start space-x-2 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span className="text-zinc-300 font-medium leading-relaxed">
              Copy-pasteable AWS CLI and Terraform remediation commands.
            </span>
          </div>
          <div className="flex items-start space-x-2 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span className="text-zinc-300 font-medium leading-relaxed">
              Zero-secrets AWS OIDC and Bedrock API tracing access.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 font-semibold">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-800/20 text-zinc-400 hover:text-white rounded-lg text-sm transition duration-200"
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm flex items-center justify-center space-x-1.5 transition duration-200 shadow-md shadow-emerald-950/20"
          >
            <span>Upgrade to Premium</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
