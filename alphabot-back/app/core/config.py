from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # 기본값은 로컬 개발 편의를 위한 SQLite 파일이며,
    # `DATABASE_URL` 환경 변수를 사용해 Postgres 등으로 교체할 수 있다.
    database_url: str = Field(
        default="sqlite:///./alphabot.db",
        env="DATABASE_URL",
    )
    
    # jwt설정
    SECRET_KEY: str = "secret_key" #나중에 키 수정
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings loader."""
    return Settings()  # type: ignore[arg-type]


settings = get_settings()
