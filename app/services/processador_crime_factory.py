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


class ProcessadorCrimeFactory:
    @staticmethod
    def criar(tipo: str) -> ProcessadorCrime:
        tipo_normalizado = tipo.strip().lower()

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

        # padrão para tipos não mapeados
        return Acidente()
