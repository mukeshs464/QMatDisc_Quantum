"""QMatDisc Chemistry Engine - 4-Site / 8-Qubit Fermi-Hubbard Ring Model.
Models electron correlation in battery cathode transition-metal d-bands.
Includes:
- Hopping (t) and on-site Coulomb repulsion (U) Hamiltonians
- Particle-number & Sz symmetry sector projection (0..8 electrons)
- Exact diagonalization vs. Hamiltonian-Variational Ansatz (HVA) VQE
- Mott-Hubbard voltage step opening at half-filling
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple
import numpy as np
from scipy.optimize import minimize

from ..quantum.fermion import get_annihilation_operators
from ..quantum.ansatz import HVAHubbardSector


@dataclass
class HubbardSectorResult:
    """Exact and VQE ground state results for a specific particle sector."""
    total_electrons: int
    n_up: int
    n_down: int
    sector_dimension: int
    exact_energy: float
    vqe_energy: float
    vqe_error: float


@dataclass
class HubbardVoltageProfile:
    """Voltage profile across all electron fillings N = 0..8."""
    t: float
    u: float
    u_over_t: float
    fillings: List[int]
    lithiation_x: List[float]  # x = N / 8 (0.125 to 1.0)
    energies_exact: List[float]
    energies_vqe: List[float]
    relative_voltage_exact: List[float]  # -[E(N) - E(N-1)]
    relative_voltage_vqe: List[float]
    half_filling_step_height: float  # (E(5) - E(4)) - (E(4) - E(3))
    max_vqe_error: float


class FermiHubbardRing:
    """4-site periodic Fermi-Hubbard ring mapped to 8 qubits."""

    def __init__(self, n_sites: int = 4):
        self.n_sites = n_sites
        self.n_qubits = 2 * n_sites  # 8 qubits
        self.ann_ops = get_annihilation_operators(self.n_qubits)
        self.num_ops = [op.conj().T @ op for op in self.ann_ops]

        # Precompute Fock state occupation table for fast sector partitioning
        indices = np.arange(2**self.n_qubits)
        self.occ_table = np.array(
            [[(k >> (self.n_qubits - 1 - j)) & 1 for j in range(self.n_qubits)] for k in indices],
            dtype=int,
        )

    def build_hamiltonians(self, t: float = 1.0, u: float = 4.0) -> Tuple[np.ndarray, np.ndarray]:
        """Constructs full 256x256 kinetic (H_t) and interaction (H_u) matrices."""
        dim = 2**self.n_qubits
        h_t = np.zeros((dim, dim), dtype=complex)
        h_u = np.zeros((dim, dim), dtype=complex)

        # 4 sites with periodic boundary: (0, 1), (1, 2), (2, 3), (3, 0)
        bonds = [(0, 1), (1, 2), (2, 3), (3, 0)]
        a = self.ann_ops

        for i, j in bonds:
            for spin in (0, 1):
                p = 2 * i + spin
                q = 2 * j + spin
                h_t += -t * (a[p].conj().T @ a[q] + a[q].conj().T @ a[p])

        for i in range(self.n_sites):
            h_u += u * (self.num_ops[2 * i] @ self.num_ops[2 * i + 1])

        # Guarantee exact Hermiticity
        h_t = 0.5 * (h_t + h_t.conj().T)
        h_u = 0.5 * (h_u + h_u.conj().T)

        return h_t, h_u

    def get_sector_indices(self, total_electrons: int) -> Tuple[np.ndarray, int, int]:
        """Finds basis indices corresponding to (N_up, N_down) with most balanced Sz."""
        n_down = total_electrons // 2
        n_up = total_electrons - n_down
        up_counts = self.occ_table[:, 0::2].sum(axis=1)
        down_counts = self.occ_table[:, 1::2].sum(axis=1)
        sector_idx = np.where((up_counts == n_up) & (down_counts == n_down))[0]
        return sector_idx, n_up, n_down

    def solve_sector(
        self,
        h_t: np.ndarray,
        h_u: np.ndarray,
        total_electrons: int,
        p_layers: int = 6,
        n_restarts: int = 10,
    ) -> HubbardSectorResult:
        """Solves exact and HVA-VQE ground state within a specific electron sector."""
        sector_idx, n_up, n_down = self.get_sector_indices(total_electrons)
        dim_sec = len(sector_idx)

        ht_sec = h_t[np.ix_(sector_idx, sector_idx)]
        hu_sec = h_u[np.ix_(sector_idx, sector_idx)]
        h_tot = ht_sec + hu_sec

        # Exact ground energy in sector
        exact_e = float(np.linalg.eigvalsh(h_tot)[0])

        if dim_sec == 1:
            return HubbardSectorResult(
                total_electrons=total_electrons,
                n_up=n_up,
                n_down=n_down,
                sector_dimension=dim_sec,
                exact_energy=exact_e,
                vqe_energy=exact_e,
                vqe_error=0.0,
            )

        hva = HVAHubbardSector(ht_sec, hu_sec, p_layers=p_layers)

        def cost(params: np.ndarray) -> float:
            psi = hva.state(params)
            return float((psi.conj() @ h_tot @ psi).real)

        best_vqe = float("inf")
        rng = np.random.default_rng(3 + total_electrons)

        # Deterministic zero initialization first
        res0 = minimize(cost, np.zeros(2 * p_layers), method="BFGS", options={"gtol": 1e-9})
        best_vqe = min(best_vqe, float(res0.fun))

        # Multistart random initializations to escape local minima
        for _ in range(n_restarts):
            p_init = rng.uniform(-0.5, 0.5, 2 * p_layers)
            res = minimize(cost, p_init, method="BFGS", options={"gtol": 1e-9})
            best_vqe = min(best_vqe, float(res.fun))
            if abs(best_vqe - exact_e) < 1e-8:
                break

        err = abs(best_vqe - exact_e)
        return HubbardSectorResult(
            total_electrons=total_electrons,
            n_up=n_up,
            n_down=n_down,
            sector_dimension=dim_sec,
            exact_energy=exact_e,
            vqe_energy=best_vqe,
            vqe_error=err,
        )

    def compute_voltage_profile(
        self,
        t: float = 1.0,
        u: float = 4.0,
        p_layers: int = 6,
    ) -> HubbardVoltageProfile:
        """Computes the full 0..8 electron voltage profile and step height."""
        h_t, h_u = self.build_hamiltonians(t=t, u=u)
        energies_exact: List[float] = []
        energies_vqe: List[float] = []
        errors: List[float] = []

        for n_e in range(9):
            sec_res = self.solve_sector(h_t, h_u, total_electrons=n_e, p_layers=p_layers)
            energies_exact.append(sec_res.exact_energy)
            energies_vqe.append(sec_res.vqe_energy)
            errors.append(sec_res.vqe_error)

        # Relative chemical potentials V(N) = -(E(N) - E(N-1))
        e_ex = np.array(energies_exact)
        e_vq = np.array(energies_vqe)

        v_exact = (-(e_ex[1:] - e_ex[:-1])).tolist()
        v_vqe = (-(e_vq[1:] - e_vq[:-1])).tolist()
        x_vals = [(i + 1) / 8.0 for i in range(8)]

        # Voltage step at half-filling (N=4): step = (E(5) - E(4)) - (E(4) - E(3))
        step_height = float((e_vq[5] - e_vq[4]) - (e_vq[4] - e_vq[3]))

        return HubbardVoltageProfile(
            t=t,
            u=u,
            u_over_t=u / t,
            fillings=list(range(9)),
            lithiation_x=x_vals,
            energies_exact=energies_exact,
            energies_vqe=energies_vqe,
            relative_voltage_exact=v_exact,
            relative_voltage_vqe=v_vqe,
            half_filling_step_height=step_height,
            max_vqe_error=float(max(errors)),
        )
