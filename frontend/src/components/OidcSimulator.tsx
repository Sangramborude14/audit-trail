'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Key, RefreshCw, Check, Lock, Terminal, Clock, Copy } from 'lucide-react';

export function OidcSimulator() {
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const mockJwt = {
    iss: 'https://oidc.vercel.sh',
    sub: 'repo:Sangramborude14/audit-trail:ref:refs/heads/main',
    aud: 'https://sts.amazonaws.com',
    exp: Math.floor(Date.now() / 1000) + 900,
    iat: Math.floor(Date.now() / 1000),
  };

  const mockTrustPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Federated: 'arn:aws:iam::123456789012:oidc-provider/oidc.vercel.sh' },
        Action: 'sts:AssumeRoleWithWebIdentity',
        Condition: {
          StringEquals: {
            'oidc.vercel.sh:aud': 'https://sts.amazonaws.com',
            'oidc.vercel.sh:sub': 'repo:Sangramborude14/audit-trail:ref:refs/heads/main',
          },
        },
      },
    ],
  };

  const mockCredentials = {
    AccessKeyId: 'ASIAIOSFODNN7EXAMPLE',
    SecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    SessionToken: 'IQoJb3JpZ2luX2VjEOb//////////wEaCXVzLWVhc3QtMSJHMEUCIQ...',
    Expiration: new Date(Date.now() + 900000).toISOString(),
  };

  // Timer countdown hook
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  const handleStartExchange = () => {
    setLoading(true);
    setStep(1);
    setIsRunning(false);
    setTimeLeft(900);

    setTimeout(() => {
      setStep(2);
      setTimeout(() => {
        setStep(3);
        setTimeout(() => {
          setStep(4);
          setLoading(false);
          setIsRunning(true);
        }, 1200);
      }, 1200);
    }, 1200);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 md:p-6 shadow-xl flex flex-col space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center">
          <Shield className="w-5 h-5 text-emerald-400 mr-2" />
          Zero-Secrets AWS OIDC Trust Sandbox
        </h2>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
          Demo sandbox showing how AuditTrail authenticates securely with AWS using OpenID Connect
          federation. Exchanges a signed Vercel identity token for short-lived AWS IAM role
          credentials, bypassing static secrets.
        </p>
      </div>

      {/* Simulator Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-950 p-4 border border-zinc-800/80 rounded-xl">
        <div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
            Active Connection Mode
          </span>
          <span className="text-sm font-semibold text-zinc-200 flex items-center mt-0.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block mr-2 animate-pulse" />
            Federated Trust Authenticated
          </span>
        </div>
        <button
          onClick={handleStartExchange}
          disabled={loading}
          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition duration-200 shadow-md cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Requesting Keys...' : 'Simulate STS Token Exchange'}</span>
        </button>
      </div>

      {/* Flow Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
        {/* Step 1: Vercel App */}
        <div
          className={`p-4 border rounded-xl transition duration-300 ${
            step >= 1 ? 'bg-zinc-800/40 border-zinc-700' : 'bg-zinc-900/30 border-zinc-850'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider">
              STEP 1: ISSUER
            </span>
            {step >= 1 && <Check className="w-4 h-4 text-emerald-400" />}
          </div>
          <h4 className="text-xs font-bold text-zinc-100">Vercel OIDC Provider</h4>
          <p className="text-[10px] text-zinc-400 mt-1">
            Generates signed JWT asserting repository identity.
          </p>
        </div>

        {/* Step 2: OpenID Connect Handshake */}
        <div
          className={`p-4 border rounded-xl transition duration-300 ${
            step >= 2
              ? 'bg-zinc-800/40 border-zinc-700 animate-pulse'
              : 'bg-zinc-900/30 border-zinc-850'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider">
              STEP 2: TRUST VERIFICATION
            </span>
            {step >= 2 && <Check className="w-4 h-4 text-emerald-400" />}
          </div>
          <h4 className="text-xs font-bold text-zinc-100">JWT Check</h4>
          <p className="text-[10px] text-zinc-400 mt-1">
            AWS verifies cryptographic signature matches issuer endpoint.
          </p>
        </div>

        {/* Step 3: STS Exchange */}
        <div
          className={`p-4 border rounded-xl transition duration-300 ${
            step >= 3 ? 'bg-zinc-800/40 border-zinc-700' : 'bg-zinc-900/30 border-zinc-850'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider">
              STEP 3: SECURITY TOKENS
            </span>
            {step >= 3 && <Check className="w-4 h-4 text-emerald-400" />}
          </div>
          <h4 className="text-xs font-bold text-zinc-100">AWS STS Exchange</h4>
          <p className="text-[10px] text-zinc-400 mt-1">
            Exchanges token for short-lived credentials.
          </p>
        </div>

        {/* Step 4: Active Role Access */}
        <div
          className={`p-4 border rounded-xl transition duration-300 ${
            step >= 4 ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-zinc-900/30 border-zinc-850'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-emerald-500 tracking-wider">
              STEP 4: SESSION CONNECTED
            </span>
            {step >= 4 && <Lock className="w-4 h-4 text-emerald-400" />}
          </div>
          <h4 className="text-xs font-bold text-emerald-300">AssumeRole Active</h4>
          <p className="text-[10px] text-emerald-500/80 mt-1">
            Temporary credentials authorized to run policy scan.
          </p>
        </div>
      </div>

      {/* JSON Payloads & AWS CLI Credentials Display */}
      {step > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[350px]">
          {/* Left panel: OIDC Token & Trust Policy */}
          <div className="flex flex-col space-y-4">
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono flex items-center">
                <Terminal className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                Vercel OIDC JWT Payload (Decoded)
              </span>
              <pre className="flex-1 text-[11px] text-emerald-400/90 font-mono overflow-auto bg-zinc-950 p-2 rounded max-h-[160px] leading-relaxed">
                {JSON.stringify(mockJwt, null, 2)}
              </pre>
            </div>
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono flex items-center">
                <Shield className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                AWS IAM Role Trust Relationship
              </span>
              <pre className="flex-1 text-[11px] text-zinc-300/90 font-mono overflow-auto bg-zinc-950 p-2 rounded max-h-[160px] leading-relaxed">
                {JSON.stringify(mockTrustPolicy, null, 2)}
              </pre>
            </div>
          </div>

          {/* Right panel: Temporary AWS credentials console */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-4">
              <span className="text-xs font-bold text-zinc-400 flex items-center">
                <Key className="w-4 h-4 mr-2 text-emerald-400" />
                AWS STS Temporary Session Credentials
              </span>
              {isRunning && (
                <span className="inline-flex items-center px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">
                  <Clock className="w-3 h-3 mr-1 animate-pulse" />
                  {formatTime(timeLeft)}
                </span>
              )}
            </div>

            {step < 4 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 py-12">
                <Lock className="w-12 h-12 mb-3 text-zinc-800" />
                <p className="text-xs font-mono text-center">
                  {step === 1 && 'Signing OIDC Assertion token...'}
                  {step === 2 && 'Exchanging token with AWS OIDC endpoint...'}
                  {step === 3 && 'Requesting temporary session keys...'}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-3 font-mono text-[11px]">
                {/* Access Key ID */}
                <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500 text-[9px] uppercase font-bold block mb-1">
                      AWS_ACCESS_KEY_ID
                    </span>
                    <span className="text-zinc-200">{mockCredentials.AccessKeyId}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(mockCredentials.AccessKeyId, 'access')}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
                    title="Copy Key ID"
                  >
                    {copiedKey === 'access' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Secret Access Key */}
                <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500 text-[9px] uppercase font-bold block mb-1">
                      AWS_SECRET_ACCESS_KEY
                    </span>
                    <span className="text-zinc-200">wJalrXUtnFEMI/K7MDENG/bPxRfiCYE...</span>
                  </div>
                  <button
                    onClick={() => handleCopy(mockCredentials.SecretAccessKey, 'secret')}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
                    title="Copy Secret Key"
                  >
                    {copiedKey === 'secret' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Session Token */}
                <div className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-lg flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[9px] uppercase font-bold">
                      AWS_SESSION_TOKEN
                    </span>
                    <button
                      onClick={() => handleCopy(mockCredentials.SessionToken, 'session')}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
                      title="Copy Session Token"
                    >
                      {copiedKey === 'session' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <span className="text-zinc-400 text-[10px] break-all max-h-[50px] overflow-y-auto leading-relaxed">
                    {mockCredentials.SessionToken}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
