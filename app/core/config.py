import os
from functools import lru_cache
import logging

from dotenv import load_dotenv  # type: ignore

logger = logging.getLogger("apolo.config")

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
    """Carrega arquivo .env em ambiente de desenvolvimento."""
    running_on_render = os.getenv("RENDER", "").lower() == "true"
    if os.getenv("NODE_ENV", "development").lower() != "production" and not running_on_render:
        load_dotenv(override=False)


def _normalize_database_url(database_url: str) -> str:
    """Normaliza URL de banco de dados (compatível com Render e Supabase)."""
    normalized = database_url.strip()

    if normalized.startswith("postgres://"):
        return normalized.replace("postgres://", "postgresql://", 1)

    return normalized


def _parse_origins(raw_origins: str | None) -> list[str]:
    """Parse CORS origins a partir de string separada por vírgulas."""
    configured = []
    if raw_origins:
        configured = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    origins = list(dict.fromkeys([*LOCAL_ORIGINS, *configured]))
    return origins


def _get_database_url() -> str:
    """
    Obtém URL de banco de dados com suporte a Supabase.
    
    Prioridade:
    1. SUPABASE_DB_URL (recomendado para Supabase)
    2. DATABASE_URL (compatível com Render e PostgreSQL genérico)
    3. SQLite local (padrão para desenvolvimento)
    
    Nota: Supabase com SSL é obrigatório em produção (sslmode=require)
    """
    # Supabase: usar URL direta com ?sslmode=require
    supabase_url = os.getenv("SUPABASE_DB_URL", "").strip()
    if supabase_url:
        return _normalize_database_url(supabase_url)
    
    # Fallback: DATABASE_URL (Render, PostgreSQL genérico)
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        return _normalize_database_url(database_url)
    
    # Padrão: SQLite local
    return "sqlite:///./apolo_codex.db"


@lru_cache
def get_settings() -> dict:
    """
    Carrega configurações da aplicação a partir de variáveis de ambiente.
    
    Compatível com:
    - Desenvolvimento local (SQLite)
    - Render (PostgreSQL)
    - Supabase (PostgreSQL gerenciado)
    """
    _load_local_env()

    environment = os.getenv("NODE_ENV", "development").lower()
    is_production = environment == "production"
    database_url = _get_database_url()
    
    mapbox_token = os.getenv("MAPBOX_TOKEN", "")
    
    # Supabase auth keys (opcional, para futura integração)
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Debug logging for deployment
    if is_production or environment == "staging":
        import sys
        print(f"[CONFIG] Environment: {environment}", file=sys.stderr)
        print(f"[CONFIG] Database configured: {bool(database_url)}", file=sys.stderr)
        print(f"[CONFIG] MAPBOX_TOKEN configured: {bool(mapbox_token)}", file=sys.stderr)
        if mapbox_token:
            print(f"[CONFIG] MAPBOX_TOKEN starts with pk.eyJ1: {mapbox_token.startswith('pk.eyJ1')}", file=sys.stderr)
        print(f"[CONFIG] Supabase Auth configured: {bool(supabase_anon_key)}", file=sys.stderr)

    return {
        "app_name": "Apolo CodexAI API",
        "environment": environment,
        "is_production": is_production,
        "database_url": database_url,
        "port": int(os.getenv("PORT", "8000")),
        "mapbox_token": mapbox_token,
        "frontend_api_base": os.getenv("FRONTEND_API_BASE", ""),
        "cors_origins": _parse_origins(os.getenv("CORS_ORIGINS")),
        # Supabase configuration
        "supabase_anon_key": supabase_anon_key,
        "supabase_service_role_key": supabase_service_role_key,
        "supabase_url": os.getenv("SUPABASE_URL", ""),
    }
