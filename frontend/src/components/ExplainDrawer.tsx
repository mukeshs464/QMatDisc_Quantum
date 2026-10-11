import React from "react";
import { useSimulationStore } from "../store/simulationStore";
import { X, Sparkles, AlertTriangle, BookOpen, CheckCircle } from "lucide-react";

export const ExplainDrawer: React.FC = () => {
  const { explainDrawerOpen, explainContent, closeExplain } = useSimulationStore();

  if (!explainDrawerOpen || !explainContent) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0F182B] border-l border-space-border h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-space-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-quantum-cyan/15 border border-quantum-cyan/30 text-quantum-cyan">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-quantum-cyan tracking-wider uppercase">
                  {explainContent.category}
                </span>
                <h2 className="text-base font-bold text-space-text">
                  {explainContent.title}
                </h2>
              </div>
            </div>
            <button
              onClick={closeExplain}
              className="p-1.5 rounded-lg text-space-muted hover:text-space-text hover:bg-space-card transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Plain-Language Summary */}
          <div className="my-5 p-4 rounded-xl bg-space-card/80 border border-space-border">
            <h4 className="text-xs font-semibold uppercase font-mono text-space-muted mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-quantum-cyan" /> Plain-Language Summary
            </h4>
            <p className="text-sm text-space-text leading-relaxed">
              {explainContent.summary}
            </p>
          </div>

          {/* Physics & Mechanics Breakdown */}
          <div className="mb-5">
            <h4 className="text-xs font-semibold uppercase font-mono text-space-muted mb-2.5">
              Physical Mechanics & Quantum Formulation
            </h4>
            <div className="space-y-2">
              {explainContent.physicsDetails.map((detail, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-[#142036] border border-space-border text-xs text-space-text"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-quantum-emerald mt-0.5 shrink-0" />
                  <span className="leading-relaxed font-sans">{detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Honest Limits & Scientific Disclosures */}
          <div className="p-4 rounded-xl bg-quantum-amber/10 border border-quantum-amber/30">
            <h4 className="text-xs font-semibold uppercase font-mono text-quantum-amber mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Honest Scientific Limitations
            </h4>
            <p className="text-xs text-space-text leading-relaxed">
              {explainContent.honestLimits}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-space-border mt-6 flex justify-end">
          <button
            onClick={closeExplain}
            className="px-4 py-2 rounded-lg bg-quantum-cyan text-space-bg font-semibold text-xs hover:bg-cyan-300 transition-colors shadow-cyan-glow"
          >
            Got it, close
          </button>
        </div>
      </div>
    </div>
  );
};
