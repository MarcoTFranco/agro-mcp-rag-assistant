"""Cliente MCP que conecta ao servidor MCP Clima via HTTP."""

import httpx
import logging

from app.config import settings

logger = logging.getLogger(__name__)


async def get_weather(cidade: str) -> dict | None:
    """Consulta o MCP Clima server para obter dados meteorológicos.

    Retorna o dict com dados climáticos ou None se indisponível.
    """
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # Chama o MCP server via endpoint REST simplificado
            response = await client.post(
                f"{settings.mcp_clima_url}/call-tool",
                json={"tool_name": "get_weather", "arguments": {"cidade": cidade}},
            )
            response.raise_for_status()
            result = response.json()

            # Verifica se os dados estão disponíveis
            if isinstance(result, dict) and result.get("disponivel"):
                return result

            logger.warning("MCP Clima: dados indisponíveis — %s", result)
            return None

    except httpx.RequestError as e:
        logger.warning("MCP Clima indisponível: %s", e)
        return None
    except Exception as e:
        logger.warning("Erro ao consultar MCP Clima: %s", e)
        return None
