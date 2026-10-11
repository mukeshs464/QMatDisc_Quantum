"""API endpoints for Active Learning surrogate model and candidate acquisition."""

from fastapi import APIRouter
from ..models.schemas import ActiveLearningRequest, ActiveLearningResponse
from ..ml.active_learning import ActiveLearningLoop

router = APIRouter(prefix="/active-learning", tags=["Active Learning"])
al_engine = ActiveLearningLoop(u_min=0.0, u_max=10.0, n_grid=50)


@router.post("/step", response_model=ActiveLearningResponse)
def compute_active_learning_step(req: ActiveLearningRequest):
    """Fits Gaussian Process on observed material points and suggests next candidate."""
    obs_x = [pt.u_over_t for pt in req.observed_points]
    obs_y = [pt.true_step_height for pt in req.observed_points]

    res = al_engine.run_step(
        observed_x=obs_x,
        observed_y=obs_y,
        exploration_weight=req.exploration_weight,
    )

    return ActiveLearningResponse(
        grid_u_over_t=res["grid_u_over_t"],
        gp_mean=res["gp_mean"],
        gp_std=res["gp_std"],
        acquisition_scores=res["acquisition_scores"],
        next_suggested_u=res["next_suggested_u"],
        predicted_step_at_next=res["predicted_step_at_next"],
        iteration=res["iteration"],
    )
