"""Servidor MCP Clima — expõe a tool get_weather.

Implementa o protocolo MCP via SDK oficial (FastMCP) para demonstração,
e também expõe um endpoint REST /call-tool para integração direta com o Orquestrador.
"""

import os

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="MCP Clima Server")

OPENWEATHERMAP_URL = "https://api.openweathermap.org/data/2.5/weather"


async def _fetch_weather(cidade: str) -> dict:
    """Lógica central de consulta ao OpenWeatherMap."""
    api_key = os.getenv("OPENWEATHERMAP_API_KEY", "")

    if not api_key:
        return {
            "disponivel": False,
            "erro": "Chave da API OpenWeatherMap não configurada. "
            "Configure OPENWEATHERMAP_API_KEY no arquivo .env.",
        }

    params = {
        "q": f"{cidade},BR",
        "appid": api_key,
        "units": "metric",
        "lang": "pt_br",
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(OPENWEATHERMAP_URL, params=params)
            response.raise_for_status()
            data = response.json()

        return {
            "disponivel": True,
            "cidade": data["name"],
            "temperatura_c": data["main"]["temp"],
            "sensacao_termica_c": data["main"]["feels_like"],
            "umidade_pct": data["main"]["humidity"],
            "vento_kmh": round(data["wind"]["speed"] * 3.6, 1),
            "descricao": data["weather"][0]["description"],
            "nuvens_pct": data["clouds"]["all"],
        }

    except httpx.HTTPStatusError as e:
        return {
            "disponivel": False,
            "erro": f"Erro na API OpenWeatherMap: HTTP {e.response.status_code}",
        }
    except httpx.RequestError as e:
        return {
            "disponivel": False,
            "erro": f"Erro de conexão com OpenWeatherMap: {e}",
        }


# --- Endpoint REST para integração com o Orquestrador ---


class CallToolRequest(BaseModel):
    tool_name: str
    arguments: dict


@app.post("/call-tool")
async def call_tool(req: CallToolRequest):
    """Endpoint REST que expõe as tools MCP via HTTP simples."""
    if req.tool_name == "get_weather":
        cidade = req.arguments.get("cidade", "Lavras")
        return await _fetch_weather(cidade)
    return {"erro": f"Tool '{req.tool_name}' não encontrada"}


@app.get("/health")
async def health():
    api_key = os.getenv("OPENWEATHERMAP_API_KEY", "")
    return {
        "status": "ok",
        "service": "mcp-clima",
        "api_key_configured": bool(api_key),
    }


# --- Servidor MCP via SDK oficial (protocolo MCP sobre stdio) ---
# Para uso com clientes MCP compatíveis (ex: Claude Desktop, MCP Inspector):
#   python server.py --mcp
#
# O servidor FastAPI (REST) é o modo padrão para integração com o Orquestrador.


def _create_mcp_server():
    """Cria servidor MCP com a tool get_weather para uso via stdio."""
    from mcp.server.fastmcp import FastMCP

    mcp = FastMCP("mcp-clima")

    @mcp.tool()
    async def get_weather(cidade: str) -> dict:
        """Consulta condições meteorológicas de uma cidade brasileira."""
        return await _fetch_weather(cidade)

    return mcp


if __name__ == "__main__":
    import sys

    if "--mcp" in sys.argv:
        mcp_server = _create_mcp_server()
        mcp_server.run(transport="stdio")
    else:
        uvicorn.run(app, host="0.0.0.0", port=8081)
