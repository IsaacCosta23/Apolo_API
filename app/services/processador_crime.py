"""
Processadores de crime com cálculo de periculosidade.

Implementa Strategy pattern para calcular nível de risco por tipo de crime.

Níveis de periculosidade:
- Baixo: Perturbações menores (perturbação de sossego, etc)
- Médio: Crimes contra propriedade (furto, vandalismo) e agressões leves
- Alto: Crimes violentos (roubo, violência sexual, tráfico)
- Máximo: Crimes extremos (homicídio)

Nota: Este é um cálculo simplificado. Em produção, consideraria:
- Histórico de crimes na área
- Horário do dia
- Tipo de arma usada
- Perfil de vítima
"""

import logging
from abc import ABC, abstractmethod

logger = logging.getLogger("apolo.services.crime")


class ProcessadorCrime(ABC):
    """Classe abstrata para processadores de crime."""
    
    @abstractmethod
    def nivel_periculosidade(self) -> str:
        """Retorna nível de periculosidade do crime."""
        pass


class Roubo(ProcessadorCrime):
    """Processador para crimes de Roubo."""
    
    def nivel_periculosidade(self) -> str:
        """Roubo: Alto risco (geralmente envolve violência/ameaça)."""
        return "Alto"


class Furto(ProcessadorCrime):
    """Processador para crimes de Furto."""
    
    def nivel_periculosidade(self) -> str:
        """Furto: Médio risco (crime contra propriedade, sem violência)."""
        return "Médio"


class Acidente(ProcessadorCrime):
    """Processador para Acidentes."""
    
    def nivel_periculosidade(self) -> str:
        """Acidente: Baixo risco (não é crime)."""
        return "Baixo"


class Agressao(ProcessadorCrime):
    """Processador para crimes de Agressão."""
    
    def nivel_periculosidade(self) -> str:
        """Agressão: Médio risco (violência interpessoal)."""
        return "Médio"


class ViolenciaSexual(ProcessadorCrime):
    """Processador para crimes de Violência Sexual."""
    
    def nivel_periculosidade(self) -> str:
        """Violência Sexual: Alto risco (crime grave contra pessoa)."""
        return "Alto"


class Vandalismo(ProcessadorCrime):
    """Processador para crimes de Vandalismo."""
    
    def nivel_periculosidade(self) -> str:
        """Vandalismo: Médio risco (dano à propriedade)."""
        return "Médio"


class TraficodeDrogas(ProcessadorCrime):
    """Processador para crimes de Tráfico de Drogas."""
    
    def nivel_periculosidade(self) -> str:
        """Tráfico: Alto risco (crime organizado, pode envolver violência)."""
        return "Alto"


class Homicidio(ProcessadorCrime):
    """Processador para crimes de Homicídio."""
    
    def nivel_periculosidade(self) -> str:
        """Homicídio: Máximo risco (crime mais grave)."""
        return "Máximo"


class TentativaHomicidio(ProcessadorCrime):
    """Processador para crimes de Tentativa de Homicídio."""
    
    def nivel_periculosidade(self) -> str:
        """Tentativa de Homicídio: Máximo risco (crime muito grave)."""
        return "Máximo"


class PerturbacaoSossego(ProcessadorCrime):
    """Processador para crimes de Perturbação de Sossego."""
    
    def nivel_periculosidade(self) -> str:
        """Perturbação de Sossego: Baixo risco (crime menor)."""
        return "Baixo"
