"""API endpoints for battery material candidate screening, multi-objective ranking, and Pareto analysis."""

from typing import List
from fastapi import APIRouter
from ..models.schemas import CandidateWeightsRequest, RankedCandidateSchema
from ..chemistry.voltage import BATTERY_CANDIDATE_LIBRARY, score_candidate_material

router = APIRouter(prefix="/candidates", tags=["Candidates"])


def identify_pareto_front(candidates: list) -> list[bool]:
    """Identifies non-dominated candidates (Pareto optimal) across capacity and voltage."""
    n = len(candidates)
    is_pareto = [True] * n
    for i in range(n):
        for j in range(n):
            if i != j:
                # If j has higher or equal capacity and higher or equal voltage, and strictly better in at least one
                j_dominates = (
                    candidates[j].specific_capacity_mah_g >= candidates[i].specific_capacity_mah_g
                    and candidates[j].nominal_voltage_v >= candidates[i].nominal_voltage_v
                    and (
                        candidates[j].specific_capacity_mah_g > candidates[i].specific_capacity_mah_g
                        or candidates[j].nominal_voltage_v > candidates[i].nominal_voltage_v
                    )
                )
                if j_dominates:
                    is_pareto[i] = False
                    break
    return is_pareto


@router.get("/library", response_model=List[RankedCandidateSchema])
def get_candidate_library():
    """Returns the baseline library of battery candidate materials with default weights."""
    return rank_candidates(CandidateWeightsRequest())


@router.post("/rank", response_model=List[RankedCandidateSchema])
def rank_candidates(req: CandidateWeightsRequest):
    """Computes multi-objective utility scores and Pareto optimality for candidate materials."""
    pareto_flags = identify_pareto_front(BATTERY_CANDIDATE_LIBRARY)
    ranked: List[RankedCandidateSchema] = []

    for idx, c in enumerate(BATTERY_CANDIDATE_LIBRARY):
        score = score_candidate_material(
            c,
            w_capacity=req.w_capacity,
            w_voltage=req.w_voltage,
            w_volume=req.w_volume,
            w_barrier=req.w_barrier,
        )
        ranked.append(
            RankedCandidateSchema(
                id=c.id,
                name=c.name,
                formula=c.formula,
                chemistry_family=c.chemistry_family,
                u_over_t=c.u_over_t,
                nominal_voltage_v=c.nominal_voltage_v,
                specific_capacity_mah_g=c.specific_capacity_mah_g,
                volume_change_pct=c.volume_change_pct,
                migration_barrier_ev=c.migration_barrier_ev,
                active_space_orbitals=c.active_space_orbitals,
                utility_score=round(score, 2),
                is_pareto_optimal=pareto_flags[idx],
                is_synthetic_proxy=c.is_synthetic_proxy,
                description=c.description,
            )
        )

    # Sort descending by utility score
    ranked.sort(key=lambda x: x.utility_score, reverse=True)
    return ranked
