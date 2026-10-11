"""API endpoints for fault-tolerant quantum resource estimation."""

from fastapi import APIRouter, Query
from ..models.schemas import ResourceEstimateResponse
from ..core.resource_estimator import estimate_fault_tolerant_resources

router = APIRouter(prefix="/resources", tags=["Fault-Tolerant Resources"])


@router.get("/estimate", response_model=ResourceEstimateResponse)
def get_resource_estimate(
    n_spin_orbitals: int = Query(16, ge=4, le=120, description="Active space spin-orbitals"),
    target_accuracy_mHa: float = Query(1.5936, ge=0.1, le=10.0, description="Target precision in mHa"),
    physical_error_rate: float = Query(1e-3, ge=1e-5, le=1e-2, description="Physical gate error rate"),
):
    """Calculates QPE Toffoli count, logical qubits, surface code overhead, and classical memory scaling."""
    est = estimate_fault_tolerant_resources(
        n_spin_orbitals=n_spin_orbitals,
        target_accuracy_mHa=target_accuracy_mHa,
        physical_error_rate=physical_error_rate,
    )
    return ResourceEstimateResponse(**est)
