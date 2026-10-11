import React, { useState, useEffect } from "react";
import { api, CandidateMaterial } from "../lib/api";
import { useSimulationStore } from "../store/simulationStore";
import { PlotlyChart } from "../components/PlotlyChart";
import {
  BarChart3,
  HelpCircle,
  Sliders,
  Award,
  Sparkles,
  Info,
  CheckCircle,
} from "lucide-react";

export const CandidateRanking: React.FC = () => {
  const { candidates, setCandidates, weights, setWeights, openExplain } = useSimulationStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateMaterial | null>(null);

  const fetchRanked = async (w: typeof weights) => {
    setLoading(true);
    try {
      const data = await api.rankCandidates(w);
      setCandidates(data);
      if (!selectedCandidate && data.length > 0) {
        setSelectedCandidate(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanked(weights);
  }, [weights]);

  const handleExplain = () => {
    openExplain({
      title: "Multi-Objective Battery Candidate Screening & Pareto Frontier",
      category: "Material Informatics",
      summary:
        "Electrochemical battery design requires balancing conflicting physical trade-offs: specific capacity (energy storage), open-circuit voltage, lattice volume expansion (cycling strain), and Li+ migration barrier (fast charging rate). A material is Pareto optimal if no other candidate has strictly superior properties across all metrics without sacrifice.",
      physicsDetails: [
        "Synthetic demo library: Parameterized from correlated Hubbard U/t proxies and experimental literature benchmarks.",
        "Pareto optimality: Highlights non-dominated solutions across capacity (mAh/g) vs discharge voltage (V).",
        "Utility function: Normalized weighted sum across four practical battery performance criteria.",
      ],
      honestLimits:
        "All candidate metrics are synthetic demonstration data based on qualitative Hubbard proxies and standard experimental literature. Real materials discovery requires full ab initio DFT active-space construction and high-throughput validation.",
    });
  };

  // Radar Chart Plotly Data
  const radarPlotData = React.useMemo(() => {
    if (!selectedCandidate) return [];

    const categories = ["Capacity", "Voltage", "Low Volume Strain", "Fast Ion Transport"];
    // Normalized 0 to 1 values
    const capNorm = Math.min(1, selectedCandidate.specific_capacity_mah_g / 300);
    const voltNorm = Math.min(1, selectedCandidate.nominal_voltage_v / 5);
    const volNorm = Math.min(1, 1 - Math.abs(selectedCandidate.volume_change_pct) / 20);
    const barrNorm = Math.min(1, 1 - (selectedCandidate.migration_barrier_ev - 0.15) / 0.4);

    return [
      {
        type: "scatterpolar" as const,
        r: [capNorm, voltNorm, volNorm, barrNorm, capNorm],
        theta: [...categories, categories[0]],
        fill: "toself" as const,
        fillcolor: "rgba(34, 211, 238, 0.25)",
        line: { color: "#22D3EE", width: 2 },
        name: selectedCandidate.name,
      },
    ];
  }, [selectedCandidate]);

  // Pareto Frontier Plot Data (Capacity vs Voltage)
  const paretoPlotData = React.useMemo(() => {
    if (!candidates.length) return [];

    const paretoItems = candidates.filter((c) => c.is_pareto_optimal);
    const nonParetoItems = candidates.filter((c) => !c.is_pareto_optimal);

    return [
      {
        x: nonParetoItems.map((c) => c.specific_capacity_mah_g),
        y: nonParetoItems.map((c) => c.nominal_voltage_v),
        text: nonParetoItems.map((c) => `${c.formula} (${c.name})`),
        type: "scatter" as const,
        mode: "markers+text" as const,
        textposition: "top center" as const,
        textfont: { color: "#9FB3CC", size: 10, family: "JetBrains Mono" },
        marker: { color: "#3B82F6", size: 9 },
        name: "Standard Candidates",
      },
      {
        x: paretoItems.map((c) => c.specific_capacity_mah_g),
        y: paretoItems.map((c) => c.nominal_voltage_v),
        text: paretoItems.map((c) => `★ ${c.formula}`),
        type: "scatter" as const,
        mode: "markers+text" as const,
        textposition: "bottom center" as const,
        textfont: { color: "#FBBF24", size: 11, family: "JetBrains Mono" },
        marker: { color: "#FBBF24", size: 14, symbol: "star" },
        name: "Pareto Front (Non-Dominated)",
      },
    ];
  }, [candidates]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-quantum-amber/15 text-quantum-amber border border-quantum-amber/30 font-bold uppercase">
              SYNTHETIC DEMO DATA
            </span>
            <span className="text-xs text-space-muted font-mono">Multi-Objective Optimization • Pareto Front</span>
          </div>
          <h2 className="text-xl font-extrabold text-space-text">
            Battery Material Candidate Screening & Multi-Objective Ranking
          </h2>
        </div>

        <button
          onClick={handleExplain}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-space-card border border-space-border text-space-muted hover:text-space-text text-xs transition-colors self-start md:self-auto"
        >
          <HelpCircle className="w-4 h-4 text-quantum-cyan" />
          <span>Explain Methodology</span>
        </button>
      </div>

      {/* Multi-Objective Weighting Sliders */}
      <div className="glass-panel p-5">
        <h4 className="text-xs font-bold font-mono text-space-text uppercase mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-quantum-cyan" />
          <span>Adjust Objective Priority Weights</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-space-muted">Specific Capacity:</span>
              <span className="text-quantum-cyan font-bold">{Math.round(weights.w_capacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.w_capacity}
              onChange={(e) => setWeights({ ...weights, w_capacity: parseFloat(e.target.value) })}
              className="w-full cursor-pointer h-1.5 bg-[#1B2844] rounded"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-space-muted">Nominal Voltage:</span>
              <span className="text-quantum-cyan font-bold">{Math.round(weights.w_voltage * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.w_voltage}
              onChange={(e) => setWeights({ ...weights, w_voltage: parseFloat(e.target.value) })}
              className="w-full cursor-pointer h-1.5 bg-[#1B2844] rounded"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-space-muted">Low Volume Strain:</span>
              <span className="text-quantum-cyan font-bold">{Math.round(weights.w_volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.w_volume}
              onChange={(e) => setWeights({ ...weights, w_volume: parseFloat(e.target.value) })}
              className="w-full cursor-pointer h-1.5 bg-[#1B2844] rounded"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-space-muted">Fast Diffusion Rate:</span>
              <span className="text-quantum-cyan font-bold">{Math.round(weights.w_barrier * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.w_barrier}
              onChange={(e) => setWeights({ ...weights, w_barrier: parseFloat(e.target.value) })}
              className="w-full cursor-pointer h-1.5 bg-[#1B2844] rounded"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Candidates Table and Radar/Pareto Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidates Table (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold font-mono text-space-text uppercase">
              Screened Candidate Materials (Ranked by Utility Score)
            </h4>
            <span className="text-[10px] text-quantum-amber font-mono">
              {candidates.filter((c) => c.is_pareto_optimal).length} Pareto-Optimal Materials
            </span>
          </div>

          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-space-border text-space-muted text-[11px]">
                <th className="pb-2">Rank</th>
                <th className="pb-2">Formula / Name</th>
                <th className="pb-2">Capacity</th>
                <th className="pb-2">Voltage</th>
                <th className="pb-2">ΔVol %</th>
                <th className="pb-2">Barrier</th>
                <th className="pb-2">U/t</th>
                <th className="pb-2">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-space-border/50">
              {candidates.map((c, idx) => {
                const isSelected = selectedCandidate?.id === c.id;
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCandidate(c)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-quantum-cyan/15 text-quantum-cyan"
                        : "hover:bg-space-card/60 text-space-text"
                    }`}
                  >
                    <td className="py-2.5 font-bold">
                      #{idx + 1}
                      {c.is_pareto_optimal && (
                        <span className="ml-1 text-quantum-amber" title="Pareto Optimal">
                          ★
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span className="font-bold text-white block">{c.formula}</span>
                      <span className="text-[10px] text-space-muted">{c.name}</span>
                    </td>
                    <td className="py-2.5">{c.specific_capacity_mah_g} mAh/g</td>
                    <td className="py-2.5">{c.nominal_voltage_v} V</td>
                    <td className="py-2.5">{c.volume_change_pct > 0 ? `+${c.volume_change_pct}` : c.volume_change_pct}%</td>
                    <td className="py-2.5">{c.migration_barrier_ev} eV</td>
                    <td className="py-2.5 text-quantum-amber">{c.u_over_t}</td>
                    <td className="py-2.5 font-bold text-quantum-cyan">{c.utility_score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Candidate Radar Card */}
        <div className="glass-panel p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold font-mono text-space-text uppercase">
                Trade-off Radar Profile
              </h4>
              {selectedCandidate?.is_pareto_optimal && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-quantum-amber/20 text-quantum-amber border border-quantum-amber/40">
                  Pareto Front
                </span>
              )}
            </div>

            {selectedCandidate && (
              <div className="mb-2">
                <span className="text-sm font-bold text-white">{selectedCandidate.formula}</span>
                <p className="text-[11px] text-space-muted mt-0.5 leading-snug">
                  {selectedCandidate.description}
                </p>
              </div>
            )}

            <PlotlyChart
              data={radarPlotData}
              layout={{
                polar: {
                  bgcolor: "transparent",
                  radialaxis: { visible: true, range: [0, 1], gridcolor: "#1E2B44" },
                  angularaxis: { gridcolor: "#1E2B44", tickfont: { size: 9, color: "#9FB3CC" } },
                },
                margin: { l: 30, r: 30, t: 20, b: 20 },
              }}
              chartId="candidate-radar"
              className="w-full h-56"
            />
          </div>
        </div>
      </div>

      {/* Pareto Frontier Plot (Capacity vs Voltage) */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-xs font-bold font-mono text-space-text uppercase">
              2D Pareto Frontier (Specific Capacity vs. Discharge Voltage)
            </h4>
            <span className="text-[11px] text-space-muted">
              Starred materials represent non-dominated candidates maximizing both metrics simultaneously
            </span>
          </div>
        </div>

        <PlotlyChart
          data={paretoPlotData}
          layout={{
            xaxis: { title: "Specific Capacity (mAh/g)", range: [100, 310] },
            yaxis: { title: "Nominal Open Circuit Voltage (V)", range: [2.5, 5.0] },
          }}
          chartId="pareto-frontier-plot"
        />
      </div>
    </div>
  );
};
