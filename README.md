# Agro MCP RAG Assistant

Sistema distribuído de suporte à decisão para **manejo inteligente de pragas agrícolas**, desenvolvido para a disciplina **GCC129 — Sistemas Distribuídos** (UFLA — Universidade Federal de Lavras).

Combina recuperação semântica de documentos técnicos (RAG), dados climáticos em tempo real (MCP) e geração de linguagem natural (LLM) para apoiar produtores rurais, técnicos agrícolas e agrônomos em decisões de manejo fitossanitário.

---

## O Problema

O Brasil é o maior consumidor de defensivos agrícolas do mundo (R$ 57 bilhões em 2023). Parte expressiva desse gasto é desperdiçada por:

- Identificação imprecisa de pragas sem acesso rápido às bulas AGROFIT e manuais Embrapa
- Aplicação fora da janela climática correta (antes de chuvas, em dias de vento forte)
- Tempo de resposta lento — uma consulta manual pode demorar horas enquanto pragas se alastram

---

## A Solução

Quando o usuário descreve um sintoma ou praga em linguagem natural, o sistema:

1. **RAG:** recupera os trechos técnicos mais relevantes de bulas AGROFIT e manuais Embrapa via busca semântica (ChromaDB + sentence-transformers)
2. **MCP Clima:** consulta automaticamente a previsão meteorológica (OpenWeatherMap) se a pergunta envolver janela climática
3. **LLM:** sintetiza tudo em uma resposta acessível, citando as fontes utilizadas

---

## Arquitetura

![Poster de arquitetura do sistema](docs/arquitetura/poster_arquitetura.svg)

### Propriedades de Sistemas Distribuídos atendidas

| Propriedade | Como é atendida |
|---|---|
| Transparência de Localização | Orquestrador acessa Ollama via URL ngrok sem conhecer a localização física da GPU |
| Transparência de Acesso | Gateway e Front operam via REST/SSE padrão, sem saber detalhes internos do Orquestrador |
| Tolerância a Falhas | Circuit Breaker (Resilience4j) no Gateway; Colab pode reiniciar sem perda do ChromaDB |
| Desacoplamento | MCP Clima em contêiner Docker isolado; substituível sem alterar o Orquestrador |
| Escalabilidade | Orquestrador stateless permite múltiplas instâncias atrás do Gateway |

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React + Vite + TypeScript + EventSource API (SSE nativo) | React 19 · Vite 8 · TS 6 |
| API Gateway | Java + Spring Boot + Resilience4j | Spring Boot 3.5 · Java 17 |
| Orquestrador | Python + FastAPI + LangChain Agent | Python 3.11+ |
| Vector Store | ChromaDB (local, persistência em disco) | — |
| Embeddings | sentence-transformers (offline, sem API externa) | — |
| Protocolo de Ferramentas | SDK `mcp` (Python) — protocolo MCP oficial | — |
| LLM | Ollama (Llama 3 / Mistral / Gemma) | — |
| Túnel | ngrok | — |
| Testes (front) | Vitest + Testing Library | Vitest 4 |
| Containerização | Docker Compose | 24+ |

---

## Pré-requisitos

| Ferramenta | Versão mínima | Para quê |
|---|---|---|
| Node.js | 20+ | Frontend React |
| Java | 17+ | API Gateway |
| Maven | 3.9+ | Build do Gateway |
| Docker + Docker Compose | 24+ | MCP Clima e demais serviços |
| Python | 3.11+ | Orquestrador e RAG |
| Conta Google | — | Notebook Colab com GPU T4 |
| Chave OpenWeatherMap | — | Dados climáticos em tempo real |
| Token ngrok | — | Túnel para o Ollama no Colab |

---

## Como Rodar

> Os serviços estão sendo implementados em fases. Rode apenas os componentes já disponíveis.

### 1. Variáveis de ambiente

Crie um arquivo `.env` na raiz (nunca commitar):

```env
OPENWEATHERMAP_API_KEY=sua_chave_aqui
NGROK_AUTHTOKEN=seu_token_aqui
OLLAMA_BASE_URL=https://<url-ngrok>/api/generate
```

### 2. Frontend (disponível)

```bash
cd front
npm install
npm run dev
# Acesse http://localhost:5173
```

O Vite faz proxy automático de `/api` → `http://localhost:8080` (Gateway). Certifique-se de que o Gateway está no ar antes de enviar perguntas.

