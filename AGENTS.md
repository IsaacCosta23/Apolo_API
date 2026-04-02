# PROJETO: APOLO API

## VISÃO GERAL
API para monitoramento de denúncias de crimes geolocalizados, com foco em:
- segurança urbana
- geração de mapas de calor
- alertas em tempo real

A API será consumida por um aplicativo mobile.

---

## STACK TECNOLÓGICA
- FastAPI
- Python 3.11+
- SQLAlchemy (ORM)
- SQLite (MVP) → preparado para PostgreSQL
- Pydantic (validação)

---

## ARQUITETURA

O projeto deve seguir separação clara de responsabilidades:

app/
├── models/        # entidades do banco
├── schemas/       # validação e contratos (Pydantic)
├── routes/        # endpoints (camada HTTP)
├── services/      # regras de negócio
├── core/          # configs, utils e base
└── database.py    # conexão com banco

---

## REGRAS ARQUITETURAIS (OBRIGATÓRIAS)

1. Rotas NÃO podem conter lógica de negócio
2. Toda lógica deve estar em services
3. Models NÃO devem conter lógica complexa
4. Código deve ser modular e desacoplado
5. Sempre separar criação, processamento e persistência

---

## PADRÕES DE PROJETO (OBRIGATÓRIOS)

### Builder
- Usado para construção de denúncias
- Deve permitir encadeamento de métodos
- Deve centralizar a criação do objeto Denuncia

### Factory Method
- Usado para processar tipos de crime
- Cada tipo de crime deve ter um comportamento diferente
- Retornar nível de periculosidade

---

## REGRAS DE CÓDIGO

- Seguir princípios SOLID
- Aplicar DRY (Don't Repeat Yourself)
- Funções pequenas e claras
- Nomes descritivos
- Evitar ifs complexos (usar polimorfismo quando possível)

---

## OBJETIVO DO MVP

A API deve conter:

- CRUD de denúncias
- Cálculo básico de periculosidade
- Retorno estruturado de dados
- Código preparado para escalar

---

## BOAS PRÁTICAS

- Tipagem forte com Pydantic
- Uso de services para regras de negócio
- Preparar para futura autenticação
- Preparar para geolocalização avançada

---

## PROIBIÇÕES

- Não misturar camadas
- Não colocar lógica na rota
- Não criar código monolítico
- Não ignorar os padrões definidos

---

## COMPORTAMENTO ESPERADO DO CODEX

- Sempre seguir essa arquitetura
- Sempre aplicar os padrões definidos
- Sempre sugerir melhorias estruturais
- Sempre manter código limpo e escalável