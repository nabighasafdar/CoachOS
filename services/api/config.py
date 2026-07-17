from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    groq_api_key: str = ""
    gemini_api_key: str = ""
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    use_mock_tools: bool = True
    accountability_secret: str = "coachos-dev-secret"
    chroma_path: str = "./data/chroma"
    chroma_enabled: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "*"


@lru_cache
def get_settings() -> Settings:
    return Settings()
