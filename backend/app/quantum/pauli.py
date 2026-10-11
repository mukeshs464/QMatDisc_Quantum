"""QMatDisc Quantum Engine - Pauli matrix representations and algebraic utilities.
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass
from typing import List, Sequence, Tuple

import numpy as np

# Single-qubit Pauli matrices and projection operators
I2: np.ndarray = np.array([[1.0, 0.0], [0.0, 1.0]], dtype=complex)
X: np.ndarray = np.array([[0.0, 1.0], [1.0, 0.0]], dtype=complex)
Y: np.ndarray = np.array([[0.0, -1.0j], [1.0j, 0.0]], dtype=complex)
Z: np.ndarray = np.array([[1.0, 0.0], [0.0, -1.0]], dtype=complex)
SIGMA_MINUS: np.ndarray = np.array([[0.0, 1.0], [0.0, 0.0]], dtype=complex)
SIGMA_PLUS: np.ndarray = np.array([[0.0, 0.0], [1.0, 0.0]], dtype=complex)

PAULI_DICT = {"I": I2, "X": X, "Y": Y, "Z": Z}
PAULI_CHARS = ["I", "X", "Y", "Z"]
PAULI_MATS = [I2, X, Y, Z]


@dataclass(frozen=True)
class PauliTerm:
    """Represents a single Pauli string term with real coefficient c * P."""

    label: str
    coeff: float
    matrix: np.ndarray | None = None

    def get_matrix(self) -> np.ndarray:
        if self.matrix is not None:
            return self.matrix
        return pauli_string_to_matrix(self.label)


def kron_product(matrices: Sequence[np.ndarray]) -> np.ndarray:
    """Computes the Kronecker product over a sequence of 2x2 matrices."""
    if not matrices:
        return np.array([[1.0 + 0.0j]], dtype=complex)
    out = np.array([[1.0 + 0.0j]], dtype=complex)
    for m in matrices:
        out = np.kron(out, m)
    return out


def pauli_string_to_matrix(label: str) -> np.ndarray:
    """Converts a Pauli label string (e.g. 'IXYZ') into its 2^n x 2^n matrix representation."""
    if not label:
        return np.array([[1.0 + 0.0j]], dtype=complex)
    mats = [PAULI_DICT[char] for char in label]
    return kron_product(mats)


def pauli_decomposition(
    h_matrix: np.ndarray,
    n_qubits: int,
    tol: float = 1e-9,
    include_matrices: bool = True,
) -> List[PauliTerm]:
    """Decomposes an arbitrary Hermitian 2^n x 2^n matrix into a sum of Pauli terms.

    c_alpha = (1 / 2^n) * Tr(P_alpha @ H)
    """
    dim = 2**n_qubits
    if h_matrix.shape != (dim, dim):
        raise ValueError(f"Matrix shape {h_matrix.shape} does not match 2^{n_qubits} = {dim}")

    out: List[PauliTerm] = []
    inv_dim = 1.0 / dim

    for indices in itertools.product(range(4), repeat=n_qubits):
        label = "".join(PAULI_CHARS[i] for i in indices)
        p_mat = kron_product([PAULI_MATS[i] for i in indices])
        c = float(np.trace(p_mat @ h_matrix).real * inv_dim)
        if abs(c) > tol:
            out.append(PauliTerm(label=label, coeff=c, matrix=p_mat if include_matrices else None))

    return out


def reconstruct_from_pauli(pauli_terms: Sequence[PauliTerm], n_qubits: int) -> np.ndarray:
    """Reconstructs the full Hamiltonian matrix from its Pauli terms sum_k c_k P_k."""
    dim = 2**n_qubits
    h_rec = np.zeros((dim, dim), dtype=complex)
    for term in pauli_terms:
        mat = term.get_matrix()
        h_rec += term.coeff * mat
    return h_rec
