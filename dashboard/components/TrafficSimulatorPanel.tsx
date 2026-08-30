"use client";

import { useState } from "react";
import { Zap, Play, ShieldAlert, Radio, Terminal, Send, Check, Info } from "lucide-react";
import InfoModal, { ModalInfoContent } from "@/components/InfoModal";

interface TrafficSimulatorPanelProps {
  onSimulate: (
    mode: string,
    count?: number,
    delay?: number,
    customIp?: string,
    customPath?: string
  ) => Promise<any>;
}

export default function TrafficSimulatorPanel({ onSimulate }: TrafficSimulatorPanelProps) {
  const [loadingMode, setLoadingMode] = useState<string | null>(null);
  const [customIp, setCustomIp] = useState("185.220.101.44");
  const [customPath, setCustomPath] = useState("/admin/config.json");
  const [customCount, setCustomCount] = useState(25);
  const [message, setMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalInfoContent | null>(null);

  const handleRun = async (
    mode: string,
    count: number = 40,
    delay: number = 0.1,
    ip?: string,
    path?: string
  ) => {
    setLoadingMode(mode);
    setMessage(null);
    const res = await onSimulate(mode, count, delay, ip, path);
    setLoadingMode(null);

    if (res?.status === "started") {
      setMessage(`Started '${mode}' simulation (${count} requests)`);
    } else if (res?.message) {
      setMessage(res.message);
    }
    setTimeout(() => setMessage(null), 4000);
  };

  const simulatorInfo: ModalInfoContent = {
    title: "Synthetic Telemetry & Traffic Injector",
    category: "Simulation Engine",
    badge: "Interactive Testing",
    badgeColor: "amber",
    summary:
      "This simulator generates real HTTP calls sent directly to the FastAPI telemetry ingestion endpoint, mimicking different network activity profiles to validate real-time concept drift detection.",
    keyPoints: [
      "Normal User Traffic: Sends legitimate requests from clean IP blocks to demonstrate baseline operation.",
      "Gradual Concept Drift: Slowly shifts API endpoint access depth and method balance to test PSI & KS-Test sensitivity.",
      "Volumetric Botnet Attack: Bursts high-frequency HTTP GET/POST requests from TOR exit nodes & known botnet IP ranges (e.g. 185.220.101.x).",
      "Custom Fake IP Injection: Allows manual entry of target IP addresses and request paths."
    ],
    normalVsAnomaly: {
      normal: "Clean browsing patterns maintaining low RPS and static feature averages.",
      anomaly: "High request rates or IP addresses tagged as TOR/Botnet causing threat risk alerts in the live telemetry stream."
    },
    howToTest: "Click any of the 3 preset buttons or fill in custom IP/Path and click 'Inject' to observe live events in the table below!"
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Synthetic Telemetry Injector
                <button
                  onClick={() => setActiveModal(simulatorInfo)}
                  className="rounded-full p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all"
                  title="Learn about Traffic Injector"
                >
                  <Info className="h-4 w-4" />
                </button>
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Generate synthetic HTTP traffic and fake IP calls to demonstrate concept drift & IDS response
            </p>
          </div>

          {message && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-400 border border-emerald-500/30 animate-fadeIn">
              <Check className="h-4 w-4" />
              <span>{message}</span>
            </div>
          )}
        </div>

        {/* Preset Action Buttons */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {/* Normal Users */}
          <button
            disabled={loadingMode !== null}
            onClick={() => handleRun("normal", 35, 0.12)}
            className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-left hover:bg-emerald-900/30 transition-all group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Play className="h-4 w-4 fill-emerald-400/20" />
                Normal User Traffic
              </span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                Clean IPs
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Sends 35 standard browsing requests from legitimate IPs (198.51.100.x) to clean paths.
            </p>
          </button>

          {/* Gradual Shift */}
          <button
            disabled={loadingMode !== null}
            onClick={() => handleRun("gradual", 50, 0.08)}
            className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-left hover:bg-amber-900/30 transition-all group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Radio className="h-4 w-4" />
                Gradual Concept Drift
              </span>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                Ramping Rate
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Gradually ramps request rate and shifts query path depth to trigger PSI and KS-Test warnings.
            </p>
          </button>

          {/* Spike Attack */}
          <button
            disabled={loadingMode !== null}
            onClick={() => handleRun("spike", 75, 0.02)}
            className="flex flex-col gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-left hover:bg-rose-900/30 transition-all group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <ShieldAlert className="h-4 w-4" />
                Volumetric Botnet Attack
              </span>
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300">
                Botnet IPs
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Bursts 75 high-rate HTTP requests from Tor exit nodes & botnet IP ranges (185.220.101.x).
            </p>
          </button>
        </div>

        {/* Custom Fake IP & Path Form */}
        <div className="mt-5 rounded-xl bg-slate-950/80 p-4 border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Terminal className="h-4 w-4 text-cyan-400" />
            Inject Custom Fake IP Payload
          </h3>

          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <label className="text-[11px] font-medium text-slate-400">Target Fake IP Address</label>
              <input
                type="text"
                value={customIp}
                onChange={(e) => setCustomIp(e.target.value)}
                placeholder="e.g. 185.220.101.44"
                className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="text-[11px] font-medium text-slate-400">Request URI Path</label>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="e.g. /admin/login"
                className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3 flex items-end">
              <button
                disabled={loadingMode !== null}
                onClick={() => handleRun("custom", customCount, 0.05, customIp, customPath)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-bold text-white hover:from-cyan-500 hover:to-blue-500 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Inject {customCount} Req
              </button>
            </div>
          </div>
        </div>
      </div>

      <InfoModal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        content={activeModal}
      />
    </>
  );
}

