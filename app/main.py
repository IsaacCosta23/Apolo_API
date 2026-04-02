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

# Montar arquivos estáticos a partir do diretório raiz do projeto
static_dir = Path(".")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

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
