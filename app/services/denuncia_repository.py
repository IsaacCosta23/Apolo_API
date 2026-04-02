from sqlalchemy.orm import Session
from app.models import Denuncia


class DenunciaRepository:
    @staticmethod
    def salvar(db: Session, denuncia: Denuncia) -> Denuncia:
        db.add(denuncia)
        db.commit()
        db.refresh(denuncia)
        return denuncia

    @staticmethod
    def buscar_por_id(db: Session, denuncia_id: int) -> Denuncia | None:
        return db.query(Denuncia).filter(Denuncia.id == denuncia_id).first()

    @staticmethod
    def buscar_duplicada(db: Session, tipo: str, latitude: float, longitude: float) -> Denuncia | None:
        return (
            db.query(Denuncia)
            .filter(
                Denuncia.tipo == tipo,
                Denuncia.latitude == latitude,
                Denuncia.longitude == longitude,
            )
            .first()
        )

    @staticmethod
    def deletar(db: Session, denuncia: Denuncia) -> None:
        db.delete(denuncia)
        db.commit()

    @staticmethod
    def listar(db: Session) -> list[Denuncia]:
        return db.query(Denuncia).all()
