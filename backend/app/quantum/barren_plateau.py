"""QMatDisc Quantum Engine - Barren Plateau Analysis.
Demonstrates the concentration of measure and exponential vanishing of parameter gradients
Var[dE/dtheta] ~ O(2^-n) for random unstructured ansatzes versus symmetry-preserving ansatzes.
"""

from __future__ import annotations

from typing import Dict, List, Sequence
import numpy as np

from .ansatz import HardwareEfficientAnsatz
from .pauli import Z, I2, kron_product


def make_local_observable(n_qubits: int, target_qubit: int = 0) -> np.ndarray:
    """Creates a local Pauli-Z observable on target_qubit: I x ... x Z x ... x I."""
    factors = [Z if i == target_qubit else I2 for i in range(n_qubits)]
    return kron_product(factors)


def compute_gradient_variance(
    n_qubits: int,
    layers: int = 2,
    n_samples: int = 50,
    seed: int = 42,
) -> Dict[str, float]:
    """Estimates the variance of the partial derivative d<Z_0>/d(theta_0) over random parameters."""
    hea = HardwareEfficientAnsatz(n_qubits=n_qubits, layers=layers)
    obs = make_local_observable(n_qubits, target_qubit=0)
    rng = np.random.default_rng(seed)

    gradients: List[float] = []
    # Finite difference step
    eps = 1e-5

    for _ in range(n_samples):
        params = rng.uniform(0.0, 2.0 * np.pi, size=hea.n_params)

        # Gradient with respect to first parameter
        p_plus = params.copy()
        p_minus = params.copy()
        p_plus[0] += eps
        p_minus[0] -= eps

        psi_plus = hea.state(p_plus)
        psi_minus = hea.state(p_minus)

        e_plus = float((psi_plus.conj() @ obs @ psi_plus).real)
        e_minus = float((psi_minus.conj() @ obs @ psi_minus).real)

        grad = (e_plus - e_minus) / (2.0 * eps)
        gradients.append(grad)

    grad_arr = np.array(gradients)
    variance = float(np.var(grad_arr))
    mean_val = float(np.mean(grad_arr))

    return {
        "n_qubits": n_qubits,
        "n_params": hea.n_params,
        "layers": layers,
        "variance": variance,
        "std_dev": float(np.std(grad_arr)),
        "mean_gradient": mean_val,
        "theoretical_bound": float(1.0 / (2**n_qubits)),
    }


def scan_qubit_variance(
    qubit_range: Sequence[int] = (2, 3, 4, 5, 6),
    layers: int = 2,
    n_samples: int = 40,
    seed: int = 42,
) -> List[Dict[str, float]]:
    """Scans gradient variance as a function of qubit count."""
    results = []
    for n in qubit_range:
        res = compute_gradient_variance(
            n_qubits=n, layers=layers, n_samples=n_samples, seed=seed + n
        )
        results.append(res)
    return results
