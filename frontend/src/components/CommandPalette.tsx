import React, { useState, useEffect } from "react";
import { useSimulationStore, PageId } from "../store/simulationStore";
import {
  Search,
  Atom,
  Zap,
  Activity,
  BarChart3,
  RefreshCw,
  ShieldCheck,
  BatteryCharging,
  BookOpen,
  Home,
  Sliders,
  Play,
  RotateCcw,
} from "lucide-react";

interface ActionItem {
  id: string;
  title: string;
  category: "Navigation" | "Simulations" | "Presets";
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActivePage,
    startVQEStream,
    setWeights,
  } = useSimulationStore();

  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      } else if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const actions: ActionItem[] = [
    // Navigation
    {
      id: "nav-home",
      title: "Mission Control (Overview)",
      category: "Navigation",
      icon: <Home className="w-4 h-4 text-quantum-cyan" />,
      action: () => {
        setActivePage("mission-control");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "nav-molecule",
      title: "Molecule Lab (H2 STO-3G VQE)",
      category: "Navigation",
      icon: <Atom className="w-4 h-4 text-quantum-cyan" />,
      action: () => {
        setActivePage("molecule-lab");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "nav-voltage",
      title: "Voltage Explorer (Mott-Hubbard 8-Qubit Ring)",
      category: "Navigation",
      icon: <Zap className="w-4 h-4 text-quantum-cyan" />,
      action: () => {
        setActivePage("voltage-explorer");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "nav-noise",
      title: "Noise & Mitigation Lab (Richardson ZNE)",
      category: "Navigation",
      icon: <Activity className="w-4 h-4 text-quantum-magenta" />,
      action: () => {
        setActivePage("noise-lab");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "nav-candidates",
      title: "Candidate Ranking (Pareto Front & Radar)",
      category: "Navigation",
      icon: <BarChart3 className="w-4 h-4 text-quantum-amber" />,
      action: () => {
        setActivePage("candidate-ranking");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "nav-active-learning",
      title: "Active-Learning Loop (Bayesian GP Surrogate)",
      category: "Navigation",
      icon: <RefreshCw className="w-4 h-4 text-quantum-emerald" />,
      action: () => {
        setActivePage("active-learning");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "nav-fault-tolerant",
      title: "Fault-Tolerant Roadmap (Delgado QPE Scaling)",
      category: "Navigation",
      icon: <ShieldCheck className="w-4 h-4 text-quantum-cyan" />,
      action: () => {
        setActivePage("fault-tolerant");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "nav-battery-twin",
      title: "Battery Digital Twin (3D Cell & Intercalation)",
      category: "Navigation",
      icon: <BatteryCharging className="w-4 h-4 text-quantum-cyan" />,
      action: () => {
        setActivePage("battery-twin");
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "nav-methodology",
      title: "About & Methodology (Math Derivations & Code)",
      category: "Navigation",
      icon: <BookOpen className="w-4 h-4 text-space-muted" />,
      action: () => {
        setActivePage("about-methodology");
        setCommandPaletteOpen(false);
      },
    },
    // Quick Actions
    {
      id: "act-run-h2-eq",
      title: "Run Equilibrium H2 VQE (R = 0.735 Å)",
      category: "Simulations",
      icon: <Play className="w-4 h-4 text-quantum-emerald" />,
      action: () => {
        setActivePage("molecule-lab");
        startVQEStream(0.735);
        setCommandPaletteOpen(false);
      },
    },
    {
      id: "act-reset-weights",
      title: "Reset Candidate Objective Weights (Balanced)",
      category: "Presets",
      icon: <RotateCcw className="w-4 h-4 text-quantum-amber" />,
      action: () => {
        setWeights({ w_capacity: 0.35, w_voltage: 0.25, w_volume: 0.2, w_barrier: 0.2 });
        setActivePage("candidate-ranking");
        setCommandPaletteOpen(false);
      },
    },
  ];

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#111B30] border border-space-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3 border-b border-space-border">
          <Search className="w-4 h-4 text-space-muted mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to page... (e.g. 'Molecule', 'Battery', 'ZNE')"
            className="w-full bg-transparent text-space-text placeholder-space-muted text-sm focus:outline-none"
          />
          <kbd className="text-[10px] bg-space-card px-1.5 py-0.5 rounded border border-space-border text-space-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-space-muted font-mono">
              No matching commands or pages found.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full flex items-center justify-between p-2.5 rounded-lg text-left hover:bg-space-cardHover transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded bg-space-card border border-space-border group-hover:border-quantum-cyan/40">
                    {item.icon}
                  </div>
                  <span className="text-xs font-medium text-space-text group-hover:text-quantum-cyan transition-colors">
                    {item.title}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-space-muted uppercase">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-space-border bg-[#0D1527] flex items-center justify-between text-[11px] text-space-muted font-mono">
          <span>Navigate with mouse or arrows</span>
          <span>Shortcut: Ctrl + K</span>
        </div>
      </div>
    </div>
  );
};
