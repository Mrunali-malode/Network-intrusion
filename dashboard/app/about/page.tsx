"use client";

import Navbar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { useSocket } from "@/hooks/useSocket";
import { Shield, Cpu, Activity, Database, GitBranch, Lock, Server } from "lucide-react";

export default function AboutPage() {
  const { totalRequests, connected } = useSocket();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar connected={connected} totalRequests={totalRequests} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 border border-cyan-500/30 font-mono">
              <Shield className="h-3.5 w-3.5 text-cyan-400" />
              SYSTEM ARCHITECTURE & METHODOLOGY
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Network Intrusion Sentinel Architecture
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-3xl">
            Learn how Network Intrusion Sentinel streams real-time HTTP telemetry, builds statistical reference baselines, and detects cyber attack shifts.
          </p>
        </div>

        {/* Architecture Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl space-y-3">
            <div className="rounded-xl bg-cyan-500/10 p-3 w-fit text-cyan-400 border border-cyan-500/30">
              <Server className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white font-mono">1. Middleware Telemetry</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every HTTP request hitting the application middleware (Next.js demo site) extracts request metadata (Path, Depth, Content-Length, IP, Headers) and streams JSON payloads to FastAPI via async HTTP POST.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl space-y-3">
            <div className="rounded-xl bg-purple-500/10 p-3 w-fit text-purple-400 border border-purple-500/30">
              <Cpu className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white font-mono">2. Multi-Technique ML Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              FastAPI backend evaluates incoming streams against a 250-event reference baseline across Population Stability Index (PSI), Kolmogorov-Smirnov (KS) Test, Wasserstein Earth Mover's Distance (EMD), and 3-Sigma Z-Score.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl space-y-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 w-fit text-emerald-400 border border-emerald-500/30">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white font-mono">3. Real-Time WebSocket SOC</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Updated statistical drift metrics, threat alerts, and telemetry events are broadcast instantly over WebSocket to connected SOC dashboard clients.
            </p>
          </div>
        </div>

        {/* Calibration Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl space-y-4">
          <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-cyan-400" />
            Threat Alert Calibration Matrix
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/80 font-mono text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Traffic Type</th>
                  <th className="py-3 px-4">Composite Score Range</th>
                  <th className="py-3 px-4">Threat Status</th>
                  <th className="py-3 px-4">Statistical Characteristics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">Normal Browsing</td>
                  <td className="py-3.5 px-4 text-white">0% – 20%</td>
                  <td className="py-3.5 px-4"><span className="rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-400">NORMAL</span></td>
                  <td className="py-3.5 px-4 text-slate-400">Stable path distribution, normal p-values (p &gt; 0.05), low EMD distance.</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-amber-400">Gradual Concept Drift</td>
                  <td className="py-3.5 px-4 text-white">20% – 60%</td>
                  <td className="py-3.5 px-4"><span className="rounded bg-amber-500/20 px-2 py-0.5 font-bold text-amber-400">WARNING</span></td>
                  <td className="py-3.5 px-4 text-slate-400">Ramping request velocity, emerging attack endpoints, moderate PSI shift (0.10 - 0.25).</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-rose-400">Spike DDoS Attack</td>
                  <td className="py-3.5 px-4 text-white">60% – 100%</td>
                  <td className="py-3.5 px-4"><span className="rounded bg-rose-500/20 px-2 py-0.5 font-bold text-rose-400">CRITICAL</span></td>
                  <td className="py-3.5 px-4 text-slate-400">High request concurrency, botnet TOR IPs, malicious path injection, extreme 3-Sigma Z-Score.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}