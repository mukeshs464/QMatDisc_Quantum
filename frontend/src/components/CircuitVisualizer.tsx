import React from "react";

interface CircuitVisualizerProps {
  type?: "uccd" | "hva";
  theta?: number;
}

export const CircuitVisualizer: React.FC<CircuitVisualizerProps> = ({
  type = "uccd",
  theta = 0.056,
}) => {
  if (type === "uccd") {
    return (
      <div className="glass-panel p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-space-muted font-mono uppercase">
              UCCD Quantum Circuit Topology (H2 Minimal Basis)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-quantum-cyan/15 text-quantum-cyan border border-quantum-cyan/30">
              4 Qubits • 48 CNOTs Trotterized
            </span>
          </div>
          <span className="text-xs font-mono text-quantum-magenta">
            θ = {theta.toFixed(4)} rad
          </span>
        </div>

        <svg viewBox="0 0 780 180" className="w-full min-w-[700px] h-36">
          {/* Background gridlines */}
          {[30, 70, 110, 150].map((y, i) => (
            <g key={i}>
              <line x1="60" y1={y} x2="750" y2={y} stroke="#1E2B44" strokeWidth="2" />
              <text x="15" y={y + 4} fill="#9FB3CC" fontSize="11" fontFamily="JetBrains Mono">
                |q_{i}⟩
              </text>
            </g>
          ))}

          {/* Reference State (Hartree-Fock: q0 and q1 occupied with X gates) */}
          <rect x="75" y="16" width="28" height="28" rx="4" fill="#162B4D" stroke="#22D3EE" strokeWidth="1.5" />
          <text x="89" y="34" fill="#22D3EE" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">X</text>

          <rect x="75" y="56" width="28" height="28" rx="4" fill="#162B4D" stroke="#22D3EE" strokeWidth="1.5" />
          <text x="89" y="74" fill="#22D3EE" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">X</text>

          {/* Barrier */}
          <line x1="125" y1="15" x2="125" y2="165" stroke="#33445F" strokeDasharray="4 4" strokeWidth="1.5" />

          {/* Entangling CNOT Ladder */}
          {/* CNOT 0 -> 1 */}
          <circle cx="150" cy="30" r="4" fill="#22D3EE" />
          <line x1="150" y1="30" x2="150" y2="70" stroke="#22D3EE" strokeWidth="1.5" />
          <circle cx="150" cy="70" r="9" fill="none" stroke="#22D3EE" strokeWidth="1.5" />
          <line x1="150" y1="63" x2="150" y2="77" stroke="#22D3EE" strokeWidth="1.5" />

          {/* CNOT 1 -> 2 */}
          <circle cx="185" cy="70" r="4" fill="#22D3EE" />
          <line x1="185" y1="70" x2="185" y2="110" stroke="#22D3EE" strokeWidth="1.5" />
          <circle cx="185" cy="110" r="9" fill="none" stroke="#22D3EE" strokeWidth="1.5" />
          <line x1="185" y1="103" x2="185" y2="117" stroke="#22D3EE" strokeWidth="1.5" />

          {/* CNOT 2 -> 3 */}
          <circle cx="220" cy="110" r="4" fill="#22D3EE" />
          <line x1="220" y1="110" x2="220" y2="150" stroke="#22D3EE" strokeWidth="1.5" />
          <circle cx="220" cy="150" r="9" fill="none" stroke="#22D3EE" strokeWidth="1.5" />
          <line x1="220" y1="143" x2="220" y2="157" stroke="#22D3EE" strokeWidth="1.5" />

          {/* Central Parameterized Rz(theta) Rotation */}
          <rect x="255" y="134" width="70" height="32" rx="5" fill="#2D124D" stroke="#E879F9" strokeWidth="1.5" />
          <text x="290" y="154" fill="#E879F9" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
            Rz(θ)
          </text>

          {/* Inverse CNOT Ladder */}
          <circle cx="355" cy="110" r="4" fill="#22D3EE" />
          <line x1="355" y1="110" x2="355" y2="150" stroke="#22D3EE" strokeWidth="1.5" />
          <circle cx="355" cy="150" r="9" fill="none" stroke="#22D3EE" strokeWidth="1.5" />
          <line x1="355" y1="143" x2="355" y2="157" stroke="#22D3EE" strokeWidth="1.5" />

          <circle cx="390" cy="70" r="4" fill="#22D3EE" />
          <line x1="390" y1="70" x2="390" y2="110" stroke="#22D3EE" strokeWidth="1.5" />
          <circle cx="390" cy="110" r="9" fill="none" stroke="#22D3EE" strokeWidth="1.5" />
          <line x1="390" y1="103" x2="390" y2="117" stroke="#22D3EE" strokeWidth="1.5" />

          <circle cx="425" cy="30" r="4" fill="#22D3EE" />
          <line x1="425" y1="30" x2="425" y2="70" stroke="#22D3EE" strokeWidth="1.5" />
          <circle cx="425" cy="70" r="9" fill="none" stroke="#22D3EE" strokeWidth="1.5" />
          <line x1="425" y1="63" x2="425" y2="77" stroke="#22D3EE" strokeWidth="1.5" />

          {/* 8-Trotter repeat ellipsis */}
          <line x1="465" y1="15" x2="465" y2="165" stroke="#33445F" strokeDasharray="4 4" strokeWidth="1.5" />
          <rect x="490" y="45" width="140" height="90" rx="8" fill="#111B30" stroke="#FBBF24" strokeWidth="1.2" strokeDasharray="3 3" />
          <text x="560" y="85" fill="#FBBF24" fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono">
            × 8 Pauli Strings
          </text>
          <text x="560" y="105" fill="#9FB3CC" fontSize="10" textAnchor="middle" fontFamily="Inter">
            (XXXY, XXYX, ...)
          </text>

          {/* Measurement meters */}
          {[30, 70, 110, 150].map((y, i) => (
            <g key={i}>
              <rect x="680" y={y - 14} width="28" height="28" rx="4" fill="#16223D" stroke="#33445F" strokeWidth="1" />
              <path d={`M ${686} ${y + 6} A 8 8 0 0 1 ${702} ${y + 6}`} fill="none" stroke="#22D3EE" strokeWidth="1.2" />
              <line x1="694" y1={y + 6} x2="700" y2={y - 4} stroke="#22D3EE" strokeWidth="1.2" />
            </g>
          ))}
        </svg>
      </div>
    );
  }

  // HVA Circuit for Hubbard model
  return (
    <div className="glass-panel p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-space-muted font-mono uppercase">
            Hamiltonian-Variational Ansatz (HVA) Layer Topology
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-quantum-magenta/15 text-quantum-magenta border border-quantum-magenta/30">
            8 Qubits • Particle-Number Conserving
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 py-3">
        <div className="px-3 py-4 rounded-lg bg-space-card border border-quantum-cyan/40 text-center flex-1">
          <span className="text-xs font-bold font-mono text-quantum-cyan block">Reference State |ψ₀⟩</span>
          <span className="text-[11px] text-space-muted">Hartree-Fock or lowest non-interacting sector state</span>
        </div>
        <span className="text-space-muted font-mono">→</span>
        <div className="px-3 py-4 rounded-lg bg-space-card border border-quantum-magenta/40 text-center flex-1">
          <span className="text-xs font-bold font-mono text-quantum-magenta block">exp(-i θₖ H_U)</span>
          <span className="text-[11px] text-space-muted">On-site Coulomb interaction (4 site pairs)</span>
        </div>
        <span className="text-space-muted font-mono">→</span>
        <div className="px-3 py-4 rounded-lg bg-space-card border border-quantum-amber/40 text-center flex-1">
          <span className="text-xs font-bold font-mono text-quantum-amber block">exp(-i φₖ H_t)</span>
          <span className="text-[11px] text-space-muted">Periodic hopping ring (4 bonds × 2 spins)</span>
        </div>
        <span className="text-space-muted font-mono">× p=6 layers</span>
      </div>
    </div>
  );
};
