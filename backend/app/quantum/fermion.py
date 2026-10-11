"""QMatDisc Quantum Engine - Jordan-Wigner fermion operators and state builders.
"""

from __future__ import annotations

from typing import List, Sequence
import numpy as np

from .pauli import I2, Z, SIGMA_MINUS, SIGMA_PLUS, kron_product


def get_annihilation_operators(n_qubits: int) -> List[np.ndarray]:
    """Builds fermionic annihilation operators a_j for j = 0..n-1 using the Jordan-Wigner mapping.

    a_j = Z^{\\otimes j} \\otimes \\sigma^- \\otimes I^{\\otimes (n - j - 1)}
    """
    ops: List[np.ndarray] = []
    for j in range(n_qubits):
        factors = [Z] * j + [SIGMA_MINUS] + [I2] * (n_qubits - j - 1)
        ops.append(kron_product(factors))
    return ops


def get_creation_operators(n_qubits: int) -> List[np.ndarray]:
    """Builds fermionic creation operators a_j^\\dagger for j = 0..n-1 using the Jordan-Wigner mapping.

    a_j^\\dagger = Z^{\\otimes j} \\otimes \\sigma^+ \\otimes I^{\\otimes (n - j - 1)}
    """
    ann_ops = get_annihilation_operators(n_qubits)
    return [op.conj().T for op in ann_ops]


def get_number_operators(n_qubits: int) -> List[np.ndarray]:
    """Builds the local number operators n_j = a_j^\\dagger a_j for each orbital."""
    ann_ops = get_annihilation_operators(n_qubits)
    return [op.conj().T @ op for op in ann_ops]


def get_total_number_operator(n_qubits: int) -> np.ndarray:
    """Builds the total particle number operator N = sum_j n_j."""
    num_ops = get_number_operators(n_qubits)
    dim = 2**n_qubits
    tot = np.zeros((dim, dim), dtype=complex)
    for n_op in num_ops:
        tot += n_op
    return tot


def build_vacuum_state(n_qubits: int) -> np.ndarray:
    """Returns the Fock vacuum state |0...0> of dimension 2^n."""
    vac = np.zeros(2**n_qubits, dtype=complex)
    vac[0] = 1.0 + 0.0j
    return vac


def build_occupied_state(occupations: Sequence[int], n_qubits: int) -> np.ndarray:
    """Creates a Fock basis state by applying creation operators to vacuum.

    occupations: list of orbital indices to occupy, applied in reverse order to respect
    anticommutation ordering, e.g. [1, 0] creates a_0^dagger a_1^dagger |vac>.
    """
    state = build_vacuum_state(n_qubits)
    ann_ops = get_annihilation_operators(n_qubits)
    for j in occupations:
        state = ann_ops[j].conj().T @ state
    norm = np.linalg.norm(state)
    if norm > 1e-12:
        state = state / norm
    return state
