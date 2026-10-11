"""QMatDisc Quantum Engine - Quantum Noise Simulation & Zero-Noise Extrapolation (ZNE).
Models:
- Gate depolarizing damping on Pauli expectation values: (1 - eps)^(G * k)
- Binomial projection shot noise per Pauli observable
- Richardson quadratic zero-noise extrapolation over scale factors {1, 3, 5}
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple
import numpy as np

from .pauli import PauliTerm


@dataclass
class ZNETrialResult:
    """Result of a single noisy measurement trial across noise scale factors."""
    raw_energy: float
    zne_energy: float
    ideal_energy: float
    scale_energies: Dict[int, float]  # e.g. {1: e1, 3: e3, 5: e5}


@dataclass
class ZNEBenchmarkSummary:
    """Statistical summary across multiple noisy simulation trials."""
    n_trials: int
    shots: int
    eps: float
    cnot_count: int
    exact_energy: float
    raw_mae_mHa: float
    zne_mae_mHa: float
    shot_only_mae_mHa: float
    raw_bias_mHa: float
    zne_bias_mHa: float
    zne_std_mHa: float
    chemical_accuracy_success_rate: float
    trials: List[ZNETrialResult]


class NoisyExpectationSimulator:
    """Simulates physical hardware noise on Pauli expectation values."""

    def __init__(
        self,
        pauli_terms: Sequence[PauliTerm],
        statevector: np.ndarray,
        cnot_count: int = 48,
        eps: float = 0.0003,
        shots: int = 100000,
        seed: int | None = None,
    ):
        self.pauli_terms = list(pauli_terms)
        self.statevector = statevector
        self.cnot_count = cnot_count
        self.eps = eps
        self.shots = shots
        self.rng = np.random.default_rng(seed)

        # Precompute noiseless expectation values <psi|P|psi>
        self.labels = [t.label for t in self.pauli_terms]
        self.coeffs = np.array([t.coeff for t in self.pauli_terms], dtype=float)
        self.is_identity = np.array(
            [all(c == "I" for c in t.label) for t in self.pauli_terms], dtype=bool
        )

        exact_exp = []
        for term in self.pauli_terms:
            mat = term.get_matrix()
            exp_val = float((self.statevector.conj() @ mat @ self.statevector).real)
            exact_exp.append(exp_val)
        self.noiseless_expectations = np.array(exact_exp, dtype=float)
        self.noiseless_energy = float(np.sum(self.coeffs * self.noiseless_expectations))

    def measure_at_scale(self, scale_k: float) -> float:
        """Measures expectation values with noise scale k.

        Damping: (1 - eps)^(cnot_count * scale_k)
        Shot noise: Binomial(shots, (1 + expectation) / 2)
        """
        damping = (1.0 - self.eps) ** (self.cnot_count * scale_k)
        # Identity term is unaffected by gate errors
        damped_exp = np.where(
            self.is_identity,
            self.noiseless_expectations,
            self.noiseless_expectations * damping,
        )

        # Probability of +1 outcome
        prob = np.clip((1.0 + damped_exp) / 2.0, 0.0, 1.0)

        # Binomial shot noise per Pauli term
        successes = self.rng.binomial(self.shots, prob)
        sampled_exp = (2.0 * successes - self.shots) / self.shots

        # Replace identity with exact 1.0
        final_exp = np.where(self.is_identity, 1.0, sampled_exp)
        return float(np.sum(self.coeffs * final_exp))

    def run_single_zne(
        self, scales: Sequence[int] = (1, 3, 5)
    ) -> ZNETrialResult:
        """Executes measurements across scales and performs Richardson polynomial extrapolation to zero."""
        scale_energies: Dict[int, float] = {}
        for k in scales:
            scale_energies[k] = self.measure_at_scale(k)

        xs = np.array(list(scales), dtype=float)
        ys = np.array([scale_energies[k] for k in scales], dtype=float)

        # Quadratic Richardson fit
        poly_coeffs = np.polyfit(xs, ys, deg=2)
        zne_val = float(np.polyval(poly_coeffs, 0.0))

        # Shot-noise only (infinite gate fidelity eps=0)
        shot_only = self.measure_at_scale(0.0)

        return ZNETrialResult(
            raw_energy=scale_energies[scales[0]],
            zne_energy=zne_val,
            ideal_energy=shot_only,
            scale_energies=scale_energies,
        )

    def run_benchmark(
        self,
        n_trials: int = 200,
        scales: Sequence[int] = (1, 3, 5),
    ) -> ZNEBenchmarkSummary:
        """Runs n_trials and computes chemical accuracy error statistics."""
        trials: List[ZNETrialResult] = []
        raw_list: List[float] = []
        zne_list: List[float] = []
        shot_list: List[float] = []

        for _ in range(n_trials):
            res = self.run_single_zne(scales)
            trials.append(res)
            raw_list.append(res.raw_energy)
            zne_list.append(res.zne_energy)
            shot_list.append(res.ideal_energy)

        raw_arr = np.array(raw_list)
        zne_arr = np.array(zne_list)
        shot_arr = np.array(shot_list)
        e0 = self.noiseless_energy

        # 1 Hartree = 1000 mHa; chemical accuracy is 1 kcal/mol = 1.5936 mHa (~1.6 mHa)
        raw_errors_mha = np.abs(raw_arr - e0) * 1000.0
        zne_errors_mha = np.abs(zne_arr - e0) * 1000.0
        shot_errors_mha = np.abs(shot_arr - e0) * 1000.0

        within_chem_acc = np.mean(zne_errors_mha <= 1.6) * 100.0

        return ZNEBenchmarkSummary(
            n_trials=n_trials,
            shots=self.shots,
            eps=self.eps,
            cnot_count=self.cnot_count,
            exact_energy=e0,
            raw_mae_mHa=float(np.mean(raw_errors_mha)),
            zne_mae_mHa=float(np.mean(zne_errors_mha)),
            shot_only_mae_mHa=float(np.mean(shot_errors_mha)),
            raw_bias_mHa=float(np.mean(raw_arr - e0) * 1000.0),
            zne_bias_mHa=float(np.mean(zne_arr - e0) * 1000.0),
            zne_std_mHa=float(np.std(zne_arr) * 1000.0),
            chemical_accuracy_success_rate=float(within_chem_acc),
            trials=trials,
        )
