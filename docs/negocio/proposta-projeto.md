# Proposta do Projeto: Manejo Inteligente de Pragas Agrícolas

## 1. O Problema: Decisões lentas custam caro

O Brasil é o maior consumidor de defensivos agrícolas do mundo, movimentando **R$ 57 bilhões em 2023** (SINDIVEG). Parte expressiva desse gasto é desperdiçada por falhas operacionais na decisão de manejo:

- **Identificação imprecisa da praga:** produtores sem acesso rápido às bulas AGROFIT e recomendações técnicas recorrem a consultas genéricas ou à memória, gerando escolhas de produto inadequadas.
- **Erro na janela climática de aplicação:** defensivos aplicados antes de chuvas perdem eficácia e contaminam corpos d'água; aplicados em dias de vento forte ultrapassam limites de deriva toleráveis.
- **Tempo de resposta ineficiente:** uma consulta a um agrônomo ou ao sistema AGROFIT do MAPA pode demandar horas — em surtos de pragas, cada hora representa perda de produtividade.

**Consequências diretas:**
- Desperdício financeiro com produto lavado, re-aplicação desnecessária e dosagem incorreta.
- Contaminação ambiental: solo, lençol freático e fauna auxiliar (polinizadores).
- Perda de produtividade na safra, afetando especialmente pequenos produtores sem margem de erro.

---

## 2. Público-Alvo

| Perfil | Necessidade principal |
|---|---|
| Pequenos e médios produtores rurais | Decisão rápida e acessível, sem depender de consultoria presencial |
| Técnicos agrícolas de campo | Ferramenta de apoio para atender múltiplos produtores simultaneamente |
| Agrônomos | Consulta rápida a bulas e cruzamento com condições climáticas locais |

---

## 3. A Solução Proposta

Um **sistema distribuído de suporte à decisão** que combina três capacidades:

1. **RAG (Retrieval-Augmented Generation):** indexa semanticamente bulas do AGROFIT e manuais da Embrapa usando ChromaDB. Quando o produtor descreve um sintoma ou praga, o sistema recupera os trechos técnicos mais relevantes automaticamente — sem navegação manual em PDFs.

2. **MCP Clima (Model Context Protocol):** integra dados de previsão meteorológica (OpenWeatherMap) como ferramenta do agente. O sistema verifica autonomamente as condições climáticas das próximas horas e inclui esse contexto na recomendação.

3. **LLM Local (Ollama):** sintetiza os trechos técnicos recuperados e os dados climáticos em uma resposta em linguagem natural, acessível ao produtor sem formação técnica aprofundada.

**Diferencial:** ao contrário de chatbots genéricos, o sistema fundamenta cada resposta em documentação oficial (AGROFIT/Embrapa) e nas condições climáticas reais do momento da consulta.

---

## 4. Requisitos

### 4.1 Funcionais

- **RF01:** Receber perguntas em linguagem natural sobre identificação e manejo de pragas.
- **RF02:** Recuperar trechos relevantes de bulas AGROFIT e manuais Embrapa por similaridade semântica.
- **RF03:** Consultar previsão meteorológica automaticamente quando a pergunta envolver janela climática.
- **RF04:** Gerar resposta em linguagem natural citando as fontes consultadas.
- **RF05:** Exibir as fontes utilizadas (título do documento, trecho) e os serviços MCP invocados.

### 4.2 Não Funcionais

- **RNF01 — Disponibilidade:** a base de conhecimento (ChromaDB) e o Orquestrador devem permanecer disponíveis mesmo quando o servidor de inferência (Colab) estiver indisponível.
- **RNF02 — Latência:** resposta ao usuário em até **30 segundos** (dominada pelo tempo de inferência do LLM no Colab).
- **RNF03 — Segurança:** chaves de API (OpenWeatherMap, ngrok) nunca devem ser commitadas; uso obrigatório de `.env`.
- **RNF04 — Manutenibilidade:** adição de novos documentos à base RAG sem necessidade de alterar código (apenas re-ingestão).

---

## 5. Escopo por Fase

| Fase | Entregável | Status |
|---|---|---|
| **Fase 1** | Proposta de projeto, especificação de arquitetura, poster | Concluída |
| **Fase 2** | RAG funcional + integração MCP + demo do caminho de leitura | Em andamento |
| **Fase 3** | Orquestração completa, serviços de escrita (Estoque, Agenda, Histórico), relatório final | Pendente |

> **Escopo da Fase 2 (atual):** exclusivamente o **caminho de leitura (Query)**. Serviços de escrita, mensageria (RabbitMQ) e saga de transações são Fase 3.

---

## 6. Impacto Esperado

- **Redução de custo operacional:** decisões mais precisas diminuem re-aplicações e desperdício de insumos.
- **Redução de impacto ambiental:** aplicação na janela correta minimiza contaminação por deriva e lavagem.
- **Democratização do conhecimento técnico:** acesso a recomendações baseadas em bulas oficiais sem custo de consultoria presencial.
- **Tempo de resposta:** de horas (consulta manual) para segundos (consulta ao sistema).
