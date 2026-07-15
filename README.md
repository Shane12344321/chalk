# CHALK

CHALK is a localhost hackathon prototype for a math and physics tutor that talks while drawing and stops when the student interrupts. Milestone M1 proves the riskiest foundation: a browser-to-OpenAI Realtime WebRTC voice loop, server-minted ephemeral credentials, interruption handling, and a dummy tool round trip. The deterministic whiteboard arrives in M2.

This is not a production service and is not suitable for unsupervised use by children. It has no authentication, persistence, deployment hardening, or production privacy controls.

## Current status

M1 is complete: deterministic checks, live voice, the dummy-tool continuation, layered token controls, and five consecutive playback-backed interruptions passed. Automated checks do not call the live API or require a key. A manual rerun still requires a valid `OPENAI_API_KEY`; see `PROGRESS.md` and the checked-in ID-free acceptance summary for evidence actually collected.

## Local setup

Prerequisites:

- Node.js `^20.19.0` or `>=22.12.0` with npm (the current development machine uses Node 25 and npm 11).
- [`uv`](https://docs.astral.sh/uv/) for the Python environment.
- A current Chromium-family browser with localhost microphone permission for the live check.
- An OpenAI API key with access to `gpt-realtime-2.1-mini` for live M1 validation.

From the repository root:

```bash
uv python install 3.12
make install
cp .env.example .env
```

`uv sync --project backend --python 3.12` creates and uses the backend's isolated Python 3.12 environment; the system Python version does not need to change.
`npm ci` installs the exact frontend dependency graph recorded in the checked-in lockfile.

Add `OPENAI_API_KEY` to the root `.env`. Keep it server-only: never put it in `frontend/`, browser storage, a `VITE_*` variable, screenshots, or logs. The checked-in development defaults are:

```dotenv
REALTIME_MODEL=gpt-realtime-2.1-mini
REALTIME_VOICE=marin
SAFETY_IDENTIFIER_SALT=chalk-local-development-v1
BOARD_MODEL=gpt-5.6-terra
SYNC_MODE=fixed
DRAWBACK_MODE=vision
FRONTEND_ORIGIN=http://localhost:5173
```

`SAFETY_IDENTIFIER_SALT` is a non-secret domain-separation value, not an authentication credential. Choose a deliberate per-app value if this prototype is ever adapted beyond local development. `BOARD_MODEL`, `SYNC_MODE`, and `DRAWBACK_MODE` are forward configuration for later milestones; they do not imply those features exist in M1. Audition `cedar` against `marin` before recording. Use `gpt-realtime-2.1` only if the owner explicitly approves the higher recording cost after the mini-model flow passes.

## Run locally

Start each service in a separate terminal from the repository root:

```bash
make dev-backend
```

```bash
make dev-frontend
```

Then open [http://localhost:5173](http://localhost:5173). The backend binds to `127.0.0.1:8000`, and CORS permits exactly `http://localhost:5173`. Do not expose either service to a LAN or the public internet. The frontend uses `VITE_API_BASE_URL=http://127.0.0.1:8000` by default; a non-default value must still be a trusted localhost URL for this prototype.

The health endpoint does not require a key and must not reveal its value:

```bash
curl --fail http://127.0.0.1:8000/health
```

## Developer commands

The Make targets below are thin wrappers around the native project commands.

| Task | Root command | Native command |
|---|---|---|
| Install frontend | `make install-frontend` | `npm --prefix frontend ci` |
| Install backend with Python 3.12 | `make install-backend` | `uv sync --project backend --python 3.12` |
| Start frontend | `make dev-frontend` | `npm --prefix frontend run dev` |
| Start backend | `make dev-backend` | `uv run --project backend uvicorn --app-dir backend app.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend` |
| Frontend tests | `make test-frontend` | `npm --prefix frontend run test` |
| Backend tests | `make test-backend` | `uv run --project backend pytest -c backend/pyproject.toml backend/tests` |
| All tests | `make test` | both test commands above |
| Frontend lint | `make lint-frontend` | `npm --prefix frontend run lint` |
| Backend lint/format check | `make lint-backend` | `uv run --project backend ruff check backend` and `ruff format --check backend` |
| Frontend production build | `make build-frontend` | `npm --prefix frontend run build` |
| Backend syntax build | `make build-backend` | `uv run --project backend python -m compileall -q backend/app backend/tests` |
| All lint/build checks | `make lint` / `make build` | the corresponding commands above |

The production frontend build is a static validation artifact only; deployment is out of scope.

## Realtime cost controls

M1 stays on `gpt-realtime-2.1-mini` and applies several independent limits:

- 256 maximum output tokens per assistant response;
- 4,000 post-instruction conversation tokens with 0.8 retention-ratio truncation;
- input transcription disabled, avoiding its separate transcription charge;
- cumulative numeric usage read from each `response.done` event and shown in the UI;
- automatic disconnect at 20,000 cumulative tokens for one connection.

The 20,000-token counter resets on reconnect and is therefore a session guardrail, not an account-wide spending cap. The first live trace predates numeric usage retention, so its exact cost cannot be reconstructed from the saved metadata.

## Reproducing the M1 live protocol check

With both services running and a configured API key:

Keep any rerun deliberately light: use `gpt-realtime-2.1-mini`, short synthetic phrases, and brief responses. Perform only the required handshake and five short interruption trials, then disconnect. Do not run live checks in loops or retry configuration/access failures automatically. Do not use the full Realtime model or extend the session without explicit owner approval.

1. Open the app, click **Connect**, and allow microphone access.
2. Confirm the UI reaches its connected state and two-way voice works.
3. Start a response long enough to interrupt. Wait until the UI explicitly says **Chalk is speaking**, then speak and confirm the marker appears, local teaching state stops immediately, and no stale response continues afterward. A response that is merely created but has not started audio playback does not count.
4. Repeat step 3 five consecutive times. Record each run in `PROGRESS.md`; measure detected-speech-start to local-state stop separately from the subjective audio-stop judgment.
5. Confirm the session token metric remains below its limit, then disconnect.
6. Copy the redacted diagnostic trace. Record the five markers and numeric token usage; model, voice, browser, VAD settings, and the dummy-tool response trigger were captured in the earlier trace.

Expected event names from current documentation are only a checklist. The live trace is authoritative. Redact client-secret values, authorization data, audio payloads, raw utterance/transcript content, and any identifying data before retaining evidence.

## Privacy and security limitations

- The standard API key remains in the backend process; the browser receives only a short-lived client secret.
- Audio is sent from the browser to OpenAI during a live session. CHALK does not promise local-only audio processing.
- The prototype must not persist student audio, images, names, or raw utterances. Use synthetic, non-identifying content for testing.
- Diagnostics retain event metadata and timing only. Secret values, authorization headers, audio, image data URLs, and raw student content must be removed.
- The browser persists a random UUID for the local client. The backend sends only `SHA-256(salt + ":" + UUID)` as `OpenAI-Safety-Identifier`; the raw UUID is never sent upstream to OpenAI and must not be derived from a name, email address, IP address, or utterance. Clearing site data rotates the browser UUID.
- Localhost binding is a scope boundary, not production security. There is no authentication or multi-user isolation.

## Project guidance

- `AGENTS.md` is the audited execution contract.
- `ARCHITECTURE.md` records system boundaries and decisions.
- `PLANS.md` records milestones, assumptions, validation, and rollback.
- `PROGRESS.md` records evidence from work actually performed.
- `chalk-build-plan.md` is the original product brief; audited corrections in `AGENTS.md` take precedence.
