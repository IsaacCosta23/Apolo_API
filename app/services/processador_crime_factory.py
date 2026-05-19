"""
Factory pattern para processadores de crime.

Cria instâncias de ProcessadorCrime baseado no tipo de crime.

Tipos suportados:
- Roubo (Alto risco)
- Furto (Médio risco)
- Agressão (Médio risco)
- Violência Sexual (Alto risco)
- Vandalismo (Médio risco)
- Tráfico de Drogas (Alto risco)
- Homicídio (Máximo risco)
- Tentativa de Homicídio (Máximo risco)
- Perturbação de Sossego (Baixo risco)

Normalizações aplicadas:
- Case-insensitive
- Suporta múltiplas variações (com/sem acento)
- Fallback para "Acidente" se tipo não reconhecido
"""

import logging

from app.services.processador_crime import (
    Acidente,
    Agressao,
    Furto,
    Homicidio,
    PerturbacaoSossego,
    ProcessadorCrime,
    Roubo,
    TentativaHomicidio,
    TraficodeDrogas,
    Vandalismo,
    ViolenciaSexual,
)

logger = logging.getLogger("apolo.services.factory")


class ProcessadorCrimeFactory:
    """Factory para criar processadores de crime específicos por tipo."""
    
    @staticmethod
    def criar(tipo: str) -> ProcessadorCrime:
        """
        Cria processador de crime apropriado para o tipo dado.
        
        Normaliza tipo (lowercase, sem acento) e mapeia para ProcessadorCrime.
        
        Args:
            tipo: Tipo de crime (string)
            
        Returns:
            ProcessadorCrime instância específica do tipo
            
        Nota: Tipos não reconhecidos retornam Acidente (fallback seguro)
        """
        tipo_normalizado = tipo.strip().lower()
        
        logger.debug(f"Creating processor for crime type: {tipo} -> {tipo_normalizado}")

        # Mapeamento tipo -> ProcessadorCrime
        if tipo_normalizado == "roubo":
            return Roubo()
        
        if tipo_normalizado == "furto":
            return Furto()
        
        if tipo_normalizado == "acidente":
            return Acidente()
        
        if tipo_normalizado in ["agressão", "agressao"]:
            return Agressao()
        
        if tipo_normalizado in ["violência sexual", "violencia sexual", "violencia-sexual"]:
            return ViolenciaSexual()
        
        if tipo_normalizado == "vandalismo":
            return Vandalismo()
        
        if tipo_normalizado in ["tráfico de drogas", "trafico de drogas", "tráfico", "trafico"]:
            return TraficodeDrogas()
        
        if tipo_normalizado in ["homicídio", "homicidio"]:
            return Homicidio()
        
        if tipo_normalizado in ["tentativa de homicídio", "tentativa de homicidio", "tentativa-homicidio"]:
            return TentativaHomicidio()
        
        if tipo_normalizado in ["perturbação de sossego", "perturbacao de sossego", "perturbacao-sossego"]:
            return PerturbacaoSossego()

        # Fallback para tipos não mapeados
        logger.warning(f"Unknown crime type, using default fallback: {tipo}")
        return Acidente()
