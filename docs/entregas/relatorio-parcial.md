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
| Notebook Colab (Ollama + ngrok) | ⬜ Pendente | Instala Ollama, baixa modelo, expõe porta 11434 |
| Pipeline RAG (ingestão + consulta) | ⬜ Pendente | ChromaDB local, sentence-transformers |
| Orquestrador — `POST /consulta` | ⬜ Pendente | LangChain Agent, integra RAG e MCP |
| MCP Clima (OpenWeatherMap) | ⬜ Pendente | Contêiner Docker, SDK `mcp` Python |
| API Gateway (Spring Boot + SSE) | ⬜ Pendente | SseEmitter, borda do sistema |
| Front End mínimo (React + SSE) | ⬜ Pendente | EventSource, WeatherCard condicional |
| Demo gravada | ⬜ Pendente | — |

> *Atualizar esta tabela conforme cada item for concluído.*

---

## 3. Decisões Arquiteturais Planejadas

As decisões abaixo refletem o design previsto com base na especificação de arquitetura atual. Estão sujeitas a ajustes durante a implementação.

### 3.1 Separação de Ambientes (Local vs. Google Colab)

**Decisão planejada:** isolar completamente o servidor de inferência (Ollama) do restante da aplicação, rodando-o no Google Colab via GPU gratuita e expondo-o com ngrok.

**Justificativa:** o custo de uma GPU dedicada é proibitivo para um projeto acadêmico. O Colab oferece GPU T4 sem custo. A separação garante que uma reinicialização do Colab (que ocorre a cada ~12h) não cause perda de dados: o ChromaDB e o estado do Orquestrador permanecem no backend local.

**Propriedade SD visada:** Tolerância a Falhas — o sistema degrada graciosamente (sem inferência) mas não perde consistência de dados.

### 3.2 SSE em vez de WebSocket

**Decisão planejada:** usar Server-Sent Events (SSE) para a comunicação Gateway → Front End.

**Justificativa:** o fluxo de resposta é estritamente unidirecional (servidor envia, cliente consome). SSE usa HTTP/1.1 nativo, não exige handshake de upgrade de protocolo e é suportado nativamente pelo `EventSource` do browser sem bibliotecas adicionais.

**Propriedade SD visada:** Transparência de Acesso — o Front End consome eventos padrão HTTP sem conhecer a topologia interna.

### 3.3 MCP via SDK Oficial (`mcp` Python)

**Decisão planejada:** implementar o servidor de clima como um servidor MCP usando o SDK oficial `mcp` (Python), expondo a tool `get_weather`.

**Justificativa:** o protocolo MCP padroniza a interface entre agentes LLM e ferramentas externas, permitindo que qualquer agente compatível consuma o servidor sem adaptações. O uso do SDK oficial garante conformidade com o schema de negociação de capabilities do protocolo.

**Propriedade SD visada:** Desacoplamento — o MCP Clima pode ser substituído ou atualizado sem alterar o Orquestrador, desde que o contrato da tool seja mantido.

---

## 4. Próximos Passos

1. Configurar o notebook Colab com Ollama e ngrok e validar a chamada HTTP de inferência.
2. Implementar o pipeline de ingestão RAG (leitura de PDFs, geração de embeddings, persistência no ChromaDB).
3. Implementar o Orquestrador (LangChain Agent) expondo `POST /consulta`.
4. Implementar o servidor MCP Clima em Docker.
5. Implementar o API Gateway (Spring Boot + SSE).
6. Implementar o Front End mínimo consumindo SSE.
7. Gravar a demo do caminho de leitura completo.
