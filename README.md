# APOLO API

<p align="center">
  <img src="app/frontend/logo.png" alt="Logo do projeto Apolo API" width="180" />
</p>

<p align="center">
  <strong>Monitoramento de denúncias geolocalizadas para ampliar a percepção de risco urbano.</strong>
</p>

<p align="center">
  Projeto acadêmico e social construído para ajudar pessoas a identificarem áreas potencialmente perigosas,
  visualizarem padrões de risco no mapa e tomarem decisões mais seguras no dia a dia.
</p>

---

## Sobre o projeto

O **Apolo API** nasceu com uma proposta simples, mas muito relevante: usar tecnologia para transformar denúncias geolocalizadas em informação acessível, visual e útil para a população.

Em muitas cidades, o risco está espalhado pelo território, mas nem sempre ele é percebido com clareza. Uma rua aparentemente tranquila pode concentrar ocorrências de roubo, agressão ou violência, e a população muitas vezes só descobre isso quando já está exposta ao perigo.

Nosso objetivo com este projeto é justamente **reduzir essa distância entre o acontecimento e a percepção do risco**.

Ao registrar denúncias com localização e tipo de ocorrência, o sistema consegue:

- organizar informações de segurança urbana;
- calcular um nível básico de periculosidade;
- exibir os dados de forma visual em mapa;
- destacar regiões com maior concentração de ocorrências;
- contribuir para escolhas mais seguras de deslocamento e permanência.

Em outras palavras, o projeto busca **alertar a população sobre localidades com maior histórico de risco**, para que as pessoas possam evitar situações perigosas e se deslocar com mais consciência.

---

## Problema que o projeto busca resolver

Pessoas circulam diariamente por bairros, ruas e regiões sem qualquer indicação clara sobre o histórico recente de risco daquele local.

Esse cenário gera problemas como:

- baixa percepção de áreas perigosas;
- dificuldade para identificar padrões de violência;
- ausência de visualização intuitiva para apoiar decisões;
- pouca integração entre denúncia, localização e interpretação visual.

O **Apolo API** foi pensado para atacar esse problema a partir de uma base moderna e escalável, preparada para servir um aplicativo mobile e futuras evoluções do sistema.

---

## Objetivo do MVP

O MVP do projeto entrega uma base sólida com:

- CRUD de denúncias;
- classificação básica de periculosidade por tipo de crime;
- dados estruturados para consumo por frontend/mobile;
- visualização geográfica com mapa e heatmap;
- arquitetura organizada para crescimento futuro.

---

## Impacto social pretendido

Mais do que cadastrar ocorrências, este projeto tem um propósito social.

Queremos que a tecnologia seja usada como ferramenta de prevenção. Quando uma pessoa visualiza no mapa que uma área concentra registros de risco, ela passa a ter mais contexto para:

- evitar trajetos perigosos;
- redobrar a atenção em determinadas regiões;
- compreender melhor o comportamento de risco da cidade;
- apoiar uma cultura de prevenção e cuidado coletivo.

O mapa de calor não existe apenas para “mostrar pontos”. Ele existe para **traduzir denúncias em percepção visual de perigo**, facilitando a leitura até para quem não tem familiaridade com dados técnicos.

---

## Principais funcionalidades

- Cadastro de denúncias com:
  - tipo de crime;
  - descrição;
  - latitude;
  - longitude;
  - opção de anonimato;
  - data e hora.
- Listagem de denúncias registradas.
- Remoção de denúncias.
- Classificação de periculosidade por tipo de crime.
- Exposição de tipos de crime válidos para integração com frontend.
- Interface web com mapa interativo em Leaflet.
- Heatmap com `Leaflet.heat` para destacar áreas de influência e concentração de ocorrências.

---

## Tecnologias utilizadas

### Backend

- **FastAPI**
- **Python 3.11+**
- **SQLAlchemy**
- **Pydantic**
- **SQLite** no MVP
- **PostgreSQL-ready** para evolução futura

### Frontend integrado

- **HTML**
- **CSS**
- **JavaScript**
- **Leaflet**
- **Leaflet.heat**

---

## Arquitetura do projeto