Para rodar os testes do frontend:

```bash
cd front
npx vitest
```

### 3. API Gateway (estrutura disponível — endpoints em implementação)

```bash
cd gateway
./mvnw spring-boot:run
# Sobe na porta 8080
```

### 4. LLM no Google Colab (disponível)

Abra o notebook `notebooks/manejo-pragas-colab.ipynb` no Google Colab com GPU T4 habilitada. Ele instala o Ollama, baixa o modelo e expõe a porta via ngrok. Copie a URL gerada para `OLLAMA_BASE_URL` no `.env`.

### 5. Serviços completos (em implementação)

```bash
# Quando todos os serviços estiverem prontos:
docker compose up
```

---

## Contrato da API do Orquestrador

**`POST /consulta`**

```bash
curl -X POST http://localhost:8000/consulta \
  -H "Content-Type: application/json" \
  -d '{"pergunta": "Como tratar ferrugem asiática com chuva amanhã?"}'
```

```json
// Request
{
  "pergunta": "Como tratar ferrugem asiática com chuva amanhã?"
}

// Response
{
  "resposta": "Recomenda-se aguardar janela sem chuva por 6h após aplicação...",
  "fontes": [
    {
      "titulo": "Bula Azoxistrobina 250 SC — AGROFIT",
      "trecho": "Não aplicar quando chuvas são previstas nas próximas 4 horas.",
      "pagina": 3
    }
  ],
  "mcp_invocados": ["get_weather"]
}
```

O Gateway repassa esse contrato ao Front End via SSE (`GET /api/consulta?pergunta=`).

---

## Estrutura do Repositório

```
agro-mcp-rag-assistant/
├── front/                          # Frontend React 19 + Vite 8 + TypeScript 6
│   ├── src/
│   │   ├── components/             # ChatWindow, ChatInput, MessageBubble, WeatherCard, FontesChips, Header, EmptyState, RespostaDisplay
│   │   ├── hooks/
│   │   │   └── useConsultaRAG.ts   # SSE consumer — abre EventSource ao Gateway (/api/consulta)
│   │   └── types.ts                # Tipos do contrato /consulta
│   ├── vite.config.ts              # Proxy /api → localhost:8080, config Vitest
│   └── package.json
├── gateway/                        # API Gateway Spring Boot 3.5 + Java 17
│   ├── src/main/java/br/ufla/gcc129/gateway/
│   │   └── GatewayApplication.java
│   ├── src/main/resources/
│   │   └── application.properties
│   └── pom.xml                     # Spring Web, Actuator, Lombok
├── notebooks/
│   └── manejo-pragas-colab.ipynb   # Notebook Colab: instala Ollama, baixa modelo, expõe via ngrok
├── docs/
│   ├── negocio/
│   │   └── proposta-projeto.md     # Proposta, problema, requisitos e escopo por fase
│   ├── arquitetura/
│   │   ├── especificacao-arquitetura.md  # Especificação completa da arquitetura
│   │   └── poster_arquitetura.svg        # Poster do projeto
│   └── entregas/
│       └── relatorio-parcial.md    # Relatório da Fase 2
└── README.md
```

---

## Fases do Projeto

| Fase | Entregável | Status |
|---|---|---|
| Fase 1 | Proposta, especificação de arquitetura, poster | ✅ Concluída |
| Fase 2 | Notebook Colab (Ollama + ngrok), RAG, MCP Clima, Gateway, Front End, demo | 🔄 Em andamento |
| Fase 3 | Orquestração completa, serviços de escrita, mensageria (RabbitMQ), relatório final | ⏳ Pendente |

### Estado atual (Fase 2)

| Componente | Estado |
|---|---|
| Notebook Colab (Ollama + ngrok) | ✅ Concluído |
| Front End mínimo (React + SSE) | ✅ Concluído |
| API Gateway — endpoint SSE + Circuit Breaker | ⬜ Pendente |
| Pipeline RAG (ChromaDB + ingestão) | ⬜ Pendente |
| Orquestrador — `POST /consulta` | ⬜ Pendente |
| MCP Clima (Docker + OpenWeatherMap) | ⬜ Pendente |

---

## Equipe

Projeto acadêmico — GCC129 Sistemas Distribuídos  
**Professor:** Andre de Lima Salgado  
**Instituição:** UFLA — Universidade Federal de Lavras