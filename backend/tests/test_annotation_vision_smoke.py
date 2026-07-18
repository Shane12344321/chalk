"""The vision spike is owner-gated, exactly two calls, and never retains image bytes."""

import json
from pathlib import Path

import httpx
import pytest
from pydantic import SecretStr

from app.annotation_vision_smoke import main, run_annotation_vision_smoke
from app.config import Settings

API_KEY = "vision-smoke-api-key-test-sentinel"


def settings() -> Settings:
    return Settings(
        _env_file=None,
        openai_api_key=SecretStr(API_KEY),
        safety_identifier_salt="vision-smoke-test-salt",
    )


def completed_program(request_id: str) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "status": "completed",
            "usage": {"input_tokens": 20, "output_tokens": 8, "total_tokens": 28},
            "output": [
                {
                    "type": "message",
                    "content": [
                        {
                            "type": "output_text",
                            "text": json.dumps(
                                {
                                    "schema_version": "1.0",
                                    "request_id": request_id,
                                    "manifest_version": 1,
                                    "ops": [
                                        {
                                            "op": "text",
                                            "id": "antinodehint",
                                            "target_id": "wave",
                                            "side": "below",
                                            "content": "antinode",
                                        }
                                    ],
                                }
                            ),
                        }
                    ],
                }
            ],
        },
    )


def test_vision_smoke_builds_control_and_low_detail_image_calls(tmp_path: Path) -> None:
    bodies: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.read())
        bodies.append(body)
        text = body["input"][0]["content"][0]["text"]
        request_id = json.loads(text)["request_id"]
        return completed_program(request_id)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        summary, passed = run_annotation_vision_smoke(
            settings(), tmp_path / "evidence", client=client
        )

    assert passed is True
    assert len(bodies) == 2
    assert bodies[0]["store"] is False
    assert bodies[0]["input"][0]["content"] == [
        {"type": "input_text", "text": bodies[1]["input"][0]["content"][0]["text"]}
    ]
    image = bodies[1]["input"][0]["content"][1]
    assert image["type"] == "input_image"
    assert image["detail"] == "low"
    assert image["image_url"].startswith("data:image/png;base64,")
    assert summary["attempted_calls"] == 2
    retained = (tmp_path / "evidence" / "summary.json").read_text(encoding="utf-8")
    assert "base64" not in retained
    assert API_KEY not in retained
    assert summary["results"][0]["annotation"]["ops"][0].get("content") is None


def test_vision_smoke_cli_refuses_without_fresh_owner_acknowledgement(tmp_path: Path) -> None:
    with pytest.raises(SystemExit) as error:
        main(["--output-dir", str(tmp_path / "evidence")])
    assert error.value.code == 2
    assert not (tmp_path / "evidence").exists()
