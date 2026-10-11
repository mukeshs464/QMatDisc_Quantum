# QMatDisc: Quantum Simulation-based Material Discovery Platform
## End-to-End System Architecture

```
                                      +---------------------------------------------+
                                      |            Client Web Application           |
                                      | React 19 + TypeScript + Vite + Tailwind CSS |
                                      | 3D Three.js Digital Twin + Plotly.js Charts |
                                      +---------------------------------------------+
                                                     |               ^
                                          REST HTTP  |               | WebSocket Live Telemetry
                                                     v               |
                                      +---------------------------------------------+
                                      |          FastAPI Application Server         |
                                      | Uvicorn Async ASGI (Port 8001 / Route Prefix) |
                                      +---------------------------------------------+
                                           |                 |                |
                       +-------------------+                 |                +--------------------+
                       v                                     v                                     v
         +---------------------------+         +---------------------------+         +---------------------------+
         |     Chemistry Engine      |         |      Quantum Engine       |         |   ML & Estimation Core    |
         |  - STO-3G Ints (Boys F0)  |         |  - Pauli Algebra (2^n)    |         |  - Active Learning GP     |
         |  - H2 RHF / FCI / UCCD    |         |  - Jordan-Wigner Fermions |         |  - Bayesian UCB Search    |
         |  - 4-Site Hubbard (8-Qub) |<------->|  - Ansätze (UCCD, HVA, HEA|         |  - Delgado Resource Est.  |
         |  - Nernst-Delgado Voltage |         |  - VQE (BFGS, SPSA, COBY) |         |  - Qiskit Adapter Loader  |
         |  - JSON Pauli Downfolding |         |  - Richardson ZNE & Noise |         |                           |
         +---------------------------+         +---------------------------+         +---------------------------+
```

---

## 1. High-Level Architectural Overview

**QMatDisc** is an open-source, mathematically rigorous quantum simulation platform specifically engineered to accelerate the computational discovery and design of transition-metal cathode materials for high-energy-density rechargeable batteries.

The system combines:
1. An analytical **electronic structure chemistry engine** based on first-principles contracted Gaussian basis sets ($H_2$ STO-3G) and strongly correlated lattice models ($4$-site / $8$-qubit Fermi-Hubbard ring).
2. A zero-dependency **pure NumPy/SciPy quantum statevector engine** capable of Jordan-Wigner transformations, arbitrary parameterized unitary ansätze, hybrid classical-quantum optimization (VQE), and hardware noise mitigation (Richardson Zero-Noise Extrapolation).
3. A fault-tolerant **Delgado Quantum Resource Estimator** deriving logical qubit, physical qubit (surface code distance $d$), and Toffoli gate complexities for classically intractable transition metal clusters ($LiCoO_2$, $LiNiO_2$, $LiMn_2O_4$).
4. An **Active Learning Bayesian surrogate loop** (Gaussian Process Regression with Upper Confidence Bound acquisition) that iteratively navigates cathode candidate design spaces.
5. A **FastAPI async backend** with real-time WebSocket parameter streaming.
6. A responsive **React + TypeScript + Vite** frontend with dynamic Plotly visualizations, an interactive 3D WebGL battery digital twin (Three.js / React Three Fiber), and accessible quantum explainers.

---

## 2. Quantum Engine Architecture (`backend/app/quantum/`)

The quantum engine is designed with zero external quantum framework dependencies as its core foundation, supplemented by optional runtime plug-and-play adapter support for frameworks like Qiskit.

### 2.1 Pauli Algebra & Decomposition (`pauli.py`)
- **Single-Qubit Paulis**: Identity $I$, Pauli $X$, Pauli $Y$, and Pauli $Z$ are represented as exact $2 \times 2$ complex matrices (`np.complex128`).
- **N-Qubit Kronecker Products**: Multi-qubit Pauli operators $P = \bigotimes_{i=0}^{n-1} P_i$ are constructed via Kronecker products.
- **Operator Inversion (Hilbert-Schmidt Projection)**: Any arbitrary $2^n \times 2^n$ Hermitian matrix $H$ is decomposed onto the complete orthonormal Pauli basis:
  $$H = \sum_{P \in \{I,X,Y,Z\}^{\otimes n}} c_P P, \quad c_P = \frac{1}{2^n} \text{Tr}(P^\dagger H)$$
- Complexity: $O(4^n \cdot 2^{2n}) = O(16^n)$ exact Hilbert-Schmidt projection with configurable numerical cutoff tolerance ($\epsilon = 10^{-9}$).

