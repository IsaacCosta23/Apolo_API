"""
Modelo de dados para Denuncia (Crime Report).

Mapeado para tabela 'denuncias' no banco de dados.

Compatível com:
- SQLite (desenvolvimento)
- PostgreSQL (Render, Supabase)
- PostGIS (para queries geoespaciais futuras)

Campos:
- id: Identificador único (autoincremento)
- tipo: Tipo de crime (string)
- descricao: Descrição do incidente
- latitude: Coordenada de latitude (-90 a 90)
- longitude: Coordenada de longitude (-180 a 180)
- anonimo: Indicador se denúncia é anônima
- data_hora: Timestamp de criação/incidente
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
import datetime

from app.database import Base


class Denuncia(Base):
    """Modelo de denúncia/relatório de crime."""
    
    __tablename__ = "denuncias"

    id = Column(Integer, primary_key=True, index=True)
    """Identificador único da denúncia."""
    
    tipo = Column(String, nullable=False)
    """Tipo de crime (Roubo, Furto, Homicídio, etc)."""
    
    descricao = Column(String, nullable=True)
    """Descrição detalhada do incidente."""
    
    latitude = Column(Float, nullable=False)
    """Latitude da localização do incidente."""
    
    longitude = Column(Float, nullable=False)
    """Longitude da localização do incidente."""
    
    anonimo = Column(Boolean, default=False)
    """Se True, denúncia é anônima."""
    
    data_hora = Column(DateTime, default=datetime.datetime.utcnow)
    """Timestamp de quando a denúncia foi registrada."""
    
    def __repr__(self) -> str:
        return (
            f"Denuncia(id={self.id}, tipo={self.tipo}, "
            f"loc=({self.latitude},{self.longitude}), "
            f"anonimo={self.anonimo})"
        )
