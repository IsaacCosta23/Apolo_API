"""
Rotas de denúncias (Denuncia API endpoints).

Endpoints:
- POST /denuncias: Criar nova denúncia
- GET /denuncias: Listar todas as denúncias
- DELETE /denuncias/{id}: Deletar denúncia por ID
- GET /denuncias/tipos-crime: Listar tipos de crime válidos

Nota: Rotas NÃO contêm lógica de negócio.
Toda lógica deve estar em services/.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db_session
from app.schemas.denuncia import DenunciaCreate, DenunciaResponse
from app.services.denuncia_service import criar_denuncia, deletar_denuncia, listar_denuncias

router = APIRouter(prefix="/denuncias", tags=["denuncias"])


@router.post("", response_model=DenunciaResponse, status_code=201)
def criar_denuncia_route(
    denuncia: DenunciaCreate,
    db: Session = Depends(get_db_session),
):
    """
    Cria nova denúncia de crime.
    
    Validações:
    - Campos obrigatórios: tipo, descricao, latitude, longitude
    - Latitude: -90 a 90
    - Longitude: -180 a 180
    - Duplicatas: mesma localização e tipo não são aceitas
    
    Response: DenunciaResponse com id, tipo, localização, periculosidade calculada
    """
    return criar_denuncia(denuncia.dict(exclude_none=True), db)


@router.get("", response_model=list[DenunciaResponse])
def listar_denuncias_route(db: Session = Depends(get_db_session)):
    """
    Lista todas as denúncias registradas.
    
    Retorna lista completa com todas as denúncias do sistema.
    """
    return listar_denuncias(db)


@router.get("/tipos-crime", response_model=list[str])
def listar_tipos_crime_route():
    """
    Lista tipos de crime válidos no sistema.
    
    Mantém tipos centralizados para consistência entre frontend e backend.
    """
    return [
        "Roubo",
        "Furto",
        "Agressão",
        "Violência Sexual",
        "Vandalismo",
        "Tráfico de Drogas",
        "Homicídio",
        "Tentativa de Homicídio",
        "Perturbação de Sossego",
    ]


@router.delete("/{denuncia_id}", status_code=204)
def deletar_denuncia_route(
    denuncia_id: int,
    db: Session = Depends(get_db_session),
):
    """
    Deleta uma denúncia por ID.
    
    Response: 204 No Content se sucesso, 404 Not Found se não existe
    """
    deletar_denuncia(denuncia_id, db)
