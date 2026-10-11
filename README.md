# QMatDisc: Quantum Simulation-based Material Discovery Platform
### Next-Generation Battery Cathode Design via Variational Quantum Algorithms & Lattice Models

[![Tests](https://img.shields.io/badge/tests-64%2F64%20passing-brightgreen.svg)](docs/ARCHITECTURE.md)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.13-blue.svg)](backend/)
[![React](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite%20%2B%20TS-cyan.svg)](frontend/)
[![Quantum](https://img.shields.io/badge/quantum-pure%20NumPy%20statevector-magenta.svg)](backend/app/quantum/)
[![Accuracy](https://img.shields.io/badge/chemical%20accuracy-%3C%201.6%20mHa-gold.svg)](notebooks/reproduce_figures.ipynb)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 📌 Executive Summary

**QMatDisc** is a capstone-grade computational platform bridging quantum algorithms, first-principles electronic structure, and materials science to accelerate the discovery of cathode materials for next-generation lithium- and sodium-ion batteries.

Classical Density Functional Theory (DFT) struggles with strongly correlated transition-metal $d$- and $f$-electrons found in modern battery cathodes, often suffering from self-interaction errors and unphysical delocalization. Conversely, full configuration interaction (FCI) encounters an intractable exponential memory wall.

QMatDisc demonstrates how hybrid quantum-classical algorithms—specifically the **Variational Quantum Eigensolver (VQE)**, **Unitary Coupled-Cluster (UCCD)**, and the **Hamiltonian-Variational Ansatz (HVA)**—can accurately resolve electron correlation in active spaces while maintaining rigorous physical fidelity.

> **Scientific Honesty Guarantee**: Every calculation in QMatDisc is dynamically derived from real quantum simulation engines. Zero values are mocked. All approximations (such as qualitative Hubbard proxies and the $14$-qubit statevector memory limit) are transparently disclosed.

---

## 🔬 Core Scientific Benchmarks

All benchmark figures below are generated dynamically using `notebooks/generate_notebook.py` and are reproducible via `notebooks/reproduce_figures.ipynb`.

| Figure 1: $H_2$ PES Dissociation Curve | Figure 2: Mott-Hubbard Voltage Gap |
| :---: | :---: |
| ![Figure 1](docs/figures/fig1_h2_pes.png) | ![Figure 2](docs/figures/fig2_hubbard_voltage.png) |
| *Exact agreement between 4-qubit UCCD-VQE and FCI ($< 10^{-12}$ Ha error), overcoming the severe failure of Restricted Hartree-Fock at large bond separations.* | *4-site / 8-qubit Fermi-Hubbard ring voltage profile showing the opening of the Mott-Hubbard insulator gap at half-filling ($N=4$) as Coulomb repulsion $U/t \to 8$.* |

| Figure 3: Richardson ZNE Error Mitigation | Figure 4: The Classical Exponential Wall |
| :---: | :---: |
| ![Figure 3](docs/figures/fig3_zne_benchmark.png) | ![Figure 4](docs/figures/fig4_exponential_wall.png) |
| *Richardson quadratic ZNE under depolarizing noise ($\epsilon = 3\times 10^{-4}$, 48 CNOTs) recovers chemical accuracy ($< 1.6$ mHa / $1.0$ kcal/mol) with 86% success rate.* | *Logarithmic scaling of classical statevector RAM ($2^n \times 16$ bytes) contrasting the $14$-qubit desktop ceiling against fault-tolerant quantum advantage.* |

---

## 🖥️ Platform Visual Walkthrough

The web application features 9 dedicated exploration modules styled in a modern dark "quantum laboratory" aesthetic (`#0B1220`).

### 1. Mission Control & System Overview
Real-time KPI telemetry, simulator health monitors, and rapid benchmark launchers.
![01 Mission Control](docs/screenshots/01_mission_control.png)

### 2. Molecule Lab & 3D Orbital Isosurface
Potential energy surface (PES) scanner with interactive 3D WebGL electron cloud orbitals ($\sigma_g$ bonding and $\sigma_u^*$ antibonding).
![02 Molecule Lab](docs/screenshots/02_molecule_lab.png)

### 3. Voltage Explorer (Hubbard Mott-Hubbard Physics)
Intercalation chemical potential $\mu(N)$ and voltage plateaus across variable Coulomb interaction strengths $U/t \in \{0, 2, 4, 8\}$.
![03 Voltage Explorer](docs/screenshots/03_voltage_explorer.png)

### 4. Noise Lab & Richardson ZNE Mitigation
Hardware gate infidelity simulation, finite shot projection sampling, and quadratic zero-noise extrapolation.
![04 Noise Lab](docs/screenshots/04_noise_lab.png)

### 5. Candidate Ranking & Multi-Criteria Trade-offs
Radar chart comparisons across 7 battery cathode candidates ($LiCoO_2$, $LiFePO_4$, NMC-811, $LiMn_2O_4$, etc.) with user-weighted utility functions.
![05 Candidate Ranking](docs/screenshots/05_candidate_ranking.png)

### 6. Active Learning (Gaussian Process & UCB)
Bayesian surrogate loop balancing exploration of unknown chemical compositions with exploitation of high-capacity candidates.
![06 Active Learning](docs/screenshots/06_active_learning.png)

### 7. Fault-Tolerant Resource Estimator (Delgado et al.)
Surface code distance ($d$), logical qubit count, physical patch routing, and Toffoli complexity projections for large transition-metal clusters.
![07 Fault Tolerant](docs/screenshots/07_fault_tolerant.png)

### 8. Battery Digital Twin (3D WebGL Simulation)
Interactive 3D lithium-ion cell with animated Li-ion transport between cathode and anode, coupled in real time to the simulated cell voltage.
![08 Battery Digital Twin](docs/screenshots/08_battery_digital_twin.png)

### 9. Scientific Methodology & Literature Foundations
Theoretical derivations, mathematical formulas, and full literature citations.
![09 About Methodology](docs/screenshots/09_about_methodology.png)

---

## 🚀 Quickstart & Installation

### Option A: Local Development

#### Prerequisites
- Python 3.11+ (tested on Python 3.11 and 3.13)
- Node.js 18+ & npm

```bash
# 1. Clone repository
git clone https://github.com/mukeshs464/QMatDisc_Quantum.git
cd QMatDisc_Quantum

# 2. Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. Launch development services
# Terminal 1 (Backend):
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001

# Terminal 2 (Frontend):
cd frontend && npm run dev
```

Visit the running application at: **`http://127.0.0.1:5173`**
Backend Swagger documentation at: **`http://127.0.0.1:8001/docs`**

---

### Option B: Docker Compose

```bash
docker compose up --build
```
This starts both the FastAPI backend container (port 8001) and Nginx-served React frontend container (port 5173).

---

## 🧪 Verification & Testing

Run the full automated test suite (64 unit, property, and regression tests):
```bash
# Using Makefile
make test

# Or directly via pytest
pytest backend/tests/ -v
```

Execute the standalone terminal verification demo:
```bash
make demo
# or: python scripts/demo.py
```

Regenerate all publication benchmark figures:
```bash
make figures
# or: python notebooks/generate_notebook.py
```

---

## 📐 Project Structure

```
QMatDisc_Quantum/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routes (VQE, voltage, noise, candidates, WS)
│   │   ├── chemistry/       # STO-3G integrals, H2 PES, Hubbard ring, voltage
│   │   ├── core/            # Config, Delgado resource estimator, LRU cache
│   │   ├── ml/              # Active learning Gaussian Process & UCB
│   │   └── quantum/         # Pauli algebra, Jordan-Wigner, ansätze, VQE, ZNE
│   ├── tests/               # 64 pytest tests (invariants, regression, API)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # 3D Digital Twin, Orbital View, Plotly, Circuit
│   │   ├── pages/           # 9 core application views
│   │   └── lib/             # API client, types, constants, stores
│   └── package.json
├── notebooks/
│   ├── reproduce_figures.ipynb # Executed Jupyter reproduction notebook
│   └── generate_notebook.py   # Headless execution generator
├── docs/
│   ├── ARCHITECTURE.md      # In-depth system architecture
│   ├── LIMITATIONS.md       # Computational and physical boundaries
│   ├── API_REFERENCE.md     # REST and WebSocket protocol catalog
│   ├── figures/             # 4 high-resolution publication benchmark figures
│   └── screenshots/         # 9 verified frontend page screenshots
├── scripts/
│   └── demo.py              # CLI verification demo script
├── Makefile                 # Portable developer workflow commands
├── docker-compose.yml       # Multi-container orchestration
└── README.md
```

---

## 📚 References & Scientific Foundations

1. **Delgado, A. et al.** (2022). *Simulating key properties of lithium-ion batteries using quantum computers*. Physical Review Applied, 17(3), 034041.
2. **Peruzzo, A. et al.** (2014). *A variational eigenvalue solver on a photonic quantum processor*. Nature Communications, 5, 4213.
3. **Mcardle, S. et al.** (2020). *Quantum computational chemistry*. Reviews of Modern Physics, 92(1), 015003.
4. **Temme, K., Bravyi, S., & Gambetta, J. M.** (2017). *Error mitigation for short-depth quantum circuits*. Physical Review Letters, 119(18), 180509.
5. **McClean, J. R. et al.** (2018). *Barren plateaus in quantum neural network training landscapes*. Nature Communications, 9(1), 4812.

---

## 📄 License
This project is licensed under the MIT License.
