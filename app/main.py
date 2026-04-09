import json
import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.database import Base, engine
from app.routes import denuncia_router

settings = get_settings()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("apolo.api")

app = FastAPI(title=settings["app_name"])
Base.metadata.create_all(bind=engine)
app.include_router(denuncia_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings["cors_origins"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar arquivos estáticos a partir da pasta app/frontend/static, onde style.css/js estão localizados
static_dir = Path("app/frontend/static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Montar arquivos da pasta frontend para servir logo.png e outros
frontend_dir = Path("app/frontend")
app.mount("/frontend", StaticFiles(directory=frontend_dir), name="frontend")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("Request %s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info("Response %s %s -> %s", request.method, request.url.path, response.status_code)
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error at %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor"},
    )

# Rota dedicada para servir o favicon (usado automaticamente pelos navegadores)
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    favicon_path = Path(__file__).resolve().parent / "frontend" / "favicon" / "favicon.ico"
    return FileResponse(favicon_path)

@app.get("/")
async def read_root():
    return FileResponse(Path("app/frontend") / "index.html")

@app.get("/config.js", include_in_schema=False)
async def frontend_config():
    mapbox_token = settings["mapbox_token"]
    
    # Debug logging
    logger.info(f"Frontend config requested - MAPBOX_TOKEN exists: {bool(mapbox_token)}, length: {len(mapbox_token) if mapbox_token else 0}")
    if not mapbox_token:
        logger.warning("⚠️ MAPBOX_TOKEN is empty! Check environment variables.")
    
    return Response(
        content=(
            'window.APP_CONFIG = { '
            f'MAPBOX_TOKEN: {json.dumps(mapbox_token)}, '
            f'API_BASE: {json.dumps(settings["frontend_api_base"])} '
            '};'
        ),
        media_type="application/javascript",
    )

@app.get("/api")
def api_root():
    return {"message": "API Apolo CodexAI - FastAPI base", "environment": settings["environment"]}


@app.get("/api/health")
def api_health():
    return {
        "status": "ok",
        "environment": settings["environment"],
        "database_engine": "postgresql" if settings["database_url"].startswith("postgresql") else "sqlite",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=settings["port"], reload=False)
