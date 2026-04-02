import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import Base, engine
from app.routes import denuncia_router

app = FastAPI()
Base.metadata.create_all(bind=engine)
app.include_router(denuncia_router)

# Montar arquivos estáticos a partir da pasta app, onde index.css/js estão localizados
static_dir = Path("app")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Rota dedicada para servir o favicon (usado automaticamente pelos navegadores)
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    favicon_path = Path(__file__).resolve().parent / "favicon" / "favicon.ico"
    return FileResponse(favicon_path)

@app.get("/")
async def read_root():
    return FileResponse(Path("app") / "index.html")

@app.get("/api")
def api_root():
    return {"message": "API Apolo CodexAI - FastAPI base"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
