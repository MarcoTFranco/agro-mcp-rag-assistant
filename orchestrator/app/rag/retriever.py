import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from app.config import settings


def get_embedding_fn():
    """Retorna a função de embedding."""
    return SentenceTransformerEmbeddingFunction(
        model_name=settings.embedding_model
    )


def get_collection():
    """Conecta ao ChromaDB e retorna a collection de documentos."""
    client = chromadb.HttpClient(
        host=settings.chromadb_host, port=settings.chromadb_port
    )
    return client.get_collection(
        name=settings.collection_name,
    )


def query_documents(pergunta: str, top_k: int = 4) -> list[dict]:
    """Busca semântica nos documentos indexados.

    Retorna lista de dicts com titulo, trecho e pagina.
    """
    collection = get_collection()
    embedding_fn = get_embedding_fn()
    query_embedding = embedding_fn([pergunta])
    results = collection.query(query_embeddings=query_embedding, n_results=top_k)

    fontes = []
    for i in range(len(results["documents"][0])):
        fontes.append(
            {
                "titulo": results["metadatas"][0][i]["titulo"],
                "trecho": results["documents"][0][i],
                "pagina": results["metadatas"][0][i]["pagina"],
            }
        )
    return fontes