O projeto segue uma separação clara de responsabilidades, priorizando manutenção, escalabilidade e limpeza de código.

```text
app/
├── models/        # entidades do banco
├── schemas/       # contratos e validações com Pydantic
├── routes/        # camada HTTP
├── services/      # regras de negócio
├── core/          # configs e utilidades
└── database.py    # conexão com banco
```

### Princípios adotados

- rotas sem lógica de negócio;
- regras centralizadas em `services`;
- models enxutos;
- código modular e desacoplado;
- separação entre criação, processamento e persistência;
- base preparada para futuras expansões.

---

## Padrões de projeto aplicados

### Builder

O padrão **Builder** foi utilizado na construção de denúncias.

Isso permite:

- criação encadeada do objeto;
- validação de campos obrigatórios antes da persistência;
- centralização da montagem da entidade `Denuncia`.

Arquivo relacionado:

- [app/services/denuncia_builder.py](c:\Isaac área de trabalho\Faculdade\Projeto Apolo CodexAI\Apolo_API\app\services\denuncia_builder.py)

### Factory Method

O padrão **Factory Method** foi usado para selecionar o processador adequado de acordo com o tipo de crime.

Cada processador retorna um comportamento específico, neste caso o **nível de periculosidade** da ocorrência.

Isso facilita:

- extensão para novos tipos de crime;
- redução de lógica condicional espalhada;
- maior aderência a SOLID e polimorfismo.

Arquivos relacionados:

- [app/services/processador_crime_factory.py](c:\Isaac área de trabalho\Faculdade\Projeto Apolo CodexAI\Apolo_API\app\services\processador_crime_factory.py)
- [app/services/processador_crime.py](c:\Isaac área de trabalho\Faculdade\Projeto Apolo CodexAI\Apolo_API\app\services\processador_crime.py)

---

## Fluxo da aplicação

1. O usuário envia uma denúncia com tipo, descrição e localização.
2. A rota recebe a requisição e delega o processamento para a camada de serviço.
3. O serviço usa o `DenunciaBuilder` para montar a entidade.
4. O serviço verifica duplicidade antes de persistir.
5. A denúncia é salva pelo repositório.
6. O `ProcessadorCrimeFactory` identifica o tipo de crime.
7. O sistema retorna a denúncia com o nível de periculosidade calculado.
8. O frontend consome esses dados e renderiza pontos e heatmap no mapa.

---

## Endpoints principais

### `GET /`

Serve a interface principal do projeto.

### `GET /api`

Endpoint simples de verificação da API.

Resposta esperada:

```json
{
  "message": "API Apolo CodexAI - FastAPI base"
}
```

### `GET /denuncias`

Lista todas as denúncias cadastradas.

### `POST /denuncias`

Cria uma nova denúncia.

Exemplo de payload:

```json
{
  "tipo": "Roubo",
  "descricao": "Assalto em via pública próximo ao ponto de ônibus.",
  "latitude": -8.057,
  "longitude": -34.879,
  "anonimo": true
}
```

### `DELETE /denuncias/{denuncia_id}`

Remove uma denúncia pelo ID.

### `GET /denuncias/tipos-crime`

Retorna os tipos de crime aceitos pelo sistema.

---

## Como executar localmente

### 1. Clonar o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd Apolo_API
```

### 2. Criar e ativar um ambiente virtual

No Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
```

### 3. Instalar as dependências

```bash
pip install -r requirements.txt
```

### 4. Executar a aplicação

```bash
uvicorn app.main:app --reload
```

### 5. Acessar no navegador

- Aplicação web: `http://127.0.0.1:8000/`
- Documentação automática: `http://127.0.0.1:8000/docs`
- Redoc: `http://127.0.0.1:8000/redoc`

---

## Estrutura de dados da denúncia

De forma geral, cada denúncia contém:

- `id`
- `tipo`
- `descricao`
- `latitude`
- `longitude`
- `anonimo`
- `data_hora`
- `nivel_periculosidade`

Essa estrutura foi pensada para ser simples no MVP e flexível para expansões futuras.

---

## Visualização com mapa e heatmap

O projeto utiliza **Leaflet** para o mapa interativo e **Leaflet.heat** para o mapa de calor.

