"""Pydantic v2 schemas for QMatDisc API endpoints and WebSocket telemetry.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# --- VQE H2 Schemas ---
class VQEH2Request(BaseModel):
    distance_angstrom: float = Field(0.735, ge=0.15, le=3.0, description="H-H bond distance in Angstroms")
    optimizer: str = Field("BFGS", description="Optimizer: BFGS, COBYLA, or SPSA")
    include_pes_curve: bool = Field(True, description="Whether to include full 27-point PES curve")


class PauliTermSchema(BaseModel):
    pauli: str
    coeff: float


class PESPointSchema(BaseModel):
    distance_angstrom: float
    energy_hf: float
    energy_fci: float
    energy_vqe: float
    correlation_energy_mHa: float
    vqe_error_mHa: float


class VQEH2Response(BaseModel):
    distance_angstrom: float
    energy_hf: float
    energy_fci: float
    energy_vqe: float
    optimal_theta: float
    correlation_energy_mHa: float
    vqe_error_mHa: float
    nuclear_repulsion: float
    n_pauli_terms: int
    pauli_terms: List[PauliTermSchema]
    pes_curve: Optional[List[PESPointSchema]] = None


# --- Hubbard Schemas ---
class VQEHubbardRequest(BaseModel):
    t: float = Field(1.0, ge=0.1, le=10.0, description="Hopping amplitude")
    u: float = Field(4.0, ge=0.0, le=20.0, description="On-site Coulomb repulsion")
    total_electrons: int = Field(4, ge=0, le=8, description="Electron filling sector (0..8)")
    p_layers: int = Field(6, ge=1, le=12, description="Number of HVA ansatz layers")


class VQEHubbardResponse(BaseModel):
    t: float
    u: float
    u_over_t: float
    total_electrons: int
    n_up: int
    n_down: int
    sector_dimension: int
    exact_energy: float
    vqe_energy: float
    vqe_error: float


class VoltageProfileResponse(BaseModel):
    t: float
    u: float
    u_over_t: float
    fillings: List[int]
    lithiation_x: List[float]
    energies_exact: List[float]
    energies_vqe: List[float]
    relative_voltage_exact: List[float]
    relative_voltage_vqe: List[float]
    half_filling_step_height: float
    max_vqe_error: float
    is_proxy: bool = True
    badge_note: str = "Relative voltage proxy (units of t)"


# --- Noise & ZNE Schemas ---
class ZNERequest(BaseModel):
    distance_angstrom: float = Field(0.735, ge=0.2, le=2.5)
    cnot_count: int = Field(48, ge=1, le=200)
    eps: float = Field(0.0003, ge=1e-5, le=0.05)
    shots: int = Field(100000, ge=1000, le=500000)
    n_trials: int = Field(200, ge=10, le=1000)
    seed: int = Field(7)


class ZNEResponse(BaseModel):
    exact_energy: float
    raw_mae_mHa: float
    zne_mae_mHa: float
    shot_only_mae_mHa: float
    raw_bias_mHa: float
    zne_bias_mHa: float
    zne_std_mHa: float
    chemical_accuracy_success_rate: float
    cnot_count: int
    eps: float
    shots: int
    n_trials: int
    sample_trials: List[Dict[str, Any]]
    raw_histogram_bins: List[float]
    raw_histogram_counts: List[int]
    zne_histogram_counts: List[int]


# --- Material Candidates Schemas ---
class CandidateWeightsRequest(BaseModel):
    w_capacity: float = Field(0.35, ge=0.0, le=1.0)
    w_voltage: float = Field(0.25, ge=0.0, le=1.0)
    w_volume: float = Field(0.20, ge=0.0, le=1.0)
    w_barrier: float = Field(0.20, ge=0.0, le=1.0)


class RankedCandidateSchema(BaseModel):
    id: str
    name: str
    formula: str
    chemistry_family: str
    u_over_t: float
    nominal_voltage_v: float
    specific_capacity_mah_g: float
    volume_change_pct: float
    migration_barrier_ev: float
    active_space_orbitals: int
    utility_score: float
    is_pareto_optimal: bool
    is_synthetic_proxy: bool
    description: str


# --- Active Learning Schemas ---
class ActiveLearningPoint(BaseModel):
    u_over_t: float
    true_step_height: float
    is_observed: bool = True


class ActiveLearningRequest(BaseModel):
    observed_points: List[ActiveLearningPoint] = Field(default_factory=list)
    exploration_weight: float = Field(1.5, ge=0.1, le=5.0)


class ActiveLearningResponse(BaseModel):
    grid_u_over_t: List[float]
    gp_mean: List[float]
    gp_std: List[float]
    acquisition_scores: List[float]
    next_suggested_u: float
    predicted_step_at_next: float
    iteration: int


# --- Resource Estimation Schemas ---
class ResourceEstimateRequest(BaseModel):
    n_spin_orbitals: int = Field(16, ge=4, le=120)
    target_accuracy_mHa: float = Field(1.5936, ge=0.1, le=10.0)  # 1 kcal/mol
    physical_error_rate: float = Field(1e-3, ge=1e-5, le=1e-2)


class ResourceEstimateResponse(BaseModel):
    n_spin_orbitals: int
    logical_qubits: int
    toffoli_count: int
    t_depth: int
    qpe_runtime_seconds: float
    surface_code_distance: int
    physical_qubits: int
    classical_fci_states: float
    classical_fci_memory_gb: float
    method_reference: str = "Delgado et al. Phys. Rev. A 106, 032428 (2022)"


# --- Custom Upload Schemas ---
class CustomPauliTerm(BaseModel):
    pauli: str
    coeff: float


class CustomUploadRequest(BaseModel):
    name: str = "Uploaded Hamiltonian"
    n_qubits: int = Field(4, ge=1, le=14)
    terms: List[CustomPauliTerm]
    description: str = ""
    run_vqe: bool = True
