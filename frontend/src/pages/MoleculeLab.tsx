import React, { useState, useEffect } from "react";
import { api, VQEH2Response } from "../lib/api";
import { useSimulationStore } from "../store/simulationStore";
import { PlotlyChart } from "../components/PlotlyChart";
import { MolecularOrbitalView } from "../three/MolecularOrbitalView";
import { CircuitVisualizer } from "../components/CircuitVisualizer";
import {
  Play,
  Square,
  HelpCircle,
  Atom,
  CheckCircle2,
  AlertCircle,
  Layers,
  Activity,
} from "lucide-react";

export const MoleculeLab: React.FC = () => {
  const [distance, setDistance] = useState<number>(0.735);
  const [optimizer, setOptimizer] = useState<string>("BFGS");
  const [calcData, setCalcData] = useState<VQEH2Response | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const {
    openExplain,
    isVQEStreaming,
    vqeStreamHistory,
    vqeExactEnergy,
    vqeOptimalResult,
    startVQEStream,
    stopVQEStream,
  } = useSimulationStore();

  const fetchCalculation = async (dist: number, opt: string) => {
    setLoading(true);
    try {
      const res = await api.computeVQEH2({
        distance_angstrom: dist,
        optimizer: opt,
        include_pes_curve: true,
      });
      setCalcData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalculation(distance, optimizer);
  }, [distance, optimizer]);

  const handleExplain = () => {
    openExplain({
      title: "H2 Dissociation & UCCD Variational Quantum Eigensolver",
      category: "Molecular Electronic Structure",
      summary:
        "The minimal-basis STO-3G H2 molecule provides the canonical benchmark for quantum computational chemistry. At equilibrium (0.735 Å), classical single-determinant Hartree-Fock approximates the ground state with ~20 mHa error. However, as the bond is stretched toward 1.59 Å, electron correlation grows dramatically and Hartree-Fock error surges to ~100 mHa, while the 4-qubit UCCD quantum ansatz stays exact to within 1e-12 Ha.",
      physicsDetails: [
        "Minimal basis: 4 spin-orbitals mapped to 4 qubits via Jordan-Wigner transformation.",
        "Hartree-Fock state: |0011⟩ (two electrons occupying the bonding σ_g orbital).",
        "UCCD generator: T2 - T2^† = a_2^† a_3^† a_1 a_0 - a_0^† a_1^† a_3 a_2.",
        "Exact FCI solution obtained via full diagonalisation of the 16x16 Hamiltonian matrix.",
      ],
      honestLimits:
        "The STO-3G basis only models s-type Gaussians. Real chemical accuracy for experimental bond dissociation energies requires larger basis sets (e.g. cc-pVDZ or cc-pVTZ) requiring 20+ qubits and double/triple excitations.",
    });
  };

  // Prepare PES Curve Plotly traces
  const pesPlotData = React.useMemo(() => {
    if (!calcData?.pes_curve) return [];

    const distances = calcData.pes_curve.map((p) => p.distance_angstrom);
    const hfEnergies = calcData.pes_curve.map((p) => p.energy_hf);
    const fciEnergies = calcData.pes_curve.map((p) => p.energy_fci);
    const vqeEnergies = calcData.pes_curve.map((p) => p.energy_vqe);

    return [
      {
        x: distances,
        y: hfEnergies,
        type: "scatter" as const,
        mode: "lines" as const,
        name: "Hartree–Fock (Classical RHF)",
        line: { color: "#FBBF24", width: 2 },
      },
      {
        x: distances,
        y: fciEnergies,
        type: "scatter" as const,
        mode: "lines" as const,
        name: "Exact (Full CI)",
        line: { color: "#E6EDF7", width: 3 },
      },
      {
        x: distances,
        y: vqeEnergies,
        type: "scatter" as const,
        mode: "markers" as const,
        name: "Quantum VQE (UCCD)",
        marker: { color: "#22D3EE", size: 6, symbol: "circle" },
      },
      // Current Slider Marker
      {
        x: [distance],
        y: [calcData.energy_vqe],
        type: "scatter" as const,
        mode: "markers" as const,
        name: `Current (R = ${distance.toFixed(3)} Å)`,
        marker: { color: "#E879F9", size: 12, symbol: "diamond" },
      },
    ];
  }, [calcData, distance]);

  // Live WebSocket Optimization Plot Traces
  const vqeStreamData = React.useMemo(() => {
    const iters = vqeStreamHistory.map((s) => s.iteration);
    const energies = vqeStreamHistory.map((s) => s.energy);
    const bests = vqeStreamHistory.map((s) => s.best_energy);

    const traces: any[] = [
      {
        x: iters,
        y: energies,
        type: "scatter",
        mode: "lines+markers",
        name: "Energy E(θ)",
        line: { color: "#22D3EE", width: 2 },
        marker: { size: 5, color: "#22D3EE" },
      },
      {
        x: iters,
        y: bests,
        type: "scatter",
        mode: "lines",
        name: "Best Energy",
        line: { color: "#34D399", width: 2, dash: "dot" },
      },
    ];

    if (vqeExactEnergy !== null) {
      traces.push({
        x: [0, Math.max(1, iters.length - 1)],
        y: [vqeExactEnergy, vqeExactEnergy],
        type: "scatter",
        mode: "lines",
        name: "Exact FCI Ground State",
        line: { color: "#E879F9", width: 1.5, dash: "dash" },
      });
    }

    return traces;
  }, [vqeStreamHistory, vqeExactEnergy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-quantum-cyan/15 text-quantum-cyan border border-quantum-cyan/30">
              FIRST-PRINCIPLES CHEMISTRY
            </span>
            <span className="text-xs text-space-muted font-mono">4 Qubits • 15 Pauli Terms</span>
          </div>
          <h2 className="text-xl font-extrabold text-space-text">
            H2 Potential Energy Surface & UCCD Quantum Eigensolver
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExplain}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-space-card border border-space-border text-space-muted hover:text-space-text text-xs transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-quantum-cyan" />
            <span>Explain Physics</span>
          </button>
        </div>
      </div>

      {/* Control Panel: Bond distance slider and Optimizer selector */}
      <div className="glass-panel p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-space-muted font-medium">Internuclear Separation R (H–H):</span>
              <span className="text-quantum-cyan font-bold text-sm">{distance.toFixed(3)} Å</span>
            </div>
            <input
              type="range"
              min="0.21"
              max="2.50"
              step="0.01"
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value))}
              className="w-full cursor-pointer h-2 bg-[#1B2844] rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-space-muted">
              <span>0.21 Å (Repulsive core)</span>
              <span className="text-quantum-cyan">0.735 Å (Equilibrium)</span>
              <span>1.59 Å (Dissociated stretch)</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-space-muted block font-medium">
              Classical Optimizer:
            </label>
            <div className="flex gap-2">
              {["BFGS", "COBYLA", "SPSA"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setOptimizer(opt)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    optimizer === opt
                      ? "bg-quantum-cyan text-space-bg font-bold shadow-cyan-glow"
                      : "bg-space-card text-space-muted border border-space-border hover:text-space-text"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Solved Metrics Row */}
      {calcData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4">
            <span className="text-[11px] font-mono text-space-muted block">Hartree–Fock Energy</span>
            <div className="text-base font-bold font-mono text-quantum-amber mt-1">
              {calcData.energy_hf.toFixed(5)} <span className="text-[10px] text-space-muted">Ha</span>
            </div>
          </div>
          <div className="glass-panel p-4">
            <span className="text-[11px] font-mono text-space-muted block">Exact FCI Energy</span>
            <div className="text-base font-bold font-mono text-white mt-1">
              {calcData.energy_fci.toFixed(5)} <span className="text-[10px] text-space-muted">Ha</span>
            </div>
          </div>
          <div className="glass-panel p-4">
            <span className="text-[11px] font-mono text-space-muted block">Quantum VQE Energy</span>
            <div className="text-base font-bold font-mono text-quantum-cyan mt-1">
              {calcData.energy_vqe.toFixed(5)} <span className="text-[10px] text-space-muted">Ha</span>
            </div>
          </div>
          <div className="glass-panel p-4">
            <span className="text-[11px] font-mono text-space-muted block">Correlation / HF Error</span>
            <div className="text-base font-bold font-mono text-quantum-magenta mt-1">
              {calcData.correlation_energy_mHa.toFixed(2)} <span className="text-[10px] text-space-muted">mHa</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: PES Curve & 3D Molecular Orbital Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Dissociation Curve */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold font-mono text-space-text uppercase">
                Potential Energy Surface (PES) Dissociation
              </h4>
              <span className="text-[11px] text-space-muted">
                HF fails at stretch (~100 mHa error); VQE tracks exact Full CI
              </span>
            </div>
          </div>
          <PlotlyChart
            data={pesPlotData}
            layout={{
              xaxis: { title: "Bond Distance R (Å)" },
              yaxis: { title: "Energy (Hartree)" },
            }}
            chartId="h2-pes-curve"
          />
        </div>

        {/* Right: 3D Molecular Orbitals */}
        <MolecularOrbitalView distance={distance} />
      </div>

      {/* Live WebSocket Optimization Telemetry */}
      <div className="glass-panel p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-quantum-cyan" />
              <h4 className="text-xs font-bold font-mono text-space-text uppercase">
                Live Quantum VQE Optimization Stream (WebSocket)
              </h4>
            </div>
            <p className="text-[11px] text-space-muted mt-0.5">
              Watch real-time statevector expectation evaluations stream from the pure NumPy simulator
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isVQEStreaming ? (
              <button
                onClick={stopVQEStream}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-quantum-rose/20 text-quantum-rose border border-quantum-rose/40 text-xs font-mono font-semibold"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop Stream</span>
              </button>
            ) : (
              <button
                onClick={() => startVQEStream(distance, optimizer)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-quantum-cyan text-space-bg text-xs font-mono font-bold shadow-cyan-glow hover:bg-cyan-300 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-space-bg" />
                <span>Stream VQE ({optimizer})</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Convergence Chart */}
        {vqeStreamHistory.length > 0 ? (
          <div className="space-y-4">
            <PlotlyChart
              data={vqeStreamData}
              layout={{
                xaxis: { title: "Iteration Step" },
                yaxis: { title: "Energy (Hartree)" },
              }}
              chartId="live-vqe-convergence"
            />
            {vqeOptimalResult && (
              <div className="p-3 rounded-lg bg-quantum-emerald/10 border border-quantum-emerald/30 text-xs text-quantum-emerald flex items-center justify-between">
                <span>Optimization converged to optimal energy: <strong>{vqeOptimalResult.energy.toFixed(6)} Ha</strong></span>
                <span>Final error: <strong>{vqeOptimalResult.error_mHa.toFixed(6)} mHa</strong></span>
              </div>
            )}
          </div>
        ) : (
          <div className="h-44 border border-dashed border-space-border rounded-xl flex items-center justify-center text-xs text-space-muted font-mono">
            Click "Stream VQE" to initiate live WebSocket parameter optimization telemetry.
          </div>
        )}
      </div>

      {/* Quantum Circuit Decomposition */}
      <CircuitVisualizer type="uccd" theta={calcData?.optimal_theta || 0.056} />

      {/* Pauli Decomposition Table */}
      {calcData && (
        <div className="glass-panel p-4">
          <h4 className="text-xs font-bold font-mono text-space-text uppercase mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-quantum-cyan" />
            <span>Hamiltonian Pauli Terms ({calcData.n_pauli_terms} Total Terms)</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto">
            {calcData.pauli_terms.map((term, i) => (
              <div key={i} className="p-2 rounded bg-space-card border border-space-border text-xs font-mono">
                <span className="text-quantum-cyan font-bold">{term.pauli}</span>
                <span className="text-space-muted block text-[11px] mt-0.5">
                  {term.coeff >= 0 ? `+${term.coeff.toFixed(5)}` : term.coeff.toFixed(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
