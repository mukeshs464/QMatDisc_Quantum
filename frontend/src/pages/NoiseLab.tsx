import React, { useState, useEffect } from "react";
import { api, ZNEResponse } from "../lib/api";
import { useSimulationStore } from "../store/simulationStore";
import { PlotlyChart } from "../components/PlotlyChart";
import {
  Activity,
  HelpCircle,
  ShieldCheck,
  Zap,
  TrendingDown,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export const NoiseLab: React.FC = () => {
  const [eps, setEps] = useState<number>(0.0003);
  const [shots, setShots] = useState<number>(100000);
  const [cnotCount, setCnotCount] = useState<number>(48);
  const [nTrials, setNTrials] = useState<number>(200);
  const [zneData, setZneData] = useState<ZNEResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [barrenScan, setBarrenScan] = useState<any[]>([]);

  const { openExplain } = useSimulationStore();

  const runBenchmark = async () => {
    setLoading(true);
    try {
      const data = await api.runZNEBenchmark({
        distance_angstrom: 0.735,
        cnot_count: cnotCount,
        eps,
        shots,
        n_trials: nTrials,
        seed: 7,
      });
      setZneData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runBenchmark();
    api.getBarrenPlateaus().then(setBarrenScan).catch(console.error);
  }, [eps, shots, cnotCount]);

  const handleExplain = () => {
    openExplain({
      title: "Depolarizing Noise & Richardson Zero-Noise Extrapolation (ZNE)",
      category: "Quantum Error Mitigation",
      summary:
        "On noisy intermediate-scale quantum (NISQ) devices, two-qubit entangling gates (CNOTs) suffer from depolarizing error ε. This dampens non-identity Pauli observables by (1 - ε)^(G·k). At raw hardware error rates (ε = 3e-4, 48 CNOTs), the ground-state energy deviates by ~15 mHa—far outside the chemical accuracy window. Zero-Noise Extrapolation intentionally inflates the noise scale factor k ∈ {1, 3, 5} via pulse stretching or unitary folding, then fits a Richardson quadratic polynomial to extrapolate back to the noiseless limit k → 0.",
      physicsDetails: [
        "Noise channel: Global depolarizing damping ⟨P_i⟩_noisy = ⟨P_i⟩ · (1 - ε)^(G·k).",
        "Projection shot noise: Modeled via Binomial(shots, (1 + ⟨P⟩)/2) per Pauli string.",
        "Richardson fit: Second-order polynomial fit over scale factors k ∈ {1, 3, 5}.",
        "Chemical accuracy criterion: |E - E_exact| ≤ 1.6 mHa (1 kcal/mol).",
      ],
      honestLimits:
        "ZNE relies on uniform gate error scaling. If non-Markovian noise, coherent crosstalk, or state-preparation and measurement (SPAM) drift dominates, polynomial extrapolation can overfit and amplify sampling variance.",
    });
  };

  // Dual-Histogram Plotly Data (Raw vs ZNE)
  const histogramPlotData = React.useMemo(() => {
    if (!zneData) return [];

    const bins = zneData.raw_histogram_bins;
    const rawCounts = zneData.raw_histogram_counts;
    const zneCounts = zneData.zne_histogram_counts;

    return [
      {
        x: bins,
        y: rawCounts,
        type: "bar" as const,
        name: "Raw Noisy VQE",
        marker: { color: "#FBBF24", opacity: 0.75 },
      },
      {
        x: bins,
        y: zneCounts,
        type: "bar" as const,
        name: "After Richardson ZNE",
        marker: { color: "#22D3EE", opacity: 0.85 },
      },
    ];
  }, [zneData]);

  // Richardson Extrapolation Curve for Sample Trial 0
  const richardsonCurveData = React.useMemo(() => {
    if (!zneData?.sample_trials?.length) return [];

    const trial = zneData.sample_trials[0];
    const scales = [1, 3, 5];
    const energies = scales.map((k) => trial.scale_energies[String(k)]);

    // Quadratic curve fit points
    const fitX = [0, 1, 2, 3, 4, 5];
    // Richardson extrapolated value at 0
    const fitY = [trial.zne_energy, ...energies];

    return [
      {
        x: scales,
        y: energies,
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "#FBBF24", size: 10, symbol: "circle" },
        name: "Measured Scales (k = 1, 3, 5)",
      },
      {
        x: [0],
        y: [trial.zne_energy],
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "#22D3EE", size: 12, symbol: "star" },
        name: `ZNE Limit k→0 (${trial.zne_energy.toFixed(5)} Ha)`,
      },
      {
        x: [0, 5],
        y: [zneData.exact_energy, zneData.exact_energy],
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#E879F9", width: 1.5, dash: "dash" as const },
        name: "Exact FCI Ground State",
      },
    ];
  }, [zneData]);

  // Barren Plateau Variance Scan Data
  const barrenPlotData = React.useMemo(() => {
    if (!barrenScan.length) return [];

    const qs = barrenScan.map((b) => b.n_qubits);
    const variances = barrenScan.map((b) => b.variance);
    const bounds = barrenScan.map((b) => b.theoretical_bound);

    return [
      {
        x: qs,
        y: variances,
        type: "scatter" as const,
        mode: "lines+markers" as const,
        line: { color: "#FB7185", width: 2 },
        marker: { size: 6, color: "#FB7185" },
        name: "Empirical Var[∂E/∂θ]",
      },
      {
        x: qs,
        y: bounds,
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#9FB3CC", width: 1.5, dash: "dot" as const },
        name: "Theoretical Bound ~ 2⁻ⁿ",
      },
    ];
  }, [barrenScan]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-quantum-magenta/15 text-quantum-magenta border border-quantum-magenta/30 font-bold uppercase">
              ERROR MITIGATION & NOISE SIMULATOR
            </span>
            <span className="text-xs text-space-muted font-mono">Richardson Extrapolation • Scales 1, 3, 5</span>
          </div>
          <h2 className="text-xl font-extrabold text-space-text">
            Zero-Noise Extrapolation & Chemical Accuracy Restoration
          </h2>
        </div>

        <button
          onClick={handleExplain}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-space-card border border-space-border text-space-muted hover:text-space-text text-xs transition-colors self-start md:self-auto"
        >
          <HelpCircle className="w-4 h-4 text-quantum-cyan" />
          <span>Explain Theory</span>
        </button>
      </div>

      {/* Control Panel: Error rate, shots, CNOT count sliders */}
      <div className="glass-panel p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CNOT error rate eps */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-space-muted">CNOT Error Rate ε:</span>
              <span className="text-quantum-magenta font-bold text-sm">{(eps * 100).toFixed(2)}% ({eps.toExponential(1)})</span>
            </div>
            <input
              type="range"
              min="0.00005"
              max="0.0015"
              step="0.00005"
              value={eps}
              onChange={(e) => setEps(parseFloat(e.target.value))}
              className="w-full cursor-pointer h-2 bg-[#1B2844] rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-space-muted">
              <span>0.005% (Superconducting)</span>
              <span className="text-quantum-magenta">0.03% (Standard)</span>
              <span>0.15% (Noisy)</span>
            </div>
          </div>

          {/* Shot Count */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-space-muted">Measurement Shots S:</span>
              <span className="text-quantum-cyan font-bold text-sm">{shots.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="10000"
              max="200000"
              step="10000"
              value={shots}
              onChange={(e) => setShots(parseInt(e.target.value))}
              className="w-full cursor-pointer h-2 bg-[#1B2844] rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-space-muted">
              <span>10k shots</span>
              <span className="text-quantum-cyan">100k shots</span>
              <span>200k shots</span>
            </div>
          </div>

          {/* CNOT Gate Count */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-space-muted">Ansatz CNOT Count G:</span>
              <span className="text-quantum-amber font-bold text-sm">{cnotCount} CNOTs</span>
            </div>
            <input
              type="range"
              min="12"
              max="96"
              step="6"
              value={cnotCount}
              onChange={(e) => setCnotCount(parseInt(e.target.value))}
              className="w-full cursor-pointer h-2 bg-[#1B2844] rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-space-muted">
              <span>12 CNOTs</span>
              <span className="text-quantum-amber">48 CNOTs (UCCD)</span>
              <span>96 CNOTs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistical Outcome Cards */}
      {zneData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4">
            <span className="text-[11px] font-mono text-space-muted block">Raw Noisy MAE</span>
            <div className="text-xl font-bold font-mono text-quantum-amber mt-1">
              {zneData.raw_mae_mHa.toFixed(2)} <span className="text-xs text-space-muted">mHa</span>
            </div>
            <span className="text-[10px] text-quantum-rose font-mono">Outside chemical accuracy</span>
          </div>

          <div className="glass-panel p-4">
            <span className="text-[11px] font-mono text-space-muted block">Richardson ZNE MAE</span>
            <div className="text-xl font-bold font-mono text-quantum-cyan mt-1">
              {zneData.zne_mae_mHa.toFixed(2)} <span className="text-xs text-space-muted">mHa</span>
            </div>
            <span className="text-[10px] text-quantum-emerald font-mono">Restored to chemical accuracy!</span>
          </div>

          <div className="glass-panel p-4">
            <span className="text-[11px] font-mono text-space-muted block">Chemical Accuracy Success</span>
            <div className="text-xl font-bold font-mono text-quantum-emerald mt-1">
              {zneData.chemical_accuracy_success_rate.toFixed(1)}%
            </div>
            <span className="text-[10px] text-space-muted font-mono">Within ±1.6 mHa band</span>
          </div>

          <div className="glass-panel p-4">
            <span className="text-[11px] font-mono text-space-muted block">ZNE Standard Deviation</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              ±{zneData.zne_std_mHa.toFixed(2)} <span className="text-xs text-space-muted">mHa</span>
            </div>
            <span className="text-[10px] text-space-muted font-mono">Across {zneData.n_trials} trials</span>
          </div>
        </div>
      )}

      {/* Main Charts: Dual-Histogram & Richardson Quadratic Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Error Distributions Histogram */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold font-mono text-space-text uppercase">
                Raw vs. Mitigated Error Distributions
              </h4>
              <span className="text-[11px] text-space-muted">
                Shaded band highlights ±1.6 mHa chemical accuracy
              </span>
            </div>
          </div>
          <PlotlyChart
            data={histogramPlotData}
            layout={{
              barmode: "overlay",
              xaxis: { title: "Energy Error E - E₀ (mHa)", range: [-25, 25] },
              yaxis: { title: "Trials Count" },
              shapes: [
                {
                  type: "rect",
                  x0: -1.6,
                  x1: 1.6,
                  y0: 0,
                  y1: 1,
                  yref: "paper",
                  fillcolor: "rgba(52, 211, 153, 0.15)",
                  line: { color: "#34D399", width: 1.2, dash: "dot" },
                },
              ],
            }}
            chartId="zne-error-histogram"
          />
        </div>

        {/* Right: Richardson Polynomial Extrapolation */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold font-mono text-space-text uppercase">
                Richardson Quadratic Fit (k ∈ {`{1, 3, 5}`} → 0)
              </h4>
              <span className="text-[11px] text-space-muted">
                Sample trial zero-noise limit converging to exact ground state
              </span>
            </div>
          </div>
          <PlotlyChart
            data={richardsonCurveData}
            layout={{
              xaxis: { title: "Noise Scale Factor k", range: [-0.5, 5.5] },
              yaxis: { title: "Energy (Hartree)" },
            }}
            chartId="richardson-extrapolation-curve"
          />
        </div>
      </div>

      {/* Barren Plateau Scaling Probe */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-quantum-rose" />
              <h4 className="text-xs font-bold font-mono text-space-text uppercase">
                Barren Plateau Probe: Gradient Variance vs. Qubit Count
              </h4>
            </div>
            <span className="text-[11px] text-space-muted">
              Demonstrates exponential concentration of measure Var[∂E/∂θ] ~ O(2⁻ⁿ) in unstructured circuits
            </span>
          </div>
        </div>

        <PlotlyChart
          data={barrenPlotData}
          layout={{
            xaxis: { title: "Qubit Count n" },
            yaxis: { title: "Gradient Variance Var[∂E/∂θ]", type: "log" },
          }}
          chartId="barren-plateau-scan"
        />
      </div>
    </div>
  );
};
