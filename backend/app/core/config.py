"""
Application Configuration
Uses Pydantic Settings for environment variable management.
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Get the absolute path to the .env file (backend/.env)
ENV_FILE_PATH = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Application
    APP_NAME: str = "B2 Second Brain"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = Field(default="your-secret-key-change-in-production")
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
    
    # PostgreSQL Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "b2_secondbrain"
    
    @property
    def POSTGRES_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def POSTGRES_URL_SYNC(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def DATABASE_URL(self) -> str:
        return self.POSTGRES_URL

    
    # MongoDB
    MONGO_HOST: str = "localhost"
    MONGO_PORT: int = 27017
    MONGO_DB: str = "b2_secondbrain"
    MONGO_USER: Optional[str] = None
    MONGO_PASSWORD: Optional[str] = None
    
    @property
    def MONGO_URL(self) -> str:
        if self.MONGO_USER and self.MONGO_PASSWORD:
            return f"mongodb://{self.MONGO_USER}:{self.MONGO_PASSWORD}@{self.MONGO_HOST}:{self.MONGO_PORT}"
        return f"mongodb://{self.MONGO_HOST}:{self.MONGO_PORT}"
    
    # JWT Authentication
    JWT_SECRET_KEY: str = Field(default="jwt-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # File Storage (Local for development)
    UPLOAD_DIR: str = "./storage/uploads"
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: List[str] = [
        # Documents
        ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt", ".txt", ".md", ".csv", ".json",
        # Images
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".bmp", ".tiff",
        # Audio
        ".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac",
        # Video
        ".mp4", ".mov", ".avi", ".webm", ".mkv",
        # Code
        ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".c", ".go", ".rs", ".html", ".css"
    ]
    
    # AI Services - API Keys (REQUIRED - app will fail to start if missing)
    GOOGLE_API_KEY: str = Field(..., description="Google API key for Gemini - REQUIRED")
    
    # AI Model Configuration (Gemini only)
    AI_PROVIDER: str = "gemini"
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Embedding Configuration
    EMBEDDING_PROVIDER: str = "sentence-transformers"  # sentence-transformers, openai, huggingface
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    
    # OCR Configuration
    ENABLE_OCR: bool = True
    OCR_ENGINE: str = "tesseract"  # tesseract, paddleocr, easyocr
    
    # STT Configuration
    ENABLE_STT: bool = True
    WHISPER_MODEL: str = "base"  # tiny, base, small, medium, large
    WHISPER_DEVICE: str = "cpu"  # cpu, cuda
    
    # RAG Configuration
    RAG_RETRIEVAL_K: int = 10
    RAG_RERANK_K: int = 5
    RAG_SIMILARITY_THRESHOLD: float = 0.5
    ENABLE_HYBRID_SEARCH: bool = True
    
    # Chunking Configuration
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    CHUNKING_METHOD: str = "semantic"  # fixed, semantic, recursive
    
    # In-Memory Cache (instead of Redis)
    CACHE_TTL_SECONDS: int = 300
    MAX_CACHE_SIZE: int = 1000
    
    # Background Tasks Configuration
    MAX_CONCURRENT_TASKS: int = 5
    TASK_TIMEOUT_SECONDS: int = 300


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
