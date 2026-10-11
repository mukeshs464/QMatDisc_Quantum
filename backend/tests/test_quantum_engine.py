"""Unit tests for Phase 1: QMatDisc Quantum Engine.
Validates:
- Pauli algebra and decomposition/reconstruction
- Jordan-Wigner canonical anticommutation relations
- Ansatz unitarity and symmetries
- VQE convergence across BFGS, COBYLA, and SPSA
- Noise model damping, shot noise, and Richardson ZNE
- Barren plateau gradient variance estimation
"""

import numpy as np
import pytest

from app.quantum.pauli import (
    I2,
    X,
    Y,
    Z,
    kron_product,
    pauli_string_to_matrix,
    pauli_decomposition,
    reconstruct_from_pauli,
)
from app.quantum.fermion import (
    get_annihilation_operators,
    get_creation_operators,
    get_number_operators,
    get_total_number_operator,
    build_vacuum_state,
    build_occupied_state,
)
from app.quantum.ansatz import (
    UCCDAnsatzH2,
    HVAHubbardSector,
    HardwareEfficientAnsatz,
)
from app.quantum.vqe import VQERunner, statevector_expectation
from app.quantum.noise import NoisyExpectationSimulator
from app.quantum.barren_plateau import compute_gradient_variance


class TestPauliAlgebra:
    def test_pauli_properties(self):
        """Checks Pauli matrix multiplication and Hermiticity."""
        assert np.allclose(X @ X, I2)
        assert np.allclose(Y @ Y, I2)
        assert np.allclose(Z @ Z, I2)
        assert np.allclose(X @ Y, 1j * Z)
        assert np.allclose(Y @ Z, 1j * X)
        assert np.allclose(Z @ X, 1j * Y)

    def test_pauli_decomposition_and_reconstruction(self):
        """Verifies decomposition and exact reconstruction of arbitrary Hermitian matrices."""
        dim = 4  # 2 qubits
        rng = np.random.default_rng(123)
        a = rng.normal(size=(dim, dim)) + 1j * rng.normal(size=(dim, dim))
        h = a + a.conj().T  # Strictly Hermitian

        terms = pauli_decomposition(h, n_qubits=2)
        assert len(terms) > 0

        h_rec = reconstruct_from_pauli(terms, n_qubits=2)
        assert np.allclose(h, h_rec, atol=1e-12)


class TestFermionOperators:
    def test_canonical_anticommutation_relations(self):
        """Verifies {a_i, a_j^dagger} = delta_ij * I and {a_i, a_j} = 0."""
        n = 3
        a_ops = get_annihilation_operators(n)
        ad_ops = get_creation_operators(n)
        eye_dim = np.eye(2**n, dtype=complex)

        for i in range(n):
            for j in range(n):
                # {a_i, a_j^dagger}
                anti_comm_ad = a_ops[i] @ ad_ops[j] + ad_ops[j] @ a_ops[i]
                expected = eye_dim if i == j else np.zeros_like(eye_dim)
                assert np.allclose(anti_comm_ad, expected, atol=1e-12)

                # {a_i, a_j}
                anti_comm_aa = a_ops[i] @ a_ops[j] + a_ops[j] @ a_ops[i]
                assert np.allclose(anti_comm_aa, 0.0, atol=1e-12)

    def test_number_operators_and_states(self):
        """Verifies number operators count fermions properly."""
        n = 4
        tot_n = get_total_number_operator(n)
        vac = build_vacuum_state(n)
        assert np.isclose(vac.conj() @ tot_n @ vac, 0.0)

        # 2-particle state
        psi2 = build_occupied_state([1, 0], n)
        assert np.isclose(psi2.conj() @ tot_n @ psi2, 2.0)


class TestAnsatzLibrary:
    def test_uccd_h2_unitarity_and_conservation(self):
        """Verifies UCCD generator is anti-Hermitian and preserves 2-particle sector."""
        uccd = UCCDAnsatzH2()
        g = uccd.get_generator()
        assert np.allclose(g.conj().T, -g, atol=1e-12)  # Anti-Hermitian

        tot_n = get_total_number_operator(4)
        for th in [-0.5, 0.0, 0.25, 0.8]:
            psi = uccd.state(th)
            norm = np.linalg.norm(psi)
            assert np.isclose(norm, 1.0, atol=1e-12)
            n_val = psi.conj() @ tot_n @ psi
            assert np.isclose(n_val.real, 2.0, atol=1e-12)

    def test_hardware_efficient_ansatz_unitarity(self):
        """Verifies HEA outputs normalized states for arbitrary parameter vectors."""
        hea = HardwareEfficientAnsatz(n_qubits=3, layers=2)
        rng = np.random.default_rng(42)
        params = rng.uniform(0, 2 * np.pi, size=hea.n_params)
        psi = hea.state(params)
        assert np.isclose(np.linalg.norm(psi), 1.0, atol=1e-12)


class TestVQEOptimizers:
    @pytest.mark.parametrize("opt", ["BFGS", "COBYLA", "SPSA"])
    def test_vqe_on_simple_hamiltonian(self, opt):
        """Validates convergence of BFGS, COBYLA, and SPSA on a 2-qubit system."""
        # Simple Hamiltonian H = -Z_0 - 0.5 * Z_1 with exact ground energy -1.5
        h = -kron_product([Z, I2]) - 0.5 * kron_product([I2, Z])
        exact_e0 = -1.5

        hea = HardwareEfficientAnsatz(n_qubits=2, layers=1)
        runner = VQERunner(
            hamiltonian=h,
            ansatz_fn=hea.state,
            optimizer=opt,
            maxiter=80 if opt != "SPSA" else 150,
        )

        p0 = np.zeros(hea.n_params) + 0.1
        res = runner.run(p0)
        # Should get very close to -1.5
        assert res.optimal_energy <= -1.45


class TestNoiseAndZNE:
    def test_zne_extrapolation(self):
        """Verifies NoisyExpectationSimulator attenuates Pauli terms and Richardson extrapolates."""
        # Single qubit with H = 0.5 * I + 0.5 * Z
        # Ground state is |0>, expectation <Z> = 1, <I> = 1 -> E = 1.0
        psi = np.array([1.0, 0.0], dtype=complex)
        terms = pauli_decomposition(0.5 * I2 + 0.5 * Z, n_qubits=1)

        sim = NoisyExpectationSimulator(
            pauli_terms=terms,
            statevector=psi,
            cnot_count=20,
            eps=0.005,
            shots=50000,
            seed=42,
        )

        res = sim.run_single_zne(scales=(1, 3, 5))
        # Raw energy is damped away from 1.0
        assert res.raw_energy < 1.0
        # ZNE should restore energy closer to 1.0 than raw
        assert abs(res.zne_energy - 1.0) < abs(res.raw_energy - 1.0)


class TestBarrenPlateaus:
    def test_gradient_variance_magnitude(self):
        """Verifies barren plateau probe returns non-negative variance within bounds."""
        res = compute_gradient_variance(n_qubits=3, layers=1, n_samples=20, seed=10)
        assert res["variance"] >= 0.0
        assert res["n_qubits"] == 3
