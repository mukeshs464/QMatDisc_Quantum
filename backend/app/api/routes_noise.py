"""API endpoints for quantum noise modeling, Zero-Noise Extrapolation, and Barren Plateaus."""

from typing import Any, Dict, List
import numpy as np
from fastapi import APIRouter
from ..models.schemas import ZNERequest, ZNEResponse
from ..chemistry.h2_molecule import H2HamiltonianBuilder
from ..quantum.noise import NoisyExpectationSimulator
from ..quantum.barren_plateau import scan_qubit_variance
from ..core.cache import sim_cache

router = APIRouter(prefix="/noise", tags=["Noise & Mitigation"])
h2_builder = H2HamiltonianBuilder()


@router.post("/zne", response_model=ZNEResponse)
def run_zne_benchmark(req: ZNERequest):
    """Executes noisy expectation sampling and Richardson zero-noise extrapolation."""
    cache_key = f"zne_{req.distance_angstrom:.3f}_{req.cnot_count}_{req.eps:.5f}_{req.shots}_{req.n_trials}_{req.seed}"
    cached = sim_cache.get(cache_key)
    if cached is not None:
        return cached

    h2_res = h2_builder.compute_at_distance(req.distance_angstrom)
    psi = h2_builder.uccd.state(h2_res.optimal_theta)

    sim = NoisyExpectationSimulator(
        pauli_terms=h2_res.pauli_terms,
        statevector=psi,
        cnot_count=req.cnot_count,
        eps=req.eps,
        shots=req.shots,
        seed=req.seed,
    )

    bench = sim.run_benchmark(n_trials=req.n_trials)

    # Prepare histogram distribution data for frontend charts
    raw_errors = [t.raw_energy - bench.exact_energy for t in bench.trials]
    zne_errors = [t.zne_energy - bench.exact_energy for t in bench.trials]

    # Convert to mHa
    raw_errors_mha = np.array(raw_errors) * 1000.0
    zne_errors_mha = np.array(zne_errors) * 1000.0

    bins = np.linspace(-35.0, 35.0, 71)
    raw_counts, bin_edges = np.histogram(raw_errors_mha, bins=bins)
    zne_counts, _ = np.histogram(zne_errors_mha, bins=bins)

    bin_centers = 0.5 * (bin_edges[:-1] + bin_edges[1:])

    sample_trials_data = [
        {
            "raw_energy": t.raw_energy,
            "zne_energy": t.zne_energy,
            "scale_energies": t.scale_energies,
        }
        for t in bench.trials[:15]
    ]

    out = ZNEResponse(
        exact_energy=bench.exact_energy,
        raw_mae_mHa=bench.raw_mae_mHa,
        zne_mae_mHa=bench.zne_mae_mHa,
        shot_only_mae_mHa=bench.shot_only_mae_mHa,
        raw_bias_mHa=bench.raw_bias_mHa,
        zne_bias_mHa=bench.zne_bias_mHa,
        zne_std_mHa=bench.zne_std_mHa,
        chemical_accuracy_success_rate=bench.chemical_accuracy_success_rate,
        cnot_count=bench.cnot_count,
        eps=bench.eps,
        shots=bench.shots,
        n_trials=bench.n_trials,
        sample_trials=sample_trials_data,
        raw_histogram_bins=bin_centers.tolist(),
        raw_histogram_counts=raw_counts.tolist(),
        zne_histogram_counts=zne_counts.tolist(),
    )
    sim_cache.set(cache_key, out)
    return out


@router.get("/barren-plateaus")
def get_barren_plateaus_scan():
    """Returns gradient variance decay across qubit counts showing the concentration of measure."""
    cache_key = "barren_plateaus_scan"
    cached = sim_cache.get(cache_key)
    if cached is not None:
        return cached

    scan_res = scan_qubit_variance(qubit_range=(2, 3, 4, 5, 6, 7), layers=2, n_samples=30)
    sim_cache.set(cache_key, scan_res)
    return scan_res
