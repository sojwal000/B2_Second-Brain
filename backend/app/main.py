"""
B2 Second Brain - FastAPI Main Application
Advanced Version 2.0
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import time

from app.core.config import settings
from app.core.database import init_db, close_db, MongoDB
from app.core.background_tasks import task_manager
from app.api import auth, content, assistant, flashcards, tasks, dashboard, mindmap

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# ============================================================================
# Lifespan Context Manager
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    try:
        # Initialize PostgreSQL
        await init_db()
        logger.info("PostgreSQL database initialized")
        
        # Connect to MongoDB (optional - app can work without it for basic features)
        try:
            await MongoDB.connect()
            logger.info("MongoDB connected")
        except Exception as mongo_err:
            logger.warning(f"MongoDB not available: {mongo_err}. Some features (embeddings, chat history) will be limited.")
        
        # Start background task manager
        await task_manager.start()
        logger.info("Background task manager started")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    
    try:
        # Stop background task manager
        await task_manager.stop()
        logger.info("Background task manager stopped")
        
        # Close MongoDB
        await MongoDB.disconnect()
        logger.info("MongoDB disconnected")
        
        # Close PostgreSQL
        await close_db()
        logger.info("PostgreSQL disconnected")
        
    except Exception as e:
        logger.error(f"Shutdown error: {e}")


# ============================================================================
# Create FastAPI Application
# ============================================================================

app = FastAPI(
    title=settings.APP_NAME,
    description="Personal AI-powered knowledge management system",
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
    redirect_slashes=False
)


# ============================================================================
# Middleware
# ============================================================================

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
    return response


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"{request.method} {request.url.path} - {response.status_code}")
    return response


# ============================================================================
# Exception Handlers
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "detail": errors
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


# ============================================================================
# Include API Routers
# ============================================================================

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["Assistant / RAG"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["Flashcards"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(mindmap.router, prefix="/api/mindmap", tags=["Mind Map / Knowledge Graph"])


# ============================================================================
# Root Endpoints
# ============================================================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs" if settings.DEBUG else None
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION
    }


@app.get("/health/ready", tags=["Health"])
async def readiness_check():
    """Readiness check - verifies all dependencies."""
    from app.core.database import engine, MongoDB
    
    checks = {
        "postgresql": "unknown",
        "mongodb": "unknown",
        "task_manager": "unknown"
    }
    
    # Check PostgreSQL
    try:
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        checks["postgresql"] = "healthy"
    except Exception as e:
        checks["postgresql"] = f"unhealthy: {str(e)}"
    
    # Check MongoDB
    try:
        await MongoDB.client.admin.command('ping')
        checks["mongodb"] = "healthy"
    except Exception as e:
        checks["mongodb"] = f"unhealthy: {str(e)}"
    
    # Check task manager
    try:
        if task_manager.running:
            checks["task_manager"] = "healthy"
        else:
            checks["task_manager"] = "not running"
    except Exception as e:
        checks["task_manager"] = f"unhealthy: {str(e)}"
    
    # Determine overall status
    all_healthy = all(v == "healthy" for v in checks.values())
    
    return {
        "status": "ready" if all_healthy else "degraded",
        "checks": checks
    }


# ============================================================================
# Run Application (for development)
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD
    )
