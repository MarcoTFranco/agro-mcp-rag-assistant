# Relatório Parcial — Fase 2
## Manejo Inteligente de Pragas Agrícolas (GCC129 — Sistemas Distribuídos)

**Disciplina:** GCC129 — Sistemas Distribuídos  
**Professor:** Andre de Lima Salgado  
**Instituição:** UFLA — Universidade Federal de Lavras  
**Data:** Junho de 2026  

---

## 1. Resumo Executivo

Este relatório documenta o estado de desenvolvimento ao final da **Fase 2** do sistema distribuído de suporte ao manejo inteligente de pragas agrícolas. A Fase 2 cobre exclusivamente o **caminho de leitura (Query Path)**: o usuário envia uma pergunta em linguagem natural e recebe uma resposta gerada por LLM, fundamentada em documentação técnica oficial (AGROFIT/Embrapa) e enriquecida com dados climáticos em tempo real.

---

## 2. Estado de Implementação

| Componente | Estado | Observações |
|---|---|---|
| Notebook Colab (Ollama + ngrok) | ✅ Concluído | Instala Ollama, baixa modelo, expõe porta 11434 |
| Pipeline RAG (ingestão + consulta) | ✅ Concluído | ChromaDB local, sentence-transformers multilingual, chunking com overlap |
| Orquestrador — `POST /consulta` | ✅ Concluído | FastAPI + httpx, integra RAG e MCP via tool calling |
| MCP Clima (OpenWeatherMap) | ✅ Concluído | Contêiner Docker, SDK `mcp` Python, dual-mode (REST + MCP stdio) |
| API Gateway (Spring Boot + SSE) | ✅ Concluído | SseEmitter, RestClient, Resilience4j Circuit Breaker |
| Front End (React + SSE) | ✅ Concluído | fetch-event-source, WeatherCard com dados reais |
| Docker Compose com healthchecks | ✅ Concluído | Orquestração completa com readiness checks |
| Demo gravada | ⬜ Pendente | — |

---

## 3. Decisões Arquiteturais

### 3.1 Separação de Ambientes (Local vs. Google Colab)

**Decisão:** isolar completamente o servidor de inferência (Ollama) do restante da aplicação, rodando-o no Google Colab via GPU gratuita e expondo-o com ngrok.

**Justificativa:** o custo de uma GPU dedicada é proibitivo para um projeto acadêmico. O Colab oferece GPU T4 sem custo. A separação garante que uma reinicialização do Colab (que ocorre a cada ~12h) não cause perda de dados: o ChromaDB e o estado do Orquestrador permanecem no backend local.

**Propriedade SD visada:** Tolerância a Falhas — o sistema degrada graciosamente (sem inferência) mas não perde consistência de dados.

### 3.2 SSE em vez de WebSocket

**Decisão:** usar Server-Sent Events (SSE) para a comunicação Gateway → Front End.

**Justificativa:** o fluxo de resposta é estritamente unidirecional (servidor envia, cliente consome). SSE usa HTTP/1.1 nativo, não exige handshake de upgrade de protocolo e é compatível com intermediários HTTP (proxies, load balancers).

**Propriedade SD visada:** Transparência de Acesso — o Front End consome eventos padrão HTTP sem conhecer a topologia interna.

### 3.3 Tool Calling via LLM (MCP)

**Decisão:** a LLM decide autonomamente quando invocar ferramentas MCP. O Orquestrador envia a descrição das tools disponíveis junto com a mensagem, e o Ollama responde com `tool_calls` quando julga necessário consultar dados climáticos.

**Justificativa:** delegar a decisão de invocar tools à LLM elimina regras hardcoded de keyword matching, reduz falsos positivos e permite que o modelo extraia os parâmetros da ferramenta (ex: nome da cidade) diretamente da pergunta do usuário. Isso é aderente ao protocolo MCP, que padroniza a interface entre agentes LLM e ferramentas externas.

**Propriedade SD visada:** Desacoplamento — o MCP Clima pode ser substituído ou novas tools podem ser adicionadas sem alterar o Orquestrador; basta registrar a definição da tool na lista enviada à LLM.

### 3.4 Circuit Breaker no API Gateway

**Decisão:** aplicar o padrão Circuit Breaker (via Resilience4j) no Gateway para chamadas ao Orquestrador.

**Justificativa:** o Orquestrador depende de serviços remotos (Ollama via ngrok, MCP Clima). Se o Ollama estiver indisponível (Colab desligado), falhas se acumulariam. O Circuit Breaker abre o circuito após 50% de falhas em uma janela de 10 chamadas, retornando fallback imediato por 30 segundos — protegendo o Gateway de cascata de falhas.

**Propriedade SD visada:** Tolerância a Falhas — o sistema responde com mensagem de degradação em vez de travar ou acumular conexões pendentes.

### 3.5 Healthchecks e Readiness no Docker Compose

**Decisão:** configurar `healthcheck` em todos os serviços Docker e usar `depends_on: condition: service_healthy` para garantir ordem de inicialização.

**Justificativa:** `depends_on` padrão garante apenas que o contêiner iniciou, não que o serviço está pronto para receber conexões. Com healthchecks, o Orquestrador só inicia após o ChromaDB e o MCP Clima estarem respondendo, evitando erros de conexão transitórios na startup.

**Propriedade SD visada:** Disponibilidade — o sistema evita janelas de indisponibilidade durante inicialização.

---

## 4. Próximos Passos (Fase 3)

1. Gravar a demo do caminho de leitura completo (Fase 2).
2. Implementar serviços de escrita (cadastro de observações de campo).
3. Adicionar mensageria assíncrona (RabbitMQ) para desacoplar escrita da leitura.
4. Elaborar relatório final com análise de propriedades SD demonstradas.
