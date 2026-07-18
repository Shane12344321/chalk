"""Schema-derived board prompt contract stays deterministic and complete."""

import hashlib
import json

import pytest

from app import lessons
from app.prompt_contract import (
    LESSON_SCHEMA_PATH,
    LESSON_WIRE_CONTRACT_MARKER,
    MAX_LESSON_WIRE_CONTRACT_CHARS,
    expand_prompt_contract,
    lesson_wire_contract,
)


def test_generated_contract_is_bounded_deterministic_and_covers_every_op() -> None:
    contract = lesson_wire_contract()
    assert contract == lesson_wire_contract()
    assert len(contract) <= MAX_LESSON_WIRE_CONTRACT_CHARS

    schema = json.loads(LESSON_SCHEMA_PATH.read_text(encoding="utf-8"))
    definitions = schema["$defs"]
    for reference in definitions["op"]["oneOf"]:
        op_schema = definitions[reference["$ref"].rsplit("/", 1)[-1]]
        variant_ref = op_schema.get("oneOf", [reference])[0]["$ref"]
        variant = definitions[variant_ref.rsplit("/", 1)[-1]]
        op_name = variant["properties"]["op"]["const"]
        assert f"- {op_name}:" in contract

    assert "[1..4]" in contract
    assert definitions["elementId"]["pattern"] in contract


def test_current_prompts_expand_one_marker_and_hash_the_expanded_bytes() -> None:
    for name in ("board_engine.md", "repair.md"):
        template = (lessons.PROMPT_DIR / name).read_text(encoding="utf-8")
        assert template.count(LESSON_WIRE_CONTRACT_MARKER) == 1
        expanded = lessons._prompt(name)
        assert LESSON_WIRE_CONTRACT_MARKER not in expanded
        assert lesson_wire_contract() in expanded
        assert lessons._prompt_sha256(name) == hashlib.sha256(expanded.encode()).hexdigest()


def test_board_prompt_teaches_visual_patterns_and_the_word_removal_test() -> None:
    prompt = lessons._prompt("board_engine.md")
    assert "comparison -> side-by-side panels" in prompt
    assert "rate of change -> a curve with the local tangent" in prompt
    assert "Apply the word-removal test" in prompt
    assert "n1 = 1.5" in prompt


def test_legacy_prompts_are_returned_byte_for_byte() -> None:
    for name in ("board_engine_v1.md", "board_engine_v2.md"):
        raw = (lessons.PROMPT_DIR / name).read_text(encoding="utf-8")
        assert lessons._prompt(name) == raw


@pytest.mark.parametrize(
    "template",
    ["missing", f"{LESSON_WIRE_CONTRACT_MARKER}\n{LESSON_WIRE_CONTRACT_MARKER}"],
)
def test_prompt_contract_rejects_missing_or_duplicate_markers(template: str) -> None:
    with pytest.raises(ValueError, match="exactly one"):
        expand_prompt_contract(template)
