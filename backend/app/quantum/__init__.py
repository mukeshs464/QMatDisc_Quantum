"""QMatDisc Quantum Engine.
Core pure NumPy/SciPy quantum simulation capabilities:
- Pauli algebra and decompositions
- Jordan-Wigner fermion operators
- Variational ansätze (UCCD, HVA, HEA)
- VQE optimization engine and streaming
- Depolarizing noise, shot noise, and Richardson ZNE
- Barren plateau scaling diagnostics
"""

from .pauli import (
    I2,
    X,
    Y,
    Z,
    SIGMA_MINUS,
    SIGMA_PLUS,
    PauliTerm,
    kron_product,
    pauli_string_to_matrix,
    pauli_decomposition,
    reconstruct_from_pauli,
)
from .fermion import (
    get_annihilation_operators,
    get_creation_operators,
    get_number_operators,
    get_total_number_operator,
    build_vacuum_state,
    build_occupied_state,
)
from .ansatz import (
    UCCDAnsatzH2,
    HVAHubbardSector,
    HardwareEfficientAnsatz,
    ry_matrix,
    rz_matrix,
    cnot_matrix,
)
from .vqe import (
    VQERunner,
    VQEStep,
    VQEResult,
    statevector_expectation,
    stream_vqe_steps,
)
from .noise import (
    NoisyExpectationSimulator,
    ZNETrialResult,
    ZNEBenchmarkSummary,
)
from .barren_plateau import (
    compute_gradient_variance,
    scan_qubit_variance,
)

__all__ = [
    "I2",
    "X",
    "Y",
    "Z",
    "SIGMA_MINUS",
    "SIGMA_PLUS",
    "PauliTerm",
    "kron_product",
    "pauli_string_to_matrix",
    "pauli_decomposition",
    "reconstruct_from_pauli",
    "get_annihilation_operators",
    "get_creation_operators",
    "get_number_operators",
    "get_total_number_operator",
    "build_vacuum_state",
    "build_occupied_state",
    "UCCDAnsatzH2",
    "HVAHubbardSector",
    "HardwareEfficientAnsatz",
    "ry_matrix",
    "rz_matrix",
    "cnot_matrix",
    "VQERunner",
    "VQEStep",
    "VQEResult",
    "statevector_expectation",
    "stream_vqe_steps",
    "NoisyExpectationSimulator",
    "ZNETrialResult",
    "ZNEBenchmarkSummary",
    "compute_gradient_variance",
    "scan_qubit_variance",
]
