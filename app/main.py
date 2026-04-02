import os

from fastapi import FastAPI

from app.database import Base, engine
from app.routes import denuncia_router

app = FastAPI()
Base.metadata.create_all(bind=engine)
app.include_router(denuncia_router)

@app.get("/")
def root():
    return {"message": "API Apolo CodexAI - FastAPI base"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
