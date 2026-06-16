from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"
    openweathermap_api_key: str = ""
    chromadb_host: str = "localhost"
    chromadb_port: int = 8000
    mcp_clima_url: str = "http://localhost:8081"
    collection_name: str = "documentos_agro"
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    data_dir: str = "data/documentos"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
