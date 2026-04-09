import os
from functools import lru_cache

from dotenv import load_dotenv  # type: ignore


LOCAL_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
)


def _load_local_env() -> None:
    running_on_render = os.getenv("RENDER", "").lower() == "true"
    if os.getenv("NODE_ENV", "development").lower() != "production" and not running_on_render:
        load_dotenv(override=False)


def _normalize_database_url(database_url: str) -> str:
    normalized = database_url.strip()

    if normalized.startswith("postgres://"):
        return normalized.replace("postgres://", "postgresql://", 1)

    return normalized


def _parse_origins(raw_origins: str | None) -> list[str]:
    configured = []
    if raw_origins:
        configured = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    origins = list(dict.fromkeys([*LOCAL_ORIGINS, *configured]))
    return origins


@lru_cache
def get_settings() -> dict:
    _load_local_env()

    environment = os.getenv("NODE_ENV", "development").lower()
    is_production = environment == "production"
    database_url = _normalize_database_url(
        os.getenv("DATABASE_URL", "sqlite:///./apolo_codex.db")
    )

    return {
        "app_name": "Apolo CodexAI API",
        "environment": environment,
        "is_production": is_production,
        "database_url": database_url,
        "port": int(os.getenv("PORT", "8000")),
        "mapbox_token": os.getenv("MAPBOX_TOKEN", ""),
        "frontend_api_base": os.getenv("FRONTEND_API_BASE", ""),
        "cors_origins": _parse_origins(os.getenv("CORS_ORIGINS")),
    }
