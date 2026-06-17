import os
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from app.config import settings


def parse_document(file_path: str) -> dict:
    """Lê um arquivo .txt e extrai titulo, fonte e conteúdo."""
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    titulo = ""
    fonte = ""
    content_start = 0

    for i, line in enumerate(lines):
        if line.startswith("TITULO:"):
            titulo = line.replace("TITULO:", "").strip()
        elif line.startswith("FONTE:"):
            fonte = line.replace("FONTE:", "").strip()
            content_start = i + 1
            break

    conteudo = "".join(lines[content_start:]).strip()
    return {"titulo": titulo, "fonte": fonte, "conteudo": conteudo}


def split_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> tuple[list[str], list[str]]:
    """Divide texto em chunks por parágrafos, respeitando chunk_size e overlap."""
    paragraphs = text.split("\n\n")
    clean_chunks = []
    current = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(current) + len(para) + 2 <= chunk_size:
            current = f"{current}\n\n{para}" if current else para
        else:
            if current:
                clean_chunks.append(current)
            # Se o parágrafo sozinho é maior que chunk_size, divide por sentenças
            if len(para) > chunk_size:
                sentences = para.replace(". ", ".\n").split("\n")
                sub = ""
                for sent in sentences:
                    if len(sub) + len(sent) + 1 <= chunk_size:
                        sub = f"{sub} {sent}" if sub else sent
                    else:
                        if sub:
                            clean_chunks.append(sub)
                        sub = sent
                current = sub
            else:
                current = para

    if current:
        clean_chunks.append(current)

    # Gera vetores com overlap para melhor continuidade semântica no embedding.
    # Os chunks limpos (clean_chunks) são usados como documents no ChromaDB —
    # como embeddings= é passado explicitamente, documents= é só texto exibido.
    if chunk_overlap > 0 and len(clean_chunks) > 1:
        embedding_chunks = [clean_chunks[0]]
        for i in range(1, len(clean_chunks)):
            prev = clean_chunks[i - 1]
            suffix = prev[-chunk_overlap:] if len(prev) >= chunk_overlap else prev
            embedding_chunks.append(suffix + " " + clean_chunks[i])
    else:
        embedding_chunks = list(clean_chunks)

    return embedding_chunks, clean_chunks


def ingest_documents():
    """Lê todos os documentos de data/documentos/, chunkeia e persiste no ChromaDB."""
    data_dir = settings.data_dir
    if not os.path.isdir(data_dir):
        raise FileNotFoundError(f"Diretório de dados não encontrado: {data_dir}")

    files = [f for f in os.listdir(data_dir) if f.endswith(".txt")]
    if not files:
        raise FileNotFoundError(f"Nenhum arquivo .txt encontrado em {data_dir}")

    embedding_fn = SentenceTransformerEmbeddingFunction(
        model_name=settings.embedding_model
    )

    client = chromadb.HttpClient(
        host=settings.chromadb_host, port=settings.chromadb_port
    )

    # Recria a collection para ingestão limpa
    try:
        client.delete_collection(settings.collection_name)
    except Exception:
        pass

    collection = client.get_or_create_collection(
        name=settings.collection_name,
    )

    total_chunks = 0

    for filename in files:
        filepath = os.path.join(data_dir, filename)
        doc = parse_document(filepath)
        embedding_texts, display_texts = split_text(doc["conteudo"])

        ids = [f"{filename}_{i}" for i in range(len(display_texts))]
        metadatas = [
            {"titulo": doc["titulo"], "fonte": doc["fonte"], "pagina": i}
            for i in range(len(display_texts))
        ]
        embeddings = embedding_fn(embedding_texts)

        collection.add(documents=display_texts, ids=ids, metadatas=metadatas, embeddings=embeddings)
        total_chunks += len(display_texts)
        print(f"  [{filename}] {len(display_texts)} chunks ingeridos")

    print(f"\nIngestão concluída: {len(files)} documentos, {total_chunks} chunks total")
    print(f"Collection: {settings.collection_name}")
    return total_chunks
