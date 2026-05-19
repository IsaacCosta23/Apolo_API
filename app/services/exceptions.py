"""
Exceções customizadas da aplicação.

Padrão de erros estruturados para melhor tratamento e logging.
"""


class DenunciaNotFound(Exception):
    """Exceção lançada quando uma denúncia não é encontrada."""
    
    def __init__(self, denuncia_id: int):
        self.denuncia_id = denuncia_id
        super().__init__(f"Denuncia not found: id={denuncia_id}")


class DuplicateDenuncia(Exception):
    """Exceção lançada quando uma denúncia duplicada é detectada."""
    
    def __init__(self, tipo: str, latitude: float, longitude: float):
        self.tipo = tipo
        self.latitude = latitude
        self.longitude = longitude
        super().__init__(
            f"Duplicate denuncia: tipo={tipo}, location=({latitude}, {longitude})"
        )


class InvalidDenunciaData(Exception):
    """Exceção lançada quando dados de denúncia são inválidos."""
    
    def __init__(self, message: str, field: str = None):
        self.field = field
        super().__init__(message)


class DatabaseError(Exception):
    """Exceção lançada quando há erro de conexão/operação com banco."""
    
    def __init__(self, message: str, original_error: Exception = None):
        self.original_error = original_error
        super().__init__(message)
