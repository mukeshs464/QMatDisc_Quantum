import React, { useEffect, useState } from "react";
import { useSimulationStore } from "../../store/simulationStore";
import { api } from "../../lib/api";
import { Atom, Command, Sparkles, CheckCircle2 } from "lucide-react";

export const Navbar: React.FC = () => {
  const { setCommandPaletteOpen, activePage } = useSimulationStore();
  const [adapters, setAdapters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.getHealth()
      .then((data) => setAdapters(data.adapters || {}))
      .catch(() => {});
  }, []);

  return (
    <header className="h-16 border-b border-space-border bg-[#0B1220]/90 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand & Animated Orbital Ring Logo */}
      <div className="flex items-center gap-3">
        <div className="relative w-9 h-9 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-quantum-cyan/40 animate-spin-slow" />
          <div className="absolute inset-1 rounded-full border border-quantum-magenta/30 animate-spin-reverse-slow" />
          <div className="w-4 h-4 rounded-full bg-quantum-cyan shadow-cyan-glow flex items-center justify-center">
            <Atom className="w-3 h-3 text-space-bg" />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-quantum-cyan via-white to-quantum-magenta bg-clip-text text-transparent">
              QMatDisc
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-quantum-cyan/15 text-quantum-cyan border border-quantum-cyan/30 font-semibold">
              CAPSTONE
            </span>
          </div>
          <p className="text-[10px] text-space-muted font-mono leading-none">
            Quantum Simulation Material Discovery Platform
          </p>
        </div>
      </div>

      {/* Center status indicators */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-space-card/70 border border-space-border text-space-muted">
          <div className="w-2 h-2 rounded-full bg-quantum-emerald animate-pulse" />
          <span>Core Simulator: <strong className="text-space-text font-normal">Pure NumPy/SciPy</strong></span>
        </div>

        {adapters.qiskit && (
          <span className="px-2 py-1 rounded bg-[#132038] text-[11px] text-quantum-cyan border border-quantum-cyan/20">
            Qiskit Adapter: Active
          </span>
        )}
      </div>

      {/* Right Actions: Command Palette button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-space-card border border-space-border hover:border-quantum-cyan/50 text-space-muted hover:text-space-text transition-all text-xs font-mono group"
        >
          <Command className="w-3.5 h-3.5 text-quantum-cyan group-hover:scale-110 transition-transform" />
          <span>Command Palette</span>
          <kbd className="text-[10px] bg-[#16233B] px-1.5 py-0.5 rounded border border-space-border text-space-muted">
            Ctrl+K
          </kbd>
        </button>
      </div>
    </header>
  );
};
