"""
Serviço de negócio para denúncias.

Regras de negócio implementadas:
1. Validação de duplicatas (mesmo tipo e localização)
2. Cálculo automático de periculosidade
3. Transformação de modelos para responses

Nota: Toda lógica de negócio deve estar aqui, NÃO em rotas.
"""

import logging
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Denuncia
from app.services.denuncia_builder import DenunciaBuilder
from app.services.denuncia_repository import DenunciaRepository
from app.services.processador_crime_factory import ProcessadorCrimeFactory

logger = logging.getLogger("apolo.services.denuncia")


def _build_denuncia(payload: dict) -> Denuncia:
    """
    Constrói objeto Denuncia usando Builder pattern.
    
    Encadeia métodos para construção segura e validada.
    """
    builder = (
        DenunciaBuilder()
        .tipo(payload["tipo"])
        .descricao(payload["descricao"])
        .latitude(payload["latitude"])
        .longitude(payload["longitude"])
        .anonimo(payload.get("anonimo", False))
    )
    if payload.get("data_hora"):
        builder.data_hora(payload["data_hora"])
    
    denuncia = builder.build()
    logger.debug(f"Denuncia built: tipo={denuncia.tipo}, lat={denuncia.latitude}, lon={denuncia.longitude}")
    return denuncia


def _to_response(denuncia: Denuncia) -> dict:
    """
    Transforma modelo Denuncia para response serializable.
    
    Calcula periculosidade usando Factory pattern.
    """
    processador = ProcessadorCrimeFactory.criar(denuncia.tipo)
    
    response = {
        "id": denuncia.id,
        "tipo": denuncia.tipo,
        "descricao": denuncia.descricao,
        "latitude": denuncia.latitude,
        "longitude": denuncia.longitude,
        "anonimo": denuncia.anonimo,
        "data_hora": denuncia.data_hora,
        "nivel_periculosidade": processador.nivel_periculosidade(),
    }
    
    return response


def criar_denuncia(payload: dict, db: Session) -> dict:
    """
    Cria nova denúncia com validações.
    
    Validações:
    1. Campos obrigatórios presentes
    2. Sem duplicatas (mesmo tipo + localização)
    3. Builder valida dados antes de persistir
    
    Args:
        payload: dict com tipo, descricao, latitude, longitude, anonimo (opt), data_hora (opt)
        db: Sessão SQLAlchemy
        
    Returns:
        dict com resposta serializada
        
    Raises:
        HTTPException 409: Se denúncia duplicada
        HTTPException 500: Se erro interno
    """
    try:
        lat = payload["latitude"]
        lon = payload["longitude"]
        tipo = payload["tipo"]
        
        logger.info(f"Creating denuncia: tipo={tipo}, location=({lat}, {lon})")
        
        # Verificar duplicata
        if DenunciaRepository.buscar_duplicada(db, tipo, lat, lon):
            logger.warning(
                f"Duplicate denuncia attempt: tipo={tipo}, lat={lat}, lon={lon}"
            )
            raise HTTPException(
                status_code=409,
                detail="Duplicate report: same crime type and location already reported.",
            )
        
        # Construir e persistir
        denuncia = _build_denuncia(payload)
        saved = DenunciaRepository.salvar(db, denuncia)
        
        logger.info(f"Denuncia created successfully: id={saved.id}, tipo={saved.tipo}")
        return _to_response(saved)
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Validation error creating denuncia: {e}")
        raise HTTPException(
            status_code=422,
            detail=f"Invalid data: {str(e)}",
        )
    except Exception as e:
        logger.exception(f"Unexpected error creating denuncia: {e}", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail="Internal server error",
        )


def listar_denuncias(db: Session) -> list[dict]:
    """
    Lista todas as denúncias registradas.
    
    Returns:
        Lista de dicts com denúncias transformadas para response
    """
    try:
        logger.debug("Listing all denuncias")
        denuncias = DenunciaRepository.listar(db)
        
        responses = [_to_response(denuncia) for denuncia in denuncias]
        logger.info(f"Listed {len(responses)} denuncias")
        
        return responses
        
    except Exception as e:
        logger.exception(f"Error listing denuncias: {e}", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail="Internal server error",
        )


def deletar_denuncia(denuncia_id: int, db: Session) -> None:
    """
    Deleta denúncia por ID.
    
    Args:
        denuncia_id: ID da denúncia
        db: Sessão SQLAlchemy
        
    Raises:
        HTTPException 404: Se denúncia não encontrada
        HTTPException 500: Se erro ao deletar
    """
    try:
        logger.debug(f"Deleting denuncia: id={denuncia_id}")
        
        denuncia = DenunciaRepository.buscar_por_id(db, denuncia_id)
        if not denuncia:
            logger.warning(f"Denuncia not found for deletion: id={denuncia_id}")
            raise HTTPException(
                status_code=404,
                detail="Report not found",
            )
        
        DenunciaRepository.deletar(db, denuncia)
        logger.info(f"Denuncia deleted successfully: id={denuncia_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error deleting denuncia: {e}", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail="Internal server error",
        )
