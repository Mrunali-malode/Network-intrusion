"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Radio, Cpu, Terminal, HelpCircle, Activity, Gauge, Database, Info } from "lucide-react";
import InfoModal, { ModalInfoContent } from "@/components/InfoModal";

interface NavBarProps {
  connected?: boolean;
  totalRequests?: number;
}

export default function NavBar({ connected = true, totalRequests = 0 }: NavBarProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: "Dashboard", href: "/", icon: Activity },
    { name: "Monitoring", href: "/monitoring", icon: Radio },
    { name: "Drift Analysis", href: "/drift-analysis", icon: Gauge },
    { name: "Traffic Explorer", href: "/traffic-explorer", icon: Database },
    { name: "About", href: "/about", icon: Info },
  ];

  const guideContent: ModalInfoContent = {
    title: "Network Intrusion Sentinel — User Guide",
    category: "SOC Enterprise Platform",
    badge: "SOC Manual",
    badgeColor: "cyan",
    summary:
      "Network Intrusion Sentinel is an enterprise Security Operations Center (SOC) platform designed for real-time HTTP telemetry streaming, multi-technique statistical concept drift analysis, and volumetric cyber attack detection.",
    keyPoints: [
      "1. Real-Time Telemetry Stream: Ingests live HTTP traffic from middleware (demo site) and attack injection scripts.",
      "2. Calibrated Drift Engine: Evaluates Population Stability Index (PSI), Kolmogorov-Smirnov (KS) Test, Wasserstein Earth Mover's Distance (EMD), and 3-Sigma Z-Scores.",
      "3. Threat Level Hierarchy: NORMAL (0-20%), WARNING (20-60%), CRITICAL (60-100%).",
      "4. Traffic Simulator: Inject synthetic normal traffic, gradual drift attacks, or volumetric botnet DDoS attacks to test SOC alert triggers.",
      "5. Mathematical Debug Breakdown: Exposes exact contribution weightings and formula calculations live."
    ],
    normalVsAnomaly: {
      normal: "Legitimate user browsing (0-20% drift score). Stable baseline path and IP distributions.",
      anomaly: "Automated vulnerability scanning, DDoS flooding, or rapid structural shifts in HTTP methods and paths."
    },
    howToTest:
      "Use the Traffic Control Panel to launch 'Gradual Attack' or 'Volumetric Botnet Attack' to watch threat status escalate to WARNING or CRITICAL!"
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-2 text-white shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
                <Shield className="h-6 w-6" />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500"></span>
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-wider text-white uppercase font-mono">
                    Network Intrusion <span className="text-cyan-400">Sentinel</span>
                  </h1>
                  <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30">
                    SOC ENTERPRISE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Real-Time Concept Drift & Threat Monitoring Platform
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-slate-950" : "text-cyan-400"}`} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* System Telemetry & Status Badges */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
            >
              <HelpCircle className="h-4 w-4 text-cyan-400" />
              <span className="hidden sm:inline">Guide</span>
            </button>

            {totalRequests > 0 && (
              <div className="hidden lg:flex items-center gap-2 rounded-lg bg-slate-900/80 px-3 py-1.5 border border-slate-800 text-xs text-slate-300">
                <Terminal className="h-3.5 w-3.5 text-purple-400" />
                <span>Events: <strong className="text-cyan-300 font-mono">{totalRequests.toLocaleString()}</strong></span>
              </div>
            )}

            {/* Connection Badge */}
            <div className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 border border-slate-800 text-xs">
              <Radio className={`h-3.5 w-3.5 ${connected ? "text-emerald-400 animate-pulse" : "text-rose-500"}`} />
              <span className="font-semibold tracking-wider uppercase text-[11px]">
                {connected ? (
                  <span className="text-emerald-400 font-bold">STREAM LIVE</span>
                ) : (
                  <span className="text-rose-400 font-bold">DISCONNECTED</span>
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