### 2.2 Fermionic Second Quantization & Jordan-Wigner (`fermion.py`)
- **Canonical Anticommutation Relations (CAR)**: Fermionic annihilation operators $a_p$ and creation operators $a_p^\dagger$ satisfy:
  $$\{a_p, a_q^\dagger\} = \delta_{pq} I, \quad \{a_p, a_q\} = 0$$
- **Jordan-Wigner Transformation**: Exactly maps $n$ fermionic spin-orbitals to $n$ qubits:
  $$a_p = \left( \bigotimes_{k=0}^{p-1} Z_k \right) \otimes \left( \frac{X_p + i Y_p}{2} \right) \otimes \left( \bigotimes_{k=p+1}^{n-1} I_k \right)$$
- Number operators $\hat{N}_p = a_p^\dagger a_p$ and total particle operator $\hat{N} = \sum_{p=0}^{n-1} \hat{N}_p$ are precomputed to guarantee strict particle-number conservation verification ($[H, \hat{N}] = 0$).

### 2.3 Parameterized Ansätze Library (`ansatz.py`)
- **UCCD (Unitary Coupled-Cluster Doubles)**:
  - Conserves total electron count $\hat{N}$ and projection spin $\hat{S}_z$.
  - For $H_2$ (4 qubits): Excites electrons from occupied spatial orbital $\sigma_g$ ($\alpha_0, \beta_1$) to virtual antibonding orbital $\sigma_u^*$ ($\alpha_2, \beta_3$):
    $$|\psi(\theta)\rangle = \exp\left[ \theta (a_2^\dagger a_3^\dagger a_0 a_1 - a_0^\dagger a_1^\dagger a_2 a_3) \right] |\text{HF}\rangle$$
  - Evaluated via exact operator exponentiation `scipy.linalg.expm`.
- **HVA (Hamiltonian-Variational Ansatz)**:
  - Alternates non-commuting terms of the physical problem Hamiltonian:
    $$U_{\text{HVA}}(\vec{\theta}) = \prod_{l=1}^p e^{-i \theta_{l, U} H_U} e^{-i \theta_{l, t} H_t}$$
  - Preserves underlying lattice symmetries and avoids barren plateaus in local parameter space.
- **HEA (Hardware-Efficient Ansatz)**:
  - Alternating layers of single-qubit rotations $R_y(\theta)$ and entangling CNOT ladders for NISQ demonstration.

### 2.4 Variational Quantum Eigensolver (VQE) (`vqe.py`)
- Energy objective function:
  $$E(\vec{\theta}) = \langle \psi(\vec{\theta}) | H | \psi(\vec{\theta}) \rangle = \psi(\vec{\theta})^\dagger H \psi(\vec{\theta})$$
- **Supported Optimizers**:
  1. `BFGS`: Quasi-Newton gradient optimization with analytic finite-difference gradients.
  2. `COBYLA`: Constrained optimization by linear approximation (derivative-free).
  3. `SPSA`: Simultaneous Perturbation Stochastic Approximation for noisy cost landscapes:
     $$g_k(\theta) = \frac{E(\theta + c_k \Delta_k) - E(\theta - c_k \Delta_k)}{2 c_k \Delta_k}, \quad \Delta_k \in \{-1, +1\}^d$$
- **Telemetry Callbacks**: Emits epoch-by-epoch energy convergence, parameter gradient norm, and parameter coordinates over asynchronous generators.

### 2.5 Quantum Noise & Richardson ZNE (`noise.py`)
- **Physical Noise Modeling**:
  - Depolarizing channel: Gate infidelity $\epsilon$ across circuit depth $G$ dampens expectation values:
    $$\langle P \rangle_\lambda = (1 - \epsilon)^{G \lambda} \langle P \rangle_0$$
  - Shot noise: Finite projection statistics sampled via Binomial distribution over $N_s$ measurement shots:
    $$k \sim \text{Binomial}\left(N_s, \frac{1 + \langle P \rangle}{2}\right), \quad \langle P \rangle_{\text{shot}} = \frac{2k}{N_s} - 1$$
- **Richardson Zero-Noise Extrapolation**:
  - Scales noise by deliberate factors $\vec{\lambda} = [1, 3, 5]$ (or user-configured scales).
  - Solves the Vandermonde linear system for polynomial extrapolation weights $\gamma_i$:
    $$\sum_{i} \gamma_i \lambda_i^k = \delta_{k, 0} \implies E_{\text{ZNE}} = \sum_i \gamma_i E(\lambda_i)$$
  - Recovers chemical accuracy ($< 1.6 \text{ mHa}$) even in the presence of physical gate infidelity.

---

## 3. Chemistry Engine Architecture (`backend/app/chemistry/`)

