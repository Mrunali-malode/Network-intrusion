"use client";

import { Shield, Activity, GitBranch, Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-950/90 px-6 py-8 text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span className="font-bold text-white tracking-wide">Network Intrusion Sentinel</span>
          <span className="text-slate-400">— Real-Time Drift Monitoring Platform</span>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-cyan-400" /> Telemetry Stream Active
          </span>
          <span className="flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5 text-purple-400" /> Multi-Technique ML Engine
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-400" /> Enterprise SOC Standard
          </span>
        </div>
      </div>
    </footer>
  );
}