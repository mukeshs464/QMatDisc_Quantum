# QMatDisc API Reference & Protocol Specification

The QMatDisc backend is powered by **FastAPI** and **ASGI Uvicorn**, serving high-performance endpoints for electronic structure, Hubbard lattice simulations, noise mitigation, and active learning.

- **Base URL**: `http://127.0.0.1:8001`
- **Interactive Swagger Docs**: `http://127.0.0.1:8001/docs`
- **OpenAPI Schema**: `http://127.0.0.1:8001/openapi.json`
- **WebSocket Endpoint**: `ws://127.0.0.1:8001/ws/vqe`

---

## 1. System Endpoints

### `GET /health`
Returns the operational health, version, and optional quantum adapter status.

**Response**:
```json
{
  "status": "online",
  "version": "1.0.0",
  "platform": "QMatDisc Quantum Material Discovery",
  "adapters": {
    "qiskit": true
  },
  "max_qubits_supported": 14
}
```

---

## 2. Quantum VQE Endpoints

### `POST /api/vqe/h2`
Calculates the single-point ground state of molecular $H_2$ in the STO-3G basis.

**Request Body**:
```json
{
  "bond_length": 0.735,
  "optimizer": "BFGS",
  "max_iter": 50
}
```

**Response Body**:
```json
{
  "distance_angstrom": 0.735,
  "distance_bohr": 1.388949,
  "energy_hf": -1.116999,
  "energy_fci": -1.137306,
  "energy_vqe": -1.137306,
  "optimal_theta": -0.111815,
  "correlation_energy_mHa": 20.3065,
  "vqe_error_mHa": 0.000000,
  "nuclear_repulsion": 0.719969,
  "n_pauli_terms": 15
}
```

---

### `POST /api/vqe/h2/pes`
Scans the potential energy surface (PES) across multiple bond distances.

**Request Body**:
```json
{
  "n_points": 25,
  "r_min": 0.25,
  "r_max": 2.50,
  "optimizer": "BFGS"
}
```

**Response Body**:
```json
{
  "points": [
    {
      "distance_angstrom": 0.25,
      "energy_hf": 0.161099,
      "energy_fci": 0.157482,
      "energy_vqe": 0.157482
    }
  ],
  "equilibrium_bond_length": 0.735,
  "equilibrium_fci_energy": -1.137306,
  "max_vqe_error_mHa": 1.11e-12
}
```

---

### `POST /api/vqe/hubbard`
Solves a specific particle-number sector in the 4-site / 8-qubit Fermi-Hubbard ring.

**Request Body**:
```json
{
  "total_electrons": 4,
  "t": 1.0,
  "u": 4.0,
  "p_layers": 6
}
```

**Response Body**:
```json
{
  "total_electrons": 4,
  "n_up": 2,
  "n_down": 2,
  "sector_dimension": 36,
  "exact_energy": -2.828427,
  "vqe_energy": -2.828427,
  "vqe_error": 1.42e-13
}
```

---

## 3. Battery Voltage & Material Endpoints

### `POST /api/voltage/hubbard-profile`
Calculates the Hubbard voltage profile across fillings $N = 0, \dots, 8$.

**Request Body**:
```json
{
  "t": 1.0,
  "u_values": [0.0, 2.0, 4.0, 8.0]
}
```

**Response Body**:
```json
{
  "profiles": {
    "4.0": {
      "t": 1.0,
      "u": 4.0,
      "fillings": [0, 1, 2, 3, 4, 5, 6, 7, 8],
      "lithiation_x": [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0],
      "energies_vqe": [0.0, -2.0, -3.236, -3.828, -2.828, -0.828, 1.764, 5.0, 16.0],
      "relative_voltage_vqe": [2.0, 1.236, 0.592, -1.0, -2.0, -2.592, -3.236, -11.0],
      "half_filling_step_height": 2.701,
      "max_vqe_error": 3.1e-13
    }
  }
}
```

---

