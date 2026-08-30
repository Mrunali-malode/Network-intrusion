"use client";

import { Shield, Activity, GitBranch, Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-950/80 px-6 py-8 text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">Sentinel Network Intrusion System</span>
          <span>— Statistical Concept Drift & Live Telemetry Sentinel</span>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-cyan-400" /> Real-time Streaming
          </span>
          <span className="flex items-center gap-1">
            <GitBranch className="h-3.5 w-3.5 text-purple-400" /> KS-Test / PSI / EMD
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-emerald-400" /> SOC Compliant
          </span>
        </div>
      </div>
    </footer>
  );
}