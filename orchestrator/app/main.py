"""FastAPI — Orquestrador do Agro MCP RAG Assistant.

Expõe POST /consulta como ponto de entrada para o sistema.
"""

import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.agent.orchestrator import consultar
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Agro MCP RAG Assistant — Orquestrador",
    version="0.1.0",
)

class ConsultaRequest(BaseModel):
    pergunta: str


class FonteResponse(BaseModel):
    titulo: str
    trecho: str
    pagina: int


class ClimaResponse(BaseModel):
    disponivel: bool = True
    cidade: str = ""
    temperatura_c: float = 0
    sensacao_termica_c: float = 0
    umidade_pct: int = 0
    vento_kmh: float = 0
    descricao: str = ""
    nuvens_pct: int = 0


class ConsultaResponse(BaseModel):
    resposta: str
    fontes: list[FonteResponse]
    mcp_invocados: list[str]
    clima: ClimaResponse | None = None


@app.get("/health")
async def health():
    return {"status": "ok", "ollama_url": settings.ollama_base_url}


@app.post("/consulta", response_model=ConsultaResponse)
async def endpoint_consulta(req: ConsultaRequest):
    if not req.pergunta.strip():
        raise HTTPException(status_code=400, detail="Pergunta não pode ser vazia")

    logger.info("Nova consulta: %s", req.pergunta[:100])
    resultado = await consultar(req.pergunta)
    return resultado