Essa escolha foi importante porque a proposta do projeto não é apenas armazenar denúncias, mas também:

- comunicar risco de forma visual;
- ampliar a percepção espacial dos registros;
- permitir leitura intuitiva de regiões críticas;
- tornar a informação mais acessível para qualquer usuário.

Quando várias denúncias se concentram em uma região, o heatmap evidencia essa densidade visualmente. Isso ajuda o usuário a entender com rapidez quais áreas merecem mais atenção.

---

## Boas práticas adotadas

- tipagem forte com Pydantic;
- separação entre camadas;
- services como núcleo da regra de negócio;
- organização voltada para escalabilidade;
- base pronta para futura autenticação;
- estrutura compatível com evolução para geolocalização avançada;
- código mais limpo com foco em manutenção.

---

## Possíveis evoluções futuras

Este projeto foi estruturado para crescer. Algumas melhorias futuras possíveis:

- autenticação e perfis de usuário;
- filtros por período, tipo de crime e região;
- integração com PostgreSQL em produção;
- geração avançada de mapas de calor;
- alertas em tempo real;
- clusterização geográfica;
- análise histórica por bairro;
- painel analítico para órgãos públicos;
- integração com aplicativo mobile completo.

---

## Por que esse projeto importa?

Porque informação salva tempo, melhora decisões e pode ajudar a evitar riscos.

O **Apolo API** representa a ideia de que dados bem organizados e bem visualizados podem contribuir para uma cidade mais consciente, preventiva e segura. Ao transformar denúncias em mapas interpretáveis, o projeto ajuda a população a enxergar melhor os perigos do espaço urbano e agir com mais cuidado.

---

## Organização do repositório

- [app/main.py](c:\Isaac área de trabalho\Faculdade\Projeto Apolo CodexAI\Apolo_API\app\main.py): inicialização da aplicação FastAPI
- [app/routes/denuncia.py](c:\Isaac área de trabalho\Faculdade\Projeto Apolo CodexAI\Apolo_API\app\routes\denuncia.py): endpoints HTTP
- [app/services/denuncia_service.py](c:\Isaac área de trabalho\Faculdade\Projeto Apolo CodexAI\Apolo_API\app\services\denuncia_service.py): regras de negócio
- [app/services/denuncia_builder.py](c:\Isaac área de trabalho\Faculdade\Projeto Apolo CodexAI\Apolo_API\app\services\denuncia_builder.py): Builder de denúncias
- [app/services/processador_crime_factory.py](c:\Isaac área de trabalho\Faculdade\Projeto Apolo CodexAI\Apolo_API\app\services\processador_crime_factory.py): Factory de processadores
- [app/services/processador_crime.py](c:\Isaac área de trabalho\Faculdade\Projeto Apolo CodexAI\Apolo_API\app\services\processador_crime.py): classes de periculosidade por tipo
- [app/frontend/index.html](c:\Isaac área de trabalho\Faculdade\Projeto Apolo CodexAI\Apolo_API\app\frontend\index.html): interface web
- [app/frontend/static/script.js](c:\Isaac área de trabalho\Faculdade\Projeto Apolo CodexAI\Apolo_API\app\frontend\static\script.js): comportamento do mapa e integração com a API

---

## Autores

Projeto desenvolvido no contexto acadêmico como iniciativa de estudo, arquitetura de software e aplicação prática de tecnologia para segurança urbana.

Se este repositório for publicado no GitHub, vale complementar esta seção com:

- nomes dos integrantes;
- instituição;
- disciplina;
- semestre;
- professor orientador.

---

## Licença

Defina aqui a licença do projeto caso desejem publicar e distribuir oficialmente o código.

Sugestões comuns:

- MIT
- Apache-2.0
- GPL-3.0

---

## Mensagem final

Este projeto não foi criado apenas para cumprir um requisito técnico. Ele foi pensado para mostrar como desenvolvimento de software, arquitetura bem definida e visualização de dados podem se unir para gerar impacto real.

Se uma pessoa conseguir evitar uma área de risco porque o sistema deixou esse perigo mais visível, então a proposta do projeto já faz sentido.
