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

class Agressao(ProcessadorCrime):
    def nivel_periculosidade(self) -> str:
        return "Médio"

class ViolenciaSexual(ProcessadorCrime):
    def nivel_periculosidade(self) -> str:
        return "Alto"

class Vandalismo(ProcessadorCrime):
    def nivel_periculosidade(self) -> str:
        return "Médio"

class TraficodeDrogas(ProcessadorCrime):
    def nivel_periculosidade(self) -> str:
        return "Alto"

class Homicidio(ProcessadorCrime):
    def nivel_periculosidade(self) -> str:
        return "Máximo"

class TentativaHomicidio(ProcessadorCrime):
    def nivel_periculosidade(self) -> str:
        return "Máximo"

class PerturbacaoSossego(ProcessadorCrime):
    def nivel_periculosidade(self) -> str:
        return "Baixo"
