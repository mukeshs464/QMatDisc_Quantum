"""QMatDisc Chemistry Engine - From-Scratch STO-3G Molecular Integral Engine.
Computes overlap, kinetic, nuclear attraction, and electron repulsion integrals
for s-type Gaussian primitives and contracted STO-3G basis functions for H2.
No external quantum chemistry packages (e.g. PySCF) required.
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass
from typing import List, Tuple
import numpy as np
from scipy.special import erf

# STO-3G contraction parameters for Hydrogen 1s orbital
STO3G_H_EXPONENTS = np.array([3.42525091, 0.62391373, 0.16885540], dtype=float)
STO3G_H_COEFFS = np.array([0.15432897, 0.53532814, 0.44463454], dtype=float)


def boys_function_f0(t: float) -> float:
    """Zeroth-order Boys function F_0(t) = \\int_0^1 \\exp(-t u^2) du.

    F_0(t) = 0.5 * sqrt(pi / t) * erf(sqrt(t)) for t > 0, F_0(0) = 1.0.
    """
    if t < 1e-10:
        return 1.0
    return float(0.5 * np.sqrt(np.pi / t) * erf(np.sqrt(t)))


def gaussian_norm(alpha: float) -> float:
    """Normalization constant for a primitive 3D s-type Gaussian: (2 * alpha / pi)^(3/4)."""
    return float((2.0 * alpha / np.pi) ** 0.75)


@dataclass
class STO3GIntegrals:
    """Calculated 1-electron and 2-electron integrals in MO basis."""
    bond_distance_bohr: float
    bond_distance_angstrom: float
    nuclear_repulsion: float
    h_mo: np.ndarray  # (2, 2) 1-electron MO integrals
    g_mo: np.ndarray  # (2, 2, 2, 2) 2-electron MO integrals
    s_ao: np.ndarray  # (2, 2) AO overlap matrix
    mo_coeffs: np.ndarray  # (2, 2) Molecular orbital coefficients (sigma_g, sigma_u)


def compute_h2_integrals(bond_distance_bohr: float) -> STO3GIntegrals:
    """Computes all STO-3G integrals for H2 at specified internuclear separation R (in bohr)."""
    r_bohr = float(bond_distance_bohr)
    if r_bohr <= 0.05:
        raise ValueError(f"Bond distance must be positive and > 0.05 bohr, got {r_bohr}")

    center_a = np.array([0.0, 0.0, 0.0], dtype=float)
    center_b = np.array([0.0, 0.0, r_bohr], dtype=float)
    centers = [center_a, center_b]

    # Pre-normalize primitive coefficients: d_k = c_k * N(alpha_k)
    prims_a = [
        (STO3G_H_EXPONENTS[k], STO3G_H_COEFFS[k] * gaussian_norm(STO3G_H_EXPONENTS[k]), center_a)
        for k in range(3)
    ]
    prims_b = [
        (STO3G_H_EXPONENTS[k], STO3G_H_COEFFS[k] * gaussian_norm(STO3G_H_EXPONENTS[k]), center_b)
        for k in range(3)
    ]
    atomic_orbitals = [prims_a, prims_b]

    # AO Overlap (S), Kinetic (T), and Nuclear Attraction (V)
    s_ao = np.zeros((2, 2), dtype=float)
    t_ao = np.zeros((2, 2), dtype=float)
    v_ao = np.zeros((2, 2), dtype=float)

    for i in range(2):
        for j in range(2):
            for a, ca, ra in atomic_orbitals[i]:
                for b, cb, rb in atomic_orbitals[j]:
                    p = a + b
                    mu = (a * b) / p
                    d2 = float(np.sum((ra - rb) ** 2))
                    s_prim = (np.pi / p) ** 1.5 * np.exp(-mu * d2)
                    t_prim = mu * (3.0 - 2.0 * mu * d2) * s_prim
                    p_center = (a * ra + b * rb) / p

                    s_ao[i, j] += ca * cb * s_prim
                    t_ao[i, j] += ca * cb * t_prim

                    for c_nuc in centers:
                        dist_pc2 = float(np.sum((p_center - c_nuc) ** 2))
                        v_prim = (
                            -2.0
                            * np.pi
                            / p
                            * np.exp(-mu * d2)
                            * boys_function_f0(p * dist_pc2)
                        )
                        v_ao[i, j] += ca * cb * v_prim

    # AO Two-electron repulsion integrals E_{ijkl} = (ij|kl)
    e_ao = np.zeros((2, 2, 2, 2), dtype=float)
    for i, j, k, l in itertools.product(range(2), repeat=4):
        for a, ca, ra in atomic_orbitals[i]:
            for b, cb, rb in atomic_orbitals[j]:
                p = a + b
                p_center = (a * ra + b * rb) / p
                ab_term = (a * b / p) * float(np.sum((ra - rb) ** 2))

                for c, cc, rc in atomic_orbitals[k]:
                    for d, cd, rd in atomic_orbitals[l]:
                        q = c + d
                        q_center = (c * rc + d * rd) / q
                        cd_term = (c * d / q) * float(np.sum((rc - rd) ** 2))

                        pq_center_dist2 = float(np.sum((p_center - q_center) ** 2))
                        t_boys = (p * q / (p + q)) * pq_center_dist2

                        e_prim = (
                            2.0
                            * (np.pi ** 2.5)
                            / (p * q * np.sqrt(p + q))
                            * np.exp(-ab_term - cd_term)
                            * boys_function_f0(t_boys)
                        )
                        e_ao[i, j, k, l] += ca * cb * cc * cd * e_prim

    # Molecular Orbitals: sigma_g and sigma_u symmetric and antisymmetric combinations
    # Normalization: C_g = [1, 1] / sqrt(2*(1 + S_01)), C_u = [1, -1] / sqrt(2*(1 - S_01))
    s01 = s_ao[0, 1]
    c_g = np.array([1.0, 1.0]) / np.sqrt(2.0 * (1.0 + s01))
    c_u = np.array([1.0, -1.0]) / np.sqrt(2.0 * (1.0 - s01))
    mo_coeffs = np.column_stack((c_g, c_u))  # (2, 2) matrix with columns [sigma_g, sigma_u]

    # Transform 1-electron core Hamiltonian H_c = T + V to MO basis
    h_core_ao = t_ao + v_ao
    h_mo = mo_coeffs.T @ h_core_ao @ mo_coeffs

    # Transform 2-electron integrals to MO basis: g_{pqrs} = sum_{ijkl} E_{ijkl} C_{ip} C_{jq} C_{kr} C_{ls}
    g_mo = np.einsum("ijkl,ip,jq,kr,ls->pqrs", e_ao, mo_coeffs, mo_coeffs, mo_coeffs, mo_coeffs)

    nuclear_repulsion = 1.0 / r_bohr
    r_angstrom = r_bohr * 0.529177210903

    return STO3GIntegrals(
        bond_distance_bohr=r_bohr,
        bond_distance_angstrom=r_angstrom,
        nuclear_repulsion=nuclear_repulsion,
        h_mo=h_mo,
        g_mo=g_mo,
        s_ao=s_ao,
        mo_coeffs=mo_coeffs,
    )
