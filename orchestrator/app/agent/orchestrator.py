"""Orquestrador principal — integra RAG + MCP Clima + Ollama.

Usa o endpoint /api/chat do Ollama com tool calling:
a LLM decide autonomamente quando invocar ferramentas MCP.
"""

import json
import logging
import re

import httpx

from app.config import settings
from app.rag.retriever import query_documents
from app.mcp_client.clima import get_weather
from app.agent.prompts import (
    SYSTEM_PROMPT,
    RAG_CONTEXT_TEMPLATE,
    USER_PROMPT_TEMPLATE,
)

logger = logging.getLogger(__name__)

# Definição da tool para o Ollama (formato OpenAI-compatible)
WEATHER_TOOL = {
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": (
            "Consulta as condições meteorológicas atuais de uma cidade brasileira. "
            "Use esta ferramenta quando o usuário perguntar sobre clima, condições "
            "de aplicação de defensivos, janela de pulverização, ou qualquer questão "
            "que dependa de temperatura, umidade, vento ou previsão de chuva."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "cidade": {
                    "type": "string",
                    "description": (
                        "Nome da cidade brasileira para consultar o clima "
                        "(ex: Lavras, Londrina, Ribeirão Preto, Juiz de Fora)"
                    ),
                }
            },
            "required": ["cidade"],
        },
    },
}

MAX_TOOL_ROUNDS = 3  # Limite de rounds de tool calling para evitar loops


REWRITE_PROMPT = (
    "Dado o histórico de conversa abaixo e a pergunta do usuário, reescreva a pergunta "
    "como uma consulta autossuficiente que possa ser entendida sem o histórico.\n"
    "REGRAS OBRIGATÓRIAS:\n"
    "- Use APENAS termos que aparecem no histórico ou na pergunta original\n"
    "- NÃO invente produtos, nomes, doses ou informações novas\n"
    "- Retorne APENAS a pergunta reescrita, sem explicações, sem prefixos, sem aspas\n\n"
    "Histórico:\n{historico}\n\n"
    "Pergunta original: {pergunta}\n\n"
    "Pergunta reescrita:"
)


def _format_rag_context(fontes: list[dict]) -> str:
    """Formata os trechos recuperados do RAG para o prompt."""
    if not fontes:
        return ""

    trechos = []
    for i, fonte in enumerate(fontes, 1):
        trechos.append(
            f"### Fonte {i}: {fonte['titulo']}\n{fonte['trecho']}"
        )

    contexto = "\n\n".join(trechos)
    return RAG_CONTEXT_TEMPLATE.format(contexto_rag=contexto)


async def _chat_ollama(messages: list[dict], tools: list[dict] | None = None) -> dict:
    """Chama o Ollama via /api/chat. Retorna o message do assistente."""
    url = f"{settings.ollama_base_url}/api/chat"

    payload = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
    }
    if tools:
        payload["tools"] = tools

    headers = {"ngrok-skip-browser-warning": "true"}

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["message"]


async def _execute_tool_call(tool_call: dict) -> tuple[str, dict | None]:
    """Executa uma tool call e retorna (resultado_str, dados_estruturados)."""
    func = tool_call.get("function", {})
    name = func.get("name", "")
    args = func.get("arguments", {})

    if name == "get_weather":
        cidade = args.get("cidade", "Lavras")
        logger.info("LLM invocou get_weather para: %s", cidade)
        weather = await get_weather(cidade)
        if weather:
            return json.dumps(weather, ensure_ascii=False), weather
        return json.dumps({"disponivel": False, "erro": "Dados climáticos indisponíveis"}), None

    return json.dumps({"erro": f"Tool '{name}' não encontrada"}), None


def _sanitize_response(text: str) -> str:
    """Remove blocos JSON de tool call que o LLM vazar no texto da resposta.

    Localiza cada '{' no texto, tenta decodificar um objeto JSON completo a
    partir dali (json.JSONDecoder.raw_decode lida com qualquer profundidade de
    aninhamento) e remove o bloco se for um dict com chave "name" do tipo str.
    Texto livre com '{' que não forma JSON válido é preservado intacto.
    """
    decoder = json.JSONDecoder()
    result = []
    i = 0
    removed = False
    while i < len(text):
        if text[i] == '{':
            try:
                obj, end = decoder.raw_decode(text, i)
                if isinstance(obj, dict) and isinstance(obj.get("name"), str):
                    removed = True
                    i = end
                    continue
            except (json.JSONDecodeError, ValueError):
                pass
        result.append(text[i])
        i += 1
    cleaned = re.sub(r'\n{3,}', '\n\n', ''.join(result)).strip()
    if removed:
        logger.warning("JSON de tool call removido da resposta do LLM")
    return cleaned


