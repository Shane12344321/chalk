"""Deterministic lesson wire contract rendered from the shared JSON Schema."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
LESSON_SCHEMA_PATH = PROJECT_ROOT / "shared/schema/lesson.schema.json"
LESSON_WIRE_CONTRACT_MARKER = "{{LESSON_WIRE_CONTRACT}}"
MAX_LESSON_WIRE_CONTRACT_CHARS = 2_500


@lru_cache(maxsize=1)
def lesson_wire_contract() -> str:
    """Return a compact, stable model-facing contract derived from the schema."""

    schema = json.loads(LESSON_SCHEMA_PATH.read_text(encoding="utf-8"))
    definitions = schema["$defs"]
    step = definitions["step"]
    element_id = definitions["elementId"]
    region = definitions["region"]
    anchor = definitions["anchor"]
    normalized_point = definitions["normalizedPoint"]
    axis_spec = definitions["axisSpec"]
    stroke_style = definitions["strokeStyle"]

    lines = [
        "Wire contract (generated from shared/schema/lesson.schema.json):",
        (
            f"- A lesson accepts at most {schema['properties']['steps']['maxItems']} steps. "
            f"Each step is exactly {_object_shape(step, definitions)}."
        ),
        f"- elementId = string matching `{element_id['pattern']}`.",
        f"- region = {_enum(region['enum'])}.",
        f"- anchor = {_object_shape(anchor, definitions)}.",
        f"- normalizedPoint = {_describe(normalized_point, definitions)}.",
        f"- axisSpec = {_object_shape(axis_spec, definitions)}.",
        f"- strokeStyle = {_enum(stroke_style['enum'])}.",
        "- Ops are exact JSON objects (a `?` suffix marks an optional key):",
    ]

    for op_name, variants in _op_variants(definitions):
        shapes = " OR ".join(_object_shape(variant, definitions) for variant in variants)
        lines.append(f"  - {op_name}: {shapes}")

    contract = "\n".join(lines)
    if len(contract) > MAX_LESSON_WIRE_CONTRACT_CHARS:
        raise ValueError("generated lesson wire contract exceeds prompt budget")
    return contract


def expand_prompt_contract(template: str) -> str:
    """Expand exactly one schema marker and reject unresolved prompt templates."""

    count = template.count(LESSON_WIRE_CONTRACT_MARKER)
    if count != 1:
        raise ValueError("schema-derived prompt must contain exactly one contract marker")
    expanded = template.replace(LESSON_WIRE_CONTRACT_MARKER, lesson_wire_contract())
    if LESSON_WIRE_CONTRACT_MARKER in expanded:
        raise ValueError("schema-derived prompt contract marker was not resolved")
    return expanded


def _op_variants(definitions: dict[str, Any]) -> list[tuple[str, list[dict[str, Any]]]]:
    result: list[tuple[str, list[dict[str, Any]]]] = []
    for op_ref in definitions["op"]["oneOf"]:
        op_schema = _resolve(op_ref, definitions)
        variants = [_resolve(item, definitions) for item in op_schema.get("oneOf", [op_schema])]
        names = {
            variant["properties"]["op"]["const"]
            for variant in variants
            if "op" in variant.get("properties", {})
        }
        if len(names) != 1:
            raise ValueError("lesson op variants do not share one discriminator")
        result.append((names.pop(), variants))
    return result


def _object_shape(schema: dict[str, Any], definitions: dict[str, Any]) -> str:
    schema = _resolve(schema, definitions)
    required = set(schema.get("required", []))
    properties = schema.get("properties", {})
    fields = []
    for name, field_schema in properties.items():
        suffix = "" if name in required else "?"
        fields.append(f"{name}{suffix}:{_describe(field_schema, definitions)}")
    return "{" + ",".join(fields) + "}"


def _describe(schema: dict[str, Any], definitions: dict[str, Any]) -> str:
    if "$ref" in schema:
        return schema["$ref"].rsplit("/", 1)[-1]
    if "const" in schema:
        return json.dumps(schema["const"], ensure_ascii=False)
    if "enum" in schema:
        return _enum(schema["enum"])
    if "oneOf" in schema:
        return "|".join(_describe(item, definitions) for item in schema["oneOf"])
    schema_type = schema.get("type")
    if schema_type == "object":
        return _object_shape(schema, definitions)
    if schema_type == "array":
        items = schema.get("items")
        if isinstance(items, list):
            return "[" + ",".join(_describe(item, definitions) for item in items) + "]"
        item = _describe(items, definitions) if isinstance(items, dict) else "value"
        minimum = schema.get("minItems")
        maximum = schema.get("maxItems")
        bounds = f"[{minimum}..{maximum}]" if minimum is not None or maximum is not None else ""
        return f"array<{item}>{bounds}"
    if schema_type == "string":
        minimum = schema.get("minLength")
        maximum = schema.get("maxLength")
        if minimum is not None or maximum is not None:
            return f"string[{minimum or 0}..{maximum or '∞'}]"
        return "string"
    if schema_type in {"number", "integer"}:
        minimum = schema.get("minimum")
        maximum = schema.get("maximum")
        if minimum is not None or maximum is not None:
            lower = minimum if minimum is not None else "-∞"
            upper = maximum if maximum is not None else "∞"
            return f"{schema_type}[{lower}..{upper}]"
        return schema_type
    if schema_type == "null":
        return "null"
    return str(schema_type or "value")


def _resolve(schema: dict[str, Any], definitions: dict[str, Any]) -> dict[str, Any]:
    reference = schema.get("$ref")
    if not isinstance(reference, str):
        return schema
    prefix = "#/$defs/"
    if not reference.startswith(prefix):
        raise ValueError(f"unsupported prompt-contract reference: {reference}")
    return definitions[reference.removeprefix(prefix)]


def _enum(values: list[Any]) -> str:
    return "|".join(json.dumps(value, ensure_ascii=False) for value in values)