### 3.1 STO-3G Contracted Gaussian Integrals (`sto3g.py`)
- Implements direct evaluation of the Boys $F_0$ function:
  $$F_0(t) = \int_0^1 e^{-t u^2} du = \frac{\sqrt{\pi}}{2 \sqrt{t}} \text{erf}(\sqrt{t}) \quad (t > 10^{-7}), \quad F_0(t) \approx 1 - \frac{t}{3} + \frac{t^2}{10} \quad (t \le 10^{-7})$$
- Evaluates overlap integrals $S_{\mu\nu}$, kinetic integrals $T_{\mu\nu}$, electron-nuclear attraction integrals $V_{\mu\nu}$, and 4-center 2-electron repulsion integrals $(\mu\nu|\lambda\sigma)$ over 3-term contracted Cartesian Gaussian primitives:
  $$\phi_{1s}(\vec{r}) = \sum_{k=1}^3 d_k \left(\frac{2\alpha_k}{\pi}\right)^{3/4} \exp(-\alpha_k |\vec{r} - \vec{R}|^2)$$
- Performs symmetric orthogonalization $S^{-1/2}$ and canonical Hartree-Fock Roothaan-Hall self-consistent field (SCF) diagonalizations.

### 3.2 Molecular Hydrogen Electronic Structure (`h2_molecule.py`)
- Transforms 1- and 2-electron atomic orbital integrals to canonical molecular orbitals:
  $$h_{pq} = \int \phi_p^*(\vec{r}) \left(-\frac{1}{2}\nabla^2 - \sum_A \frac{Z_A}{|\vec{r}-\vec{R}_A|}\right) \phi_q(\vec{r}) d\vec{r}$$
  $$g_{pqrs} = \iint \frac{\phi_p^*(\vec{r}_1) \phi_r(\vec{r}_1) \phi_q^*(\vec{r}_2) \phi_s(\vec{r}_2)}{|\vec{r}_1 - \vec{r}_2|} d\vec{r}_1 d\vec{r}_2$$
- Solves classical Restricted Hartree-Fock (RHF), exact Full Configuration Interaction (FCI), and 4-qubit UCCD-VQE simultaneously across arbitrary nuclear bond geometries ($R \in [0.2, 2.5]$ Å).

### 3.3 Fermi-Hubbard Lattice & Mott-Hubbard Physics (`hubbard.py`)
- Models strongly correlated $d$-band transition-metal redox centers via the 1D Fermi-Hubbard ring Hamiltonian ($L=4$ sites, 8 spin-orbitals):
  $$H = -t \sum_{\langle i, j \rangle, \sigma} (c_{i\sigma}^\dagger c_{j\sigma} + \text{h.c.}) + U \sum_{i=1}^L n_{i\uparrow} n_{i\downarrow}$$
- Partitions the $256$-dimensional Hilbert space into $9$ particle-conserving Fock sectors ($N = 0, \dots, 8$ electrons).
- Derives the intercalation chemical potential and voltage profile:
  $$V(N) = \frac{\mu(N)}{e} = -\frac{E(N) - E(N-1)}{e}$$
- Accurately captures the opening of the Mott-Hubbard insulator gap at half-filling ($N = 4$) as $U/t$ increases from $0 \to 8$.

### 3.4 Battery Voltage & Material Candidates (`voltage.py`)
- Integrates the thermodynamic Nernst equation with quantum Hubbard corrections:
  $$V(x) = -\frac{\Delta G_r(x)}{z F} \approx -\frac{\Delta E_{\text{quantum}}(x)}{e} - \frac{P \Delta V - T \Delta S}{z F}$$
- Pre-loaded with 7 benchmark battery cathode candidates:
  - $LiCoO_2$ (Standard Layered Oxide)
  - $LiFePO_4$ (Olivine Phosphate)
  - $LiNi_{0.8}Mn_{0.1}Co_{0.1}O_2$ (High-Ni NMC-811)
  - $LiMn_2O_4$ (Spinel Oxide)
  - $Li_2FeSiO_4$ (Polyanion Silicate)
  - $NaFePO_4$ (Sodium-Ion Olivine)
  - $Li_3V_2(PO_4)_3$ (NASICON Phosphate)
- Evaluates multi-objective material utility scoring across specific capacity, average voltage, cycle life stability, toxicity, and raw material cost.

---

## 4. Fault-Tolerant Resource Estimator (`core/resources.py`)

Classical supercomputers hit an impenetrable exponential memory wall when simulating strongly correlated transition metal clusters beyond $40$ qubits.

