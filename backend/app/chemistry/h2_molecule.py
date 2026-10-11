"""QMatDisc Chemistry Engine - H2 Molecule 4-Qubit Electronic Hamiltonian & PES Solver.
Constructs the second-quantized Hamiltonian mapped via Jordan-Wigner,
solves for Restricted Hartree-Fock (RHF), exact Full Configuration Interaction (FCI),
and UCCD Variational Quantum Eigensolver (VQE).
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple
import numpy as np

from ..quantum.fermion import get_annihilation_operators, build_occupied_state
from ..quantum.pauli import PauliTerm, pauli_decomposition
from ..quantum.ansatz import UCCDAnsatzH2
from ..quantum.vqe import VQERunner, VQEResult
from .sto3g import compute_h2_integrals, STO3GIntegrals

BOHR_TO_ANGSTROM = 0.529177210903
ANGSTROM_TO_BOHR = 1.0 / BOHR_TO_ANGSTROM


@dataclass
class H2CalculationResult:
    """Complete quantum and classical solution for H2 at a specific bond distance."""
    distance_angstrom: float
    distance_bohr: float
    energy_hf: float
    energy_fci: float
    energy_vqe: float
    optimal_theta: float
    correlation_energy_mHa: float  # (E_HF - E_FCI) * 1000
    vqe_error_mHa: float  # |E_VQE - E_FCI| * 1000
    nuclear_repulsion: float
    pauli_terms: List[PauliTerm]
    n_pauli_terms: int


class H2HamiltonianBuilder:
    """Builds the 4-qubit electronic Hamiltonian for H2 in the STO-3G basis."""

    def __init__(self):
        self.ann_ops = get_annihilation_operators(4)
        self.hf_state = build_occupied_state([1, 0], 4)
        self.uccd = UCCDAnsatzH2(n_qubits=4)

    def build_hamiltonian_matrix(self, integrals: STO3GIntegrals) -> np.ndarray:
        """Assembles the 16x16 second-quantized Hamiltonian matrix."""
        h_mo = integrals.h_mo
        g_mo = integrals.g_mo
        en = integrals.nuclear_repulsion

        dim = 16
        h_mat = en * np.eye(dim, dtype=complex)
        a = self.ann_ops

        # 1-electron terms: sum_{pq} h_{pq} a_p^\dagger a_q (spin-conserving p % 2 == q % 2)
        for p in range(4):
            for q in range(4):
                if p % 2 == q % 2:
                    h_mat += h_mo[p // 2, q // 2] * (a[p].conj().T @ a[q])

        # 2-electron terms: 0.5 * sum_{pqrs} g_{prqs} a_p^\dagger a_q^\dagger a_s a_r
        for p, q, r, s in itertools.product(range(4), repeat=4):
            if (p % 2 == r % 2) and (q % 2 == s % 2):
                coeff = 0.5 * g_mo[p // 2, r // 2, q // 2, s // 2]
                if abs(coeff) > 1e-14:
                    h_mat += coeff * (a[p].conj().T @ a[q].conj().T @ a[s] @ a[r])

        # Guarantee exact Hermiticity against numerical precision
        return 0.5 * (h_mat + h_mat.conj().T)

    def compute_at_distance(
        self,
        distance_angstrom: float,
        optimizer: str = "BFGS",
    ) -> H2CalculationResult:
        """Solves H2 at a specific bond distance in Angstroms."""
        r_bohr = distance_angstrom * ANGSTROM_TO_BOHR
        integrals = compute_h2_integrals(r_bohr)
        h_matrix = self.build_hamiltonian_matrix(integrals)

        # Classical Hartree-Fock energy
        e_hf = float((self.hf_state.conj() @ h_matrix @ self.hf_state).real)

        # Exact Full Configuration Interaction (FCI) ground state energy
        eigenvalues = np.linalg.eigvalsh(h_matrix)
        e_fci = float(eigenvalues[0])

        # Quantum VQE optimization using UCCD ansatz
        runner = VQERunner(
            hamiltonian=h_matrix,
            ansatz_fn=self.uccd.state,
            optimizer=optimizer,
            maxiter=50,
            tol=1e-8,
        )
        vqe_res = runner.run(initial_params=[0.0])
        e_vqe = vqe_res.optimal_energy
        opt_th = float(vqe_res.optimal_theta[0])

        paulis = pauli_decomposition(h_matrix, n_qubits=4, tol=1e-9)

        corr_mha = (e_hf - e_fci) * 1000.0
        vqe_err_mha = abs(e_vqe - e_fci) * 1000.0

        return H2CalculationResult(
            distance_angstrom=distance_angstrom,
            distance_bohr=r_bohr,
            energy_hf=e_hf,
            energy_fci=e_fci,
            energy_vqe=e_vqe,
            optimal_theta=opt_th,
            correlation_energy_mHa=corr_mha,
            vqe_error_mHa=vqe_err_mha,
            nuclear_repulsion=integrals.nuclear_repulsion,
            pauli_terms=paulis,
            n_pauli_terms=len(paulis),
        )

    def scan_dissociation_curve(
        self,
        n_points: int = 27,
        r_min_angstrom: float = 0.21167,  # ~0.4 bohr
        r_max_angstrom: float = 1.58753,  # ~3.0 bohr
    ) -> List[H2CalculationResult]:
        """Scans the potential energy surface across bond distances."""
        distances = np.linspace(r_min_angstrom, r_max_angstrom, n_points)
        return [self.compute_at_distance(r) for r in distances]
