"""Shared continuation validation and authenticated stateless receipts."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import secrets
from collections import OrderedDict
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator
from referencing import Registry, Resource

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = PROJECT_ROOT / "shared/schema"
CONTINUATION_SCHEMA_PATH = SCHEMA_DIR / "lesson-continuation.schema.json"
LESSON_SCHEMA_PATH = SCHEMA_DIR / "lesson.schema.json"
PLAN_SCHEMA_PATH = SCHEMA_DIR / "lesson-plan.schema.json"
SCENE_SCHEMA_PATH = SCHEMA_DIR / "resolved-board-scene.schema.json"
RECEIPT_DOMAIN = b"chalk:lesson-continuation-receipt:v1"
MAX_REPLAY_RECEIPTS = 1_024


class ContinuationContractError(ValueError):
    """A continuation request or response failed the shared wire contract."""


class ContinuationReceiptError(ValueError):
    """An opaque continuation receipt was malformed, stale, or modified."""


class ContinuationReplayGuard:
    """Bound exact receipt reuse without retaining lesson content.

    The HMAC receipt carries all restart-safe authority. This small process-local
    ledger adds best-effort exact-replay rejection during one server lifetime and
    stores only receipt digests, never topics, plans, prefixes, or model output.
    """

    def __init__(self, maximum: int = MAX_REPLAY_RECEIPTS) -> None:
        self._maximum = maximum
        self._digests: OrderedDict[str, None] = OrderedDict()
        self._lock = asyncio.Lock()

    async def consume(self, receipt: str) -> bool:
        """Return false when this exact capability was already consumed."""

        digest = hashlib.sha256(receipt.encode()).hexdigest()
        async with self._lock:
            if digest in self._digests:
                return False
            self._digests[digest] = None
            while len(self._digests) > self._maximum:
                self._digests.popitem(last=False)
            return True


@lru_cache(maxsize=1)
def continuation_request_validator() -> Draft7Validator:
    return _subschema_validator("request")


@lru_cache(maxsize=1)
def continuation_response_validator() -> Draft7Validator:
    return _subschema_validator("response")


def validate_continuation_request(value: Any) -> dict[str, Any]:
    """Validate and detach one browser continuation request."""

    return _validated_copy(value, continuation_request_validator(), "continuation request")


def validate_continuation_response(value: Any) -> dict[str, Any]:
    """Validate and detach one backend continuation response."""

    return _validated_copy(value, continuation_response_validator(), "continuation response")


def canonical_sha256(value: Any) -> str:
    """Hash one JSON value using the canonical encoding used by receipts."""

    return hashlib.sha256(_canonical_json(value)).hexdigest()


def continuation_input_context_sha256(topic: str, student_context: str) -> str:
    """Hash the exact bounded prompt context without retaining its raw content.

    Both lesson request paths strip surrounding whitespace before the values reach
    the board-model prompt. Mirror that normalization here so the initial receipt
    and later browser continuation bind the same semantic input.
    """

    if not isinstance(topic, str) or not isinstance(student_context, str):
        raise ContinuationReceiptError("continuation input context is invalid")
    normalized_topic = topic.strip()
    normalized_student_context = student_context.strip()
    if not 2 <= len(normalized_topic) <= 80 or len(normalized_student_context) > 500:
        raise ContinuationReceiptError("continuation input context is outside its bounds")
    return canonical_sha256(
        {
            "topic": normalized_topic,
            "student_context": normalized_student_context,
        }
    )


def derive_receipt_key(api_key: str) -> bytes:
    """Derive a domain-separated receipt key from the server-only API key.

    Rotating ``OPENAI_API_KEY`` intentionally invalidates outstanding continuation
    receipts. No derived key or source credential crosses the backend boundary.
    """

    if not api_key.strip():
        raise ContinuationReceiptError("continuation receipt key is unavailable")
    return hmac.new(api_key.encode(), RECEIPT_DOMAIN, hashlib.sha256).digest()


def issue_continuation_receipt(
    *,
    signing_key: bytes,
    request_id: str,
    client_id: str,
    prefix: list[dict[str, Any]],
    plan: dict[str, Any],
    topic: str,
    student_context: str,
    repairs_used: int,
    configuration_sha256: str,
) -> str:
    """Issue an opaque capability bound to the exact accepted continuation state."""

    claims = {
        "v": 1,
        "request_id": request_id,
        "client_id": client_id,
        "prefix_version": len(prefix),
        "prefix_sha256": canonical_sha256(prefix),
        "plan_sha256": canonical_sha256(plan),
        "input_context_sha256": continuation_input_context_sha256(topic, student_context),
        "repairs_used": repairs_used,
        "configuration_sha256": configuration_sha256,
        "nonce": secrets.token_urlsafe(16),
    }
    encoded = _base64url(_canonical_json(claims))
    authenticated = f"v1.{encoded}".encode()
    signature = _base64url(hmac.new(signing_key, authenticated, hashlib.sha256).digest())
    return f"v1.{encoded}.{signature}"


def verify_continuation_receipt(
    receipt: str,
    *,
    signing_key: bytes,
    request_id: str,
    client_id: str,
    prefix: list[dict[str, Any]],
    plan: dict[str, Any],
    topic: str,
    student_context: str,
    repairs_used: int,
    configuration_sha256: str,
) -> None:
    """Reject a forged, downgraded, or state-mismatched continuation receipt."""

    try:
        version, encoded, signature = receipt.split(".")
        if version != "v1":
            raise ValueError
        authenticated = f"v1.{encoded}".encode()
        expected_signature = hmac.new(signing_key, authenticated, hashlib.sha256).digest()
        observed_signature = _base64url_decode(signature)
        if not hmac.compare_digest(observed_signature, expected_signature):
            raise ValueError
        claims = json.loads(
            _base64url_decode(encoded),
            object_pairs_hook=_reject_duplicate_keys,
        )
    except (UnicodeDecodeError, ValueError, TypeError, json.JSONDecodeError):
        raise ContinuationReceiptError("continuation receipt authentication failed") from None

    expected = {
        "v": 1,
        "request_id": request_id,
        "client_id": client_id,
        "prefix_version": len(prefix),
        "prefix_sha256": canonical_sha256(prefix),
        "plan_sha256": canonical_sha256(plan),
        "input_context_sha256": continuation_input_context_sha256(topic, student_context),
        "repairs_used": repairs_used,
        "configuration_sha256": configuration_sha256,
    }
    if not isinstance(claims, dict) or set(claims) != {*expected, "nonce"}:
        raise ContinuationReceiptError("continuation receipt claims are invalid")
    if not isinstance(claims.get("nonce"), str) or not 16 <= len(claims["nonce"]) <= 64:
        raise ContinuationReceiptError("continuation receipt nonce is invalid")
    if any(claims.get(key) != value for key, value in expected.items()):
        raise ContinuationReceiptError("continuation receipt state does not match")


def _subschema_validator(name: str) -> Draft7Validator:
    continuation = _load_schema(CONTINUATION_SCHEMA_PATH)
    wrapper = {
        "$schema": continuation["$schema"],
        "$id": f"https://chalk.local/schema/lesson-continuation-{name}.validation.json",
        "$ref": f"{continuation['$id']}#/$defs/{name}",
    }
    validator = Draft7Validator(wrapper, registry=_schema_registry())
    validator.check_schema(wrapper)
    return validator


@lru_cache(maxsize=1)
def _schema_registry() -> Registry:
    schemas = [
        _load_schema(path)
        for path in (
            CONTINUATION_SCHEMA_PATH,
            LESSON_SCHEMA_PATH,
            PLAN_SCHEMA_PATH,
            SCENE_SCHEMA_PATH,
        )
    ]
    return Registry().with_resources(
        [(schema["$id"], Resource.from_contents(schema)) for schema in schemas]
    )


def _validated_copy(value: Any, validator: Draft7Validator, label: str) -> dict[str, Any]:
    issues = sorted(validator.iter_errors(value), key=lambda issue: list(issue.absolute_path))
    if issues:
        raise ContinuationContractError(f"{label} failed shared schema")
    encoded = _canonical_json(value)
    normalized = json.loads(encoded)
    if not isinstance(normalized, dict):
        raise ContinuationContractError(f"{label} is not an object")
    return normalized


def _load_schema(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"schema {path.name} is not an object")
    Draft7Validator.check_schema(value)
    return value


def _canonical_json(value: Any) -> bytes:
    try:
        return json.dumps(
            value,
            ensure_ascii=False,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode()
    except (TypeError, ValueError):
        raise ContinuationContractError("continuation value is not bounded JSON") from None


def _base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _base64url_decode(value: str) -> bytes:
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    if not value or any(character not in alphabet for character in value):
        raise ValueError("invalid base64url")
    decoded = base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    # Reject alternate encodings whose unused trailing bits decode to the same
    # bytes. The replay ledger hashes the opaque receipt string, so accepting a
    # non-canonical spelling would let one signed capability acquire new digests.
    if _base64url(decoded) != value:
        raise ValueError("non-canonical base64url")
    return decoded


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result
