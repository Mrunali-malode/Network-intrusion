"use client";

import { useState } from "react";
import { Shield, Radio, Cpu, Terminal, HelpCircle } from "lucide-react";
import InfoModal, { ModalInfoContent } from "@/components/InfoModal";

interface NavBarProps {
  connected: boolean;
  totalRequests: number;
}

export default function NavBar({ connected, totalRequests }: NavBarProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const guideContent: ModalInfoContent = {
    title: "How to Use SENTINEL.AI Network Intrusion Dashboard",
    category: "Quick Start & User Guide",
    badge: "User Manual",
    badgeColor: "cyan",
    summary:
      "Welcome to SENTINEL.AI! This dashboard monitors real-time HTTP traffic ingested from Next.js web middleware, detects statistical concept drift (distribution shifts in incoming traffic), and identifies malicious botnet/IP attacks.",
    keyPoints: [
      "1. Browse the Demo App: Open http://localhost:3000 (Netflix Clone) in a separate tab or click around to generate live middleware HTTP traffic.",
      "2. Synthetic Traffic Injector: Use the panel on the dashboard to trigger 'Normal Users', 'Gradual Concept Drift', or 'Volumetric Botnet Attack' to instantly see distribution changes.",
      "3. Concept Drift Sentinel: Monitors 4 statistical metrics (KS-Test, PSI, Wasserstein Distance, Z-Score). When anomalous traffic flows in, the alert status shifts from NORMAL to WARNING or CRITICAL.",
      "4. Real-time Recharts Timeline: Shows incoming Requests/Sec (RPS) vs Composite Drift Score %.",
      "5. Live Telemetry & Threat Feed: View live incoming HTTP requests, filter by method (GET/POST/PUT), search IPs or paths, and view auto-flagged threats."
    ],
    normalVsAnomaly: {
      normal: "Standard legitimate user traffic browsing website pages. Low RPS (<20), low drift score (<25%), normal p-values.",
      anomaly: "High request volumes, fake IP injection from TOR/Botnet ranges, or rapid shifts in API endpoint access triggering KS-Test (p < 0.05) & PSI drift (>= 0.25)."
    },
    howToTest:
      "Click on any '(i)' info icon next to metrics or section titles anywhere on the dashboard to open specific explanatory popups for each feature!"
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-2 text-white shadow-lg shadow-cyan-500/30">
              <Shield className="h-6 w-6" />
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  SENTINEL<span className="text-cyan-400">.AI</span>
                </h1>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-400 border border-cyan-500/30">
                  v2.4 Enterprise SOC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-Time Network Intrusion & Concept Drift Intelligence
              </p>
            </div>
          </div>

          {/* Status Indicators & Metadata */}
          <div className="flex items-center gap-4">
            {/* Guide Button */}
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all shadow-sm"
            >
              <HelpCircle className="h-4 w-4 text-cyan-400" />
              <span>How to Use</span>
            </button>

            <div className="hidden md:flex items-center gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 rounded-lg bg-slate-900/80 px-3 py-1.5 border border-slate-800">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <span>Engine: <strong className="text-white">FastAPI ML Pipeline</strong></span>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-900/80 px-3 py-1.5 border border-slate-800">
                <Terminal className="h-4 w-4 text-purple-400" />
                <span>Events: <strong className="text-cyan-300">{totalRequests.toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Connection Status Badge */}
            <div className="flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-1.5 border border-slate-800">
              <Radio className={`h-4 w-4 ${connected ? "text-emerald-400 animate-pulse" : "text-rose-500"}`} />
              <span className="text-xs font-semibold tracking-wide uppercase">
                {connected ? (
                  <span className="text-emerald-400">WS Live</span>
                ) : (
                  <span className="text-rose-400">Connecting...</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </header>

      <InfoModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        content={guideContent}
      />
    </>
  );
}