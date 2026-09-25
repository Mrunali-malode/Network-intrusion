"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { Brain, FlaskConical, Tag, RefreshCcw, AlertTriangle, CheckCircle2 } from "lucide-react";

const API = "http://localhost:8000";

interface PerClass { precision: number; recall: number; "f1-score": number; support: number; }
interface Metrics {
  classes: string[];
  test_accuracy: number;
  test_macro_f1: number;
  per_class: Record<string, PerClass>;
  confusion_matrix: { labels: string[]; matrix: number[][] };
  trained_at?: string;
}
interface Status {
  pending: { bucket_name: string; pending_count: number; samples: Array<{ src_ip: string; path: string; model_guess: string; confidence: number }> };
  custom_classes: Record<string, number>;
  retrain: { state: string; message: string; tail?: string[] };
  metrics: { current: Metrics | null; previous: Metrics | null };
  model: { loaded: boolean; classes: string[] };
}

export default function LearningPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [labelName, setLabelName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/learning/status`);
      if (r.ok) { setStatus(await r.json()); setConnected(true); }
    } catch { setConnected(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  const doLabel = async () => {
    setBusy("label");
    try {
      await fetch(`${API}/learning/label`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: labelName }),
      });
      setLabelName("");
      await load();
    } finally { setBusy(null); }
  };

  const doRetrain = async () => {
    setBusy("retrain");
    try {
      await fetch(`${API}/learning/retrain`, { method: "POST" });
      await load();
    } finally { setBusy(null); }
  };

  const cur = status?.metrics.current;
  const prev = status?.metrics.previous;
  const pending = status?.pending;
  const retrain = status?.retrain;
  const customClasses = status?.custom_classes || {};
  const retraining = retrain?.state === "running";

  const delta = (a?: number, b?: number) =>
    a != null && b != null ? (a - b >= 0 ? `+${(a - b).toFixed(3)}` : (a - b).toFixed(3)) : "";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Navbar connected={connected} totalRequests={0} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2">
            <Brain className="h-6 w-6 text-cyan-400" /> Active Learning
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Capture novel attacks the model is unsure about, label them, and retrain to learn new classes.
          </p>
        </div>

        {/* Novel bucket */}
        <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-950/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-fuchsia-400" /> Novel Attack Bucket
            </h2>
            <span className="rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/40 px-3 py-1 text-xs font-mono font-bold">
              {pending?.bucket_name || "Attack-1"} · {pending?.pending_count ?? 0} captured
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Events flagged when drift is high and the model isn&apos;t confident about a known class.
          </p>

          {pending && pending.samples.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 text-slate-400 uppercase text-[11px] font-mono">
                  <tr><th className="py-2 px-3">Source IP</th><th className="py-2 px-3">Path</th><th className="py-2 px-3">Model guess</th><th className="py-2 px-3">Conf</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {pending.samples.map((s, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3">{s.src_ip}</td>
                      <td className="py-2 px-3 text-slate-400">{s.path}</td>
                      <td className="py-2 px-3">{s.model_guess}</td>
                      <td className="py-2 px-3 text-slate-400">{(s.confidence * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-cyan-400" />
              <input
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                placeholder="Name this attack (new or existing class)…"
                className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none w-72 font-mono"
              />
            </div>
            <button
              onClick={doLabel}
              disabled={!pending?.pending_count || busy === "label"}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40 hover:brightness-110"
            >
              {busy === "label" ? "Labeling…" : "Label + generate synthetic"}
            </button>
          </div>

          {Object.keys(customClasses).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-slate-400 self-center">Labeled classes:</span>
              {Object.entries(customClasses).map(([name, n]) => (
                <span key={name} className="rounded-lg bg-teal-950/40 border border-teal-500/40 px-3 py-1 text-xs font-mono text-teal-300">
                  {name} · {n} rows
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Retrain */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <RefreshCcw className={`h-5 w-5 text-cyan-400 ${retraining ? "animate-spin" : ""}`} /> Retrain Model
            </h2>
            <button
              onClick={doRetrain}
              disabled={retraining || busy === "retrain" || Object.keys(customClasses).length === 0}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40 hover:brightness-110"
            >
              {retraining ? "Retraining…" : "Retrain now"}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Retrains on NSL-KDD + your labeled classes (~15s once the dataset is cached), then hot-reloads the model.
          </p>
          {retrain && retrain.state !== "idle" && (
            <div className={`rounded-lg border p-3 text-xs font-mono ${
              retrain.state === "done" ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
              : retrain.state === "error" ? "border-rose-500/40 bg-rose-950/20 text-rose-300"
              : "border-cyan-500/40 bg-cyan-950/20 text-cyan-300"}`}>
              <div className="flex items-center gap-2 font-bold">
                {retrain.state === "done" ? <CheckCircle2 className="h-4 w-4" /> : retrain.state === "error" ? <AlertTriangle className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4 animate-spin" />}
                {retrain.state.toUpperCase()} — {retrain.message}
              </div>
              {retrain.tail && retrain.tail.length > 0 && (
                <pre className="mt-2 whitespace-pre-wrap text-[10px] text-slate-400">{retrain.tail.join("\n")}</pre>
              )}
            </div>
          )}
        </div>

        {/* Model card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
          <h2 className="text-lg font-bold text-white">Model Card</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400 uppercase">Test accuracy</div>
              <div className="text-2xl font-black text-white font-mono">{cur ? (cur.test_accuracy * 100).toFixed(1) + "%" : "—"}</div>
              {prev && <div className="text-[11px] text-slate-500 font-mono">prev {(prev.test_accuracy * 100).toFixed(1)}% ({delta(cur?.test_accuracy, prev?.test_accuracy)})</div>}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400 uppercase">Macro F1</div>
              <div className="text-2xl font-black text-white font-mono">{cur ? cur.test_macro_f1.toFixed(3) : "—"}</div>
              {prev && <div className="text-[11px] text-slate-500 font-mono">prev {prev.test_macro_f1.toFixed(3)} ({delta(cur?.test_macro_f1, prev?.test_macro_f1)})</div>}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400 uppercase">Classes</div>
              <div className="text-sm font-bold text-white font-mono mt-1">{cur ? cur.classes.join(", ") : "—"}</div>
            </div>
          </div>

          {/* per-class F1 */}
          {cur && (
            <div className="overflow-x-auto">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Per-class metrics</div>
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 text-slate-400 uppercase text-[11px] font-mono">
                  <tr><th className="py-2 px-3">Class</th><th className="py-2 px-3">Precision</th><th className="py-2 px-3">Recall</th><th className="py-2 px-3">F1</th><th className="py-2 px-3">Support</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {cur.classes.map((c) => {
                    const pc = cur.per_class[c];
                    if (!pc) return null;
                    return (
                      <tr key={c}>
                        <td className="py-2 px-3 font-bold text-white">{c}</td>
                        <td className="py-2 px-3">{pc.precision.toFixed(2)}</td>
                        <td className="py-2 px-3">{pc.recall.toFixed(2)}</td>
                        <td className="py-2 px-3 text-cyan-300">{pc["f1-score"].toFixed(2)}</td>
                        <td className="py-2 px-3 text-slate-400">{pc.support}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* confusion matrix */}
          {cur?.confusion_matrix && (
            <div className="overflow-x-auto">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Confusion matrix (rows = actual)</div>
              <table className="text-xs font-mono">
                <thead>
                  <tr>
                    <th className="py-1.5 px-2 text-slate-500"></th>
                    {cur.confusion_matrix.labels.map((l) => (
                      <th key={l} className="py-1.5 px-2 text-slate-400">{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cur.confusion_matrix.matrix.map((row, i) => {
                    const total = row.reduce((a, b) => a + b, 0) || 1;
                    return (
                      <tr key={i}>
                        <td className="py-1.5 px-2 text-slate-400 font-bold">{cur.confusion_matrix.labels[i]}</td>
                        {row.map((v, j) => {
                          const intensity = v / total;
                          const correct = i === j;
                          return (
                            <td key={j} className="py-1.5 px-2 text-center rounded"
                              style={{ background: correct ? `rgba(16,185,129,${0.15 + intensity * 0.5})` : `rgba(244,63,94,${intensity * 0.5})`, color: "#e2e8f0" }}>
                              {v}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
