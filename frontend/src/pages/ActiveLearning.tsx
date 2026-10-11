import React, { useState, useEffect } from "react";
import { api, ActiveLearningResponse } from "../lib/api";
import { useSimulationStore } from "../store/simulationStore";
import { PlotlyChart } from "../components/PlotlyChart";
import {
  RefreshCw,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Cpu,
  CheckCircle2,
} from "lucide-react";

interface ObservedPoint {
  u_over_t: number;
  true_step_height: number;
  is_observed: boolean;
}

export const ActiveLearning: React.FC = () => {
  const [observed, setObserved] = useState<ObservedPoint[]>([
    { u_over_t: 0.0, true_step_height: 0.0, is_observed: true },
    { u_over_t: 8.0, true_step_height: 5.9914, is_observed: true },
  ]);
  const [explorationWeight, setExplorationWeight] = useState<number>(1.5);
  const [alData, setAlData] = useState<ActiveLearningResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const { openExplain } = useSimulationStore();

  const fetchStep = async (points: ObservedPoint[], weight: number) => {
    setLoading(true);
    try {
      const data = await api.runActiveLearningStep({
        observed_points: points,
        exploration_weight: weight,
      });
      setAlData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStep(observed, explorationWeight);
  }, [explorationWeight]);

  const handleAcquireNext = async () => {
    if (!alData) return;
    setLoading(true);
    const nextU = alData.next_suggested_u;

    try {
      // Label next point using the real quantum simulator
      const prof = await api.getVoltageProfile(1.0, nextU);
      const trueStep = prof.half_filling_step_height;

      const updated = [
        ...observed,
        { u_over_t: nextU, true_step_height: trueStep, is_observed: true },
      ];
      setObserved(updated);
      await fetchStep(updated, explorationWeight);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const initial = [
      { u_over_t: 0.0, true_step_height: 0.0, is_observed: true },
      { u_over_t: 8.0, true_step_height: 5.9914, is_observed: true },
    ];
    setObserved(initial);
    fetchStep(initial, explorationWeight);
  };

  const handleExplain = () => {
    openExplain({
      title: "Active Learning & Bayesian Optimization with Gaussian Processes",
      category: "Machine Learning & Quantum Surrogate",
      summary:
        "Evaluating ab initio electronic structure on quantum hardware or large simulators is computationally expensive. Active learning deploys a Gaussian Process surrogate model that predicts both the expected material property and an epistemic uncertainty band (±2σ). By maximizing an acquisition function (Upper Confidence Bound), the algorithm recommends exactly which parameter point to simulate next, maximizing information gain and rapidly shrinking uncertainty.",
      physicsDetails: [
        "Surrogate: Gaussian Process Regressor with squared-exponential (RBF) kernel.",
        "Epistemic uncertainty: σ(U) is wide in unexplored regions and shrinks to zero at observed sample points.",
        "Acquisition strategy: UCB α(U) = μ(U) + κ·σ(U) balancing exploitation (high predicted voltage step) and exploration (high uncertainty).",
        "Ground truth labeler: Directly triggers the 8-qubit Fermi-Hubbard quantum solver.",
      ],
      honestLimits:
        "The surrogate assumes a smooth continuous response surface. In materials exhibiting sudden first-order phase transitions or symmetry-breaking topological jumps, Gaussian Process priors can underestimate discontinuous step jumps.",
    });
  };

  // Plotly Data: GP Mean, Shaded Uncertainty Band, Observed Points
  const gpPlotData = React.useMemo(() => {
    if (!alData) return [];

    const xs = alData.grid_u_over_t;
    const mu = alData.gp_mean;
    const std = alData.gp_std;

    const upper = mu.map((m, i) => m + 1.96 * std[i]);
    const lower = mu.map((m, i) => Math.max(0, m - 1.96 * std[i]));

    return [
      // Shaded 95% Confidence Interval
      {
        x: [...xs, ...xs.slice().reverse()],
        y: [...upper, ...lower.slice().reverse()],
        fill: "toself" as const,
        fillcolor: "rgba(34, 211, 238, 0.12)",
        line: { color: "transparent" },
        name: "95% Confidence Band (±2σ)",
        type: "scatter" as const,
      },
      // GP Posterior Mean
      {
        x: xs,
        y: mu,
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#22D3EE", width: 2.5 },
        name: "Gaussian Process Mean μ(U)",
      },
      // Observed Evaluated Points
      {
        x: observed.map((p) => p.u_over_t),
        y: observed.map((p) => p.true_step_height),
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "#FBBF24", size: 9, symbol: "circle" },
        name: `Evaluated Points (${observed.length})`,
      },
      // Next Suggested Point
      {
        x: [alData.next_suggested_u],
        y: [alData.predicted_step_at_next],
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "#E879F9", size: 14, symbol: "star" },
        name: `Next Proposed Point (U/t = ${alData.next_suggested_u})`,
      },
    ];
  }, [alData, observed]);

  // Acquisition Function Plotly Data
  const acqPlotData = React.useMemo(() => {
    if (!alData) return [];

    return [
      {
        x: alData.grid_u_over_t,
        y: alData.acquisition_scores,
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#E879F9", width: 2 },
        name: "UCB Acquisition α(U)",
      },
    ];
  }, [alData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-quantum-emerald/15 text-quantum-emerald border border-quantum-emerald/30 font-bold uppercase">
              BAYESIAN SURROGATE LOOP
            </span>
            <span className="text-xs text-space-muted font-mono">Iteration #{observed.length} • Epistemic Uncertainty Shrinking</span>
          </div>
          <h2 className="text-xl font-extrabold text-space-text">
            Active-Learning Loop & Autonomous Quantum Candidate Acquisition
          </h2>
        </div>

        <button
          onClick={handleExplain}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-space-card border border-space-border text-space-muted hover:text-space-text text-xs transition-colors self-start md:self-auto"
        >
          <HelpCircle className="w-4 h-4 text-quantum-cyan" />
          <span>Explain Method</span>
        </button>
      </div>

      {/* Control Panel: Next Acquire Button, Exploration Weight Slider */}
      <div className="glass-panel p-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-2 w-full">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-space-muted">Exploration vs Exploitation Trade-off (κ):</span>
              <span className="text-quantum-cyan font-bold">{explorationWeight.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.5"
              value={explorationWeight}
              onChange={(e) => setExplorationWeight(parseFloat(e.target.value))}
              className="w-full cursor-pointer h-2 bg-[#1B2844] rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-space-muted">
              <span>Pure Exploitation (κ = 0.5)</span>
              <span>Balanced (κ = 1.5)</span>
              <span>Aggressive Exploration (κ = 4.0)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleAcquireNext}
              disabled={loading}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-quantum-cyan text-space-bg font-bold text-xs hover:bg-cyan-300 transition-all shadow-cyan-glow disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Acquire Next Candidate Point</span>
            </button>

            <button
              onClick={handleReset}
              className="p-2.5 rounded-xl bg-space-card border border-space-border text-space-muted hover:text-space-text transition-colors"
              title="Reset Active Learning Loop"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Next Suggestion Banner */}
      {alData && (
        <div className="glass-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-quantum-magenta/30 bg-quantum-magenta/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-quantum-magenta/20 text-quantum-magenta">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-quantum-magenta uppercase font-bold">
                Next Sampling Recommendation
              </span>
              <div className="text-sm font-bold text-white">
                Evaluate Hubbard parameter <strong className="text-quantum-magenta">U/t = {alData.next_suggested_u}</strong>
              </div>
            </div>
          </div>
          <div className="text-xs font-mono text-space-muted">
            Predicted Step: <span className="text-white">{alData.predicted_step_at_next} t</span> • Evaluated: <span className="text-quantum-cyan">{observed.length} samples</span>
          </div>
        </div>
      )}

      {/* Main Charts: GP Posterior with Uncertainty Band & Acquisition Function */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: GP Mean & Shaded Band (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold font-mono text-space-text uppercase">
                Gaussian Process Response Surface & Epistemic Uncertainty
              </h4>
              <span className="text-[11px] text-space-muted">
                Shaded band (±2σ) pinches to zero around quantum simulator evaluated points
              </span>
            </div>
          </div>
          <PlotlyChart
            data={gpPlotData}
            layout={{
              xaxis: { title: "Correlation Parameter U/t", range: [-0.5, 10.5] },
              yaxis: { title: "Predicted Voltage Step Height ΔV (t)" },
            }}
            chartId="active-learning-gp-curve"
          />
        </div>

        {/* Right: Acquisition Function */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold font-mono text-space-text uppercase">
                Acquisition Function α(U)
              </h4>
              <span className="text-[11px] text-space-muted">
                Peaks indicate optimal candidate locations
              </span>
            </div>
          </div>
          <PlotlyChart
            data={acqPlotData}
            layout={{
              xaxis: { title: "U/t" },
              yaxis: { title: "UCB Utility Score" },
            }}
            chartId="active-learning-acq-func"
          />
        </div>
      </div>
    </div>
  );
};
