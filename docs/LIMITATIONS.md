# QMatDisc: Computational Boundaries & Scientific Limitations

> **Guiding Principle**: *Honesty over hype.* Quantum computing holds extraordinary promise for materials discovery, but scientific credibility requires absolute transparency regarding approximations, scale limits, and physical assumptions.

---

## 1. The Classical Exponential Wall & 14-Qubit Simulation Ceiling

### Mathematical Foundation
A pure quantum statevector for an $n$-qubit register resides in the complex Hilbert space $\mathcal{H} = \mathbb{C}^{2^n}$.
Using standard double-precision complex floating-point numbers (`complex128`), each statevector amplitude requires:
$$16 \text{ bytes per state} \implies \text{Memory}(n) = 2^n \times 16 \text{ bytes}$$

| Qubit Count ($n$) | Hilbert Space Dimension ($2^n$) | Statevector Memory Requirement | Hardware Capability |
| :---: | :---: | :---: | :---: |
| **4** | $16$ | $256 \text{ B}$ | Millisecond runtime (L1 Cache) |
| **8** | $256$ | $4.0 \text{ KB}$ | Sub-millisecond runtime (L1 Cache) |
| **14** | $16,384$ | $256.0 \text{ KB}$ | **QMatDisc Default Ceiling** (Real-Time In-Browser/Local) |
| **20** | $1,048,576$ | $16.0 \text{ MB}$ | Standard laptop execution |
| **30** | $1,073,741,824$ | $16.0 \text{ GB}$ | High-end workstation RAM limit |
| **40** | $1.099 \times 10^{12}$ | $16.0 \text{ TB}$ | Distributed Supercomputer (e.g., Summit, Frontier) |
| **50** | $1.126 \times 10^{15}$ | $16.0 \text{ PB}$ | Global exascale storage ceiling |
| **100** | $1.268 \times 10^{30}$ | $2.03 \times 10^{31} \text{ bytes}$ | Exceeds the mass of the Earth |

### Implementation Boundary in QMatDisc
- QMatDisc intentionally limits local interactive simulation to **$n \le 14$ qubits** ($256$ KB RAM).
- For realistic battery crystals requiring $100$–$500$ spin-orbitals ($Li_xCoO_2$, NMC cathodes), full classical statevector simulation is physically impossible.
- **Why this matters**: Claims that classical laptops can simulate full $300$-qubit battery chemistry without approximations are false. QMatDisc simulates exact active spaces (such as 4-qubit $H_2$ or 8-qubit Hubbard clusters) and projects fault-tolerant quantum requirements for the remainder.

---

## 2. 1D Fermi-Hubbard Model as a Qualitative Voltage Proxy

### Model Description
In QMatDisc, electron correlation in cathode transition-metal $d$-bands is modeled using a 1D Fermi-Hubbard ring ($L=4$ sites, 8 spin-orbitals):
$$H = -t \sum_{\langle i, j \rangle, \sigma} (c_{i\sigma}^\dagger c_{j\sigma} + \text{h.c.}) + U \sum_{i=1}^L n_{i\uparrow} n_{i\downarrow}$$

### Physical Limitations & Proxy Caveats
1. **Dimension & Geometry**: A 1-dimensional 4-site ring does not capture the 3-dimensional trigonal/monoclinic crystal symmetries, octahedral crystal field splitting ($\Delta_{\text{oct}}$ between $t_{2g}$ and $e_g$ manifolds), or Jahn-Teller distortions found in real layered oxides ($LiCoO_2$) or spinels ($LiMn_2O_4$).
2. **Relative Units**: The intercalation chemical potential and voltage step $\mu(N) = E(N) - E(N-1)$ are computed in **relative units of the hopping parameter $t$**, not direct experimental Volts.
3. **Mott Step Significance**: The calculated step at half-filling ($N=4$) is a qualitative manifestation of strong Coulomb repulsion opening a Mott-Hubbard gap, reflecting the steep voltage drop observed during phase transitions in real cells, but it is **not an absolute battery discharge curve**.

---

## 3. STO-3G Minimal Basis Set Limitations

### Minimal Basis Assumptions
Molecular hydrogen ($H_2$) in QMatDisc is solved using the contracted Gaussian Slater-Type Orbital (STO-3G) basis set:
- 1 spatial basis function per hydrogen atom ($1s$ contracted across 3 Gaussian primitives).
- $2$ spatial orbitals $\implies$ $4$ spin-orbitals $\implies$ $4$ qubits under Jordan-Wigner.

