"""QMatDisc Machine Learning Engine - Active Learning & Bayesian Optimization Surrogate.
Uses a Gaussian Process Regressor to model the correlation landscape of battery candidates.
Computes Upper Confidence Bound (UCB) / Expected Improvement (EI) to propose the next optimal
parameter point for expensive quantum simulation.
"""

from __future__ import annotations

from typing import Dict, List, Tuple
import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, ConstantKernel as C, WhiteKernel

from ..chemistry.hubbard import FermiHubbardRing


class ActiveLearningLoop:
    """Active learning surrogate for predicting the Mott-Hubbard voltage step opening."""

    def __init__(self, u_min: float = 0.0, u_max: float = 10.0, n_grid: int = 50):
        self.u_min = u_min
        self.u_max = u_max
        self.grid_u = np.linspace(u_min, u_max, n_grid)
        self.ring = FermiHubbardRing(n_sites=4)

    def evaluate_ground_truth(self, u_val: float) -> float:
        """Evaluates the true quantum simulator voltage step height at correlation U."""
        profile = self.ring.compute_voltage_profile(t=1.0, u=u_val, p_layers=4)
        return float(profile.half_filling_step_height)

    def run_step(
        self,
        observed_x: List[float],
        observed_y: List[float],
        exploration_weight: float = 1.5,
    ) -> Dict[str, Any]:
        """Fits Gaussian Process on observed points and computes the next candidate."""
        # Seed default observations if empty
        if len(observed_x) < 2:
            observed_x = [0.0, 8.0]
            observed_y = [self.evaluate_ground_truth(0.0), self.evaluate_ground_truth(8.0)]

        X_train = np.array(observed_x).reshape(-1, 1)
        y_train = np.array(observed_y)

        # GP with Matern/RBF kernel + white noise
        kernel = C(1.0, (1e-2, 1e2)) * RBF(length_scale=2.0, length_scale_bounds=(0.5, 10.0)) + WhiteKernel(
            noise_level=1e-4, noise_level_bounds=(1e-6, 1e-2)
        )
        gp = GaussianProcessRegressor(kernel=kernel, n_restarts_optimizer=5, random_state=42)
        gp.fit(X_train, y_train)

        # Predict across the grid
        X_grid = self.grid_u.reshape(-1, 1)
        mu, sigma = gp.predict(X_grid, return_std=True)

        # Upper Confidence Bound (UCB) acquisition: alpha = mu + kappa * sigma
        acquisition = mu + exploration_weight * sigma

        # Mask points already observed to avoid proposing identical locations
        masked_acq = acquisition.copy()
        for x_obs in observed_x:
            dists = np.abs(self.grid_u - x_obs)
            masked_acq[dists < 0.2] = -1e9

        next_idx = int(np.argmax(masked_acq))
        next_u = float(self.grid_u[next_idx])
        pred_step = float(mu[next_idx])

        return {
            "grid_u_over_t": self.grid_u.tolist(),
            "gp_mean": mu.tolist(),
            "gp_std": sigma.tolist(),
            "acquisition_scores": acquisition.tolist(),
            "next_suggested_u": round(next_u, 2),
            "predicted_step_at_next": round(pred_step, 4),
            "iteration": len(observed_x),
        }