async def _rewrite_query(pergunta: str, historico: list) -> str:
    """Reescreve a pergunta como consulta autossuficiente usando o histórico."""
    historico_txt = "\n".join(f"{h.role}: {h.content}" for h in historico)
    prompt = REWRITE_PROMPT.format(historico=historico_txt, pergunta=pergunta)
    try:
        msg = await _chat_ollama([{"role": "user", "content": prompt}])
        rewritten = msg.get("content", "").strip()
        if rewritten:
            logger.info("Query reescrita: %s → %s", pergunta[:60], rewritten[:60])
            return rewritten
    except Exception as e:
        logger.warning("Falha no rewrite de query: %s", e)
    return pergunta


async def consultar(pergunta: str, historico: list | None = None) -> dict:
    """Executa o fluxo completo de consulta.

    1. Reescreve a query com contexto do histórico (se houver)
    2. Busca documentos relevantes no RAG com a query reescrita
    3. Monta prompt com contexto RAG + tools disponíveis
    4. Envia ao Ollama — a LLM decide se precisa chamar tools
    5. Se houver tool_calls, executa e reenvia resultados à LLM
    6. Retorna resposta estruturada com fontes, MCP invocados e dados climáticos
    """
    if historico is None:
        historico = []
    # Normaliza itens do histórico: aceita dicts {"role": ..., "content": ...}
    # além de objetos Pydantic com atributos .role / .content
    historico = [
        type("H", (), {"role": h["role"], "content": h["content"]})()
        if isinstance(h, dict) else h
        for h in historico
    ]
    mcp_invocados = []
    clima_dados = None

    # 1. Query rewriting — só para perguntas curtas/ambíguas com histórico
    # Perguntas longas (>= 6 palavras) são autossuficientes e não precisam de rewrite
    query_rag = pergunta
    palavras = pergunta.split()
    if historico and len(palavras) < 6:
        query_rag = await _rewrite_query(pergunta, historico)

    # 2. RAG — sempre executa
    logger.info("Consultando RAG para: %s", query_rag[:80])
    try:
        fontes = query_documents(query_rag, top_k=4)
    except Exception as e:
        logger.error("Erro ao consultar RAG: %s", e)
        fontes = []

    # 2. Monta mensagens para o chat
    contexto_rag = _format_rag_context(fontes)
    user_content = USER_PROMPT_TEMPLATE.format(
        contexto_rag=contexto_rag,
        pergunta=pergunta,
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *[{"role": h.role, "content": h.content} for h in historico],
        {"role": "user", "content": user_content},
    ]

    # 3. Chat com tool calling (loop com limite de rounds)
    logger.info("Chamando Ollama (%s) com tools...", settings.ollama_model)
    try:
        for round_num in range(MAX_TOOL_ROUNDS):
            assistant_msg = await _chat_ollama(messages, tools=[WEATHER_TOOL])

            # Se a LLM não chamou nenhuma tool, temos a resposta final
            tool_calls = assistant_msg.get("tool_calls")
            if not tool_calls:
                resposta = _sanitize_response(assistant_msg.get("content", ""))
                break

            # A LLM decidiu chamar tool(s) — executar cada uma
            messages.append(assistant_msg)

            for tc in tool_calls:
                func_name = tc.get("function", {}).get("name", "")
                result_str, structured_data = await _execute_tool_call(tc)

                if func_name == "get_weather" and structured_data:
                    mcp_invocados.append("get_weather")
                    clima_dados = structured_data

                messages.append({
                    "role": "tool",
                    "content": result_str,
                })

            logger.info("Tool round %d concluído, reenviando ao LLM...", round_num + 1)
        else:
            # Atingiu o limite de rounds sem resposta final
            resposta = _sanitize_response(assistant_msg.get("content", "Não foi possível gerar resposta."))

    except httpx.RequestError as e:
        logger.error("Ollama indisponível: %s", e)
        resposta = (
            "Serviço de inferência (LLM) indisponível no momento. "
            "Verifique se o notebook Colab está ativo e a URL ngrok está "
            "configurada corretamente no .env."
        )
    except Exception as e:
        logger.error("Erro ao chamar Ollama: %s", e)
        resposta = f"Erro ao gerar resposta: {e}"

    # 4. Retorna resposta estruturada
    resultado = {
        "resposta": resposta,
        "fontes": fontes,
        "mcp_invocados": mcp_invocados,
    }
    if clima_dados:
        resultado["clima"] = clima_dados

    return resultado
