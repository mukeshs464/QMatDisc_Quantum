"""API regression and integration tests for QMatDisc backend endpoints."""

import pytest
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestAPIEndpoints:
    def test_health_check(self):
        """Verifies /health endpoint returns online status."""
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "online"
        assert "adapters" in data

    def test_vqe_h2_endpoint(self):
        """Verifies POST /api/vqe/h2 returns accurate equilibrium energy."""
        payload = {
            "distance_angstrom": 0.735,
            "optimizer": "BFGS",
            "include_pes_curve": True,
        }
        resp = client.post("/api/vqe/h2", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert abs(data["energy_vqe"] - (-1.13731)) < 1e-4
        assert len(data["pes_curve"]) == 27
        assert data["n_pauli_terms"] == 15

    def test_vqe_hubbard_endpoint(self):
        """Verifies POST /api/vqe/hubbard solves sector ground state."""
        payload = {
            "t": 1.0,
            "u": 4.0,
            "total_electrons": 4,
            "p_layers": 4,
        }
        resp = client.post("/api/vqe/hubbard", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["vqe_error"] < 1e-5

    def test_voltage_profile_endpoint(self):
        """Verifies GET /api/voltage-profile calculates Mott gap step."""
        resp = client.get("/api/voltage-profile?t=1.0&u=4.0")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["relative_voltage_vqe"]) == 8
        assert abs(data["half_filling_step_height"] - 2.70) < 0.1
        assert data["is_proxy"] is True

    def test_noise_zne_endpoint(self):
        """Verifies POST /api/noise/zne executes trials and returns histograms."""
        payload = {
            "distance_angstrom": 0.735,
            "cnot_count": 48,
            "eps": 0.0003,
            "shots": 20000,
            "n_trials": 20,
            "seed": 42,
        }
        resp = client.post("/api/noise/zne", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["zne_mae_mHa"] < data["raw_mae_mHa"]
        assert len(data["raw_histogram_bins"]) > 0

    def test_candidate_ranking_endpoints(self):
        """Verifies GET /api/candidates/library and POST /api/candidates/rank."""
        lib_resp = client.get("/api/candidates/library")
        assert lib_resp.status_code == 200
        lib = lib_resp.json()
        assert len(lib) >= 7

        rank_payload = {
            "w_capacity": 0.5,
            "w_voltage": 0.2,
            "w_volume": 0.15,
            "w_barrier": 0.15,
        }
        rank_resp = client.post("/api/candidates/rank", json=rank_payload)
        assert rank_resp.status_code == 200
        ranked = rank_resp.json()
        assert ranked[0]["utility_score"] >= ranked[-1]["utility_score"]

    def test_active_learning_step(self):
        """Verifies POST /api/active-learning/step suggests next correlation point."""
        payload = {
            "observed_points": [
                {"u_over_t": 0.0, "true_step_height": 0.0, "is_observed": True},
                {"u_over_t": 8.0, "true_step_height": 5.99, "is_observed": True},
            ],
            "exploration_weight": 1.5,
        }
        resp = client.post("/api/active-learning/step", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert 0.0 <= data["next_suggested_u"] <= 10.0
        assert len(data["grid_u_over_t"]) == 50

    def test_resource_estimation(self):
        """Verifies GET /api/resources/estimate returns QPE Delgado estimates."""
        resp = client.get("/api/resources/estimate?n_spin_orbitals=16&target_accuracy_mHa=1.5936")
        assert resp.status_code == 200
        data = resp.json()
        assert data["logical_qubits"] >= 16
        assert data["toffoli_count"] > 1e6
        assert "Delgado" in data["method_reference"]

    def test_custom_hamiltonian_upload(self):
        """Verifies POST /api/hamiltonian/upload validates and solves custom Hamiltonian."""
        payload = {
            "name": "Test Active Space",
            "n_qubits": 2,
            "terms": [
                {"pauli": "ZZ", "coeff": -1.0},
                {"pauli": "XX", "coeff": 0.5},
            ],
            "run_vqe": True,
        }
        resp = client.post("/api/hamiltonian/upload", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "exact_ground_energy" in data
        assert "vqe_energy" in data

    def test_websocket_vqe_telemetry(self):
        """Verifies /ws/vqe WebSocket stream connection and step streaming."""
        with client.websocket_connect("/ws/vqe") as ws:
            ws.send_json({
                "system": "h2",
                "distance": 0.735,
                "optimizer": "BFGS",
                "maxiter": 5,
            })
            start_msg = ws.receive_json()
            assert start_msg["type"] == "start"
            # Receive at least one step or done
            msg = ws.receive_json()
            assert msg["type"] in ["step", "done"]
