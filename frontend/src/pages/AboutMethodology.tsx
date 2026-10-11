import React from "react";
import { BookOpen, Code, FileText, ExternalLink, CheckCircle } from "lucide-react";

export const AboutMethodology: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-quantum-cyan/15 text-quantum-cyan border border-quantum-cyan/30 font-bold uppercase">
            THEORETICAL FOUNDATIONS
          </span>
          <span className="text-xs text-space-muted font-mono">Peer-Reviewed Algorithms & Pseudocode</span>
        </div>
        <h2 className="text-2xl font-extrabold text-space-text tracking-tight">
          Algorithm Methodology, Mathematical Derivations & Citations
        </h2>
        <p className="text-sm text-space-muted mt-1 leading-relaxed">
          Comprehensive scientific documentation of the from-scratch quantum simulation algorithms powering QMatDisc.
        </p>
      </div>

      {/* Section 1: STO-3G Integral Engine */}
      <section className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2.5 text-quantum-cyan">
          <BookOpen className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">
            1. First-Principles STO-3G Molecular Integral Engine
          </h3>
        </div>

        <p className="text-xs text-space-text leading-relaxed">
          The atomic orbital basis represents each Hydrogen 1s orbital as a contraction of three primitive Gaussian functions:
          <code className="text-quantum-cyan font-mono block my-2 p-2 bg-[#0A111F] rounded border border-space-border">
            χ(r - R) = ∑_k=1^3 c_k N(α_k) exp(-α_k |r - R|²)
          </code>
          where the Gaussian normalization factor is <code className="text-quantum-cyan">N(α) = (2α/π)^(3/4)</code>.
        </p>

        <p className="text-xs text-space-text leading-relaxed">
          Two-electron Coulomb repulsion and nuclear attraction integrals are evaluated analytically using the zeroth-order Boys function:
          <code className="text-quantum-cyan font-mono block my-2 p-2 bg-[#0A111F] rounded border border-space-border">
            F₀(t) = ∫₀¹ exp(-t u²) du = 0.5 * √(π/t) * erf(√t), &nbsp; lim_t→0 F₀(t) = 1.0
          </code>
        </p>
      </section>

      {/* Section 2: Jordan-Wigner Transformation */}
      <section className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2.5 text-quantum-cyan">
          <Code className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">
            2. Second Quantization & Jordan-Wigner Fermion Mapping
          </h3>
        </div>

        <p className="text-xs text-space-text leading-relaxed">
          Fermionic operators satisfy canonical anticommutation relations <code className="text-quantum-cyan font-mono">{`{a_i, a_j^†} = δ_ij I`}</code> and <code className="text-quantum-cyan font-mono">{`{a_i, a_j} = 0`}</code>.
          The Jordan-Wigner transformation maps fermionic creation/annihilation operators into strings of non-local Pauli matrices:
          <code className="text-quantum-cyan font-mono block my-2 p-2 bg-[#0A111F] rounded border border-space-border">
            a_j = Z^(⊗j) ⊗ σ⁻ ⊗ I^(⊗n-j-1), &nbsp; a_j^† = Z^(⊗j) ⊗ σ⁺ ⊗ I^(⊗n-j-1)
          </code>
          where <code className="text-quantum-cyan">σ⁻ = [[0, 1], [0, 0]]</code> and <code className="text-quantum-cyan">σ⁺ = [[0, 0], [1, 0]]</code>.
        </p>
      </section>

      {/* Section 3: UCCD & HVA Variational Ansätze */}
      <section className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2.5 text-quantum-cyan">
          <FileText className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">
            3. Variational Quantum Eigensolver (VQE) Ansätze
          </h3>
        </div>

        <div className="space-y-3 text-xs text-space-text">
          <div>
            <h4 className="font-bold text-quantum-amber font-mono mb-1">A. Unitary Coupled Cluster Doubles (UCCD) for H2:</h4>
            <p className="leading-relaxed">
              Applied to the Hartree-Fock reference state |0011⟩:
              <code className="text-quantum-cyan font-mono block my-1 p-2 bg-[#0A111F] rounded border border-space-border">
                |ψ(θ)⟩ = exp(θ G) |HF⟩, &nbsp; G = a_2^† a_3^† a_1 a_0 - a_0^† a_1^† a_3 a_2
              </code>
              Because G is strictly anti-Hermitian (G^† = -G), exp(θ G) is unitary and preserves total particle number.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-quantum-magenta font-mono mb-1">B. Hamiltonian-Variational Ansatz (HVA) for Fermi-Hubbard:</h4>
            <p className="leading-relaxed">
              Conserves both particle number N and spin projection Sz by alternating kinetic hopping and interaction blocks:
              <code className="text-quantum-cyan font-mono block my-1 p-2 bg-[#0A111F] rounded border border-space-border">
                U(θ, φ) = ∏_k=1^p exp(-i θ_k H_U) exp(-i φ_k H_t)
              </code>
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: Richardson ZNE Extrapolation */}
      <section className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2.5 text-quantum-cyan">
          <CheckCircle className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">
            4. Richardson Zero-Noise Extrapolation (ZNE)
          </h3>
        </div>

        <p className="text-xs text-space-text leading-relaxed">
          For global depolarizing noise with error rate ε and CNOT count G, expectation values are damped by <code className="text-quantum-cyan font-mono">(1 - ε)^(G·k)</code> at noise factor k.
          Measuring at scales k ∈ {`{1, 3, 5}`} allows fitting a quadratic polynomial:
          <code className="text-quantum-cyan font-mono block my-2 p-2 bg-[#0A111F] rounded border border-space-border">
            E(k) = a k² + b k + c &nbsp;⟹&nbsp; E_ZNE = lim_k→0 E(k) = c
          </code>
          This cancels leading-order noise bias and restores chemical accuracy (|E - E_exact| ≤ 1.6 mHa).
        </p>
      </section>

      {/* Section 5: Primary Scientific References */}
      <section className="glass-panel p-6 space-y-4">
        <h3 className="text-base font-bold text-white mb-2">
          Key Literature & Scientific Citations
        </h3>

        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-[#0E1729] border border-space-border text-xs">
            <span className="font-bold text-white block">1. Delgado et al. (2022)</span>
            <span className="text-space-muted block mt-0.5">
              "Simulating key properties of lithium-ion batteries using a fault-tolerant quantum computer"
            </span>
            <span className="text-quantum-cyan font-mono text-[11px] block mt-1">
              Phys. Rev. A 106, 032428 • DOI: 10.1103/PhysRevA.106.032428
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#0E1729] border border-space-border text-xs">
            <span className="font-bold text-white block">2. McArdle et al. (2020)</span>
            <span className="text-space-muted block mt-0.5">
              "Quantum computational chemistry"
            </span>
            <span className="text-quantum-cyan font-mono text-[11px] block mt-1">
              Rev. Mod. Phys. 92, 015003 • DOI: 10.1103/RevModPhys.92.015003
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#0E1729] border border-space-border text-xs">
            <span className="font-bold text-white block">3. Temme, Bravyi, and Gambetta (2017)</span>
            <span className="text-space-muted block mt-0.5">
              "Error Mitigation for Short-Depth Quantum Circuits"
            </span>
            <span className="text-quantum-cyan font-mono text-[11px] block mt-1">
              Phys. Rev. Lett. 119, 180509 • DOI: 10.1103/PhysRevLett.119.180509
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#0E1729] border border-space-border text-xs">
            <span className="font-bold text-white block">4. Wecker et al. (2015)</span>
            <span className="text-space-muted block mt-0.5">
              "Solving strongly correlated electron models on a quantum computer"
            </span>
            <span className="text-quantum-cyan font-mono text-[11px] block mt-1">
              Phys. Rev. A 92, 062318 • DOI: 10.1103/PhysRevA.92.062318
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
