"""Pinned deterministic identity for browser-owned drawing resolution contracts."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = PROJECT_ROOT / "shared/schema"
RUNTIME_IDENTITY_PATH = PROJECT_ROOT / "shared/fixtures/drawing-runtime-identity.json"


def _load_resolver_policy_revision() -> str:
    try:
        value = json.loads(RUNTIME_IDENTITY_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("drawing runtime identity is unavailable") from error
    if not isinstance(value, dict) or set(value) != {"resolver_policy_revision"}:
        raise RuntimeError("drawing runtime identity has unknown fields")
    revision = value["resolver_policy_revision"]
    if (
        not isinstance(revision, str)
        or re.fullmatch(r"[a-z0-9][a-z0-9._-]{2,63}", revision) is None
    ):
        raise RuntimeError("drawing resolver policy revision is invalid")
    return revision


# The shared artifact is imported by browser offline evidence too. Bump it deliberately
# whenever candidate/layout/measurement policy can alter resolved geometry without a
# shared wire-schema change.
RESOLVER_POLICY_REVISION = _load_resolver_policy_revision()

_CONTRACT_PATHS = {
    "lesson_schema_sha256": SCHEMA_DIR / "lesson.schema.json",
    "lesson_plan_schema_sha256": SCHEMA_DIR / "lesson-plan.schema.json",
    "resolved_scene_schema_sha256": SCHEMA_DIR / "resolved-board-scene.schema.json",
}


def drawing_contract_identity() -> dict[str, str]:
    """Return content identities plus the deliberately maintained resolver revision."""

    return {
        **{
            name: hashlib.sha256(path.read_bytes()).hexdigest()
            for name, path in _CONTRACT_PATHS.items()
        },
        "resolver_policy_revision": RESOLVER_POLICY_REVISION,
    }
