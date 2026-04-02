from app.services.processador_crime import Acidente, Furto, ProcessadorCrime, Roubo


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
        return Acidente()