### `GET /api/candidates`
Returns all 7 pre-configured battery cathode candidate materials.

---

### `POST /api/candidates/score`
Calculates weighted material scores based on customized utility preferences.

**Request Body**:
```json
{
  "weights": {
    "energy_density": 0.30,
    "voltage": 0.20,
    "cycle_life": 0.20,
    "cost": 0.15,
    "safety": 0.15
  }
}
```

---

## 4. Noise Mitigation Endpoints

### `POST /api/noise/zne-benchmark`
Executes statistical Richardson ZNE trials on $H_2$ under depolarizing noise.

**Request Body**:
```json
{
  "n_trials": 100,
  "cnot_count": 48,
  "depolarizing_eps": 0.0003,
  "shots": 100000,
  "scale_factors": [1, 3, 5],
  "seed": 42
}
```

**Response Body**:
```json
{
  "n_trials": 100,
  "shots": 100000,
  "exact_energy": -1.137306,
  "raw_mae_mHa": 14.92,
  "zne_mae_mHa": 1.02,
  "shot_only_mae_mHa": 0.68,
  "chemical_accuracy_success_rate": 84.0,
  "trials": [ ... ]
}
```

---

## 5. Machine Learning Active Learning Endpoints

### `POST /api/active-learning/step`
Fits a Gaussian Process surrogate to known evaluated materials and selects the next candidate via Upper Confidence Bound (UCB).

**Request Body**:
```json
{
  "kappa": 2.0,
  "evaluated_indices": [0, 2, 4]
}
```

**Response Body**:
```json
{
  "next_recommended_index": 1,
  "next_candidate_name": "LiFePO4",
  "predictions": [
    {
      "index": 1,
      "predicted_mean": 74.5,
      "uncertainty_sigma": 18.2,
      "acquisition_score": 110.9
    }
  ]
}
```

---

## 6. Delgado Fault-Tolerant Resource Estimator

### `POST /api/resources/estimate`
Computes logical qubit, physical qubit (surface code), and Toffoli complexities.

**Request Body**:
```json
{
  "material_name": "LiCoO2",
  "active_orbitals": 54,
  "target_error_ha": 0.0016,
  "physical_error_rate": 0.001
}
```

**Response Body**:
```json
{
  "logical_qubits": 108,
  "code_distance": 27,
  "physical_qubits": 157464,
  "toffoli_count": 4.82e9,
  "runtime_hours": 1.34
}
```

---

## 7. Custom Downfolding & Pauli Ingestion

### `POST /api/hamiltonian/upload`
Ingests an arbitrary JSON Pauli Hamiltonian and solves for ground state energy.

**Request Body**:
```json
{
  "n_qubits": 2,
  "terms": [
    {"coefficient": -1.052, "pauli_string": "II"},
    {"coefficient": 0.397, "pauli_string": "IZ"},
    {"coefficient": -0.397, "pauli_string": "ZI"},
    {"coefficient": -0.011, "pauli_string": "ZZ"},
    {"coefficient": 0.180, "pauli_string": "XX"}
  ]
}
```

---

## 8. Real-Time WebSocket Telemetry (`/ws/vqe`)

Enables real-time streaming of VQE optimization trajectory epochs.

### Connection Handshake
Connect to `ws://127.0.0.1:8001/ws/vqe`.

### Client Command:
```json
{
  "action": "start_vqe",
  "target": "h2",
  "bond_length": 0.735,
  "optimizer": "BFGS",
  "max_iter": 50
}
```

### Server Telemetry Stream (JSON):
```json
{
  "step": 1,
  "energy": -1.116999,
  "gradient_norm": 0.1542,
  "parameters": [0.0],
  "done": false
}
```

### Final Completion Message:
```json
{
  "step": 12,
  "energy": -1.137306,
  "gradient_norm": 1.2e-7,
  "parameters": [-0.111815],
  "done": true,
  "fci_energy": -1.137306,
  "error_mHa": 0.000000
}
```
