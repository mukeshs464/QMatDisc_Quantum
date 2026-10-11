"""QMatDisc Quantum Engine - Variational Ansatz Library.
Includes:
- UCCD for H2 (Unitary Coupled Cluster Doubles)
- Hamiltonian-Variational Ansatz (HVA) for lattice Fermi-Hubbard systems
- Hardware-Efficient Ansatz (HEA) for quantum benchmark comparisons
"""

from __future__ import annotations

from typing import Callable, List, Sequence, Tuple
import numpy as np
from scipy.linalg import expm

from .fermion import get_annihilation_operators, build_occupied_state
from .pauli import I2, X, Y, Z, kron_product


class UCCDAnsatzH2:
    """UCCD ansatz for 4-qubit H2 molecule on the minimal STO-3G basis.

    Hartree-Fock reference: |0011> (electrons in sigma_g spin-orbitals 0 and 1).
    Generator: T2 - T2^dagger with T2 = a_2^dagger a_3^dagger a_1 a_0.
    """

    def __init__(self, n_qubits: int = 4):
        self.n_qubits = n_qubits
        self.ann_ops = get_annihilation_operators(n_qubits)
        # HF state: orbitals 0 and 1 occupied
        self.hf_state = build_occupied_state([1, 0], n_qubits)

        # UCCD double-excitation generator T2 - T2^dagger
        a = self.ann_ops
        t2 = a[2].conj().T @ a[3].conj().T @ a[1] @ a[0]
        self.generator = t2 - t2.conj().T  # Strictly anti-Hermitian: G^\dagger = -G

    def get_reference_state(self) -> np.ndarray:
        return self.hf_state.copy()

    def get_generator(self) -> np.ndarray:
        return self.generator.copy()

    def state(self, theta: float | np.ndarray) -> np.ndarray:
        """Returns the statevector exp(theta * G) |HF>."""
        val = float(theta[0]) if isinstance(theta, (list, tuple, np.ndarray)) else float(theta)
        unitary = expm(val * self.generator)
        return unitary @ self.hf_state

    def circuit_info(self) -> dict:
        """Returns metadata for visual quantum circuit renderers."""
        return {
            "name": "UCCD (H2 Double Excitation)",
            "n_qubits": 4,
            "parameters": 1,
            "reference": "|0011> (Hartree-Fock)",
            "generator": "a_2^† a_3^† a_1 a_0 - a_0^† a_1^† a_3 a_2",
            "cnot_count": 48,  # Standard Trotterized Pauli decomposition CNOT count
        }


class HVAHubbardSector:
    """Hamiltonian-Variational Ansatz (HVA) for Fermi-Hubbard lattice within a fixed (N_up, N_down) sector.

    Alternates p layers of kinetic exp(-i phi H_t) and interaction exp(-i theta H_U).
    """

    def __init__(
        self,
        h_t_sector: np.ndarray,
        h_u_sector: np.ndarray,
        p_layers: int = 6,
        init_state: np.ndarray | None = None,
    ):
        self.dim = h_t_sector.shape[0]
        self.h_t = h_t_sector
        self.h_u = h_u_sector
        self.p_layers = p_layers

        # Spectral decomposition for rapid parameter evaluation
        self.w_t, self.v_t = np.linalg.eigh(h_t_sector)
        self.w_u = np.real(np.diag(h_u_sector))  # Interaction is diagonal in Fock basis

        if init_state is not None:
            self.psi0 = init_state.astype(complex)
        elif self.dim == 1:
            self.psi0 = np.array([1.0 + 0.0j])
        else:
            # High-overlap ground state of weakly interacting kinetic Hamiltonian as reference
            w_init, v_init = np.linalg.eigh(self.h_t + 0.05 * self.h_u)
            self.psi0 = v_init[:, 0].astype(complex)

    def state(self, params: np.ndarray) -> np.ndarray:
        """Computes the evolved statevector given 2*p parameters [theta_0, phi_0, theta_1, phi_1, ...]."""
        if self.dim == 1:
            return self.psi0.copy()

        v = self.psi0.copy()
        for k in range(self.p_layers):
            th_u = params[2 * k]
            th_t = params[2 * k + 1]
            # Interaction layer exp(-i th_u H_U)
            v = np.exp(-1j * th_u * self.w_u) * v
            # Hopping layer exp(-i th_t H_t) = v_t @ diag(exp(-i th_t w_t)) @ v_t^\dagger @ v
            v = self.v_t @ (np.exp(-1j * th_t * self.w_t) * (self.v_t.conj().T @ v))
        return v


def ry_matrix(theta: float) -> np.ndarray:
    """Single-qubit Y-rotation matrix: exp(-i theta Y / 2)."""
    return np.array([
        [np.cos(theta / 2.0), -np.sin(theta / 2.0)],
        [np.sin(theta / 2.0), np.cos(theta / 2.0)]
    ], dtype=complex)


def rz_matrix(phi: float) -> np.ndarray:
    """Single-qubit Z-rotation matrix: exp(-i phi Z / 2)."""
    return np.array([
        [np.exp(-1j * phi / 2.0), 0.0],
        [0.0, np.exp(1j * phi / 2.0)]
    ], dtype=complex)


def cnot_matrix(control: int, target: int, n_qubits: int) -> np.ndarray:
    """Constructs a 2^n x 2^n CNOT matrix between specified control and target qubits."""
    dim = 2**n_qubits
    mat = np.zeros((dim, dim), dtype=complex)
    for i in range(dim):
        c_bit = (i >> (n_qubits - 1 - control)) & 1
        t_bit = (i >> (n_qubits - 1 - target)) & 1
        if c_bit == 1:
            # Flip target bit
            j = i ^ (1 << (n_qubits - 1 - target))
            mat[j, i] = 1.0
        else:
            mat[i, i] = 1.0
    return mat


class HardwareEfficientAnsatz:
    """Hardware-Efficient Ansatz (HEA) with alternating Ry-Rz rotation layers and circular CNOT entanglers."""

    def __init__(self, n_qubits: int, layers: int = 2):
        self.n_qubits = n_qubits
        self.layers = layers
        self.n_params = layers * n_qubits * 2
        # Precompute entangling CNOT ring
        self.entangler = np.eye(2**n_qubits, dtype=complex)
        for i in range(n_qubits):
            c = i
            t = (i + 1) % n_qubits
            self.entangler = cnot_matrix(c, t, n_qubits) @ self.entangler

    def state(self, params: np.ndarray) -> np.ndarray:
        dim = 2**self.n_qubits
        psi = np.zeros(dim, dtype=complex)
        psi[0] = 1.0  # |0...0> reference

        idx = 0
        for _ in range(self.layers):
            # Single qubit rotation layer
            rot_ops = []
            for q in range(self.n_qubits):
                th = params[idx]
                phi = params[idx + 1]
                idx += 2
                rot = rz_matrix(phi) @ ry_matrix(th)
                rot_ops.append(rot)
            rot_layer = kron_product(rot_ops)
            psi = rot_layer @ psi
            # Entangling layer
            psi = self.entangler @ psi

        return psi
