"use client";

import { useState } from "react";
import { DriftData } from "@/hooks/useSocket";
import { AlertTriangle, CheckCircle2, Flame, Gauge, Info, Layers, HelpCircle } from "lucide-react";
import InfoModal, { ModalInfoContent } from "@/components/InfoModal";

interface DriftCardProps {
  drift: DriftData;
}

export default function DriftCard({ drift }: DriftCardProps) {
  const { status, drift_detected, overall_drift_score, techniques, features } = drift;
  const [activeModalContent, setActiveModalContent] = useState<ModalInfoContent | null>(null);

  const getStatusBadge = () => {
    switch (status) {
      case "CRITICAL":
        return (
          <div className="flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-rose-400 border border-rose-500/40 text-xs font-bold animate-pulse">
            <Flame className="h-4 w-4 text-rose-400" />
            <span>CRITICAL DRIFT DETECTED</span>
          </div>
        );
      case "WARNING":
        return (
          <div className="flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-amber-400 border border-amber-500/40 text-xs font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>DISTRIBUTION SHIFT WARNING</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-400 border border-emerald-500/40 text-xs font-bold">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>DISTRIBUTION STABLE (NORMAL)</span>
          </div>
        );
    }
  };

  const modalInfos: Record<string, ModalInfoContent> = {
    overall: {
      title: "Statistical Concept Drift Sentinel",
      category: "ML Monitoring",
      badge: status,
      badgeColor: status === "CRITICAL" ? "rose" : status === "WARNING" ? "amber" : "emerald",
      summary:
        "Concept drift occurs when the statistical properties of incoming traffic change over time. When botnets, scrapers, or DDoS attacks hit the server, distribution features (RPS, IP frequencies, method ratios) shift away from historical baseline behavior.",
      keyPoints: [
        "Composite Drift Score: Aggregates Kolmogorov-Smirnov, PSI, Wasserstein Distance, and Z-Score into a unified 0-100% risk index.",
        "Baseline Window: The ML backend compares current live streaming traffic against the established clean baseline distribution.",
        "Automatic Alerts: Status escalates from STABLE -> WARNING -> CRITICAL as distribution deviation increases."
      ],
      normalVsAnomaly: {
        normal: "Composite Drift Score < 25%. Traffic pattern matches expected user browsing behavior.",
        anomaly: "Composite Drift Score >= 50%. High statistical divergence caused by automated scripts, attacks, or unexpected traffic bursts."
      },
      howToTest: "Click 'Volumetric Botnet Attack' in the Traffic Simulator panel to see the composite drift index spike and turn CRITICAL!"
    },
    ks_test: {
      title: "Kolmogorov-Smirnov Test (KS-Test)",
      category: "Continuous Distribution Hypothesis Test",
      badge: techniques.ks_test.drift ? "DRIFT DETECTED" : "PASSED",
      badgeColor: techniques.ks_test.drift ? "rose" : "emerald",
      summary:
        "The Kolmogorov-Smirnov test is a non-parametric statistical hypothesis test that compares the cumulative distribution functions (CDF) of two sample sets to decide if they come from the same underlying probability distribution.",
      formula: "p-value < 0.05 => Reject Null Hypothesis (Statistical Drift Confirmed)",
      keyPoints: [
        "D-statistic: Measures the maximum distance between the baseline cumulative distribution and current telemetry distribution.",
        "p-value: Probabilistic metric. A p-value below 0.05 indicates with 95%+ confidence that incoming traffic is statistically different from normal."
      ],
      normalVsAnomaly: {
        normal: "p-value >= 0.05 (High similarity, no distribution shift).",
        anomaly: "p-value < 0.05 (Statistically significant shift detected in numerical features like RPS or payload size)."
      },
      howToTest: "Trigger the 'Gradual Concept Drift' or 'Volumetric Botnet Attack' simulation to drop the p-value below 0.05."
    },
    psi: {
      title: "Population Stability Index (PSI)",
      category: "Categorical Shift & Binning Metric",
      badge: techniques.psi.status,
      badgeColor: techniques.psi.drift ? "rose" : "emerald",
      summary:
        "PSI measures how much a categorical distribution (e.g. HTTP Methods like GET/POST/PUT, HTTP status codes, or User Agent types) has shifted relative to baseline distribution bins.",
      formula: "PSI = Σ (Actual% - Expected%) × ln(Actual% / Expected%)",
      keyPoints: [
        "PSI < 0.10: No significant distribution change (Stable).",
        "0.10 <= PSI < 0.25: Moderate distribution shift (Warning).",
        "PSI >= 0.25: Significant population shift (Severe Drift Alert)."
      ],
      normalVsAnomaly: {
        normal: "PSI score < 0.10. Proportion of GET vs POST requests matches baseline.",
        anomaly: "PSI score >= 0.25. High influx of POST/PUT requests or unexpected endpoint flooding."
      },
      howToTest: "Inject custom requests with unusual paths or high POST counts to watch PSI rise above 0.25."
    },
    wasserstein: {
      title: "Wasserstein Distance (Earth Mover's Distance)",
      category: "Distribution Distance Metric",
      badge: techniques.wasserstein.drift ? "HIGH DISTANCE" : "NORMAL",
      badgeColor: techniques.wasserstein.drift ? "amber" : "emerald",
      summary:
        "Earth Mover's Distance (EMD) computes the minimal 'work' needed to transform one probability distribution into another. It provides a geometric measure of traffic drift.",
      formula: "EMD = ∫ |F_baseline(x) - F_current(x)| dx",
      keyPoints: [
        "Continuous Geometry: Unlike binning tests, EMD accounts for the shape and distance of distribution shifts.",
        "Higher Values = Larger Divergence: A higher distance indicates severe structural divergence in incoming telemetry parameters."
      ],
      normalVsAnomaly: {
        normal: "Low distance score (~0.0 to 0.5). Minimal work needed to align distributions.",
        anomaly: "High distance score (> 1.5). Structural shift in request features."
      },
      howToTest: "Simulate a high-volume request spike to alter the shape of the continuous throughput density curve."
    },
    z_score: {
      title: "Z-Score Throughput Anomaly",
      category: "Statistical Rate Standard Deviation",
      badge: techniques.z_score.drift ? "ANOMALY" : "STABLE",
      badgeColor: techniques.z_score.drift ? "rose" : "emerald",
      summary:
        "Z-Score measures how many standard deviations (|Z|) current incoming Requests Per Second (RPS) deviate from historical baseline moving average.",
      formula: "Z = (Current_RPS - Mean_RPS) / Standard_Deviation_RPS",
      keyPoints: [
        "|Z| <= 2.0: Within expected standard variance.",
        "|Z| > 2.5: Statistically anomalous spike (Volumetric attack or sudden traffic surge)."
      ],
      normalVsAnomaly: {
        normal: "|Z| score near 0. Throughput is consistent with average request rates.",
        anomaly: "|Z| > 2.5. Extreme burst of traffic exceeding standard deviation limits."
      },
      howToTest: "Click 'Quick Telemetry Pulse' or run 'Volumetric Botnet Attack' to produce an immediate Z-Score spike."
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
        {/* Header & Overall Status */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Statistical Concept Drift Sentinel
                <button
                  onClick={() => setActiveModalContent(modalInfos.overall)}
                  className="rounded-full p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all"
                  title="Click to learn about Concept Drift Sentinel"
                >
                  <Info className="h-4 w-4" />
                </button>
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Real-time multi-technique statistical hypothesis testing against historical baseline
            </p>
          </div>

          <div>{getStatusBadge()}</div>
        </div>

        {/* Overall Score Progress Bar */}
        <div className="mt-6 rounded-xl bg-slate-950/80 p-4 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              Composite Drift Index:
              <button
                onClick={() => setActiveModalContent(modalInfos.overall)}
                className="text-slate-400 hover:text-cyan-400 transition-all"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </span>
            <span className={`font-mono text-sm font-bold ${overall_drift_score > 50 ? "text-rose-400" : overall_drift_score > 25 ? "text-amber-400" : "text-emerald-400"}`}>
              {overall_drift_score.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                overall_drift_score > 55
                  ? "bg-gradient-to-r from-amber-500 to-rose-600 shadow-lg shadow-rose-500/50"
                  : overall_drift_score > 25
                  ? "bg-gradient-to-r from-cyan-500 to-amber-500"
                  : "bg-gradient-to-r from-emerald-500 to-cyan-500"
              }`}
              style={{ width: `${Math.max(5, overall_drift_score)}%` }}
            />
          </div>
        </div>

        {/* 4 Statistical Techniques Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. KS-Test */}
          <div className={`rounded-xl border p-4 transition-all relative group ${techniques.ks_test.drift ? "border-rose-500/50 bg-rose-950/20" : "border-slate-800 bg-slate-950/40"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                KS-Test
                <button
                  onClick={() => setActiveModalContent(modalInfos.ks_test)}
                  className="text-slate-400 hover:text-cyan-400 transition-all"
                  title="Explain Kolmogorov-Smirnov Test"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${techniques.ks_test.drift ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                {techniques.ks_test.drift ? "DRIFT" : "PASSED"}
              </span>
            </div>

            <div className="mt-3 font-mono">
              <div className="text-xl font-bold text-white">
                p = {techniques.ks_test.p_value.toFixed(4)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                D-stat: <span className="text-cyan-300">{techniques.ks_test.statistic}</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-500 leading-tight">
              {techniques.ks_test.description} (p &lt; 0.05 drift)
            </p>
          </div>

          {/* 2. Population Stability Index (PSI) */}
          <div className={`rounded-xl border p-4 transition-all relative group ${techniques.psi.drift ? "border-amber-500/50 bg-amber-950/20" : "border-slate-800 bg-slate-950/40"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                PSI (Categorical)
                <button
                  onClick={() => setActiveModalContent(modalInfos.psi)}
                  className="text-slate-400 hover:text-cyan-400 transition-all"
                  title="Explain Population Stability Index"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${techniques.psi.drift ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                {techniques.psi.status}
              </span>
            </div>

            <div className="mt-3 font-mono">
              <div className="text-xl font-bold text-white">
                {techniques.psi.score.toFixed(3)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Shift: <span className="text-cyan-300">{techniques.psi.status}</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-500 leading-tight">
              {techniques.psi.description} (&ge; 0.25 severe)
            </p>
          </div>

          {/* 3. Wasserstein Distance */}
          <div className={`rounded-xl border p-4 transition-all relative group ${techniques.wasserstein.drift ? "border-rose-500/50 bg-rose-950/20" : "border-slate-800 bg-slate-950/40"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                Wasserstein (EMD)
                <button
                  onClick={() => setActiveModalContent(modalInfos.wasserstein)}
                  className="text-slate-400 hover:text-cyan-400 transition-all"
                  title="Explain Wasserstein Distance"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${techniques.wasserstein.drift ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                {techniques.wasserstein.drift ? "HIGH DIST" : "NORMAL"}
              </span>
            </div>

            <div className="mt-3 font-mono">
              <div className="text-xl font-bold text-white">
                {techniques.wasserstein.distance.toFixed(3)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Earth Mover Distance
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-500 leading-tight">
              {techniques.wasserstein.description}
            </p>
          </div>

          {/* 4. Z-Score Anomaly */}
          <div className={`rounded-xl border p-4 transition-all relative group ${techniques.z_score.drift ? "border-rose-500/50 bg-rose-950/20" : "border-slate-800 bg-slate-950/40"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                Z-Score Rate
                <button
                  onClick={() => setActiveModalContent(modalInfos.z_score)}
                  className="text-slate-400 hover:text-cyan-400 transition-all"
                  title="Explain Z-Score Anomaly"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${techniques.z_score.drift ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                {techniques.z_score.drift ? "ANOMALY" : "STABLE"}
              </span>
            </div>

            <div className="mt-3 font-mono">
              <div className="text-xl font-bold text-white">
                Z = {techniques.z_score.score.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Variance: <span className="text-cyan-300">|Z| &gt; 2.5</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-500 leading-tight">
              {techniques.z_score.description}
            </p>
          </div>
        </div>

        {/* Feature Shift Comparison Table */}
        {features && features.length > 0 && (
          <div className="mt-6 border-t border-slate-800/80 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              Feature-Level Shift Diagnostics
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {features.map((feat, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-950/60 p-3 border border-slate-800/60 text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{feat.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Base: <span className="text-slate-300">{feat.baseline_avg}</span> | Curr: <span className="text-cyan-300">{feat.current_avg}</span>
                    </div>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${feat.drift ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                    {feat.drift ? "SHIFT" : "OK"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <InfoModal
        isOpen={activeModalContent !== null}
        onClose={() => setActiveModalContent(null)}
        content={activeModalContent}
      />
    </>
  );
}

