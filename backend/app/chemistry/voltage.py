"""QMatDisc Chemistry Engine - Battery Voltage Module & Material Candidate Presets.
Implements:
1. Hubbard relative chemical potential V(N) = -(E(N) - E(N-1)) in units of hopping t
2. Open-circuit voltage (OCV) formula for intercalated battery hosts:
   V = -[E(Li_x2 Host) - E(Li_x1 Host) - dx * E(Li)] / (dx * e)
3. Battery material candidate library with Hubbard U/t proxies, theoretical capacity,
   volume expansion, and Li+ migration barrier.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional
import numpy as np


@dataclass
class BatteryMaterialCandidate:
    """Represents a battery electrode candidate material with quantum proxy & experimental attributes."""
    id: str
    name: str
    formula: str
    chemistry_family: str  # e.g., "Layered Oxide", "Olivine", "Spinel", "Disordered Rocksalt"
    u_over_t: float        # Effective Hubbard correlation proxy
    nominal_voltage_v: float  # Nominal open circuit voltage (Volts)
    specific_capacity_mah_g: float  # Reversible capacity (mAh/g)
    volume_change_pct: float       # Lattice volume strain during lithiation/delithiation (%)
    migration_barrier_ev: float    # Li+ diffusion migration barrier (eV)
    active_space_orbitals: int     # Spin-orbitals required for full active space
    is_synthetic_proxy: bool = True
    description: str = ""


# Standard curated library of battery cathode materials (clearly marked as synthetic demo data)
BATTERY_CANDIDATE_LIBRARY: List[BatteryMaterialCandidate] = [
    BatteryMaterialCandidate(
        id="lco",
        name="Lithium Cobalt Oxide",
        formula="LiCoO2",
        chemistry_family="Layered Oxide",
        u_over_t=5.5,
        nominal_voltage_v=3.90,
        specific_capacity_mah_g=150.0,
        volume_change_pct=2.0,
        migration_barrier_ev=0.35,
        active_space_orbitals=16,
        description="Benchmark commercial layered cathode; high energy density, moderate correlation U/t.",
    ),
    BatteryMaterialCandidate(
        id="nmc811",
        name="Nickel-Manganese-Cobalt (8:1:1)",
        formula="LiNi0.8Mn0.1Co0.1O2",
        chemistry_family="Layered Oxide",
        u_over_t=6.2,
        nominal_voltage_v=3.85,
        specific_capacity_mah_g=205.0,
        volume_change_pct=5.4,
        migration_barrier_ev=0.31,
        active_space_orbitals=24,
        description="High-nickel automotive cathode; high capacity, requires careful phase stabilization.",
    ),
    BatteryMaterialCandidate(
        id="lfp",
        name="Lithium Iron Phosphate",
        formula="LiFePO4",
        chemistry_family="Olivine",
        u_over_t=4.0,
        nominal_voltage_v=3.45,
        specific_capacity_mah_g=165.0,
        volume_change_pct=-6.5,
        migration_barrier_ev=0.27,
        active_space_orbitals=12,
        description="Extremely stable 1D olivine channels; long cycle life, low cost, flat two-phase voltage plateau.",
    ),
    BatteryMaterialCandidate(
        id="lmno",
        name="High-Voltage Spinel",
        formula="LiNi0.5Mn1.5O4",
        chemistry_family="Spinel",
        u_over_t=6.8,
        nominal_voltage_v=4.70,
        specific_capacity_mah_g=147.0,
        volume_change_pct=3.1,
        migration_barrier_ev=0.38,
        active_space_orbitals=20,
        description="High-voltage 3D interstitial network; superior power density, oxidative stability boundary.",
    ),
    BatteryMaterialCandidate(
        id="nafepo4",
        name="Sodium Iron Phosphate (Na-Ion)",
        formula="NaFePO4",
        chemistry_family="Olivine (Na-ion)",
        u_over_t=3.8,
        nominal_voltage_v=2.90,
        specific_capacity_mah_g=154.0,
        volume_change_pct=17.5,
        migration_barrier_ev=0.44,
        active_space_orbitals=12,
        description="Next-gen earth-abundant sodium chemistry; larger ionic radius increases lattice strain.",
    ),
    BatteryMaterialCandidate(
        id="prussian_blue",
        name="Prussian Blue Analog",
        formula="KFe[Fe(CN)6]",
        chemistry_family="Open Framework",
        u_over_t=3.0,
        nominal_voltage_v=3.20,
        specific_capacity_mah_g=120.0,
        volume_change_pct=0.8,
        migration_barrier_ev=0.22,
        active_space_orbitals=18,
        description="Open metal-organic framework with near-zero lattice strain and ultrafast ion diffusion.",
    ),
    BatteryMaterialCandidate(
        id="drx_li_rich",
        name="Li-Rich Disordered Rocksalt",
        formula="Li1.2Mn0.4Ti0.4O2",
        chemistry_family="Disordered Rocksalt",
        u_over_t=7.5,
        nominal_voltage_v=3.65,
        specific_capacity_mah_g=285.0,
        volume_change_pct=8.2,
        migration_barrier_ev=0.42,
        active_space_orbitals=28,
        description="High-capacity dual cation-anion redox host; strong correlation with oxygen hybridization.",
    ),
]


def calculate_electrochemical_potential(
    e_host_x2: float,
    e_host_x1: float,
    e_li_metal: float,
    delta_x: float,
) -> float:
    """Calculates open-circuit battery voltage in Volts using the Nernst-Delgado thermodynamic equation:

    V = - [E(Li_x2 Host) - E(Li_x1 Host) - delta_x * E(Li)] / (delta_x * e)
    """
    if abs(delta_x) < 1e-6:
        raise ValueError("Delta x must be non-zero.")
    # In atomic units (Hartree / electron): 1 Hartree/e = 27.211386 V
    voltage_hartree = -(e_host_x2 - e_host_x1 - delta_x * e_li_metal) / delta_x
    return float(voltage_hartree)


def score_candidate_material(
    candidate: BatteryMaterialCandidate,
    w_capacity: float = 0.35,
    w_voltage: float = 0.25,
    w_volume: float = 0.20,
    w_barrier: float = 0.20,
) -> float:
    """Computes a multi-objective scalar utility score in [0, 100].

    Higher capacity, higher voltage, lower volume change, and lower migration barrier are preferred.
    """
    # Normalized metrics based on practical technology boundaries
    s_cap = np.clip(candidate.specific_capacity_mah_g / 300.0, 0.0, 1.0)
    s_volt = np.clip(candidate.nominal_voltage_v / 5.0, 0.0, 1.0)
    s_vol = np.clip(1.0 - (abs(candidate.volume_change_pct) / 20.0), 0.0, 1.0)
    s_barr = np.clip(1.0 - ((candidate.migration_barrier_ev - 0.15) / 0.40), 0.0, 1.0)

    total_weight = w_capacity + w_voltage + w_volume + w_barrier
    if total_weight <= 0:
        total_weight = 1.0

    score = 100.0 * (
        (w_capacity * s_cap + w_voltage * s_volt + w_volume * s_vol + w_barrier * s_barr)
        / total_weight
    )
    return float(score)
