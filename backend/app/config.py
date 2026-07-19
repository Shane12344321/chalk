"""Environment-backed application settings.

Only this module reads process configuration. Secret values use ``SecretStr`` so
accidental model representations do not reveal them.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime settings for the local backend."""

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    openai_api_key: SecretStr | None = Field(default=None, repr=False)
    tldraw_license_key: SecretStr | None = Field(default=None, repr=False)
    openai_api_base_url: Literal["https://api.openai.com/v1"] = "https://api.openai.com/v1"
    openai_timeout_seconds: float = Field(default=15.0, gt=0, le=60)

    realtime_model: Literal[
        "gpt-realtime-2.1-mini",
        "gpt-realtime-2.1",
    ] = "gpt-realtime-2.1-mini"
    realtime_voice: Literal["marin", "cedar"] = "marin"
    sync_mode: Literal["fixed", "paced"] = "fixed"
    board_model: Literal[
        "gpt-5.6-luna",
        "gpt-5.6-terra",
        "gpt-5.6-sol",
    ] = "gpt-5.6-luna"
    board_reasoning_effort: Literal["none", "low"] = "none"
    board_prompt_version: Literal["v1", "v2", "v3"] = "v3"
    lesson_generation_timeout_seconds: float = Field(default=30.0, gt=0, le=60)
    lesson_max_concurrent: int = Field(default=2, ge=1, le=4)
    annotation_generation_timeout_seconds: float = Field(default=15.0, gt=0, le=30)
    annotation_max_concurrent: int = Field(default=1, ge=1, le=2)
    annotation_whitespace: Literal["off", "bounded"] = "off"
    frontend_origin: str = "http://localhost:5173"
    safety_identifier_salt: str = Field(
        default="chalk-local-development-v1",
        min_length=1,
        max_length=128,
    )

    @field_validator("frontend_origin")
    @classmethod
    def validate_frontend_origin(cls, value: str) -> str:
        """Accept one explicit HTTP(S) origin, never a wildcard or URL path."""

        candidate = value.rstrip("/")
        parsed = urlsplit(candidate)
        if (
            value == "*"
            or parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.hostname not in {"localhost", "127.0.0.1", "::1"}
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError("FRONTEND_ORIGIN must be one explicit localhost HTTP(S) origin")
        return candidate

    @field_validator("safety_identifier_salt")
    @classmethod
    def validate_safety_identifier_salt(cls, value: str) -> str:
        """Reject whitespace-only or control-character domain separators."""

        if not value.strip() or any(ord(character) < 32 for character in value):
            raise ValueError("SAFETY_IDENTIFIER_SALT must be a nonempty printable string")
        return value

    @property
    def has_openai_api_key(self) -> bool:
        """Report configuration state without exposing the configured value."""

        return bool(self.openai_api_key and self.openai_api_key.get_secret_value().strip())

    @property
    def has_tldraw_license_key(self) -> bool:
        """Report SDK licence configuration without exposing the key."""

        return bool(self.tldraw_license_key and self.tldraw_license_key.get_secret_value().strip())

    @property
    def board_prompt_name(self) -> str:
        """Select the qualified fallback, accumulated-whiteboard, or spatial-contract prompt."""

        if self.board_prompt_version == "v1":
            return "board_engine_v1.md"
        if self.board_prompt_version == "v2":
            return "board_engine_v2.md"
        return "board_engine.md"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return one settings object for the lifetime of the process."""

    return Settings()
