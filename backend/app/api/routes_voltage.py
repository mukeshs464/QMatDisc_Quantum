"""API endpoints for battery voltage profiles across correlation strengths."""

from fastapi import APIRouter, Query
from ..models.schemas import VoltageProfileResponse
from ..chemistry.hubbard import FermiHubbardRing
from ..core.cache import sim_cache

router = APIRouter(tags=["Voltage"])
hubbard_ring = FermiHubbardRing(n_sites=4)


@router.get("/voltage-profile", response_model=VoltageProfileResponse)
def get_voltage_profile(
    t: float = Query(1.0, ge=0.1, le=10.0, description="Hopping amplitude t"),
    u: float = Query(4.0, ge=0.0, le=20.0, description="On-site Coulomb repulsion U"),
):
    """Computes full 0..8 electron filling voltage profile V(x) = -(E(N) - E(N-1))."""
    cache_key = f"voltage_prof_{t:.2f}_{u:.2f}"
    cached = sim_cache.get(cache_key)
    if cached is not None:
        return cached

    profile = hubbard_ring.compute_voltage_profile(t=t, u=u)

    out = VoltageProfileResponse(
        t=profile.t,
        u=profile.u,
        u_over_t=profile.u_over_t,
        fillings=profile.fillings,
        lithiation_x=profile.lithiation_x,
        energies_exact=profile.energies_exact,
        energies_vqe=profile.energies_vqe,
        relative_voltage_exact=profile.relative_voltage_exact,
        relative_voltage_vqe=profile.relative_voltage_vqe,
        half_filling_step_height=profile.half_filling_step_height,
        max_vqe_error=profile.max_vqe_error,
        is_proxy=True,
        badge_note="Relative voltage proxy (units of t)",
    )
    sim_cache.set(cache_key, out)
    return out
