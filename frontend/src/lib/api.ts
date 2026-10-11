import { API_BASE_URL } from "./constants";

export interface VQEH2Payload {
  distance_angstrom: number;
  optimizer: string;
  include_pes_curve: boolean;
}

export interface VQEH2Response {
  distance_angstrom: number;
  energy_hf: number;
  energy_fci: number;
  energy_vqe: number;
  optimal_theta: number;
  correlation_energy_mHa: number;
  vqe_error_mHa: number;
  nuclear_repulsion: number;
  n_pauli_terms: number;
  pauli_terms: { pauli: string; coeff: number }[];
  pes_curve?: {
    distance_angstrom: number;
    energy_hf: number;
    energy_fci: number;
    energy_vqe: number;
    correlation_energy_mHa: number;
    vqe_error_mHa: number;
  }[];
}

export interface VQEHubbardPayload {
  t: number;
  u: number;
  total_electrons: number;
  p_layers: number;
}

export interface VQEHubbardResponse {
  t: number;
  u: number;
  u_over_t: number;
  total_electrons: number;
  n_up: number;
  n_down: number;
  sector_dimension: number;
  exact_energy: number;
  vqe_energy: number;
  vqe_error: number;
}

export interface VoltageProfileResponse {
  t: number;
  u: number;
  u_over_t: number;
  fillings: number[];
  lithiation_x: number[];
  energies_exact: number[];
  energies_vqe: number[];
  relative_voltage_exact: number[];
  relative_voltage_vqe: number[];
  half_filling_step_height: number;
  max_vqe_error: number;
  is_proxy: boolean;
  badge_note: string;
}

export interface ZNERequestPayload {
  distance_angstrom: number;
  cnot_count: number;
  eps: number;
  shots: number;
  n_trials: number;
  seed: number;
}

export interface ZNEResponse {
  exact_energy: number;
  raw_mae_mHa: number;
  zne_mae_mHa: number;
  shot_only_mae_mHa: number;
  raw_bias_mHa: number;
  zne_bias_mHa: number;
  zne_std_mHa: number;
  chemical_accuracy_success_rate: number;
  cnot_count: number;
  eps: number;
  shots: number;
  n_trials: number;
  sample_trials: {
    raw_energy: number;
    zne_energy: number;
    scale_energies: Record<string, number>;
  }[];
  raw_histogram_bins: number[];
  raw_histogram_counts: number[];
  zne_histogram_counts: number[];
}

export interface CandidateMaterial {
  id: string;
  name: string;
  formula: string;
  chemistry_family: string;
  u_over_t: number;
  nominal_voltage_v: number;
  specific_capacity_mah_g: number;
  volume_change_pct: number;
  migration_barrier_ev: number;
  active_space_orbitals: number;
  utility_score: number;
  is_pareto_optimal: boolean;
  is_synthetic_proxy: boolean;
  description: string;
}

export interface ActiveLearningResponse {
  grid_u_over_t: number[];
  gp_mean: number[];
  gp_std: number[];
  acquisition_scores: number[];
  next_suggested_u: number;
  predicted_step_at_next: number;
  iteration: number;
}

export interface ResourceEstimateResponse {
  n_spin_orbitals: number;
  logical_qubits: number;
  toffoli_count: number;
  t_depth: number;
  qpe_runtime_seconds: number;
  surface_code_distance: number;
  physical_qubits: number;
  classical_fci_states: number;
  classical_fci_memory_gb: number;
  method_reference: string;
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }
  return res.json();
}

export const api = {
  getHealth: () => fetchJson<{ status: string; adapters: Record<string, boolean> }>("/health"),

  computeVQEH2: (payload: VQEH2Payload) =>
    fetchJson<VQEH2Response>("/vqe/h2", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  computeVQEHubbard: (payload: VQEHubbardPayload) =>
    fetchJson<VQEHubbardResponse>("/vqe/hubbard", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getVoltageProfile: (t: number = 1.0, u: number = 4.0) =>
    fetchJson<VoltageProfileResponse>(`/voltage-profile?t=${t}&u=${u}`),

  runZNEBenchmark: (payload: ZNERequestPayload) =>
    fetchJson<ZNEResponse>("/noise/zne", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getBarrenPlateaus: () =>
    fetchJson<{ n_qubits: number; variance: number; theoretical_bound: number }[]>("/noise/barren-plateaus"),

  getCandidateLibrary: () => fetchJson<CandidateMaterial[]>("/candidates/library"),

  rankCandidates: (weights: { w_capacity: number; w_voltage: number; w_volume: number; w_barrier: number }) =>
    fetchJson<CandidateMaterial[]>("/candidates/rank", {
      method: "POST",
      body: JSON.stringify(weights),
    }),

  runActiveLearningStep: (payload: {
    observed_points: { u_over_t: number; true_step_height: number; is_observed?: boolean }[];
    exploration_weight: number;
  }) =>
    fetchJson<ActiveLearningResponse>("/active-learning/step", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getResourceEstimate: (n_spin_orbitals: number = 16, target_accuracy_mHa: number = 1.5936, physical_error_rate: number = 1e-3) =>
    fetchJson<ResourceEstimateResponse>(
      `/resources/estimate?n_spin_orbitals=${n_spin_orbitals}&target_accuracy_mHa=${target_accuracy_mHa}&physical_error_rate=${physical_error_rate}`
    ),

  uploadCustomHamiltonian: (payload: { name: string; n_qubits: number; terms: { pauli: string; coeff: number }[]; run_vqe: boolean }) =>
    fetchJson<any>("/hamiltonian/upload", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
