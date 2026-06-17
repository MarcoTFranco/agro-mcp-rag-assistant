import os
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from app.config import settings


import pypdf

def parse_document(file_path: str) -> dict:
    """Lê um arquivo .pdf, extrai o texto de todas as páginas e coleta metadados."""
    reader = pypdf.PdfReader(file_path)
    
    # Tenta recuperar os metadados internos do PDF
    meta = reader.metadata
    titulo = ""
    fonte = ""
    
    if meta:
        if meta.title:
            titulo = meta.title
        if meta.author:
            fonte = meta.author

    # Fallbacks caso o PDF não possua metadados preenchidos
    if not titulo:
        # Usa o nome do arquivo sem a extensão como título
        titulo = os.path.splitext(os.path.basename(file_path))[0].replace("_", " ").title()
    if not fonte:
        fonte = "Embrapa / Infoteca-e"

    # Extrai o texto de cada página do PDF
    conteudo_completo = []
    for page in reader.pages:
        texto_pagina = page.extract_text()
        if texto_pagina:
            conteudo_completo.append(texto_pagina)
            
    # Junta todo o texto separando as páginas por quebras de linha duplas
    conteudo = "\n\n".join(conteudo_completo).strip()
    
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

    files = [f for f in os.listdir(data_dir) if f.endswith(".pdf")]
    if not files:
        raise FileNotFoundError(f"Nenhum arquivo .pdf encontrado em {data_dir}")

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
        
        # Abre o leitor de PDF diretamente no loop principal
        reader = pypdf.PdfReader(filepath)
        meta = reader.metadata
        titulo = meta.title if meta and meta.title else os.path.splitext(filename)[0]
        fonte = meta.author if meta and meta.author else "Embrapa"

        # Ingerir chunk por chunk, mapeando a página real
        for num_pagina, page in enumerate(reader.pages, start=1):
            texto_pagina = page.extract_text()
            if not texto_pagina or not texto_pagina.strip():
                continue
                
            # Divide apenas o texto desta página específica
            embedding_texts, display_texts = split_text(texto_pagina)
            
            ids = [f"{filename}_p{num_pagina}_{i}" for i in range(len(display_texts))]
            metadatas = [
                {
                    "titulo": titulo, 
                    "fonte": fonte, 
                    "pagina": num_pagina  # Agora guarda o número real da página do PDF!
                }
                for _ in range(len(display_texts))
            ]
            embeddings = embedding_fn(embedding_texts)

            collection.add(documents=display_texts, ids=ids, metadatas=metadatas, embeddings=embeddings)
            total_chunks += len(display_texts)
            
        print(f"  [{filename}] Concluído o processamento de páginas.")

    print(f"\nIngestão concluída: {len(files)} documentos, {total_chunks} chunks total")
    print(f"Collection: {settings.collection_name}")
    return total_chunks