Following **Delgado et al. (2022)** (*Simulating key properties of lithium-ion batteries using quantum computers*, *Phys. Rev. Applied 17*), the platform provides exact fault-tolerant resource scaling:
- **Active Orbital Scaling**: $N_q = 2 N_o$ logical qubits.
- **Surface Code Distance ($d$)**:
  $$d = 2 \left\lceil \frac{\log_{10}(P_{\text{target}} / (N_{\text{Toffoli}} \cdot c))}{\log_{10}(100 \cdot p_{\text{phys}})} \right\rceil + 1$$
- **Physical Qubits per Logical Patch**: $2 \times d^2$ data and syndrome qubits.
- **Toffoli Complexity (Double-Factorized Block Encoding)**:
  $$N_{\text{Toffoli}} \approx \mathcal{O}\left( \frac{\lambda_{\text{DF}}}{\epsilon_{\text{PE}}} \cdot N_o \cdot \sqrt{\text{rank}} \right)$$

---

## 5. Machine Learning Active Learning Loop (`ml/active_learning.py`)

To minimize expensive quantum circuit evaluations, the platform employs a Gaussian Process Regressor:
- **Kernel**: Radial Basis Function (RBF) with automatic length-scale optimization.
- **Surrogate Prediction**: Provides mean prediction $\mu(\vec{x})$ and epistemic uncertainty $\sigma(\vec{x})$.
- **Acquisition Function (Upper Confidence Bound - UCB)**:
  $$\alpha_{\text{UCB}}(\vec{x}) = \mu(\vec{x}) + \kappa \cdot \sigma(\vec{x})$$
  Balances exploration of unexplored chemical compositions with exploitation of high-scoring candidates.

---

## 6. API & WebSocket Architecture (`backend/app/api/`)

The FastAPI application runs on ASGI Uvicorn (Port 8001):
- **Health Check**: `GET /health` (reports engine status, Qiskit availability, memory consumption).
- **VQE Solvers**:
  - `POST /api/vqe/h2` (solves $H_2$ single point).
  - `POST /api/vqe/h2/pes` (scans full potential energy surface).
  - `POST /api/vqe/hubbard` (solves Fermi-Hubbard sector).
- **Voltage & Materials**:
  - `POST /api/voltage/hubbard-profile` (Hubbard voltage steps).
  - `GET /api/candidates` & `GET /api/candidates/{id}`.
  - `POST /api/candidates/score` (custom parameter weights).
- **Noise Mitigation**:
  - `POST /api/noise/zne-benchmark` (statistical ZNE trials).
- **Active Learning**:
  - `POST /api/active-learning/step` (GP fit and UCB recommendation).
- **Resource Estimation**:
  - `POST /api/resources/estimate` (Delgado surface code projection).
- **Custom Downfolding**:
  - `POST /api/hamiltonian/upload` (arbitrary Pauli JSON ingestion).
- **Live WebSocket Telemetry**:
  - `WS /ws/vqe` (streams real-time convergence telemetry during VQE execution).

---

## 7. Frontend Architecture (`frontend/src/`)

Built with React 19, TypeScript, and Vite with a custom dark "quantum laboratory" aesthetic:
- **Design Tokens**: Slate background (`#0B1220`), Cyan (`#22D3EE`), Magenta (`#E879F9`), Amber (`#FBBF24`).
- **Interactive 3D WebGL Digital Twin**:
  - Built with `@react-three/fiber` and `@react-three/drei`.
  - Visualizes layered cathode, separator, and anode with animated Li-ion drift and real-time state-of-charge coupling.
- **3D Molecular Orbital Visualizer**:
  - Renders 3D Gaussian electron cloud isosurfaces for bonding $\sigma_g$ and antibonding $\sigma_u^*$ orbitals.
- **9 Core Application Views**:
  1. `MissionControl.tsx`: KPI dashboards, quick actions, status monitors.
  2. `MoleculeLab.tsx`: Interactive $H_2$ PES dissociation explorer and orbital view.
  3. `VoltageExplorer.tsx`: Hubbard Mott step curves and open-circuit voltage profiles.
  4. `NoiseLab.tsx`: Real-time ZNE depolarizing mitigation and error histograms.
  5. `CandidateRanking.tsx`: Radar charts and multi-criteria cathode trade-off explorer.
  6. `ActiveLearning.tsx`: Surrogate GP confidence bands and Bayesian UCB iterations.
  7. `FaultTolerant.tsx`: Delgado resource estimator and surface code projections.
  8. `BatteryDigitalTwin.tsx`: 3D cell migration animation coupled to Hubbard voltage.
  9. `AboutMethodology.tsx`: Mathematical foundations, equations, and literature citations.
