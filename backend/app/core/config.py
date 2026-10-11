"""Application configuration and CORS settings."""

from typing import List


class Settings:
    PROJECT_NAME: str = "QMatDisc - Quantum Material Discovery Platform"
    API_V1_STR: str = "/api"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*",
    ]


settings = Settings()
