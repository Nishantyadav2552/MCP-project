"""
Configuration module for Canva AI Design Agent.
Loads settings from environment variables using Pydantic Settings.
"""
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # App Settings
    APP_ENV: str = Field(default="development", description="Environment: development, production, test")
    PORT: int = Field(default=8000, description="Backend API Port")
    HOST: str = Field(default="0.0.0.0", description="Backend Host")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")

    # CORS Settings
    FRONTEND_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:3000,https://app.canva.com,https://*.canva-apps.com",
        description="Allowed CORS origins comma-separated"
    )

    # LLM Settings
    LLM_PROVIDER: str = Field(default="compatible", description="Provider: openai, groq, compatible")
    LLM_API_KEY: str = Field(default="", description="API key for LLM provider")
    LLM_MODEL: str = Field(default="gpt-4o-mini", description="Model name to use")
    LLM_BASE_URL: str = Field(default="https://api.openai.com/v1", description="Base URL for OpenAI compatible endpoint")
    LLM_TEMPERATURE: float = Field(default=0.2, description="Sampling temperature")
    LLM_TIMEOUT_SECONDS: float = Field(default=60.0, description="Request timeout")

    # Canva App Credentials
    CANVA_CLIENT_ID: str = Field(default="", description="Canva Apps Client ID")
    CANVA_CLIENT_SECRET: str = Field(default="", description="Canva Apps Client Secret")

    # Observability Settings
    LANGFUSE_ENABLED: bool = Field(default=False, description="Enable Langfuse tracing")
    LANGFUSE_PUBLIC_KEY: str = Field(default="", description="Langfuse public key")
    LANGFUSE_SECRET_KEY: str = Field(default="", description="Langfuse secret key")
    LANGFUSE_HOST: str = Field(default="https://cloud.langfuse.com", description="Langfuse host")

    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-separated origins into a list."""
        if not self.FRONTEND_ORIGINS:
            return ["*"] if self.APP_ENV == "development" else []
        return [origin.strip() for origin in self.FRONTEND_ORIGINS.split(",") if origin.strip()]


# Global cached settings instance
settings = Settings()
