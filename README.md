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

O sistema é dividido em dois ambientes de execução com responsabilidades isoladas:

```
Backend Local                          Google Colab (GPU)
─────────────────────────────────      ───────────────────
Front End (React + SSE)                ngrok (túnel HTTP)
    │                                       │
API Gateway (Spring Boot)              Ollama (Llama 3 / Mistral)
    │
Orquestrador (LangChain Agent)
    ├── RAG Pipeline (ChromaDB)  ◄── Bulas AGROFIT + Manuais Embrapa
    └── MCP Clima (Docker)       ◄── OpenWeatherMap API
```

**Por que dois ambientes?** O Google Colab oferece GPU T4 gratuita para inferência do LLM. O ngrok expõe a porta do Ollama como URL pública, resolvendo a ausência de IP estático. Separar os ambientes garante que uma reinicialização do Colab (a cada ~12h) não cause perda de dados: o ChromaDB e o estado do Orquestrador permanecem no backend local.

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

| Camada | Tecnologia |
|---|---|
| Frontend | React + EventSource API (SSE nativo) |
| API Gateway | Java + Spring Boot + Resilience4j |
| Orquestrador | Python + LangChain Agent |
| Vector Store | ChromaDB (local, persistência em disco) |
| Embeddings | sentence-transformers (offline, sem API externa) |
| Protocolo de Ferramentas | SDK `mcp` (Python) — protocolo MCP oficial |
| LLM | Ollama (Llama 3 / Mistral / Gemma) |
| Túnel | ngrok |
| Containerização | Docker Compose |

---

## Contrato da API do Orquestrador

**`POST /consulta`**

```json
// Request
{
  "pergunta": "Como tratar ferrugem asiática com chuva amanhã?"
}

// Response
{
  "resposta": "string",
  "fontes": [
    {
      "titulo": "string",
      "trecho": "string",
      "pagina": 0
    }
  ],
  "mcp_invocados": ["get_weather"]
}
```

---

## Estrutura do Repositório

```
agro-mcp-rag-assistant/
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
| Fase 1 | Proposta, especificação de arquitetura, poster | Concluída |
| Fase 2 | Notebook Colab (Ollama + ngrok), RAG, MCP Clima, Gateway, Front End, demo | Em andamento |
| Fase 3 | Orquestração completa, serviços de escrita, mensageria (RabbitMQ), relatório final | Pendente |

### Estado atual (Fase 2)

| Componente | Estado |
|---|---|
| Notebook Colab (Ollama + ngrok) | ✅ Concluído |
| Pipeline RAG (ChromaDB + ingestão) | ⬜ Pendente |
| Orquestrador — `POST /consulta` | ⬜ Pendente |
| MCP Clima (Docker + OpenWeatherMap) | ⬜ Pendente |
| API Gateway (Spring Boot + SSE) | ⬜ Pendente |
| Front End mínimo (React + SSE) | ✅ Concluído |
| Demo gravada | ⬜ Pendente |

---

## Configuração

> Instruções detalhadas serão adicionadas conforme os componentes forem implementados.

**Variáveis de ambiente necessárias (`.env` — nunca commitar):**

```env
OPENWEATHERMAP_API_KEY=sua_chave
NGROK_AUTHTOKEN=seu_token
OLLAMA_BASE_URL=https://<url-ngrok>/api/generate
```

---

## Equipe

Projeto acadêmico — GCC129 Sistemas Distribuídos  
**Professor:** Andre de Lima Salgado  
**Instituição:** UFLA — Universidade Federal de Lavras  
