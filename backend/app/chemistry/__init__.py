"""QMatDisc Chemistry Engine.
First-principles molecular integrals, Fermi-Hubbard lattice model, and battery voltage modules:
- STO-3G Gaussian integral engine (overlap, kinetic, nuclear, electron repulsion)
- H2 electronic structure (Restricted Hartree-Fock, FCI, UCCD-VQE)
- 4-site/8-qubit Fermi-Hubbard ring model with sector block diagonalization
- Battery voltage proxy V(N) = -(E(N) - E(N-1)) and Nernst-Delgado formula
- Custom Hamiltonian JSON downfolding interface
"""

from .sto3g import (
    STO3G_H_EXPONENTS,
    STO3G_H_COEFFS,
    boys_function_f0,
    gaussian_norm,
    compute_h2_integrals,
    STO3GIntegrals,
)
from .h2_molecule import (
    H2CalculationResult,
    H2HamiltonianBuilder,
    BOHR_TO_ANGSTROM,
    ANGSTROM_TO_BOHR,
)
from .hubbard import (
    FermiHubbardRing,
    HubbardSectorResult,
    HubbardVoltageProfile,
)
from .voltage import (
    BatteryMaterialCandidate,
    BATTERY_CANDIDATE_LIBRARY,
    calculate_electrochemical_potential,
    score_candidate_material,
)
from .downfolding import (
    CustomHamiltonianPayload,
    parse_hamiltonian_json,
    solve_custom_hamiltonian,
)

__all__ = [
    "STO3G_H_EXPONENTS",
    "STO3G_H_COEFFS",
    "boys_function_f0",
    "gaussian_norm",
    "compute_h2_integrals",
    "STO3GIntegrals",
    "H2CalculationResult",
    "H2HamiltonianBuilder",
    "BOHR_TO_ANGSTROM",
    "ANGSTROM_TO_BOHR",
    "FermiHubbardRing",
    "HubbardSectorResult",
    "HubbardVoltageProfile",
    "BatteryMaterialCandidate",
    "BATTERY_CANDIDATE_LIBRARY",
    "calculate_electrochemical_potential",
    "score_candidate_material",
    "CustomHamiltonianPayload",
    "parse_hamiltonian_json",
    "solve_custom_hamiltonian",
]
