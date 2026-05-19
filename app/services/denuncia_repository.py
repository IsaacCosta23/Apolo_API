"""
Repositório de acesso a dados para Denuncia.

Implementa Repository pattern para isolar operações de banco de dados.
Todas as queries devem estar aqui, NÃO nos services.

Operações suportadas:
- CRUD: Create, Read, Update, Delete
- Validações: buscar duplicadas
- Listagem: obter todas as denúncias
"""

import logging
from sqlalchemy.orm import Session

from app.models import Denuncia

logger = logging.getLogger("apolo.services.repository")


class DenunciaRepository:
    """Repository para operações de Denuncia com banco de dados."""
    
    @staticmethod
    def salvar(db: Session, denuncia: Denuncia) -> Denuncia:
        """
        Persiste nova denúncia no banco.
        
        Args:
            db: Sessão SQLAlchemy
            denuncia: Objeto Denuncia a ser persistido
            
        Returns:
            Denuncia persistido com ID atribuído
        """
        db.add(denuncia)
        db.commit()
        db.refresh(denuncia)
        logger.debug(f"Denuncia saved: id={denuncia.id}")
        return denuncia

    @staticmethod
    def buscar_por_id(db: Session, denuncia_id: int) -> Denuncia | None:
        """
        Busca denúncia por ID.
        
        Args:
            db: Sessão SQLAlchemy
            denuncia_id: ID da denúncia
            
        Returns:
            Denuncia se encontrado, None caso contrário
        """
        return db.query(Denuncia).filter(Denuncia.id == denuncia_id).first()

    @staticmethod
    def buscar_duplicada(
        db: Session,
        tipo: str,
        latitude: float,
        longitude: float,
    ) -> Denuncia | None:
        """
        Verifica se já existe denúncia do mesmo tipo na mesma localização.
        
        Regra de negócio: Evitar denúncias duplicadas (mesmo tipo + local)
        
        Args:
            db: Sessão SQLAlchemy
            tipo: Tipo de crime
            latitude: Latitude da localização
            longitude: Longitude da localização
            
        Returns:
            Denuncia duplicada se encontrada, None caso contrário
        """
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
        """
        Deleta denúncia do banco.
        
        Args:
            db: Sessão SQLAlchemy
            denuncia: Objeto Denuncia a ser deletado
        """
        db.delete(denuncia)
        db.commit()
        logger.debug(f"Denuncia deleted: id={denuncia.id}")

    @staticmethod
    def listar(db: Session) -> list[Denuncia]:
        """
        Lista todas as denúncias.
        
        Args:
            db: Sessão SQLAlchemy
            
        Returns:
            Lista de todos os Denuncia cadastrados
        """
        return db.query(Denuncia).all()
