"""Fault-Tolerant Quantum Resource Estimator for Battery Active Spaces.
References:
- Delgado et al., "Simulating key properties of lithium-ion batteries using a fault-tolerant quantum computer",
  Phys. Rev. A 106, 032428 (2022).
- Lee et al., PRX Quantum 2, 030305 (2021) for tensor hypercontraction (THC) QPE bounds.
"""

from __future__ import annotations

import math
from typing import Dict


def estimate_fault_tolerant_resources(
    n_spin_orbitals: int,
    target_accuracy_mHa: float = 1.5936,  # Chemical accuracy (1 kcal/mol)
    physical_error_rate: float = 1e-3,     # Superconducting transmon threshold ~ 0.1%
) -> Dict[str, float | int | str]:
    """Estimates logical and physical quantum resources for QPE ground-state energy estimation."""
    n = max(4, int(n_spin_orbitals))
    eps = max(0.01, float(target_accuracy_mHa))

    # Logical qubits: system register + ancillae for QPE and block-encoding
    # Delgado et al. & Lee et al. formula: N_sys + 2 * log2(N_sys) + 8 ancillae
    ancillae = int(2 * math.ceil(math.log2(n))) + 8
    logical_qubits = n + ancillae

    # Toffoli complexity: O(N^3 / eps) under tensor-hypercontraction (THC) block encoding
    # Scaled to baseline N=16 -> ~1.2e7 Toffolis (Delgado Table II)
    base_toffoli = 1.2e7
    toffoli_count = int(base_toffoli * ((n / 16.0) ** 3.2) * (1.5936 / eps))
    t_depth = int(toffoli_count * 0.65)

    # Surface code distance d: P_logical ~ d * (100 * p_phys)^((d+1)/2) <= 1% total failure probability
    target_logical_error = 0.01 / max(1, toffoli_count)
    if physical_error_rate < 1e-2:
        suppression_factor = physical_error_rate / 1e-2
        d_val = math.ceil(
            2.0 * math.log10(target_logical_error) / math.log10(suppression_factor)
        )
        surface_code_distance = max(11, min(45, int(d_val) | 1))  # Must be odd integer
    else:
        surface_code_distance = 31

    # Physical qubits: 2 * d^2 physical per logical patch + magic state distillation factories
    physical_per_patch = 2 * (surface_code_distance**2)
    distillation_overhead = 1500  # 15-to-1 distillation factory footprint
    total_physical_qubits = int(logical_qubits * physical_per_patch + distillation_overhead)

    # Runtime with 1 microsecond surface code cycle time (1 MHz clock)
    cycle_time_us = 1.0  # 1 microsecond per surface code cycle
    # Each Toffoli requires ~d surface code cycles with routing
    runtime_seconds = float(toffoli_count * surface_code_distance * cycle_time_us * 1e-6)

    # Classical Full Configuration Interaction (FCI) memory scaling
    # Hilbert space dimension: 2^n complex numbers (16 bytes each)
    if n <= 60:
        classical_fci_states = float(2.0**n)
        classical_fci_memory_gb = float((classical_fci_states * 16.0) / 1e9)
    else:
        classical_fci_states = 1e18
        classical_fci_memory_gb = 1e10

    return {
        "n_spin_orbitals": n,
        "logical_qubits": logical_qubits,
        "toffoli_count": toffoli_count,
        "t_depth": t_depth,
        "qpe_runtime_seconds": round(runtime_seconds, 2),
        "surface_code_distance": surface_code_distance,
        "physical_qubits": total_physical_qubits,
        "classical_fci_states": classical_fci_states,
        "classical_fci_memory_gb": classical_fci_memory_gb,
        "method_reference": "Delgado et al. Phys. Rev. A 106, 032428 (2022)",
    }
