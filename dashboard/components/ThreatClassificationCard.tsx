"use client";

import { Detection, ThreatSummary, AttackClass } from "@/hooks/useSocket";
import { ShieldCheck, Crosshair, Radar, KeyRound, Terminal, ShieldAlert, Brain } from "lucide-react";

interface Props {
  detection: Detection | null;
  threatSummary: ThreatSummary;
}

const CLASS_META: Record<
  string,
  { color: string; bg: string; border: string; bar: string; icon: any; label: string }
> = {
  Normal: { color: "text-emerald-400", bg: "bg-emerald-950/30", border: "border-emerald-500/40", bar: "bg-emerald-500", icon: ShieldCheck, label: "Normal Traffic" },
  DoS: { color: "text-rose-400", bg: "bg-rose-950/30", border: "border-rose-500/50", bar: "bg-rose-500", icon: Crosshair, label: "Denial of Service" },
  Probe: { color: "text-amber-400", bg: "bg-amber-950/30", border: "border-amber-500/50", bar: "bg-amber-500", icon: Radar, label: "Probe / Recon" },
  R2L: { color: "text-purple-400", bg: "bg-purple-950/30", border: "border-purple-500/50", bar: "bg-purple-500", icon: KeyRound, label: "Remote-to-Local" },
  U2R: { color: "text-fuchsia-400", bg: "bg-fuchsia-950/30", border: "border-fuchsia-500/50", bar: "bg-fuchsia-500", icon: Terminal, label: "User-to-Root / RCE" },
  Unknown: { color: "text-slate-400", bg: "bg-slate-900/40", border: "border-slate-700", bar: "bg-slate-600", icon: ShieldAlert, label: "Unknown" },
};

const ORDER: AttackClass[] = ["Normal", "DoS", "Probe", "R2L", "U2R"];

// Palette for custom/learned classes (SlowLoris, etc.) not in CLASS_META.
const CUSTOM_META = { color: "text-teal-300", bg: "bg-teal-950/30", border: "border-teal-500/50", bar: "bg-teal-400", icon: ShieldAlert, label: "" };
function metaFor(cls: string) {
  if (CLASS_META[cls]) return CLASS_META[cls];
  return { ...CUSTOM_META, label: cls };
}

export default function ThreatClassificationCard({ detection, threatSummary }: Props) {
  const modelLoaded = detection?.model_loaded !== false;
  const isNovel = !!detection?.novel;
  const current = isNovel ? "Unknown" : (detection?.label || "Unknown");
  const meta = isNovel ? CLASS_META.Unknown : metaFor(current);
  const Icon = meta.icon;

  const totalClassified = ORDER.reduce((s, c) => s + (threatSummary.class_counts[c] || 0), 0) || 1;
  const dominant = threatSummary.dominant_attack;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              NIDS Attack Classification
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Two-tier: RandomForest (NSL-KDD) + signature layer · 5-class taxonomy
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border font-mono ${
            modelLoaded
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
          }`}
        >
          {modelLoaded ? "MODEL ONLINE" : "MODEL NOT LOADED"}
        </span>
      </div>

      {!modelLoaded && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-sm text-rose-200">
          Model artifact not found. Train it first: <code className="text-rose-300">cd nids-model &amp;&amp; python train.py</code>
        </div>
      )}

      {/* Current verdict banner */}
      <div className={`flex items-center justify-between rounded-xl ${meta.bg} p-4 border ${meta.border}`}>
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2.5 border ${meta.border} ${meta.color} ${current !== "Normal" && current !== "Unknown" ? "animate-pulse" : ""}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">Latest Classification</span>
              {isNovel ? (
                <span className="rounded px-1.5 py-0.5 text-[9px] font-extrabold border bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40">
                  NOVEL · UNKNOWN
                </span>
              ) : detection?.source ? (
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold border ${
                    detection.source === "signature"
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                      : "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                  }`}
                >
                  {detection.source === "signature" ? "SIGNATURE" : "ML MODEL"}
                </span>
              ) : null}
            </div>
            <div className={`text-xl font-black ${meta.color} font-mono`}>{isNovel ? "Unknown / Investigating" : meta.label}</div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isNovel
                ? "Drift + low model confidence — captured as a novel attack candidate. Label it on the Learning page."
                : (detection?.description || "Awaiting traffic…")}
            </p>
            {detection?.source === "signature" && detection.signature?.reason && (
              <p className="text-[11px] text-amber-300/80 mt-1 font-mono">
                ⚑ {detection.signature.reason}
                {detection.model_label && detection.model_label !== detection.label && (
                  <span className="text-slate-500"> · model said {detection.model_label}</span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="hidden sm:block text-right font-mono">
          <div className={`text-2xl font-black ${meta.color}`}>
            {detection ? `${(detection.confidence * 100).toFixed(1)}%` : "—"}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest">Confidence</div>
        </div>
      </div>

      {/* Per-class probability of the latest event */}
      {detection && detection.probabilities && Object.keys(detection.probabilities).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Latest Event — Class Probabilities</div>
          {Object.keys(detection.probabilities)
            .sort((a, b) => (detection.probabilities[b] || 0) - (detection.probabilities[a] || 0))
            .map((c) => {
            const p = detection.probabilities[c] || 0;
            const m = metaFor(c);
            return (
              <div key={c} className="flex items-center gap-3">
                <span className={`w-28 text-xs font-mono ${m.color}`}>{c}</span>
                <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full ${m.bar} transition-all duration-300`} style={{ width: `${Math.max(1, p * 100)}%` }} />
                </div>
                <span className="w-14 text-right text-[11px] font-mono text-slate-300">{(p * 100).toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Rolling window distribution */}
      <div className="border-t border-slate-800/80 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent Window ({threatSummary.window_size} events)
          </div>
          {dominant && (
            <span className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${CLASS_META[dominant]?.color} ${CLASS_META[dominant]?.bg} border ${CLASS_META[dominant]?.border}`}>
              DOMINANT THREAT: {dominant}
            </span>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-5">
          {ORDER.map((c) => {
            const count = threatSummary.class_counts[c] || 0;
            const pct = (count / totalClassified) * 100;
            const m = CLASS_META[c];
            return (
              <div key={c} className={`rounded-lg border ${m.border} ${m.bg} p-3 text-center`}>
                <div className={`text-xl font-black font-mono ${m.color}`}>{count}</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400 font-mono">{c}</div>
                <div className="text-[10px] text-slate-500">{pct.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top attacker IPs */}
      {threatSummary.top_attacker_ips.length > 0 && (
        <div className="border-t border-slate-800/80 pt-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Top Attacker Sources</div>
          <div className="flex flex-wrap gap-2">
            {threatSummary.top_attacker_ips.map((a) => (
              <span key={a.ip} className="inline-flex items-center gap-2 rounded-lg bg-rose-950/20 border border-rose-500/30 px-3 py-1.5 text-xs font-mono text-rose-300">
                <ShieldAlert className="h-3.5 w-3.5" />
                {a.ip}
                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold">{a.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
