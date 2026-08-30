"use client";

import { useState } from "react";
import Navbar from "@/components/NavBar";
import Footer from "@/components/Footer";
import DriftCard from "@/components/DriftCard";
import TrafficSimulatorPanel from "@/components/TrafficSimulatorPanel";
import RealtimeChart from "@/components/RealtimeChart";
import InfoModal, { ModalInfoContent } from "@/components/InfoModal";
import { useSocket } from "@/hooks/useSocket";
import {
  Activity,
  Globe,
  Radio,
  Shield,
  ShieldAlert,
  Search,
  Cpu,
  RefreshCcw,
  Info,
  Server,
  Zap,
} from "lucide-react";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = "cyan",
  onInfoClick,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  accentColor?: "cyan" | "emerald" | "amber" | "rose" | "purple";
  onInfoClick?: () => void;
}) {
  const colorMap = {
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-xl transition-all hover:border-slate-700 shadow-xl group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 font-mono">
          {title}
          {onInfoClick && (
            <button
              onClick={onInfoClick}
              className="text-slate-500 hover:text-cyan-400 transition-all"
              title={`Learn more about ${title}`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
        <div className={`rounded-xl border p-2.5 ${colorMap[accentColor]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <h2 className="text-3xl font-black text-white tracking-tight font-mono">
          {value}
        </h2>
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-400 font-medium">{subtitle}</p>
      )}
    </div>
  );
}

export default function Home() {
  const {
    events,
    rps,
    totalRequests,
    uniqueIps,
    connected,
    drift,
    historyData,
    triggerSimulation,
  } = useSocket();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMethod, setFilterMethod] = useState("ALL");
  const [modalContent, setModalContent] = useState<ModalInfoContent | null>(null);

  const statModalInfos: Record<string, ModalInfoContent> = {
    rps: {
      title: "Requests Per Second (RPS)",
      category: "Traffic Throughput Metric",
      badge: rps > 20 ? "HIGH THROUGHPUT" : "NORMAL",
      badgeColor: rps > 20 ? "amber" : "cyan",
      summary:
        "Requests Per Second (RPS) tracks the real-time velocity of HTTP telemetry events streaming into the system.",
      keyPoints: [
        "Normal Range: 0 to 15 RPS during typical user activity.",
        "Anomalous Volume: Exceeding 20 RPS signals possible automated script execution or DDoS attempt."
      ],
      normalVsAnomaly: {
        normal: "< 20 RPS across standard web browsing.",
        anomaly: ">= 20 RPS rapid burst traffic."
      },
      howToTest: "Click 'Quick Telemetry Pulse' or run a simulation to see RPS update in real time."
    },
    totalEvents: {
      title: "Total Telemetry Events",
      category: "Ingestion Counter",
      badge: "Middleware Stream",
      badgeColor: "purple",
      summary:
        "This is the running counter of all HTTP request logs captured by Next.js middleware and synthetic injection tools since session start.",
      keyPoints: [
        "Middleware Integration: Every page load or API fetch on the website streams telemetry payload to the FastAPI backend.",
        "Persistent Tracking: Aggregates total event count across all connected client browser tabs."
      ],
      howToTest: "Open http://localhost:3000 and click around to watch this event counter increase live."
    },
    uniqueIps: {
      title: "Unique Client IPs",
      category: "Network Address Tracking",
      badge: "IP Registry",
      badgeColor: "emerald",
      summary:
        "Tracks the total count of distinct IP addresses sending traffic to your application endpoints.",
      keyPoints: [
        "Legitimate Range: Typically clean local or user IP ranges (e.g. 198.51.100.x).",
        "Botnet Infection: Sudden spike in unique IPs from unknown ASN/TOR ranges indicates distributed botnet activity."
      ],
      howToTest: "Run 'Volumetric Botnet Attack' in the Traffic Simulator to inject distinct synthetic IP ranges."
    },
    conceptDrift: {
      title: "Concept Drift Alert Index",
      category: "Composite Risk Score",
      badge: drift.status,
      badgeColor: drift.status === "CRITICAL" ? "rose" : drift.status === "WARNING" ? "amber" : "emerald",
      summary:
        "Composite risk evaluation combining 4 calibrated statistical hypothesis tests (KS-Test, PSI, Wasserstein Distance, Z-Score) to flag when live traffic deviates from normal behavior.",
      keyPoints: [
        "NORMAL: Composite score 0 - 20%. Baseline distribution is stable.",
        "WARNING: Composite score 20 - 60%. Moderate statistical shift.",
        "CRITICAL: Composite score 60 - 100%. Significant concept drift / cyber attack detected."
      ],
      howToTest: "Trigger 'Volumetric Botnet Attack' to watch the alert transition to CRITICAL!"
    },
    liveFeed: {
      title: "Live HTTP Telemetry & Threat Log Stream",
      category: "SOC Threat Logging",
      badge: "Real-Time Table",
      badgeColor: "cyan",
      summary:
        "Displays individual HTTP requests captured live from demo web middleware and synthetic attack tools.",
      keyPoints: [
        "HTTP Method Filter: Filter table by GET, POST, PUT, or DELETE requests.",
        "Search Filter: Type any IP address or path fragment (e.g. '/admin') to isolate suspicious requests.",
        "Automatic Threat Tagging: Requests originating from known TOR/Botnet ranges (185.220.x.x) or sensitive administrative paths are flagged in red as ANOMALY."
      ],
      howToTest: "Filter by 'POST' or type 'admin' in the filter search box to inspect targeted threat entries."
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.user_agent.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod =
      filterMethod === "ALL" || ev.method.toUpperCase() === filterMethod;

    return matchesSearch && matchesMethod;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950 font-sans">
      <Navbar connected={connected} totalRequests={totalRequests} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* Hero Section Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 border border-cyan-500/30 font-mono">
                  <Radio className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
                  LIVE SOC MONITORING SYSTEM ACTIVE
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/30 font-mono">
                  <Zap className="h-3 w-3" /> FASTAPI ML PIPELINE
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Network Intrusion <span className="text-cyan-400">Sentinel</span>
              </h1>
              <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
                Enterprise real-time HTTP telemetry streaming platform powered by multi-technique concept drift analysis (Laplace PSI, 2-Sample KS-Test, Earth Mover's Distance, and 3-Sigma Z-Score).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => triggerSimulation("normal", 30, 0.1)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-xs font-black text-slate-950 hover:brightness-110 transition-all shadow-lg shadow-cyan-500/20 uppercase tracking-wider"
              >
                <RefreshCcw className="h-4 w-4 text-slate-950" />
                Quick Telemetry Pulse
              </button>
            </div>
          </div>
        </div>

        {/* Top Enterprise Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Requests / Sec (RPS)"
            value={rps}
            subtitle={rps > 20 ? "⚠️ High Traffic Surge" : "Normal Velocity"}
            icon={Activity}
            accentColor={rps > 20 ? "amber" : "cyan"}
            onInfoClick={() => setModalContent(statModalInfos.rps)}
          />

          <StatCard
            title="Total Ingested Events"
            value={totalRequests.toLocaleString()}
            subtitle="Captured via Next.js Middleware"
            icon={Cpu}
            accentColor="purple"
            onInfoClick={() => setModalContent(statModalInfos.totalEvents)}
          />

          <StatCard
            title="Unique Client IPs"
            value={uniqueIps}
            subtitle="Tracked Remote Addresses"
            icon={Globe}
            accentColor="emerald"
            onInfoClick={() => setModalContent(statModalInfos.uniqueIps)}
          />

          <StatCard
            title="Concept Drift Alert"
            value={drift.status}
            subtitle={`Composite Score: ${drift.overall_drift_score.toFixed(1)}%`}
            icon={drift.drift_detected ? ShieldAlert : Shield}
            accentColor={drift.status === "CRITICAL" ? "rose" : drift.status === "WARNING" ? "amber" : "emerald"}
            onInfoClick={() => setModalContent(statModalInfos.conceptDrift)}
          />
        </div>

        {/* Section 1: Concept Drift Engine Sentinel & Traffic Control Panel */}
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <DriftCard drift={drift} />
          </div>
          <div className="lg:col-span-5">
            <TrafficSimulatorPanel onSimulate={triggerSimulation} />
          </div>
        </div>

        {/* Section 2: Real-time Recharts Timeline */}
        <div>
          <RealtimeChart data={historyData} />
        </div>

        {/* Section 3: Live Telemetry & Threat Log Stream Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2 font-sans">
                Live HTTP Telemetry & Threat Log Stream
                <button
                  onClick={() => setModalContent(statModalInfos.liveFeed)}
                  className="rounded-full p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all"
                  title="Learn about Live Threat Feed"
                >
                  <Info className="h-4 w-4" />
                </button>
              </h2>
              <p className="text-xs text-slate-400">
                Real-time HTTP request log ingestion stream from demo web middleware and synthetic threat injectors
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
                {["ALL", "GET", "POST", "PUT", "DELETE"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setFilterMethod(m)}
                    className={`rounded-md px-2.5 py-1 transition-all ${
                      filterMethod === m
                        ? "bg-cyan-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter IP or Path..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg bg-slate-950 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none w-48 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/80 font-semibold uppercase tracking-wider text-slate-400 text-[11px] font-mono">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4">Request Path</th>
                  <th className="py-3 px-4">Payload Size</th>
                  <th className="py-3 px-4">Threat Risk Tag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      No matching telemetry events. Trigger simulation or browse demo site.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev, index) => {
                    const isAttackerIp =
                      ev.ip.startsWith("185.220") ||
                      ev.ip.startsWith("45.83") ||
                      ev.ip.startsWith("103.21");

                    const isAttackPath =
                      ev.path.includes("admin") ||
                      ev.path.includes(".env") ||
                      ev.path.includes("debug") ||
                      ev.path.includes("bypass");

                    return (
                      <tr
                        key={ev.id || index}
                        className={`transition-colors hover:bg-slate-800/40 ${
                          isAttackerIp || isAttackPath ? "bg-rose-950/10" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-400">{ev.time}</td>

                        <td className="py-3 px-4">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              ev.method === "POST"
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                : ev.method === "GET"
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {ev.method}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className={isAttackerIp ? "text-rose-400 font-bold" : "text-slate-200"}>
                            {ev.ip}
                          </span>
                          {isAttackerIp && (
                            <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-500/30">
                              BOTNET / TOR
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-300">
                          <span className={isAttackPath ? "text-amber-300 font-bold" : ""}>
                            {ev.path}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-400">
                          {ev.content_length ? `${ev.content_length} B` : "0 B"}
                        </td>

                        <td className="py-3 px-4">
                          {isAttackerIp || isAttackPath ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
                              <ShieldAlert className="h-3 w-3" /> ANOMALY
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              LEGITIMATE
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

      <InfoModal
        isOpen={modalContent !== null}
        onClose={() => setModalContent(null)}
        content={modalContent}
      />
    </div>
  );
}