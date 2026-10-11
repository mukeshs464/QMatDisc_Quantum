import React, { useState, useEffect } from "react";
import { api, VoltageProfileResponse } from "../lib/api";
import { useSimulationStore } from "../store/simulationStore";
import { PlotlyChart } from "../components/PlotlyChart";
import { CircuitVisualizer } from "../components/CircuitVisualizer";
import {
  Zap,
  HelpCircle,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Battery,
} from "lucide-react";

export const VoltageExplorer: React.FC = () => {
  const [tVal, setTVal] = useState<number>(1.0);
  const [uVal, setUVal] = useState<number>(4.0);
  const [profile, setProfile] = useState<VoltageProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedElectron, setSelectedElectron] = useState<number>(4);

  const { openExplain, setSimulatedCathodeVoltage } = useSimulationStore();

  const fetchProfile = async (t: number, u: number) => {
    setLoading(true);
    try {
      const data = await api.getVoltageProfile(t, u);
      setProfile(data);
      // Map Hubbard step to simulated battery voltage (e.g., 3.0V base + step * 0.3V)
      const batteryVoltageProxy = 3.2 + (data.half_filling_step_height / 6.0) * 1.2;
      setSimulatedCathodeVoltage(batteryVoltageProxy);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(tVal, uVal);
  }, [tVal, uVal]);

  const handleExplain = () => {
    openExplain({
      title: "Mott-Hubbard Correlation & Intercalation Voltage Profiles",
      category: "Solid-State Lattice Physics",
      summary:
        "In transition-metal battery cathodes, electron correlation in the 3d/4d valence bands governs the electrochemical open-circuit voltage profile. Within the 4-site Fermi-Hubbard ring, the relative chemical potential V(N) = -(E(N) - E(N-1)) represents the energy required to remove an electron during battery delithiation. At zero interaction (U=0), the voltage is flat across half-filling. As Coulomb repulsion U/t increases, a sharp Mott gap voltage step opens past half-filling (N=4).",
      physicsDetails: [
        "Lattice: 4-site periodic ring mapped to 8 spin-orbitals (8 qubits).",
        "Kinetic term H_t models inter-site electron hopping (amplitude t).",
        "Interaction term H_U models on-site Coulomb repulsion U between opposite-spin electrons.",
        "Voltage step height ΔV = (E(5) - E(4)) - (E(4) - E(3)) increases from 0.00 t (at U=0) to ~5.99 t (at U=8).",
      ],
      honestLimits:
        "This voltage profile is a relative dimensionless proxy in units of hopping parameter t. Converting to physical volts requires empirical DFT band downfolding to determine the real hopping transfer integral t (typically 0.2 to 0.5 eV) and oxygen 2p hybridization shifts.",
    });
  };

  // Plotly staircase voltage profile
  const voltagePlotData = React.useMemo(() => {
    if (!profile) return [];

    const xs = profile.lithiation_x; // 0.125 to 1.0
    const vExact = profile.relative_voltage_exact;
    const vVqe = profile.relative_voltage_vqe;

    return [
      {
        x: xs,
        y: vVqe,
        type: "scatter" as const,
        mode: "lines" as const,
        line: { shape: "hv" as const, color: "#22D3EE", width: 3 },
        name: `Quantum VQE (HVA, U/t = ${profile.u_over_t.toFixed(1)})`,
      },
      {
        x: xs,
        y: vExact,
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "#E879F9", size: 7, symbol: "diamond" },
        name: "Exact Sector Diagonalization",
      },
      // Selected electron filling marker
      {
        x: [xs[selectedElectron - 1] || xs[3]],
        y: [vVqe[selectedElectron - 1] || vVqe[3]],
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "#FBBF24", size: 13, symbol: "star" },
        name: `Selected Filling (N = ${selectedElectron})`,
      },
    ];
  }, [profile, selectedElectron]);

  return (
    <div className="space-y-6">
      {/* Header with Mandatory Honest Limits Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-quantum-amber/15 text-quantum-amber border border-quantum-amber/30 font-bold uppercase tracking-wider">
              Relative voltage proxy (units of t)
            </span>
            <span className="text-xs text-space-muted font-mono">8 Qubits • 4 Sites • Sz Conserved</span>
          </div>
          <h2 className="text-xl font-extrabold text-space-text">
            Fermi-Hubbard Ring Voltage Profile & Mott Gap Opening
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

      {/* Interactive Controls & Correlation Sliders */}
      <div className="glass-panel p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* U/t slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-space-muted">On-site Repulsion U/t:</span>
              <span className="text-quantum-amber font-bold text-sm">{(uVal / tVal).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="10.0"
              step="0.2"
              value={uVal}
              onChange={(e) => setUVal(parseFloat(e.target.value))}
              className="w-full cursor-pointer h-2 bg-[#1B2844] rounded-lg"
            />
            {/* Correlation Preset Buttons */}
            <div className="flex gap-1.5 pt-1">
              {[0, 2, 4, 8].map((uPreset) => (
                <button
                  key={uPreset}
                  onClick={() => setUVal(uPreset)}
                  className={`flex-1 py-1 rounded text-[11px] font-mono transition-colors ${
                    uVal === uPreset
                      ? "bg-quantum-amber text-space-bg font-bold"
                      : "bg-space-card text-space-muted hover:text-space-text border border-space-border"
                  }`}
                >
                  U={uPreset}
                </button>
              ))}
            </div>
          </div>

          {/* Hopping t slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-space-muted">Hopping Transfer Integral t:</span>
              <span className="text-quantum-cyan font-bold text-sm">{tVal.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={tVal}
              onChange={(e) => setTVal(parseFloat(e.target.value))}
              className="w-full cursor-pointer h-2 bg-[#1B2844] rounded-lg"
            />
            <span className="text-[10px] text-space-muted font-mono block">
              Bandwidth W = 4t = {(4 * tVal).toFixed(2)} [a.u.]
            </span>
          </div>

          {/* Electron Filling Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-space-muted">Inspect Electron Filling N:</span>
              <span className="text-quantum-cyan font-bold text-sm">{selectedElectron} / 8</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => setSelectedElectron(n)}
                  className={`py-1 rounded text-xs font-mono transition-colors ${
                    selectedElectron === n
                      ? "bg-quantum-cyan text-space-bg font-bold shadow-cyan-glow"
                      : "bg-space-card text-space-muted border border-space-border hover:text-space-text"
                  }`}
                >
                  N={n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status KPIs */}
      {profile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4">
            <span className="text-[11px] font-mono text-space-muted block">Half-Filling Step ΔV</span>
            <div className="text-xl font-bold font-mono text-quantum-amber mt-1">
              {profile.half_filling_step_height.toFixed(4)} <span className="text-xs text-space-muted">t</span>
            </div>
            <span className="text-[10px] text-space-muted font-mono">(E₅ - E₄) - (E₄ - E₃)</span>
          </div>

          <div className="glass-panel p-4">
            <span className="text-[11px] font-mono text-space-muted block">Max VQE Error</span>
            <div className="text-xl font-bold font-mono text-quantum-emerald mt-1">
              {profile.max_vqe_error.toExponential(2)} <span className="text-xs text-space-muted">t</span>
            </div>
            <span className="text-[10px] text-space-muted font-mono">Benchmark: &lt; 1e-8 t</span>
          </div>

          <div className="glass-panel p-4">
            <span className="text-[11px] font-mono text-space-muted block">Active Qubits</span>
            <div className="text-xl font-bold font-mono text-quantum-cyan mt-1">
              8 <span className="text-xs text-space-muted">Qubits</span>
            </div>
            <span className="text-[10px] text-space-muted font-mono">256 Fock states partitioned</span>
          </div>

          <div className="glass-panel p-4">
            <span className="text-[11px] font-mono text-space-muted block">Synced Cathode Voltage</span>
            <div className="text-xl font-bold font-mono text-quantum-magenta mt-1">
              {(3.2 + (profile.half_filling_step_height / 6.0) * 1.2).toFixed(2)} <span className="text-xs text-space-muted">V</span>
            </div>
            <span className="text-[10px] text-space-muted font-mono">Linked to 3D Digital Twin</span>
          </div>
        </div>
      )}

      {/* Main Voltage Profile Chart */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-xs font-bold font-mono text-space-text uppercase">
              Quantum-Simulated Voltage Profile V(x) = -[E(N) - E(N-1)]
            </h4>
            <span className="text-[11px] text-space-muted">
              Coulomb correlation U opens the Mott-Hubbard voltage step past half-filling (x = 0.5)
            </span>
          </div>
        </div>

        <PlotlyChart
          data={voltagePlotData}
          layout={{
            xaxis: {
              title: "Electron Filling x (≈ Lithium Intercalation Fraction)",
              tickmode: "array",
              tickvals: [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0],
              ticktext: ["1/8", "2/8", "3/8", "4/8 (Half)", "5/8", "6/8", "7/8", "8/8"],
            },
            yaxis: { title: "Relative Voltage V(x) [units of t]" },
          }}
          chartId="hubbard-voltage-profile"
        />
      </div>

      {/* HVA Topology Diagram */}
      <CircuitVisualizer type="hva" />
    </div>
  );
};
