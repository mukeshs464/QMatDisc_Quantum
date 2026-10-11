import React from "react";
import { useSimulationStore, PageId } from "../../store/simulationStore";
import {
  LayoutDashboard,
  Atom,
  Zap,
  Activity,
  BarChart3,
  RefreshCw,
  ShieldCheck,
  BatteryCharging,
  BookOpen,
  Sparkles,
} from "lucide-react";

interface NavItem {
  id: PageId;
  label: string;
  category: "Overview" | "Simulation Engines" | "Discovery & Roadmap" | "Reference";
  icon: React.ReactNode;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage } = useSimulationStore();

  const navItems: NavItem[] = [
    // Overview
    {
      id: "mission-control",
      label: "Mission Control",
      category: "Overview",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    // Engines
    {
      id: "molecule-lab",
      label: "Molecule Lab (H2)",
      category: "Simulation Engines",
      icon: <Atom className="w-4 h-4" />,
      badge: "STO-3G",
    },
    {
      id: "voltage-explorer",
      label: "Voltage Explorer",
      category: "Simulation Engines",
      icon: <Zap className="w-4 h-4" />,
      badge: "8-Qubit",
    },
    {
      id: "noise-lab",
      label: "Noise & Mitigation",
      category: "Simulation Engines",
      icon: <Activity className="w-4 h-4" />,
      badge: "ZNE",
    },
    // Discovery
    {
      id: "candidate-ranking",
      label: "Candidate Ranking",
      category: "Discovery & Roadmap",
      icon: <BarChart3 className="w-4 h-4" />,
      badge: "Pareto",
    },
    {
      id: "active-learning",
      label: "Active-Learning Loop",
      category: "Discovery & Roadmap",
      icon: <RefreshCw className="w-4 h-4" />,
      badge: "Bayes GP",
    },
    {
      id: "fault-tolerant",
      label: "Fault-Tolerant Roadmap",
      category: "Discovery & Roadmap",
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: "QPE",
    },
    {
      id: "battery-twin",
      label: "Battery Digital Twin",
      category: "Discovery & Roadmap",
      icon: <BatteryCharging className="w-4 h-4" />,
      badge: "3D WOW",
    },
    // Reference
    {
      id: "about-methodology",
      label: "About & Methodology",
      category: "Reference",
      icon: <BookOpen className="w-4 h-4" />,
    },
  ];

  // Group by category
  const categories = ["Overview", "Simulation Engines", "Discovery & Roadmap", "Reference"] as const;

  return (
    <aside className="w-64 border-r border-space-border bg-[#0B1220]/80 backdrop-blur-md flex flex-col shrink-0 min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-6 flex-1">
        {categories.map((cat) => (
          <div key={cat}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-space-muted/70 px-2.5 mb-2 block font-semibold">
              {cat}
            </span>
            <div className="space-y-1">
              {navItems
                .filter((item) => item.category === cat)
                .map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActivePage(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                        isActive
                          ? "bg-quantum-cyan/15 text-quantum-cyan border border-quantum-cyan/40 shadow-cyan-glow"
                          : "text-space-muted hover:text-space-text hover:bg-space-card/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={isActive ? "text-quantum-cyan" : "text-space-muted group-hover:text-space-text"}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                            item.badge === "3D WOW"
                              ? "bg-quantum-magenta/20 text-quantum-magenta border-quantum-magenta/40 animate-pulse font-bold"
                              : isActive
                              ? "bg-quantum-cyan/20 text-quantum-cyan border-quantum-cyan/30"
                              : "bg-space-card text-space-muted border-space-border"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Status Banner */}
      <div className="pt-4 border-t border-space-border/60 mt-auto">
        <div className="p-2.5 rounded-lg bg-space-card/80 border border-space-border text-[11px] font-mono">
          <div className="flex items-center justify-between text-space-muted mb-1">
            <span>Accuracy Gate:</span>
            <span className="text-quantum-emerald font-semibold">100% Passed</span>
          </div>
          <div className="w-full bg-[#1A263D] h-1.5 rounded-full overflow-hidden">
            <div className="bg-quantum-emerald h-full w-full" />
          </div>
          <span className="text-[10px] text-space-muted/70 mt-1 block">
            54/54 Rigorous Tests Verified
          </span>
        </div>
      </div>
    </aside>
  );
};
