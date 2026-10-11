"""QMatDisc FastAPI Main Application.
Provides REST and WebSocket interfaces for the quantum material discovery platform.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .quantum.adapters.adapter_loader import check_sdk_availability
from .api import (
    vqe_router,
    voltage_router,
    noise_router,
    candidates_router,
    active_learn_router,
    resources_router,
    hamiltonian_router,
    ws_router,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Full-stack quantum and chemistry simulation platform for next-generation battery materials.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST Routers under /api
app.include_router(vqe_router, prefix=settings.API_V1_STR)
app.include_router(voltage_router, prefix=settings.API_V1_STR)
app.include_router(noise_router, prefix=settings.API_V1_STR)
app.include_router(candidates_router, prefix=settings.API_V1_STR)
app.include_router(active_learn_router, prefix=settings.API_V1_STR)
app.include_router(resources_router, prefix=settings.API_V1_STR)
app.include_router(hamiltonian_router, prefix=settings.API_V1_STR)

# Register WebSocket router
app.include_router(ws_router)


@app.get("/health")
def health_check():
    """Returns platform health status and detected quantum SDK adapters."""
    return {
        "status": "online",
        "service": "QMatDisc Quantum Engine",
        "version": "1.0.0",
        "adapters": check_sdk_availability(),
    }


@app.get("/")
def root():
    return {
        "message": "Welcome to QMatDisc - Quantum Material Discovery Platform",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
