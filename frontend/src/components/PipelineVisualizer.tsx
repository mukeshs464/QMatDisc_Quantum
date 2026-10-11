import React from "react";
import { PIPELINE_STAGES } from "../lib/constants";
import { useSimulationStore, PageId } from "../store/simulationStore";
import { ArrowRight, CheckCircle2, CircleDot } from "lucide-react";

export const PipelineVisualizer: React.FC = () => {
  const { activePipelineStage, setActivePage } = useSimulationStore();

  const stageToPage: Record<string, PageId> = {
    ingest: "molecule-lab",
    downfold: "voltage-explorer",
    encode: "molecule-lab",
    solve: "molecule-lab",
    mitigate: "noise-lab",
    rank: "candidate-ranking",
  };

  return (
    <div className="glass-panel p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-quantum-cyan animate-ping" />
          <h3 className="text-xs font-semibold tracking-wider text-space-muted uppercase font-mono">
            Full-Stack Quantum Discovery Pipeline
          </h3>
        </div>
        <span className="text-xs text-space-muted font-mono">
          Stage Status:{" "}
          <span className="text-quantum-cyan">
            {activePipelineStage ? `Executing Stage: ${activePipelineStage.toUpperCase()}` : "Ready / Idle"}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 relative">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isActive = activePipelineStage === stage.id;
          const isDone = !activePipelineStage;

          return (
            <div
              key={stage.id}
              onClick={() => setActivePage(stageToPage[stage.id])}
              className={`p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden group ${
                isActive
                  ? "bg-quantum-cyan/15 border-quantum-cyan shadow-cyan-glow"
                  : "bg-space-card/60 border-space-border hover:border-space-borderActive hover:bg-space-card"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-bold font-mono ${
                    isActive ? "text-quantum-cyan" : "text-space-text"
                  }`}
                >
                  {stage.name}
                </span>
                {isActive ? (
                  <CircleDot className="w-3.5 h-3.5 text-quantum-cyan animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-space-muted group-hover:text-quantum-cyan transition-colors" />
                )}
              </div>
              <p className="text-[11px] text-space-muted line-clamp-2 leading-tight">
                {stage.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
