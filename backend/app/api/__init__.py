"""API routers package."""
from .routes_vqe import router as vqe_router
from .routes_voltage import router as voltage_router
from .routes_noise import router as noise_router
from .routes_candidates import router as candidates_router
from .routes_active_learn import router as active_learn_router
from .routes_resources import router as resources_router
from .routes_hamiltonian import router as hamiltonian_router
from .ws_vqe import router as ws_router

__all__ = [
    "vqe_router",
    "voltage_router",
    "noise_router",
    "candidates_router",
    "active_learn_router",
    "resources_router",
    "hamiltonian_router",
    "ws_router",
]
