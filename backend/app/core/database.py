"""
Database Connections
- PostgreSQL with SQLAlchemy (async)
- MongoDB with Motor (async)
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================================================
# SQLAlchemy Base
# ============================================================================

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


# ============================================================================
# PostgreSQL Connection (Async)
# ============================================================================

# Create async engine
engine = create_async_engine(
    settings.POSTGRES_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database - create all tables."""
    async with engine.begin() as conn:
        # Import all models to register them
        from app.models import database  # noqa
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")


async def close_db():
    """Close database connections."""
    await engine.dispose()
    logger.info("Database connections closed")


# ============================================================================
# MongoDB Connection (Async)
# ============================================================================

class MongoDB:
    """MongoDB connection manager."""
    
    client: AsyncIOMotorClient = None
    database: AsyncIOMotorDatabase = None
    
    @classmethod
    async def connect(cls):
        """Connect to MongoDB."""
        cls.client = AsyncIOMotorClient(settings.MONGO_URL)
        cls.database = cls.client[settings.MONGO_DB]
        
        # Test connection
        try:
            await cls.client.admin.command('ping')
            logger.info(f"Connected to MongoDB: {settings.MONGO_DB}")
        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
            cls.client = None
            cls.database = None
            raise
    
    @classmethod
    async def disconnect(cls):
        """Disconnect from MongoDB."""
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed")
    
    @classmethod
    def get_database(cls) -> AsyncIOMotorDatabase:
        """Get MongoDB database instance."""
        if cls.database is None:
            raise RuntimeError("MongoDB not connected. Please start MongoDB and restart the server.")
        return cls.database
    
    @classmethod
    def is_connected(cls) -> bool:
        """Check if MongoDB is connected."""
        return cls.database is not None
    
    @classmethod
    def get_collection(cls, collection_name: str):
        """Get MongoDB collection by name."""
        return cls.get_database()[collection_name]


async def get_mongo_db() -> AsyncIOMotorDatabase:
    """Dependency to get MongoDB database."""
    if not MongoDB.is_connected():
        raise RuntimeError("MongoDB not available. Please start MongoDB.")
    return MongoDB.get_database()


# ============================================================================
# Collection Names
# ============================================================================

class Collections:
    """MongoDB collection names."""
    RAW_CONTENTS = "raw_contents"
    EMBEDDINGS = "embeddings"
    CHAT_MESSAGES = "chat_messages"
    PROCESSING_LOGS = "processing_logs"
