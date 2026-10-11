import React, { useState, useEffect } from "react";
import { useSimulationStore } from "../store/simulationStore";
import { BatteryCellView } from "../three/BatteryCellView";
import {
  BatteryCharging,
  Zap,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  Thermometer,
  ShieldAlert,
} from "lucide-react";

export const BatteryDigitalTwin: React.FC = () => {
  const { simulatedCathodeVoltage, openExplain } = useSimulationStore();
  const [soc, setSoc] = useState<number>(0.65); // 65% State of Charge
  const [isCharging, setIsCharging] = useState<boolean>(true);
  const [activeCathode, setActiveCathode] = useState<string>("nmc811");

  // Dynamic live voltage mapped to state of charge
  // Base voltage from Voltage Explorer quantum profile + SoC modulation
  const liveVoltage = simulatedCathodeVoltage + (soc - 0.5) * 0.6;

  // Auto-play charging animation toggle
  useEffect(() => {
    let interval: any = null;
    if (isCharging) {
      interval = setInterval(() => {
        setSoc((prev) => {
          if (prev >= 0.98) return 0.05;
          return prev + 0.01;
        });
      }, 120);
    }
    return () => clearInterval(interval);
  }, [isCharging]);

  const handleExplain = () => {
    openExplain({
      title: "3D Battery Electrochemical Digital Twin & Phase Intercalation",
      category: "Electrochemical Digital Twin",
      summary:
        "This interactive 3D digital twin couples quantum-simulated electronic structure with macroscopic cell transport. As the cell charges, external work extracts electrons from the transition metal d-orbitals in the cathode host (Li_x MO₂), oxidizing the transition metal cation and driving Li⁺ ions across the liquid electrolyte separator into the graphitic anode layers (C₆). The cathode lattice changes color in real-time based on the quantum chemical potential.",
      physicsDetails: [
        "Cathode: Layered transition metal oxide host sheets (e.g. NMC811, LCO).",
        "Anode: Graphitic intercalation host (LiC₆ stage-1 compound at full charge).",
        "Intercalation fraction: x in Li_x MO₂ corresponds directly to filling fraction in the 8-qubit Hubbard ring.",
        "Voltage color coupling: Cathode glow shifts between dark cyan (~3.0 V) and intense magenta (~4.4 V) reflecting the quantum chemical potential μ(N).",
      ],
      honestLimits:
        "The 3D model visualizes ideal single-particle intercalation. Real cells undergo solid-electrolyte interphase (SEI) growth, transition-metal dissolution, particle fracture from volume expansion, and temperature-dependent diffusion overpotentials.",
    });
  };

  const cathodePresets: Record<string, { name: string; formula: string; ut: number; baseV: number }> = {
    lco: { name: "Lithium Cobalt Oxide", formula: "LiCoO2", ut: 5.5, baseV: 3.9 },
    nmc811: { name: "Nickel-Rich NMC (8:1:1)", formula: "LiNi0.8Mn0.1Co0.1O2", ut: 6.2, baseV: 3.85 },
    lfp: { name: "Lithium Iron Phosphate", formula: "LiFePO4", ut: 4.0, baseV: 3.45 },
    lmno: { name: "High-Voltage Spinel", formula: "LiNi0.5Mn1.5O4", ut: 6.8, baseV: 4.7 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-quantum-magenta/20 text-quantum-magenta border border-quantum-magenta/40 font-bold uppercase animate-pulse">
              3D ELECTROCHEMICAL DIGITAL TWIN
            </span>
            <span className="text-xs text-space-muted font-mono">React-Three-Fiber • Voltage-Coupled Intercalation</span>
          </div>
          <h2 className="text-xl font-extrabold text-space-text">
            Battery Digital Twin: Intercalation Dynamics & Quantum Voltage Coupling
          </h2>
        </div>

        <button
          onClick={handleExplain}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-space-card border border-space-border text-space-muted hover:text-space-text text-xs transition-colors self-start md:self-auto"
        >
          <HelpCircle className="w-4 h-4 text-quantum-cyan" />
          <span>Explain Digital Twin</span>
        </button>
      </div>

      {/* Control Panel: SoC Slider, Charge/Discharge controls, Cathode Selector */}
      <div className="glass-panel p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SoC Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-space-muted">State of Charge (SoC):</span>
              <span className="text-quantum-cyan font-bold text-sm">{(soc * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.01"
              value={soc}
              onChange={(e) => {
                setSoc(parseFloat(e.target.value));
                setIsCharging(false);
              }}
              className="w-full cursor-pointer h-2 bg-[#1B2844] rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-space-muted">
              <span>0% (Fully Discharged)</span>
              <span>50% (Half-Filling)</span>
              <span className="text-quantum-cyan">100% (Fully Charged)</span>
            </div>
          </div>

          {/* Active Cathode Chemistry Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-space-muted block font-medium">
              Cathode Crystal Host:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(cathodePresets).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => setActiveCathode(key)}
                  className={`py-1.5 px-2 rounded text-xs font-mono transition-colors text-left ${
                    activeCathode === key
                      ? "bg-quantum-cyan text-space-bg font-bold shadow-cyan-glow"
                      : "bg-space-card text-space-muted border border-space-border hover:text-space-text"
                  }`}
                >
                  <span className="block truncate">{item.formula}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Animation & Transport Controls */}
          <div className="space-y-2 flex flex-col justify-end">
            <label className="text-xs font-mono text-space-muted block font-medium">
              Ion Transport Cycle:
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCharging(!isCharging)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isCharging
                    ? "bg-quantum-amber text-space-bg shadow-lg"
                    : "bg-quantum-cyan text-space-bg shadow-cyan-glow"
                }`}
              >
                {isCharging ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-space-bg" />}
                <span>{isCharging ? "Pause Transport" : "Animate Charging"}</span>
              </button>

              <button
                onClick={() => {
                  setSoc(0.5);
                  setIsCharging(false);
                }}
                className="p-2 rounded-lg bg-space-card border border-space-border text-space-muted hover:text-space-text transition-colors"
                title="Reset to 50% Half-Filling"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Telemetry KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <span className="text-[11px] font-mono text-space-muted block">Cell Open-Circuit Voltage</span>
          <div className="text-xl font-bold font-mono text-quantum-cyan mt-1">
            {liveVoltage.toFixed(3)} <span className="text-xs text-space-muted">V</span>
          </div>
          <span className="text-[10px] text-quantum-emerald font-mono">Synced to Quantum Engine</span>
        </div>

        <div className="glass-panel p-4">
          <span className="text-[11px] font-mono text-space-muted block">Lithiation Fraction x</span>
          <div className="text-xl font-bold font-mono text-quantum-amber mt-1">
            {(1.0 - soc * 0.75).toFixed(3)}
          </div>
          <span className="text-[10px] text-space-muted font-mono">in Li_x MO₂ Host</span>
        </div>

        <div className="glass-panel p-4">
          <span className="text-[11px] font-mono text-space-muted block">Active Chemistry</span>
          <div className="text-xl font-bold font-mono text-white mt-1 truncate">
            {cathodePresets[activeCathode]?.formula}
          </div>
          <span className="text-[10px] text-space-muted font-mono">
            U/t proxy = {cathodePresets[activeCathode]?.ut}
          </span>
        </div>

        <div className="glass-panel p-4">
          <span className="text-[11px] font-mono text-space-muted block">Ion Migration State</span>
          <div className="text-xl font-bold font-mono text-quantum-magenta mt-1">
            {isCharging ? "Charging →" : "Stationary"}
          </div>
          <span className="text-[10px] text-space-muted font-mono">
            {isCharging ? "Li⁺ flowing into Anode" : "Equilibrium state"}
          </span>
        </div>
      </div>

      {/* 3D Battery Canvas Container */}
      <div className="glass-panel p-4 h-[520px] relative overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2 z-10">
          <div>
            <h4 className="text-xs font-bold font-mono text-space-text uppercase">
              Interactive 3D Intercalation Cell Model
            </h4>
            <span className="text-[11px] text-space-muted">
              Cathode crystal lattice colors dynamically in response to quantum simulated potential
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-space-muted bg-space-bg/80 px-3 py-1 rounded-lg border border-space-border">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-quantum-cyan" />
              <span>Li⁺ Ions</span>
            </span>
            <span className="text-space-border">•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-quantum-magenta" />
              <span>Cathode Host</span>
            </span>
            <span className="text-space-border">•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#334155]" />
              <span>Anode Graphite</span>
            </span>
          </div>
        </div>

        <div className="flex-1 w-full rounded-xl overflow-hidden bg-[#0A101D] border border-space-border relative">
          <BatteryCellView soc={soc} voltage={liveVoltage} isCharging={isCharging} />

          <div className="absolute bottom-3 left-3 text-[10px] text-space-muted/70 font-mono pointer-events-none">
            Click & drag to rotate cell • Scroll to zoom • Watch Li⁺ ion migration
          </div>
        </div>
      </div>
    </div>
  );
};
