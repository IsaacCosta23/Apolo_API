"""
Schemas Pydantic para validação de dados de Denuncia.

Schemas definem contratos de API:
- DenunciaCreate: Input para criar nova denúncia
- DenunciaResponse: Output serializado de denúncia

Pydantic valida:
- Tipos de dados
- Ranges de valores (latitude/longitude)
- Campos obrigatórios
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class DenunciaCreate(BaseModel):
    """
    Schema para criação de nova denúncia.
    
    Validações:
    - tipo: string obrigatório
    - descricao: string obrigatório
    - latitude: float, range -90 a 90
    - longitude: float, range -180 a 180
    - anonimo: boolean, opcional (default: False)
    - data_hora: datetime, opcional (default: now)
    """
    
    tipo: str = Field(
        ...,
        description="Tipo de crime",
        example="Roubo"
    )
    
    descricao: str = Field(
        ...,
        description="Descrição do incidente",
        example="Roubo de bicicleta próximo à praça"
    )
    
    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
        description="Latitude da localização (-90 a 90)",
        example=-23.5505
    )
    
    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
        description="Longitude da localização (-180 a 180)",
        example=-46.6333
    )
    
    anonimo: bool = Field(
        False,
        description="Se denúncia é anônima",
        example=True
    )
    
    data_hora: datetime | None = Field(
        None,
        description="Timestamp do incidente (defaults para now)",
        example="2026-05-19T15:30:00"
    )


class DenunciaResponse(BaseModel):
    """
    Schema para resposta de denúncia.
    
    Retornado em:
    - POST /denuncias (criação)
    - GET /denuncias (listagem)
    
    Inclui campo calculado:
    - nivel_periculosidade: calculado com base no tipo (Factory pattern)
    """
    
    id: int = Field(
        ...,
        description="ID único da denúncia",
        example=1
    )
    
    tipo: str = Field(
        ...,
        description="Tipo de crime",
        example="Roubo"
    )
    
    descricao: str = Field(
        ...,
        description="Descrição do incidente",
        example="Roubo de bicicleta próximo à praça"
    )
    
    latitude: float = Field(
        ...,
        description="Latitude da localização",
        example=-23.5505
    )
    
    longitude: float = Field(
        ...,
        description="Longitude da localização",
        example=-46.6333
    )
    
    anonimo: bool = Field(
        ...,
        description="Se denúncia é anônima",
        example=True
    )
    
    data_hora: datetime = Field(
        ...,
        description="Timestamp da denúncia",
        example="2026-05-19T15:30:00"
    )
    
    nivel_periculosidade: str = Field(
        ...,
        description="Nível de risco calculado (Baixo/Médio/Alto/Máximo)",
        example="Alto"
    )

    model_config = ConfigDict(from_attributes=True)
