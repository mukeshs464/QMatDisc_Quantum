"""QMatDisc Chemistry Engine - Downfolding & Custom Hamiltonian Plug-in Interface.
Allows users to upload custom Hamiltonians (JSON format) derived from DFT downfolding
(e.g., Wannier90, cRPA, PySCF active spaces) and solve them via exact diagonalization or VQE.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, List
import numpy as np

from ..quantum.pauli import PauliTerm, reconstruct_from_pauli
from ..quantum.ansatz import HardwareEfficientAnsatz
from ..quantum.vqe import VQERunner, VQEResult


@dataclass
class CustomHamiltonianPayload:
    """Parsed external Hamiltonian specification."""
    name: str
    n_qubits: int
    terms: List[PauliTerm]
    description: str = ""
    metadata: Dict[str, Any] = None


def parse_hamiltonian_json(raw_json: str | dict) -> CustomHamiltonianPayload:
    """Parses and validates a JSON string or dictionary representing an external Pauli Hamiltonian."""
    data = json.loads(raw_json) if isinstance(raw_json, str) else raw_json

    if "n_qubits" not in data or "terms" not in data:
        raise ValueError("JSON must include 'n_qubits' (int) and 'terms' (list).")

    n_qubits = int(data["n_qubits"])
    if n_qubits < 1 or n_qubits > 14:
        raise ValueError(f"Supported qubit count for statevector simulation is 1..14, got {n_qubits}")

    name = str(data.get("name", "Custom Downfolded Hamiltonian"))
    description = str(data.get("description", ""))

    terms: List[PauliTerm] = []
    for item in data["terms"]:
        label = str(item["pauli"]).strip().upper()
        if len(label) != n_qubits:
            raise ValueError(f"Pauli label '{label}' length does not match n_qubits = {n_qubits}")
        if not all(c in "IXYZ" for c in label):
            raise ValueError(f"Invalid character in Pauli string '{label}'. Only I, X, Y, Z allowed.")
        coeff = float(item["coeff"])
        terms.append(PauliTerm(label=label, coeff=coeff))

    return CustomHamiltonianPayload(
        name=name,
        n_qubits=n_qubits,
        terms=terms,
        description=description,
        metadata=data.get("metadata", {}),
    )


def solve_custom_hamiltonian(
    payload: CustomHamiltonianPayload,
    run_vqe: bool = True,
    vqe_layers: int = 2,
    optimizer: str = "BFGS",
) -> Dict[str, Any]:
    """Solves a custom parsed Hamiltonian matrix using exact diagonalization and optional HEA-VQE."""
    h_mat = reconstruct_from_pauli(payload.terms, payload.n_qubits)
    # Ensure Hermiticity
    h_mat = 0.5 * (h_mat + h_mat.conj().T)

    eigenvals = np.linalg.eigvalsh(h_mat)
    ground_exact = float(eigenvals[0])

    result: Dict[str, Any] = {
        "name": payload.name,
        "n_qubits": payload.n_qubits,
        "n_terms": len(payload.terms),
        "exact_ground_energy": ground_exact,
        "lowest_5_eigenvalues": [float(e) for e in eigenvals[: min(5, len(eigenvals))]],
        "spectral_gap": float(eigenvals[1] - eigenvals[0]) if len(eigenvals) > 1 else 0.0,
    }

    if run_vqe:
        hea = HardwareEfficientAnsatz(n_qubits=payload.n_qubits, layers=vqe_layers)
        runner = VQERunner(
            hamiltonian=h_mat,
            ansatz_fn=hea.state,
            optimizer=optimizer,
            maxiter=60,
        )
        p0 = np.zeros(hea.n_params) + 0.05
        vqe_res = runner.run(p0)
        result["vqe_energy"] = vqe_res.optimal_energy
        result["vqe_error"] = abs(vqe_res.optimal_energy - ground_exact)
        result["vqe_converged"] = vqe_res.converged

    return result
