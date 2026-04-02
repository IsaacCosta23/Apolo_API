from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.schemas.denuncia import DenunciaCreate, DenunciaResponse
from app.services.denuncia_service import criar_denuncia, deletar_denuncia, listar_denuncias

router = APIRouter(prefix="/denuncias", tags=["denuncias"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", response_model=DenunciaResponse)
def criar_denuncia_route(denuncia: DenunciaCreate, db: Session = Depends(get_db)):
    return criar_denuncia(denuncia.dict(exclude_none=True), db)

@router.get("", response_model=list[DenunciaResponse])
def listar_denuncias_route(db: Session = Depends(get_db)):
    return listar_denuncias(db)

@router.delete("/{denuncia_id}", status_code=204)
def deletar_denuncia_route(denuncia_id: int, db: Session = Depends(get_db)):
    deletar_denuncia(denuncia_id, db)
