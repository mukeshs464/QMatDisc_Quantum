"""Property-Based Invariant Tests for QMatDisc.
Validates:
1. Hermiticity: H = H^dagger across all physical operators
2. Unitarity: U(theta) @ U(theta)^dagger = I across all ansatz operators
3. Symmetry & Invariants: [H, N_total] = 0 (particle number conservation)
"""

import numpy as np
import pytest
from scipy.linalg import expm

from app.chemistry.h2_molecule import H2HamiltonianBuilder
from app.chemistry.hubbard import FermiHubbardRing
from app.chemistry.sto3g import compute_h2_integrals
from app.quantum.ansatz import UCCDAnsatzH2, HardwareEfficientAnsatz, cnot_matrix, ry_matrix, rz_matrix
from app.quantum.fermion import get_total_number_operator


class TestHamiltonianHermiticity:
    @pytest.mark.parametrize("distance", [0.3, 0.735, 1.2, 1.8, 2.5])
    def test_h2_hamiltonian_hermiticity(self, distance):
        """Verifies H_2 Hamiltonian is strictly Hermitian across arbitrary geometries."""
        builder = H2HamiltonianBuilder()
        integrals = compute_h2_integrals(distance * 1.8897259886)
        h = builder.build_hamiltonian_matrix(integrals)
        assert np.allclose(h, h.conj().T, atol=1e-12)

    @pytest.mark.parametrize("t,u", [(1.0, 0.0), (1.0, 2.0), (0.5, 4.0), (2.0, 8.0)])
    def test_hubbard_hamiltonian_hermiticity(self, t, u):
        """Verifies Hubbard H_t and H_u are Hermitian across parameter combinations."""
        ring = FermiHubbardRing(n_sites=4)
        ht, hu = ring.build_hamiltonians(t=t, u=u)
        assert np.allclose(ht, ht.conj().T, atol=1e-12)
        assert np.allclose(hu, hu.conj().T, atol=1e-12)
        h_tot = ht + hu
        assert np.allclose(h_tot, h_tot.conj().T, atol=1e-12)


class TestAnsatzUnitarity:
    @pytest.mark.parametrize("theta", [-1.5, -0.785, 0.0, 0.523, 1.2, 3.14159])
    def test_uccd_operator_unitarity(self, theta):
        """Verifies UCCD evolution operator exp(theta * G) is unitary."""
        uccd = UCCDAnsatzH2()
        g = uccd.get_generator()
        u = expm(theta * g)
        eye = np.eye(u.shape[0], dtype=complex)
        assert np.allclose(u @ u.conj().T, eye, atol=1e-12)
        assert np.allclose(u.conj().T @ u, eye, atol=1e-12)

    @pytest.mark.parametrize("angle", [-2.0, 0.0, 1.0, 2.5])
    def test_single_qubit_rotation_unitarity(self, angle):
        """Verifies Ry and Rz rotation matrices are unitary."""
        ry = ry_matrix(angle)
        rz = rz_matrix(angle)
        i2 = np.eye(2, dtype=complex)
        assert np.allclose(ry @ ry.conj().T, i2, atol=1e-12)
        assert np.allclose(rz @ rz.conj().T, i2, atol=1e-12)

    def test_cnot_matrix_unitarity(self):
        """Verifies CNOT multi-qubit matrices are unitary."""
        cnot = cnot_matrix(0, 1, n_qubits=2)
        i4 = np.eye(4, dtype=complex)
        assert np.allclose(cnot @ cnot.conj().T, i4, atol=1e-12)


class TestParticleConservationInvariants:
    @pytest.mark.parametrize("u", [0.0, 1.0, 4.0, 8.0])
    def test_hubbard_particle_conservation(self, u):
        """Verifies [H_Hubbard, N_total] = 0."""
        ring = FermiHubbardRing(n_sites=4)
        ht, hu = ring.build_hamiltonians(t=1.0, u=u)
        h_tot = ht + hu
        n_tot = get_total_number_operator(n_qubits=8)
        commutator = h_tot @ n_tot - n_tot @ h_tot
        assert np.allclose(commutator, 0.0, atol=1e-12)

    def test_h2_particle_conservation(self):
        """Verifies H2 Hamiltonian preserves 2-electron subspace."""
        builder = H2HamiltonianBuilder()
        integrals = compute_h2_integrals(1.4)
        h = builder.build_hamiltonian_matrix(integrals)
        n_tot = get_total_number_operator(n_qubits=4)
        commutator = h @ n_tot - n_tot @ h
        assert np.allclose(commutator, 0.0, atol=1e-12)
