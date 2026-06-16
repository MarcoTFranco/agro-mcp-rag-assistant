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


def split_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> list[str]:
    """Divide texto em chunks por parágrafos, respeitando chunk_size e overlap."""
    paragraphs = text.split("\n\n")
    chunks = []
    current = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(current) + len(para) + 2 <= chunk_size:
            current = f"{current}\n\n{para}" if current else para
        else:
            if current:
                chunks.append(current)
            # Se o parágrafo sozinho é maior que chunk_size, divide por sentenças
            if len(para) > chunk_size:
                sentences = para.replace(". ", ".\n").split("\n")
                sub = ""
                for sent in sentences:
                    if len(sub) + len(sent) + 1 <= chunk_size:
                        sub = f"{sub} {sent}" if sub else sent
                    else:
                        if sub:
                            chunks.append(sub)
                        sub = sent
                current = sub
            else:
                current = para

    if current:
        chunks.append(current)

    # Aplica overlap: cada chunk inclui os últimos caracteres do anterior
    if chunk_overlap > 0 and len(chunks) > 1:
        overlapped = [chunks[0]]
        for i in range(1, len(chunks)):
            prev = chunks[i - 1]
            suffix = prev[-chunk_overlap:] if len(prev) >= chunk_overlap else prev
            overlapped.append(suffix + " " + chunks[i])
        chunks = overlapped

    return chunks


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
        chunks = split_text(doc["conteudo"])

        ids = [f"{filename}_{i}" for i in range(len(chunks))]
        metadatas = [
            {"titulo": doc["titulo"], "fonte": doc["fonte"], "pagina": i}
            for i in range(len(chunks))
        ]
        embeddings = embedding_fn(chunks)

        collection.add(documents=chunks, ids=ids, metadatas=metadatas, embeddings=embeddings)
        total_chunks += len(chunks)
        print(f"  [{filename}] {len(chunks)} chunks ingeridos")

    print(f"\nIngestão concluída: {len(files)} documentos, {total_chunks} chunks total")
    print(f"Collection: {settings.collection_name}")
    return total_chunks
