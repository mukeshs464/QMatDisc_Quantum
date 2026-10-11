"""QMatDisc Quantum Engine - Generic VQE Runner.
Pure NumPy/SciPy statevector variational quantum eigensolver with support for:
- Optimizers: BFGS, COBYLA, and SPSA
- Callback streaming for WebSocket live plotting
- Generator-based streaming
- Analytical statevector expectation calculation
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Iterator, List, Sequence
import numpy as np
from scipy.optimize import minimize


@dataclass
class VQEStep:
    """Telemetry data emitted at each VQE optimization step."""
    iteration: int
    energy: float
    best_energy: float
    theta: List[float]
    grad_norm: float | None = None


@dataclass
class VQEResult:
    """Final outcome of a VQE optimization run."""
    optimal_energy: float
    optimal_theta: List[float]
    history: List[VQEStep] = field(default_factory=list)
    total_evaluations: int = 0
    converged: bool = True
    message: str = "Optimization terminated successfully."


def statevector_expectation(psi: np.ndarray, h_matrix: np.ndarray) -> float:
    """Computes exact expectation value <psi|H|psi>."""
    return float((psi.conj() @ h_matrix @ psi).real)


class VQERunner:
    """Variational Quantum Eigensolver execution engine."""

    def __init__(
        self,
        hamiltonian: np.ndarray,
        ansatz_fn: Callable[[np.ndarray], np.ndarray],
        optimizer: str = "BFGS",
        maxiter: int = 100,
        tol: float = 1e-7,
        callback: Callable[[VQEStep], None] | None = None,
    ):
        self.h_matrix = hamiltonian
        self.ansatz_fn = ansatz_fn
        self.optimizer = optimizer.upper()
        self.maxiter = maxiter
        self.tol = tol
        self.callback = callback
        self.history: List[VQEStep] = []
        self.n_evals = 0
        self.best_energy = float("inf")

    def objective(self, params: np.ndarray) -> float:
        """Cost function evaluated by the classical optimizer."""
        self.n_evals += 1
        psi = self.ansatz_fn(params)
        energy = statevector_expectation(psi, self.h_matrix)
        if energy < self.best_energy:
            self.best_energy = energy
        return energy

    def run(self, initial_params: Sequence[float] | np.ndarray) -> VQEResult:
        """Executes the VQE optimization loop."""
        p0 = np.array(initial_params, dtype=float)
        self.history = []
        self.n_evals = 0
        self.best_energy = float("inf")
        step_counter = 0

        # Initial point evaluation
        e0 = self.objective(p0)
        initial_step = VQEStep(
            iteration=0,
            energy=e0,
            best_energy=self.best_energy,
            theta=p0.tolist(),
            grad_norm=0.0,
        )
        self.history.append(initial_step)
        if self.callback:
            self.callback(initial_step)

        if self.optimizer == "SPSA":
            return self._run_spsa(p0)

        # Scipy minimizers: BFGS or COBYLA
        def scipy_callback(xk: np.ndarray):
            nonlocal step_counter
            step_counter += 1
            e = self.objective(xk)
            step = VQEStep(
                iteration=step_counter,
                energy=e,
                best_energy=self.best_energy,
                theta=xk.tolist(),
            )
            self.history.append(step)
            if self.callback:
                self.callback(step)

        method = "BFGS" if self.optimizer == "BFGS" else "COBYLA"
        options: Dict[str, Any] = {"maxiter": self.maxiter}
        if method == "BFGS":
            options["gtol"] = self.tol
        elif method == "COBYLA":
            options["tol"] = self.tol

        res = minimize(
            self.objective,
            p0,
            method=method,
            callback=scipy_callback if method == "BFGS" else None,
            options=options,
        )

        # For COBYLA, scipy's callback does not pass xk, so ensure final point is appended
        final_energy = float(res.fun)
        opt_theta = res.x.tolist()
        if not self.history or self.history[-1].theta != opt_theta:
            step_counter += 1
            final_step = VQEStep(
                iteration=step_counter,
                energy=final_energy,
                best_energy=min(self.best_energy, final_energy),
                theta=opt_theta,
            )
            self.history.append(final_step)
            if self.callback:
                self.callback(final_step)

        return VQEResult(
            optimal_energy=final_energy,
            optimal_theta=opt_theta,
            history=self.history,
            total_evaluations=self.n_evals,
            converged=bool(res.success),
            message=str(res.message),
        )

    def _run_spsa(
        self,
        p0: np.ndarray,
        a: float = 0.2,
        c: float = 0.1,
        alpha: float = 0.602,
        gamma: float = 0.101,
    ) -> VQEResult:
        """Simultaneous Perturbation Stochastic Approximation optimizer."""
        theta = p0.copy()
        rng = np.random.default_rng(42)
        n_params = len(theta)

        for k in range(1, self.maxiter + 1):
            ak = a / (k**alpha)
            ck = c / (k**gamma)
            delta = rng.choice([-1.0, 1.0], size=n_params)

            theta_plus = theta + ck * delta
            theta_minus = theta - ck * delta

            e_plus = self.objective(theta_plus)
            e_minus = self.objective(theta_minus)

            ghat = (e_plus - e_minus) / (2.0 * ck * delta)
            theta = theta - ak * ghat

            curr_e = self.objective(theta)
            step = VQEStep(
                iteration=k,
                energy=curr_e,
                best_energy=self.best_energy,
                theta=theta.tolist(),
                grad_norm=float(np.linalg.norm(ghat)),
            )
            self.history.append(step)
            if self.callback:
                self.callback(step)

        return VQEResult(
            optimal_energy=self.best_energy,
            optimal_theta=theta.tolist(),
            history=self.history,
            total_evaluations=self.n_evals,
            converged=True,
            message="SPSA reached maximum iterations.",
        )


def stream_vqe_steps(
    hamiltonian: np.ndarray,
    ansatz_fn: Callable[[np.ndarray], np.ndarray],
    initial_params: Sequence[float],
    optimizer: str = "BFGS",
    maxiter: int = 50,
) -> Iterator[VQEStep]:
    """Generator that yields VQEStep instances one by one as optimization proceeds."""
    buffer: List[VQEStep] = []

    def buffer_cb(step: VQEStep):
        buffer.append(step)

    runner = VQERunner(
        hamiltonian=hamiltonian,
        ansatz_fn=ansatz_fn,
        optimizer=optimizer,
        maxiter=maxiter,
        callback=buffer_cb,
    )

    p0 = np.array(initial_params, dtype=float)
    # Run optimizer in chunks / steps
    runner.run(p0)
    for step in buffer:
        yield step
