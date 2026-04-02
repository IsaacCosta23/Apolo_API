from app.models import Denuncia
from datetime import datetime

class DenunciaBuilder:
    def __init__(self):
        self._tipo = None
        self._descricao = None
        self._latitude = None
        self._longitude = None
        self._anonimo = False
        self._data_hora = datetime.utcnow()

    def tipo(self, tipo: str):
        self._tipo = tipo
        return self

    def descricao(self, descricao: str):
        self._descricao = descricao
        return self

    def latitude(self, latitude: float):
        self._latitude = latitude
        return self

    def longitude(self, longitude: float):
        self._longitude = longitude
        return self

    def anonimo(self, anonimo: bool):
        self._anonimo = anonimo
        return self

    def data_hora(self, data_hora: datetime):
        self._data_hora = data_hora
        return self

    def build(self) -> Denuncia:
        if None in (self._tipo, self._descricao, self._latitude, self._longitude):
            raise ValueError("Campos obrigatórios não preenchidos")
        return Denuncia(
            tipo=self._tipo,
            descricao=self._descricao,
            latitude=self._latitude,
            longitude=self._longitude,
            anonimo=self._anonimo,
            data_hora=self._data_hora
        )
