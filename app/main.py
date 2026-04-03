import os
from pathlib import Path
from dotenv import load_dotenv # type: ignore

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

load_dotenv()

from app.database import Base, engine
from app.routes import denuncia_router

app = FastAPI()
Base.metadata.create_all(bind=engine)
app.include_router(denuncia_router)

# Montar arquivos estáticos a partir da pasta app/frontend/static, onde style.css/js estão localizados
static_dir = Path("app/frontend/static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Montar arquivos da pasta frontend para servir logo.png e outros
frontend_dir = Path("app/frontend")
app.mount("/frontend", StaticFiles(directory=frontend_dir), name="frontend")

# Rota dedicada para servir o favicon (usado automaticamente pelos navegadores)
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    favicon_path = Path(__file__).resolve().parent / "frontend" / "favicon" / "favicon.ico"
    return FileResponse(favicon_path)

@app.get("/")
async def read_root():
    return FileResponse(Path("app/frontend") / "index.html")

@app.get("/api")
def api_root():
    return {"message": "API Apolo CodexAI - FastAPI base"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
