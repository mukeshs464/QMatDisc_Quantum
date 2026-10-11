import React, { useState, useEffect } from "react";
import { api, ResourceEstimateResponse } from "../lib/api";
import { useSimulationStore } from "../store/simulationStore";
import { PlotlyChart } from "../components/PlotlyChart";
import {
  ShieldCheck,
  HelpCircle,
  Cpu,
  Layers,
  Clock,
  Database,
  ExternalLink,
} from "lucide-react";

export const FaultTolerant: React.FC = () => {
  const [orbitals, setOrbitals] = useState<number>(16);
  const [accuracy, setAccuracy] = useState<number>(1.5936); // Chemical accuracy in mHa
  const [errorRate, setErrorRate] = useState<number>(0.001); // 10^-3 physical error rate
  const [estimate, setEstimate] = useState<ResourceEstimateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const { openExplain } = useSimulationStore();

  const fetchEstimate = async (n: number, acc: number, err: number) => {
    setLoading(true);
    try {
      const data = await api.getResourceEstimate(n, acc, err);
      setEstimate(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimate(orbitals, accuracy, errorRate);
  }, [orbitals, accuracy, errorRate]);

  const handleExplain = () => {
    openExplain({
      title: "Fault-Tolerant Quantum Phase Estimation & Resource Scaling",
      category: "Fault-Tolerant Quantum Computing",
      summary:
        "Classical exact diagonalization (Full CI) encounters an insurmountable exponential memory wall ~2^n. Storing a 50-spin-orbital battery cathode state requires over 17 Petabytes of RAM. In contrast, fault-tolerant Quantum Phase Estimation (QPE) scales polynomially in logical qubits and Toffoli complexity ~O(N^3.2) using Tensor Hypercontraction (THC) block encodings, as demonstrated by Delgado et al. (Phys. Rev. A 106, 032428).",
      physicsDetails: [
        "Algorithm: Double-factorized / THC Quantum Phase Estimation for ground-state energy.",
        "Error correction: Rotated surface code patches with code distance d = 21..31 suppressing physical noise (p = 10^-3) to target logical failure rates < 10^-9.",
        "Physical footprint: ~2d² physical qubits per logical patch plus 15-to-1 magic state distillation factories.",
        "Clock speed: Assumes 1 microsecond surface code cycle time on superconducting transmon architectures.",
      ],
      honestLimits:
        "QPE runtime for large active spaces (e.g. 80 orbitals) spans days to weeks of continuous quantum error correction without hardware idling errors. Real fault-tolerant deployment requires physical error rates below 10^-3 and millions of coherent physical qubits.",
    });
  };

  // Logarithmic Scaling Plot Data: Classical 2^n Memory vs Quantum O(n^4) Gates vs Linear Qubits
  const scalingPlotData = React.useMemo(() => {
    const qRange = Array.from({ length: 48 }, (_, i) => i + 4); // 4 to 52 orbitals

    const classicalMemoryGB = qRange.map((q) => {
      if (q > 46) return 1e11;
      return (Math.pow(2, q) * 16) / 1e9;
    });

    const quantumLogicalQubits = qRange.map((q) => q + 2 * Math.ceil(Math.log2(q)) + 8);
    const quantumToffoliScaled = qRange.map((q) => 1.2e7 * Math.pow(q / 16, 3.2));

    return [
      {
        x: qRange,
        y: classicalMemoryGB,
        type: "scatter" as const,
        mode: "lines" as const,
        name: "Classical Exact (FCI) State Memory ~ 2ⁿ [GB]",
        line: { color: "#FBBF24", width: 2.5 },
      },
      {
        x: qRange,
        y: quantumToffoliScaled,
        type: "scatter" as const,
        mode: "lines" as const,
        name: "QPE Toffoli Gate Complexity ~ N³.²",
        line: { color: "#E879F9", width: 2, dash: "dash" as const },
      },
      {
        x: qRange,
        y: quantumLogicalQubits,
        type: "scatter" as const,
        mode: "lines" as const,
        name: "Quantum Register (Logical Qubits ~ N)",
        line: { color: "#22D3EE", width: 2.5 },
      },
    ];
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-quantum-cyan/15 text-quantum-cyan border border-quantum-cyan/30 font-bold uppercase">
              DELGADO ET AL. 2022 BENCHMARK MODEL
            </span>
            <span className="text-xs text-space-muted font-mono">Surface Code • Phys. Rev. A 106, 032428</span>
          </div>
          <h2 className="text-xl font-extrabold text-space-text">
            Fault-Tolerant Quantum Computing Roadmap & Resource Estimator
          </h2>
        </div>

        <button
          onClick={handleExplain}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-space-card border border-space-border text-space-muted hover:text-space-text text-xs transition-colors self-start md:self-auto"
        >
          <HelpCircle className="w-4 h-4 text-quantum-cyan" />
          <span>Explain Scaling</span>
        </button>
      </div>

      {/* Control Panel: Active space slider, accuracy, error rate */}
      <div className="glass-panel p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active space size slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-space-muted">Active Space (Spin-Orbitals):</span>
              <span className="text-quantum-cyan font-bold text-sm">{orbitals} Orbitals</span>
            </div>
            <input
              type="range"
              min="4"
              max="96"
              step="4"
              value={orbitals}
              onChange={(e) => setOrbitals(parseInt(e.target.value))}
              className="w-full cursor-pointer h-2 bg-[#1B2844] rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-space-muted">
              <span>H2 (4)</span>
              <span>Hubbard Ring (8)</span>
              <span className="text-quantum-cyan">LCO (16)</span>
              <span>NMC811 (24)</span>
              <span>Full Host (64+)</span>
            </div>
          </div>

          {/* Target precision */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-space-muted">Target Chemical Precision:</span>
              <span className="text-quantum-magenta font-bold text-sm">{accuracy.toFixed(2)} mHa</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={accuracy}
              onChange={(e) => setAccuracy(parseFloat(e.target.value))}
              className="w-full cursor-pointer h-2 bg-[#1B2844] rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-space-muted">
              <span>0.5 mHa (High)</span>
              <span className="text-quantum-magenta">1.6 mHa (1 kcal/mol)</span>
              <span>5.0 mHa (Coarse)</span>
            </div>
          </div>

          {/* Physical Error Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-space-muted">Physical Gate Error Rate:</span>
              <span className="text-quantum-amber font-bold text-sm">{(errorRate * 100).toFixed(2)}% ({errorRate.toExponential(1)})</span>
            </div>
            <input
              type="range"
              min="0.0001"
              max="0.005"
              step="0.0001"
              value={errorRate}
              onChange={(e) => setErrorRate(parseFloat(e.target.value))}
              className="w-full cursor-pointer h-2 bg-[#1B2844] rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-space-muted">
              <span>10⁻⁴ (Trapped Ion)</span>
              <span className="text-quantum-amber">10⁻³ (Superconducting)</span>
              <span>5×10⁻³ (Noisy)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Estimation KPI Cards */}
      {estimate && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between text-space-muted mb-1">
              <span className="text-[11px] font-mono">Logical Qubits</span>
              <Cpu className="w-3.5 h-3.5 text-quantum-cyan" />
            </div>
            <div className="text-xl font-bold font-mono text-quantum-cyan">
              {estimate.logical_qubits} <span className="text-xs text-space-muted font-sans font-normal">qubits</span>
            </div>
            <span className="text-[10px] text-space-muted font-mono block mt-1">
              {estimate.n_spin_orbitals} sys + {estimate.logical_qubits - estimate.n_spin_orbitals} ancillae
            </span>
          </div>

          <div className="glass-panel p-4">
            <div className="flex items-center justify-between text-space-muted mb-1">
              <span className="text-[11px] font-mono">Toffoli Count</span>
              <Layers className="w-3.5 h-3.5 text-quantum-magenta" />
            </div>
            <div className="text-xl font-bold font-mono text-quantum-magenta">
              {estimate.toffoli_count >= 1e6
                ? `${(estimate.toffoli_count / 1e6).toFixed(1)}M`
                : estimate.toffoli_count.toLocaleString()}
            </div>
            <span className="text-[10px] text-space-muted font-mono block mt-1">
              T-depth: {estimate.t_depth >= 1e6 ? `${(estimate.t_depth / 1e6).toFixed(1)}M` : estimate.t_depth.toLocaleString()}
            </span>
          </div>

          <div className="glass-panel p-4">
            <div className="flex items-center justify-between text-space-muted mb-1">
              <span className="text-[11px] font-mono">Physical Qubits</span>
              <ShieldCheck className="w-3.5 h-3.5 text-quantum-amber" />
            </div>
            <div className="text-xl font-bold font-mono text-quantum-amber">
              {estimate.physical_qubits.toLocaleString()}
            </div>
            <span className="text-[10px] text-space-muted font-mono block mt-1">
              Code distance d = {estimate.surface_code_distance}
            </span>
          </div>

          <div className="glass-panel p-4">
            <div className="flex items-center justify-between text-space-muted mb-1">
              <span className="text-[11px] font-mono">Est. Runtime</span>
              <Clock className="w-3.5 h-3.5 text-quantum-emerald" />
            </div>
            <div className="text-xl font-bold font-mono text-quantum-emerald">
              {estimate.qpe_runtime_seconds < 60
                ? `${estimate.qpe_runtime_seconds.toFixed(1)}s`
                : estimate.qpe_runtime_seconds < 3600
                ? `${(estimate.qpe_runtime_seconds / 60).toFixed(1)} min`
                : `${(estimate.qpe_runtime_seconds / 3600).toFixed(1)} hours`}
            </div>
            <span className="text-[10px] text-space-muted font-mono block mt-1">
              @ 1 MHz surface cycle clock
            </span>
          </div>
        </div>
      )}

      {/* Main Plot: The Exponential Wall - Classical Memory vs Quantum Resources */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-xs font-bold font-mono text-space-text uppercase">
              The Exponential Wall: Classical FCI State Memory vs. Quantum Polynomial Resources
            </h4>
            <span className="text-[11px] text-space-muted">
              Classical statevector storage explodes ~ 2ⁿ while quantum register size remains linear N
            </span>
          </div>
          <a
            href="https://doi.org/10.1103/PhysRevA.106.032428"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-mono text-quantum-cyan hover:underline"
          >
            <span>Delgado et al. (2022)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <PlotlyChart
          data={scalingPlotData}
          layout={{
            xaxis: { title: "Active-Space Size N (Spin-Orbitals = Qubits)" },
            yaxis: { title: "Relative Resource Cost (Log Scale)", type: "log", range: [0, 14] },
          }}
          chartId="delgado-scaling-comparison"
        />
      </div>
    </div>
  );
};
