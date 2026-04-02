from abc import ABC, abstractmethod

class ProcessadorCrime(ABC):
    @abstractmethod
    def nivel_periculosidade(self) -> str:
        pass

class Roubo(ProcessadorCrime):
    def nivel_periculosidade(self) -> str:
        return "Alto"

class Furto(ProcessadorCrime):
    def nivel_periculosidade(self) -> str:
        return "Médio"

class Acidente(ProcessadorCrime):
    def nivel_periculosidade(self) -> str:
        return "Baixo"
