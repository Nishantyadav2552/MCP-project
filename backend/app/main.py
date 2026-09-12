"""
FastAPI application entrypoint for Canva AI Design Agent.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import router

# Configure structured logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("canva_agent.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan setup and teardown."""
    logger.info("Starting Canva AI Design Agent Backend...")
    logger.info(f"Environment: {settings.APP_ENV} | LLM Provider: {settings.LLM_PROVIDER} | Model: {settings.LLM_MODEL}")
    logger.info(f"CORS Allowed Origins: {settings.cors_origins}")
    yield
    logger.info("Shutting down Canva AI Design Agent Backend...")


app = FastAPI(
    title="Canva AI Design Agent API",
    description="Agentic backend for Canva design manipulation ('Cursor for Canva')",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
