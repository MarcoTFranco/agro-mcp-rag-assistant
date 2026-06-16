"""Orquestrador principal — integra RAG + MCP Clima + Ollama.

Usa o endpoint /api/chat do Ollama com tool calling:
a LLM decide autonomamente quando invocar ferramentas MCP.
"""

import json
import logging

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


async def consultar(pergunta: str) -> dict:
    """Executa o fluxo completo de consulta.

    1. Busca documentos relevantes no RAG
    2. Monta prompt com contexto RAG + tools disponíveis
    3. Envia ao Ollama — a LLM decide se precisa chamar tools
    4. Se houver tool_calls, executa e reenvia resultados à LLM
    5. Retorna resposta estruturada com fontes, MCP invocados e dados climáticos
    """
    mcp_invocados = []
    clima_dados = None

    # 1. RAG — sempre executa
    logger.info("Consultando RAG para: %s", pergunta[:80])
    try:
        fontes = query_documents(pergunta, top_k=4)
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
                resposta = assistant_msg.get("content", "")
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
            resposta = assistant_msg.get("content", "Não foi possível gerar resposta.")

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
