"""Script CLI para ingestão de documentos no ChromaDB.

Uso: python -m scripts.ingest_docs
"""

import sys
import os

# Adiciona o diretório raiz ao path para importar app.*
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rag.ingest import ingest_documents


def main():
    print("=" * 50)
    print("Ingestão de Documentos — Agro MCP RAG Assistant")
    print("=" * 50)
    try:
        ingest_documents()
    except Exception as e:
        print(f"\nErro na ingestão: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
