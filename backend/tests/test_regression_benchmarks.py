"""Regression Benchmarks for Phase 3: Scientific Validation Suite.
These tests must pass with strict numerical tolerances before any UI code is written.

Benchmarks:
1. H2 equilibrium (0.735 A):
   - HF = -1.11700 Ha (tolerance 1e-5)
   - FCI = VQE = -1.13731 Ha (tolerance 1e-5)
2. H2 dissociation curve (27 points from 0.21 to 1.59 A):
   - max |VQE - FCI| < 1e-6 Ha across the entire potential energy surface
3. H2 correlation stretch (1.59 A):
   - HF error ~ 100 mHa while VQE error < 1e-6 Ha
4. Fermi-Hubbard ring (4 sites, 8 qubits):
   - |VQE - exact| < 1e-8 t for all N = 0..8 and U/t in {0, 2, 4, 8}
5. Hubbard half-filling voltage step height:
   - step = (E(5) - E(4)) - (E(4) - E(3)):
     U=0: ~ 0.00
     U=2: ~ 1.24
     U=4: ~ 2.70
     U=8: ~ 5.99
     (tolerance 0.05)
6. Zero-Noise Extrapolation (ZNE):
   - 200 trials, eps = 3e-4, 48 CNOTs, 1e5 shots, seed = 7
   - Raw MAE ~ 15 mHa
   - ZNE MAE < 1.6 mHa (chemical accuracy boundary)
"""

import numpy as np
import pytest

from app.chemistry.h2_molecule import H2HamiltonianBuilder
from app.chemistry.hubbard import FermiHubbardRing
from app.quantum.noise import NoisyExpectationSimulator


class TestH2RegressionBenchmarks:
    def test_h2_equilibrium_energies(self):
        """Benchmark 1: H2 at 0.735 Angstrom."""
        builder = H2HamiltonianBuilder()
        res = builder.compute_at_distance(0.735)

        # HF = -1.11700 Ha (tolerance 1e-5)
        assert np.isclose(res.energy_hf, -1.11700, atol=1e-5)

        # FCI = -1.13731 Ha (tolerance 1e-5)
        assert np.isclose(res.energy_fci, -1.13731, atol=1e-5)

        # VQE = -1.13731 Ha (tolerance 1e-5)
        assert np.isclose(res.energy_vqe, -1.13731, atol=1e-5)

        # VQE tracks exact
        assert abs(res.energy_vqe - res.energy_fci) < 1e-6

    def test_h2_pes_dissociation_curve_vqe_exactness(self):
        """Benchmark 2: Max |VQE - FCI| across 27 bond lengths below 1e-6 Ha."""
        builder = H2HamiltonianBuilder()
        curve = builder.scan_dissociation_curve(
            n_points=27,
            r_min_angstrom=0.21,
            r_max_angstrom=1.59,
        )

        assert len(curve) == 27
        max_err_ha = max(abs(pt.energy_vqe - pt.energy_fci) for pt in curve)
        assert max_err_ha < 1e-6, f"Max VQE error {max_err_ha} Ha exceeded 1e-6 Ha tolerance."

    def test_h2_correlation_at_stretched_geometry(self):
        """Benchmark 3: At 1.59 Angstrom, HF error is ~100 mHa while VQE stays exact."""
        builder = H2HamiltonianBuilder()
        res = builder.compute_at_distance(1.59)

        # HF error should be approx 100 mHa (95 to 105 mHa)
        hf_error_mha = res.correlation_energy_mHa
        assert 95.0 <= hf_error_mha <= 105.0, f"HF error {hf_error_mha} mHa was outside 95..105 mHa"

        # VQE error must remain strictly below 1e-6 Ha (0.001 mHa)
        assert res.vqe_error_mHa < 0.001


class TestHubbardRegressionBenchmarks:
    @pytest.mark.parametrize("u", [0.0, 2.0, 4.0, 8.0])
    def test_hubbard_vqe_vs_exact_diagonalization(self, u):
        """Benchmark 4: |VQE - exact| < 1e-8 t for all N = 0..8."""
        ring = FermiHubbardRing(n_sites=4)
        profile = ring.compute_voltage_profile(t=1.0, u=u)

        assert len(profile.energies_vqe) == 9
        assert len(profile.energies_exact) == 9
        assert profile.max_vqe_error < 1e-8, (
            f"Hubbard U={u} max VQE error {profile.max_vqe_error} exceeded 1e-8"
        )

    def test_hubbard_half_filling_voltage_steps(self):
        """Benchmark 5: Half-filling voltage step heights with tolerance 0.05.

        U=0: ~ 0.00
        U=2: ~ 1.24
        U=4: ~ 2.70
        U=8: ~ 5.99
        """
        ring = FermiHubbardRing(n_sites=4)

        expected_steps = {
            0.0: 0.00,
            2.0: 1.24,
            4.0: 2.70,
            8.0: 5.99,
        }

        for u, expected_step in expected_steps.items():
            profile = ring.compute_voltage_profile(t=1.0, u=u)
            step = profile.half_filling_step_height
            assert np.isclose(step, expected_step, atol=0.05), (
                f"Hubbard U={u} step {step} differed from expected {expected_step} by > 0.05"
            )


class TestZNERegressionBenchmark:
    def test_zne_reaches_chemical_accuracy(self):
        """Benchmark 6: ZNE test (200 trials, eps=3e-4, 48 CNOTs, 1e5 shots, seed=7).

        Raw MAE ~ 15 mHa (approx 12..18 mHa).
        ZNE MAE < 1.6 mHa (chemical accuracy boundary).
        """
        builder = H2HamiltonianBuilder()
        res = builder.compute_at_distance(0.735)

        sim = NoisyExpectationSimulator(
            pauli_terms=res.pauli_terms,
            statevector=builder.uccd.state(res.optimal_theta),
            cnot_count=48,
            eps=0.0003,
            shots=100000,
            seed=7,
        )

        bench = sim.run_benchmark(n_trials=200)

        # Raw MAE ~ 15 mHa
        assert 12.0 <= bench.raw_mae_mHa <= 18.0, (
            f"Raw MAE {bench.raw_mae_mHa} mHa was outside expected range [12, 18]"
        )

        # ZNE MAE < 1.6 mHa (Chemical Accuracy)
        assert bench.zne_mae_mHa < 1.6, (
            f"ZNE MAE {bench.zne_mae_mHa} mHa exceeded chemical accuracy threshold 1.6 mHa"
        )
