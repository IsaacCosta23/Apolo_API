"""
Builder pattern para construção de Denuncia.

Implementa o Builder pattern para construção segura de objetos Denuncia.

Características:
- Encadeamento de métodos (fluent interface)
- Validação de campos obrigatórios na construção
- Defaults sensatos

Exemplo de uso:
```python
denuncia = (
    DenunciaBuilder()
    .tipo("Roubo")
    .descricao("Roubo de bicicleta")
    .latitude(-23.5505)
    .longitude(-46.6333)
    .anonimo(True)
    .build()
)
```
"""

import logging
from datetime import datetime

from app.models import Denuncia

logger = logging.getLogger("apolo.services.builder")


class DenunciaBuilder:
    """Construtor seguro para Denuncia com validações."""
    
    def __init__(self):
        """Inicializa builder com valores padrão."""
        self._tipo = None
        self._descricao = None
        self._latitude = None
        self._longitude = None
        self._anonimo = False
        self._data_hora = datetime.utcnow()

    def tipo(self, tipo: str):
        """Define tipo de crime."""
        self._tipo = tipo
        return self

    def descricao(self, descricao: str):
        """Define descrição do incidente."""
        self._descricao = descricao
        return self

    def latitude(self, latitude: float):
        """Define latitude (-90 a 90)."""
        self._latitude = latitude
        return self

    def longitude(self, longitude: float):
        """Define longitude (-180 a 180)."""
        self._longitude = longitude
        return self

    def anonimo(self, anonimo: bool):
        """Define se denúncia é anônima."""
        self._anonimo = anonimo
        return self

    def data_hora(self, data_hora: datetime):
        """Define timestamp (defaults para UTC now)."""
        self._data_hora = data_hora
        return self

    def build(self) -> Denuncia:
        """
        Constrói objeto Denuncia validando campos obrigatórios.
        
        Campos obrigatórios: tipo, descricao, latitude, longitude
        
        Returns:
            Denuncia construído
            
        Raises:
            ValueError: Se campo obrigatório estiver vazio
        """
        if None in (self._tipo, self._descricao, self._latitude, self._longitude):
            raise ValueError(
                "Required fields not filled: "
                "tipo, descricao, latitude, longitude"
            )
        
        logger.debug(f"Building Denuncia: tipo={self._tipo}")
        
        return Denuncia(
            tipo=self._tipo,
            descricao=self._descricao,
            latitude=self._latitude,
            longitude=self._longitude,
            anonimo=self._anonimo,
            data_hora=self._data_hora,
        )
