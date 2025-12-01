from functools import lru_cache
from pathlib import Path
from typing import Any, Optional
from urllib.parse import quote_plus

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_ENV_PATH = _PROJECT_ROOT / ".env"
load_dotenv(_ENV_PATH, override=False)


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        extra="ignore",
    )

    # Cloud / external DB connection info (preferred)
    database_url: Optional[str] = Field(
        default=None,
        alias="DATABASE_URL",
        validation_alias="DATABASE_URL",
    )
    db_host: Optional[str] = Field(default=None, alias="DB_HOST")
    db_name: Optional[str] = Field(default=None, alias="DB_NAME")
    db_password: Optional[str] = Field(default=None, alias="DB_PASSWORD")
    db_port: Optional[int] = Field(default=None, alias="DB_PORT")
    db_user: Optional[str] = Field(default=None, alias="DB_USER")

    # fallback sqlite path for local development
    sqlite_path: str = Field(
        default=f"sqlite:///{(_PROJECT_ROOT / 'alphabot-back' / 'alphabot.db').as_posix()}",
        alias="SQLITE_PATH",
    )

    # jwt설정
    SECRET_KEY: str = "secret_key" #나중에 키 수정
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    def model_post_init(self, __context: Any) -> None:  # type: ignore[override]
        if self.database_url:
            return

        if all([self.db_host, self.db_name, self.db_password, self.db_port, self.db_user]):
            user = quote_plus(self.db_user)
            password = quote_plus(self.db_password)
            self.database_url = (
                f"postgresql+psycopg://{user}:{password}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}"
            )
        else:
            self.database_url = self.sqlite_path

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings loader."""
    return Settings()  # type: ignore[arg-type]


settings = get_settings()
