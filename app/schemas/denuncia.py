from pydantic import BaseModel
from datetime import datetime

class DenunciaCreate(BaseModel):
    tipo: str
    descricao: str
    endereco: str
    anonimo: bool = False
    data_hora: datetime | None = None

class DenunciaResponse(BaseModel):
    id: int
    tipo: str
    descricao: str
    latitude: float
    longitude: float
    anonimo: bool
    data_hora: datetime
    nivel_periculosidade: str

    class Config:
        orm_mode = True