### Known Systematic Errors
1. **Basis Set Incompleteness Error (BSIE)**:
   - At the complete basis set (CBS) limit, the exact non-relativistic ground state energy of $H_2$ at $R = 1.401$ bohr is:
     $$E_{\text{CBS}} = -1.174476 \text{ Hartree}$$
   - STO-3G yields:
     $$E_{\text{STO-3G}} = -1.137306 \text{ Hartree}$$
   - This represents an intrinsic basis truncation error of $\sim 37 \text{ mHa}$ ($\approx 23 \text{ kcal/mol}$).
2. **Missing Polarization**: STO-3G lacks $p$- and $d$-polarization functions, leading to systematic overestimation of equilibrium bond distances and underestimation of binding energies.
3. **Pedagogical Purpose**: STO-3G is chosen because its 4-qubit Hilbert space enables real-time, zero-error comparison between Hartree-Fock, Full CI, and VQE on standard hardware without pre-computed integral tables.

---

## 4. Barren Plateaus in Variational Quantum Algorithms

### Theoretical Origin
For deep, unconstrained hardware-efficient parameterized quantum circuits ($U(\vec{\theta})$) forming approximate 2-designs over the unitary group $\mathcal{U}(2^n)$, McClean et al. (2018) proved that the variance of the cost function gradient vanishes exponentially with the number of qubits:
$$\text{Var}_{\vec{\theta}}\left[ \frac{\partial E(\vec{\theta})}{\partial \theta_k} \right] \in \mathcal{O}\left( \frac{1}{2^n} \right)$$

### Mitigation in QMatDisc
1. **Physics-Informed Ansätze**: QMatDisc implements **UCCD** and **HVA** (Hamiltonian-Variational Ansatz). Because these operators commute with physical symmetries (particle count $\hat{N}$ and total spin $\hat{S}_z$), parameter space is constrained to symmetry-allowed sub-manifolds, suppressing barren plateau formation.
2. **Layer Depth Limits**: Hardware-efficient circuits are capped at shallow depths ($p \le 4$) in the interactive UI to maintain non-vanishing gradient landscapes.

---

## 5. Noise Modeling vs. Physical Quantum Hardware

### Idealized Assumptions in the Noise Engine
The platform's noise simulator incorporates gate depolarizing error and finite binomial shot projection:
1. **Uniform Depolarizing Channel**: Real superconducting transmon or trapped-ion QPUs experience asymmetric Pauli errors ($p_x, p_y \ll p_z$), state-dependent relaxation ($T_1$), and dephasing ($T_2$).
2. **Markovian Noise**: The model assumes memoryless noise, ignoring non-Markovian two-level fluctuators (TLFs) and $1/f$ magnetic flux drift.
3. **Richardson Extrapolation**: Quadratic ZNE assumes noise scaling $\lambda \in \{1, 3, 5\}$ scales gate error uniformly without altering pulse shapes or inducing non-linear cross-talk.

---

## 6. Battery Candidate Material Library

### Synthetic Benchmark Disclaimer
The 7 pre-configured cathode materials in `CandidateRanking.tsx` ($LiCoO_2$, $LiFePO_4$, NMC-811, etc.) combine:
1. First-principles Hubbard model correlation parameters ($U/t$).
2. Representative experimental literature values (nominal operating voltage, gravimetric capacity, cycle life, material cost).
3. **Explicit Labeling**: These values are compiled as representative engineering baselines for comparative multi-objective trade-off analysis. They are not dynamic DFT/QMC relaxations of $10,000$-atom crystallographic supercells.

---

## 7. Delgado Fault-Tolerant Resource Estimator Assumptions

The surface code projections derived in `FaultTolerant.tsx` adhere to **Delgado et al. (2022)** and assume:
1. **Physical Gate Error Rate**: $p_{\text{phys}} = 10^{-3}$ (threshold $p_{\text{th}} \approx 1\%$).
2. **Double-Factorized Block Encoding**: Truncation threshold $\Delta\epsilon = 10^{-3} \text{ Ha}$.
3. **Magic State Distillation**: 15-to-1 factory routing overhead included via $2 \times d^2$ physical qubits per logical patch.
4. **Hardware Execution Time**: Assumes 1 microsecond surface-code cycle time.
