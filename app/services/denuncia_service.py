import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Denuncia
from app.services.denuncia_builder import DenunciaBuilder
from app.services.denuncia_repository import DenunciaRepository
from app.services.processador_crime_factory import ProcessadorCrimeFactory

logger = logging.getLogger("apolo.denuncia_service")


def _build_denuncia(payload: dict) -> Denuncia:
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
    return builder.build()


def _to_response(denuncia: Denuncia) -> dict:
    processador = ProcessadorCrimeFactory.criar(denuncia.tipo)
    return {
        "id": denuncia.id,
        "tipo": denuncia.tipo,
        "descricao": denuncia.descricao,
        "latitude": denuncia.latitude,
        "longitude": denuncia.longitude,
        "anonimo": denuncia.anonimo,
        "data_hora": denuncia.data_hora,
        "nivel_periculosidade": processador.nivel_periculosidade(),
    }


def criar_denuncia(payload: dict, db: Session) -> dict:
    try:
        lat = payload["latitude"]
        lon = payload["longitude"]

        if DenunciaRepository.buscar_duplicada(
            db,
            payload["tipo"],
            lat,
            lon,
        ):
            raise HTTPException(
                status_code=409,
                detail="Denúncia duplicada: mesmo tipo e endereço já cadastrados.",
            )

        denuncia = _build_denuncia(payload)
        saved = DenunciaRepository.salvar(db, denuncia)
        return _to_response(saved)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro interno ao criar denúncia", exc_info=e)
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


def listar_denuncias(db: Session) -> list[dict]:
    denuncias = DenunciaRepository.listar(db)
    return [_to_response(denuncia) for denuncia in denuncias]


def deletar_denuncia(denuncia_id: int, db: Session) -> None:
    denuncia = DenunciaRepository.buscar_por_id(db, denuncia_id)
    if not denuncia:
        raise HTTPException(status_code=404, detail="Denúncia não encontrada")
    DenunciaRepository.deletar(db, denuncia)
