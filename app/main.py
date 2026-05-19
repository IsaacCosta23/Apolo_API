"""
Aplicação FastAPI - Apolo CodexAI

API para monitoramento de denúncias de crimes geolocalizados.

Suporta múltiplos backends de banco de dados:
- SQLite (desenvolvimento)
- PostgreSQL (Render)
- PostgreSQL via Supabase (recomendado para produção)

Variáveis de ambiente obrigatórias:
- NODE_ENV: development|staging|production
- DATABASE_URL ou SUPABASE_DB_URL: URL de conexão com banco
- MAPBOX_TOKEN: Token do Mapbox para frontend

Opcionais:
- SUPABASE_ANON_KEY: Chave anônima do Supabase (para futura Auth)
- SUPABASE_SERVICE_ROLE_KEY: Chave de serviço do Supabase
- CORS_ORIGINS: Origins CORS adicionais (separados por vírgula)
"""

import json
import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.database import Base, engine, check_database_health
from app.routes import denuncia_router

settings = get_settings()

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("apolo.api")

# Criar aplicação
app = FastAPI(
    title=settings["app_name"],
    description="API para monitoramento de crimes geolocalizados com Supabase",
    version="1.0.0",
)

# Criar tabelas no banco de dados (idempotente)
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully")
except Exception as e:
    logger.error(f"Failed to create database tables: {e}")
    raise

# Incluir rotas
app.include_router(denuncia_router)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings["cors_origins"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar arquivos estáticos
static_dir = Path("app/frontend/static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

frontend_dir = Path("app/frontend")
app.mount("/frontend", StaticFiles(directory=frontend_dir), name="frontend")


@app.on_event("startup")
async def startup_event():
    """
    Executado ao iniciar a aplicação.
    
    Validações:
    - Conectividade com banco de dados
    - Configuração de variáveis críticas
    """
    logger.info("=" * 60)
    logger.info(f"Starting Apolo CodexAI API in {settings['environment']} mode")
    logger.info("=" * 60)
    
    # Validar conectividade do banco de dados
    try:
        db_healthy = await check_database_health()
        if db_healthy:
            logger.info("✓ Database connectivity: OK")
        else:
            logger.warning("⚠ Database connectivity: DEGRADED")
    except Exception as e:
        logger.error(f"✗ Database connectivity: FAILED - {e}")
    
    # Validar configurações críticas
    if not settings["mapbox_token"]:
        logger.warning("⚠ MAPBOX_TOKEN not configured")
    else:
        logger.info("✓ Mapbox token configured")
    
    logger.info(f"✓ CORS origins configured: {len(settings['cors_origins'])} origins")
    logger.info("=" * 60)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Middleware para logging de requisições HTTP.
    
    Registra informações sobre cada requisição processada.
    """
    logger.info(f"→ {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"← {request.method} {request.url.path} | {response.status_code}")
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Tratador global de exceções não capturadas.
    
    Registra erro e retorna resposta genérica para o cliente.
    """
    logger.exception(
        f"Unhandled exception at {request.method} {request.url.path}",
        exc_info=exc
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Rotas de serviço (sem autenticação)

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    """Serve favicon do aplicativo."""
    favicon_path = Path(__file__).resolve().parent / "frontend" / "favicon" / "favicon.ico"
    return FileResponse(favicon_path)


@app.get("/", include_in_schema=False)
async def read_root():
    """Serve página frontend (index.html)."""
    return FileResponse(Path("app/frontend") / "index.html")


@app.get("/config.js", include_in_schema=False)
async def frontend_config():
    """
    Fornece configurações do frontend como JavaScript global.
    
    Expõe:
    - window.APP_CONFIG.MAPBOX_TOKEN: Token do Mapbox
    - window.APP_CONFIG.API_BASE: URL base da API
    """
    mapbox_token = settings["mapbox_token"]
    
    if not mapbox_token:
        logger.warning("⚠ MAPBOX_TOKEN is empty! Frontend may not work correctly.")
    
    return Response(
        content=(
            'window.APP_CONFIG = { '
            f'MAPBOX_TOKEN: {json.dumps(mapbox_token)}, '
            f'API_BASE: {json.dumps(settings["frontend_api_base"])} '
            '};'
        ),
        media_type="application/javascript",
    )


@app.get("/api", tags=["status"])
def api_root():
    """Retorna informações básicas da API."""
    return {
        "message": "Apolo CodexAI API - FastAPI",
        "version": "1.0.0",
        "environment": settings["environment"],
    }


@app.get("/api/health", tags=["status"])
async def api_health():
    """
    Health check endpoint.
    
    Valida:
    - Status geral da aplicação
    - Conectividade do banco de dados
    - Tipo de banco configurado
    
    Útil para Kubernetes probes e monitoramento.
    """
    db_healthy = await check_database_health()
    
    db_engine_type = (
        "postgresql" if settings["database_url"].startswith("postgresql")
        else "sqlite"
    )
    
    return {
        "status": "healthy" if db_healthy else "degraded",
        "environment": settings["environment"],
        "database": db_engine_type,
        "database_health": "ok" if db_healthy else "error",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings["port"],
        reload=False,
    )
