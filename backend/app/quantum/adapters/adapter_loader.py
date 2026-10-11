"""QMatDisc Quantum Engine - Hardware & SDK Adapters.
Dynamically discovers and adapts to optional external quantum computing and chemistry frameworks:
- Qiskit (SparsePauliOp, Estimator)
- PennyLane (Hamiltonian, QNode)
- PySCF (Integrals, SCF)
Gracefully degrades to native pure NumPy/SciPy engine when external SDKs are absent.
"""

from __future__ import annotations

from typing import Any, Dict, List, Sequence
import importlib.util

from ..pauli import PauliTerm


def check_sdk_availability() -> Dict[str, bool]:
    """Returns availability status for optional external quantum and chemistry libraries."""
    return {
        "qiskit": importlib.util.find_spec("qiskit") is not None,
        "pennylane": importlib.util.find_spec("pennylane") is not None,
        "pyscf": importlib.util.find_spec("pyscf") is not None,
    }


def to_qiskit_op(pauli_terms: Sequence[PauliTerm]) -> Any:
    """Converts internal Pauli terms to a Qiskit SparsePauliOp if Qiskit is installed."""
    if not importlib.util.find_spec("qiskit"):
        raise ModuleNotFoundError("Qiskit is not installed in the current environment.")
    from qiskit.quantum_info import SparsePauliOp

    labels = [t.label for t in pauli_terms]
    coeffs = [t.coeff for t in pauli_terms]
    return SparsePauliOp(labels, coeffs=coeffs)


def to_pennylane_hamiltonian(pauli_terms: Sequence[PauliTerm]) -> Any:
    """Converts internal Pauli terms to a PennyLane Hamiltonian if PennyLane is installed."""
    if not importlib.util.find_spec("pennylane"):
        raise ModuleNotFoundError("PennyLane is not installed in the current environment.")
    import pennylane as qml

    pauli_map = {"I": qml.Identity, "X": qml.PauliX, "Y": qml.PauliY, "Z": qml.PauliZ}
    ops = []
    coeffs = []
    for term in pauli_terms:
        coeffs.append(term.coeff)
        term_ops = []
        for qubit_idx, char in enumerate(term.label):
            if char != "I":
                term_ops.append(pauli_map[char](qubit_idx))
        if not term_ops:
            ops.append(qml.Identity(0))
        elif len(term_ops) == 1:
            ops.append(term_ops[0])
        else:
            prod = term_ops[0]
            for op in term_ops[1:]:
                prod = prod @ op
            ops.append(prod)

    return qml.Hamiltonian(coeffs, ops)
