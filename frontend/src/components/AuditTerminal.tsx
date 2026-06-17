'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Terminal, UploadCloud } from 'lucide-react';

interface AuditTerminalProps {
  tenantId: string;
  onAuditComplete: (score: number, passed: boolean) => void;
  onScanAttempt?: () => boolean;
}

export function AuditTerminal({ tenantId, onAuditComplete, onScanAttempt }: AuditTerminalProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (onScanAttempt && !onScanAttempt()) {
      event.target.value = '';
      return;
    }

    setIsScanning(true);
    setLogs([`[INFO] Opening security policy document: ${file.name}`, '[INFO] Reading bytes...']);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileContent = e.target?.result as string;
      await runAudit(fileContent);
    };
    reader.readAsText(file);
  };

  const runAudit = async (content: string) => {
    try {
      setLogs((prev) => [
        ...prev,
        '[INFO] Sending payload to AI Compliance Parser API Route...',
        '[INFO] Connecting to Bedrock Claude 3.5 Sonnet...',
      ]);

      let parsedJson = {};
      try {
        parsedJson = JSON.parse(content);
      } catch {
        parsedJson = { rawText: content };
      }

      const response = await fetch('/api/audit/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ configJson: parsedJson }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: Failed to invoke parsing API.`);
      }

      const streamReader = response.body?.getReader();
      if (!streamReader) {
        throw new Error('Failed to initialize response stream reader.');
      }

      setLogs((prev) => [...prev, '[INFO] Connection established. Starting audit pipeline...']);

      const decoder = new TextDecoder();
      let buffer = '';

      const activeLogs: string[] = [];

      while (true) {
        const { done, value } = await streamReader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          // Vercel AI SDK text stream prefix is 0:"..."
          if (line.startsWith('0:"') && line.endsWith('"')) {
            try {
              const text = JSON.parse(line.substring(2));
              const textLines = text.split('\n');
              for (const tl of textLines) {
                if (tl.trim() !== '') {
                  setLogs((prev) => [...prev, tl]);
                  activeLogs.push(tl);
                }
              }
            } catch {
              setLogs((prev) => [...prev, line]);
              activeLogs.push(line);
            }
          } else {
            setLogs((prev) => [...prev, line]);
            activeLogs.push(line);
          }
        }
      }

      // Check if any errors are present in the audit log
      const logString = activeLogs.join('\n');
      const hasErrors =
        logString.toLowerCase().includes('violation') ||
        logString.toLowerCase().includes('fail') ||
        logString.toLowerCase().includes('warn');

      const score = hasErrors ? 72 : 98;
      const passed = score >= 80;

      setLogs((prev) => [
        ...prev,
        `[INFO] Audit pipeline run completed. Overall score: ${score}%. Status: ${passed ? 'PASSED' : 'FAILED'}.`,
      ]);

      setIsScanning(false);
      onAuditComplete(score, passed);
    } catch (err: any) {
      console.error(err);
      setLogs((prev) => [...prev, `[ERROR] Catastrophic Audit failure: ${err.message}`]);
      setIsScanning(false);
      onAuditComplete(45, false);
    }
  };

  const formatLogLine = (line: string) => {
    if (line.startsWith('[INFO]')) {
      return (
        <span className="text-emerald-400">
          <span className="font-semibold text-emerald-500">[INFO]</span> {line.substring(6)}
        </span>
      );
    }
    if (
      line.startsWith('[WARN]') ||
      line.toLowerCase().includes('violation') ||
      line.toLowerCase().includes('fail')
    ) {
      return (
        <span className="text-amber-400">
          <span className="font-semibold text-amber-500">[WARN]</span> {line.replace('[WARN]', '')}
        </span>
      );
    }
    if (
      line.startsWith('[REMEDIATION]') ||
      line.startsWith('Remediation:') ||
      line.toLowerCase().includes('aws ') ||
      line.toLowerCase().includes('terraform ')
    ) {
      return (
        <span className="text-cyan-400">
          <span className="font-semibold text-cyan-500">[REMEDIATION]</span>{' '}
          {line.replace('[REMEDIATION]', '')}
        </span>
      );
    }
    if (line.startsWith('[ERROR]')) {
      return (
        <span className="text-rose-400 font-semibold">
          <span>[ERROR]</span> {line.substring(7)}
        </span>
      );
    }
    return <span className="text-zinc-300">{line}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <span className="w-3 h-3 bg-rose-500 rounded-full inline-block" />
            <span className="w-3 h-3 bg-amber-500 rounded-full inline-block" />
            <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block" />
          </div>
          <span className="text-xs text-zinc-400 font-mono flex items-center pl-2">
            <Terminal className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
            compliance_playback_terminal.sh
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={copyToClipboard}
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition duration-200"
            title="Copy logs"
            disabled={logs.length === 0}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 p-4 font-mono text-sm overflow-y-auto min-h-[300px] max-h-[400px] space-y-1.5 bg-zinc-950">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-12">
            <Terminal className="w-12 h-12 mb-3 text-zinc-800" />
            <p className="text-center">
              Terminal idle. Upload a security policy config to start audit.
            </p>
          </div>
        ) : (
          logs.map((line, idx) => (
            <div
              key={idx}
              className="leading-relaxed border-l-2 border-transparent hover:border-zinc-800 pl-1"
            >
              {formatLogLine(line)}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* File Upload Console Footer */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
        <div className="flex items-center">
          {isScanning && (
            <div className="flex items-center space-x-2 text-amber-400 text-xs">
              <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping inline-block" />
              <span className="font-mono">AI COMPLIANCE SCANNING RUNNING...</span>
            </div>
          )}
        </div>
        <label className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg cursor-pointer text-sm font-semibold transition duration-200 shadow-md shadow-emerald-900/30">
          <UploadCloud className="w-4 h-4" />
          <span>Upload Security Configuration</span>
          <input
            id="file-upload-input"
            type="file"
            accept=".json,.txt,.yaml,.yml"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isScanning}
          />
        </label>
      </div>
    </div>
  );
}
