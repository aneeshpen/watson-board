"""Central application settings, sourced from the environment / .env file."""

from __future__ import annotations

import os
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Service ──────────────────────────────────────────────────────────────
    app_name: str = "Watson-Board Command Backend API"
    environment: str = Field(default="development")
    debug: bool = Field(default=False)

    # ── CORS ─────────────────────────────────────────────────────────────────
    # Comma-separated list. Defaults to the local dev origins only — the old
    # code shipped allow_origins=["*"] together with allow_credentials=True,
    # which is both wide open and an invalid combination browsers reject.
    cors_origins: str = Field(default="http://localhost:8080,http://127.0.0.1:8080")

    # ── Auth ─────────────────────────────────────────────────────────────────
    # When set, mutating/expensive endpoints require `X-API-Key: <admin_api_key>`.
    # Left unset in local dev so the app still runs out of the box; startup logs
    # a warning so the gap is never silent.
    admin_api_key: str | None = Field(default=None)

    # ── Paths ────────────────────────────────────────────────────────────────
    chroma_path: str = Field(default=os.path.join(BASE_DIR, "chroma_data"))
    dataset_path: str = Field(
        default=os.path.join(BASE_DIR, "..", "dataset", "forensic_autopsy_3000.csv")
    )
    temp_upload_dir: str = Field(default=os.path.join(BASE_DIR, "temp_uploads"))

    # ── Limits ───────────────────────────────────────────────────────────────
    max_page_size: int = Field(default=200)
    max_search_results: int = Field(default=25)
    max_upload_mb: int = Field(default=500)
    rate_limit_default: str = Field(default="120/minute")
    rate_limit_expensive: str = Field(default="10/minute")

    # ── Copilot (Claude) ─────────────────────────────────────────────────────
    anthropic_api_key: str | None = Field(default=None)
    copilot_model: str = Field(default="claude-opus-5")
    copilot_max_tokens: int = Field(default=4096)
    copilot_retrieval_k: int = Field(default=6)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def copilot_enabled(self) -> bool:
        """True when an Anthropic key is available, so RAG generation can run."""
        return bool(self.anthropic_api_key or os.environ.get("ANTHROPIC_API_KEY"))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
