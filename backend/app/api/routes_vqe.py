"""API endpoints for VQE simulations (H2 molecule and Fermi-Hubbard lattice)."""

from fastapi import APIRouter, HTTPException
from ..models.schemas import (
    VQEH2Request,
    VQEH2Response,
    PauliTermSchema,
    PESPointSchema,
    VQEHubbardRequest,
    VQEHubbardResponse,
)
from ..chemistry.h2_molecule import H2HamiltonianBuilder
from ..chemistry.hubbard import FermiHubbardRing
from ..core.cache import sim_cache

router = APIRouter(prefix="/vqe", tags=["VQE"])
h2_builder = H2HamiltonianBuilder()
hubbard_ring = FermiHubbardRing(n_sites=4)


@router.post("/h2", response_model=VQEH2Response)
def compute_vqe_h2(req: VQEH2Request):
    """Computes RHF, exact FCI, and UCCD-VQE for H2 at specified bond distance."""
    cache_key = f"vqe_h2_{req.distance_angstrom:.4f}_{req.optimizer}_{req.include_pes_curve}"
    cached = sim_cache.get(cache_key)
    if cached is not None:
        return cached

    res = h2_builder.compute_at_distance(req.distance_angstrom, optimizer=req.optimizer)

    pes_points = None
    if req.include_pes_curve:
        # Precomputed or cached 27-point curve
        curve_cache_key = "h2_pes_curve_27"
        curve = sim_cache.get(curve_cache_key)
        if curve is None:
            curve = h2_builder.scan_dissociation_curve(27, 0.21, 1.59)
            sim_cache.set(curve_cache_key, curve)

        pes_points = [
            PESPointSchema(
                distance_angstrom=pt.distance_angstrom,
                energy_hf=pt.energy_hf,
                energy_fci=pt.energy_fci,
                energy_vqe=pt.energy_vqe,
                correlation_energy_mHa=pt.correlation_energy_mHa,
                vqe_error_mHa=pt.vqe_error_mHa,
            )
            for pt in curve
        ]

    pauli_schemas = [
        PauliTermSchema(pauli=t.label, coeff=t.coeff) for t in res.pauli_terms
    ]

    out = VQEH2Response(
        distance_angstrom=res.distance_angstrom,
        energy_hf=res.energy_hf,
        energy_fci=res.energy_fci,
        energy_vqe=res.energy_vqe,
        optimal_theta=res.optimal_theta,
        correlation_energy_mHa=res.correlation_energy_mHa,
        vqe_error_mHa=res.vqe_error_mHa,
        nuclear_repulsion=res.nuclear_repulsion,
        n_pauli_terms=res.n_pauli_terms,
        pauli_terms=pauli_schemas,
        pes_curve=pes_points,
    )
    sim_cache.set(cache_key, out)
    return out


@router.post("/hubbard", response_model=VQEHubbardResponse)
def compute_vqe_hubbard(req: VQEHubbardRequest):
    """Computes exact and HVA-VQE ground state for Fermi-Hubbard ring in a given particle sector."""
    cache_key = f"vqe_hub_{req.t:.2f}_{req.u:.2f}_{req.total_electrons}_{req.p_layers}"
    cached = sim_cache.get(cache_key)
    if cached is not None:
        return cached

    h_t, h_u = hubbard_ring.build_hamiltonians(t=req.t, u=req.u)
    sec_res = hubbard_ring.solve_sector(
        h_t, h_u, total_electrons=req.total_electrons, p_layers=req.p_layers
    )

    out = VQEHubbardResponse(
        t=req.t,
        u=req.u,
        u_over_t=req.u / req.t,
        total_electrons=sec_res.total_electrons,
        n_up=sec_res.n_up,
        n_down=sec_res.n_down,
        sector_dimension=sec_res.sector_dimension,
        exact_energy=sec_res.exact_energy,
        vqe_energy=sec_res.vqe_energy,
        vqe_error=sec_res.vqe_error,
    )
    sim_cache.set(cache_key, out)
    return out
