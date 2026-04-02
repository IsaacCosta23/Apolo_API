from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from app.database import Base
import datetime

class Denuncia(Base):
    __tablename__ = "denuncias"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    anonimo = Column(Boolean, default=False)
    data_hora = Column(DateTime, default=datetime.datetime.utcnow)
