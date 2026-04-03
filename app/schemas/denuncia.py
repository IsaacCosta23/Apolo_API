from pydantic import BaseModel, Field
from datetime import datetime

class DenunciaCreate(BaseModel):
    tipo: str
    descricao: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
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
