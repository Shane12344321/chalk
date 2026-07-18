# CHALK progress

This file is an append-oriented evidence log. Record only checks that were actually run. Current official-documentation expectations are not evidence of live API behavior.

## 2026-07-15 — M1 scaffold and Realtime vertical slice

Status: **complete**. M1 passed deterministic checks, live voice, dummy-tool continuation, layered cost controls, metadata-only privacy auditing, and five consecutive playback-backed interruptions with a separate positive owner perception report.

### Scope and decisions

- Runtime scope is explicit localhost only: frontend `http://localhost:5173`, backend `http://127.0.0.1:8000`, and CORS restricted to the exact frontend origin.
- `uv` provisions an isolated Python 3.12 backend environment; the installed system Python is not used as evidence of compatibility.
- The development Realtime model defaults to `gpt-realtime-2.1-mini`, and the voice defaults to `marin`. `cedar` remains an audition choice; `gpt-realtime-2.1` is reserved for recording after the development path passes.
- The standard API key is server-only. Browser configuration may expose the non-secret API base URL but never the key.
- The browser persists a random client UUID; the backend hashes `SAFETY_IDENTIFIER_SALT + ":" + UUID` with SHA-256 and sends only that digest as `OpenAI-Safety-Identifier`. The development salt is non-secret domain separation, not authentication.
- Live API checks are opt-in, credentialed, nondeterministic checks and do not belong in default automated test runs.
- Credentialed checks use a minimal live budget: `gpt-realtime-2.1-mini`, short synthetic prompts and responses, no automatic retries or loops, and immediate disconnect after the required evidence. Larger-model, extended-session, and batch-evaluation runs require explicit owner approval.
- Realtime cost controls are layered: 256 maximum output tokens per response, a 4,000-token post-instruction rolling context with 0.8 retention, no input transcription, cumulative numeric usage from `response.done`, and automatic disconnect at 20,000 billed session tokens. Reconnecting starts a new client-side budget, so this is not an account-wide spending limit.
- Root setup intentionally does not claim that board generation, synchronized ink, or other M2+ behavior exists.

### Work completed

- Added `.gitignore` rules for credentials, dependency caches, build output, raw diagnostics, and local recordings.
- Added `.env.example` with server-only key placement and centralized model, voice, origin, and future feature defaults.
- Added root setup, run, test, lint, and build documentation plus Make targets.
- Added an explicit dummy-tool procedure, five-interruption checklist, redaction rules, and prototype limitations.
- Added a strict FastAPI health/session service with a 4 KiB pre-parse request cap, canonical UUIDv4 contract, exact upstream routing, hashed safety identifier, allowlisted public configuration, and safe correlated errors.
- Added a browser WebRTC adapter with microphone gating until `session.updated`, terminal cleanup, reconnect isolation, server VAD, a validated `debug_echo` tool, bounded metadata-only traces, and separate measured/perceived interruption evidence.
- Added deterministic coverage for delayed microphone races, failed connections, cancelled tool calls, tool-output continuation, stale response events, trace sanitization, and loopback-only API routing.
- Added playback-buffer lifecycle tracking so an audible response remains interruptible after generation completes, plus safe token accounting, a visible budget, per-response/context caps, and budget-triggered disconnect.
- Audited reusable open-source options. OpenAI's TypeScript Agents SDK is the preferred greenfield choice, but replacing the already tested M1 adapter before its live gate would add migration risk without removing CHALK's custom evidence work.

### Validation evidence

Append exact commands and results below; do not convert planned checks into passes.

| Date/time (Asia/Kolkata) | Check | Command/procedure | Result | Notes/evidence |
|---|---|---|---|---|
| 2026-07-15T21:22:45+0530 | Root setup syntax | Source `.env.example`; dry-run `install`, `dev-backend`, `dev-frontend`, `test`, `lint`, and `build` Make targets; scan for trailing whitespace | Pass | Dotenv values parsed as expected, all targets parsed, and no trailing whitespace was found; this was a dry run, not runtime validation |
| 2026-07-15T21:22:45+0530 | Local tool availability | `uv --version`, `npm --version`, `node --version`, `make --version` | Pass | uv 0.11.25, npm 11.12.1, Node v25.9.0, GNU Make 3.81; application compatibility is validated separately |
| 2026-07-15T21:22:45+0530 | Live credential prerequisite | Presence-only checks; no value printed | Not configured | Root `.env` absent and `OPENAI_API_KEY` unset, so no live API check was attempted |
| 2026-07-15T21:26:13+0530 | Backend unit tests | `uv run --project backend pytest` | Pass | 17 passed in 0.28s on uv-provisioned Python 3.12.13; one upstream Starlette `httpx` deprecation warning remains |
| 2026-07-15T21:26:13+0530 | Backend lint and format check | `uv run --project backend ruff check backend`; `uv run --project backend ruff format --check backend` | Pass | All checks passed; 7 files already formatted |
| 2026-07-15T21:26:13+0530 | Backend syntax build | `uv run --project backend python -m compileall -q backend/app backend/tests` | Pass | Command exited 0 with no output |
| 2026-07-15T21:27:50+0530 | Documented backend start and health | `make dev-backend`; `curl --fail http://127.0.0.1:8000/health` | Pass | Uvicorn bound to 127.0.0.1:8000; health returned `configured=false`, the mini model, and `marin`, with no secret value |
| 2026-07-15T21:27:50+0530 | Missing-key session failure | POST synthetic opaque IDs to `/session` with no key configured | Pass | Returned redacted HTTP 503 `openai_not_configured`; this is not a live OpenAI call |
| 2026-07-15 | Fresh dependency install | `make install` | Pass | `npm ci` installed the checked-in frontend lock with 0 audit findings; uv provisioned the locked Python 3.12 backend environment |
| 2026-07-15 | Local browser/no-key smoke | Start both documented services, open the Vite UI, inspect console, request `/session`, exercise CORS and body-cap failures | Pass | UI rendered without console errors; health was safe; missing key returned correlated 503; allowed CORS preflight returned 200; 5,000-byte request returned safe 413. This did not exercise OpenAI or microphone capture |
| 2026-07-15T22:11:11+0530 | Final root deterministic tests | `make test` | Pass | 57 frontend tests passed in 6 files; 38 backend tests passed on Python 3.12.13; one upstream Starlette TestClient deprecation warning remains |
| 2026-07-15T22:11+0530 | Final root lint and build | `make lint`; `make build` | Pass | ESLint, Ruff lint/format, TypeScript, Vite production build, and Python compileall passed; Vite built 34 modules |
| 2026-07-15T22:13:26+0530 | Credential prerequisite recheck | Presence-only root `.env` and environment checks; no value printed | Not configured | Root `.env` remains absent and `OPENAI_API_KEY` remains unset |
| 2026-07-15T22:13:26+0530 | Dependency/bundle/log scan | `npm --prefix frontend audit --omit=dev`; scan `frontend/dist` for key/test-secret patterns; scan application source for console calls | Pass | npm reported 0 vulnerabilities; scans found no matching values or console calls |
| 2026-07-15T22:16:03+0530 | Requirement-level deterministic completion audit | Reconcile every M1 work item and exit condition against current source, tests, documentation, runtime smokes, and missing live evidence; rerun `make test`, `make lint`, `make build`, `git diff --check`, bundle secret scan, and credential presence checks | Deterministic pass; live gate pending | 57 frontend and 38 backend tests passed; lint/build/diff/secret scans passed. Root `.env` is absent and `OPENAI_API_KEY` is unset, so WebRTC audio, dummy-tool continuation, and five human interruption trials remain unproven |
| 2026-07-15T22:20:38+0530 | Live client-secret and WebRTC smoke | Add the provided key only to ignored root `.env`; start `make dev-backend` and `make dev-frontend`; connect from the Codex in-app browser; inspect metadata-only UI and backend access output | Partial pass | `.env` is ignored; `/health` reported configured=true, `gpt-realtime-2.1-mini`, and `marin`; `/session` returned 201; UI reached connected after session acknowledgement; assistant audio response metadata completed without a browser error. No credential value was printed or retained as evidence |
| 2026-07-15T22:39:08+0530 | Supplied trace audit | Parse the attached metadata-only trace and inspect only event types, timing, status, numeric counts, and sanitized IDs | Partial pass; instrumentation defect found | Chrome 150 trace had 258 entries over 47.8 s, five completed responses, a confirmed `debug_echo` round trip, four speech turns, and one real barge-in with `output_audio_buffer.cleared` plus `conversation.item.truncated`. It contained zero local interruption markers because generation had completed while output audio was still playing |
| 2026-07-15T22:46:47+0530 | Playback/cost-control implementation | Add output-buffer lifecycle tracking, completion/clear ordering coverage, late-stale invalidation, response usage extraction, usage UI/export, 256-token response cap, 4,000-token rolling context, and 20,000-token auto-disconnect; run `make test`, `make lint`, `make build`, and `git diff --check` | Pass | 64 frontend and 38 backend tests passed; all lint/build/diff checks passed. Live cost settings and corrected markers still require one short acceptance retest |
| 2026-07-15T22:45:49+0530 | Updated dashboard smoke | Inspect the disconnected localhost UI and browser console without connecting the microphone | Pass | Token budget rendered as `0 / 20,000`, the four-card layout was visually intact, and no browser warning/error was present. This check made no Realtime call and consumed no API tokens |
| 2026-07-15T22:57:28+0530 | Second supplied trace audit and false-positive correction | Reconcile each local marker against output playback and server settlement; tighten eligibility to confirmed audible playback; rerun `make test`, `make lint`, `make build`, and `git diff --check` | Partial live pass; deterministic pass | Trace recorded all configured cost controls and 3,507 / 20,000 tokens. Four markers followed output playback and clear/truncation with zero stale events. Marker 3 occurred before playback and cancelled a zero-token response, so it was rejected. 64 frontend and 38 backend tests plus all lint/build/diff checks pass |
| 2026-07-15T23:01:10+0530 | Final live M1 acceptance | Audit all five markers against prior output playback, buffer clear, conversation truncation, settlement, stale output, numeric usage, cost configuration, privacy allowlists, and the owner's separate perception report | Pass | Five playback-backed interruptions; five clears; five truncations; five successful settlements; zero stale events; 0–0.1 ms local handler-state stop; owner: “Wonderful. Worked well.”; 5,378 / 20,000 tokens; no forbidden content/secret fields. ID-free summary checked in under `artifacts/evidence/` |
| 2026-07-15T23:05:22+0530 | Final clean milestone gate | Parse the evidence JSON; run `make test`, `make lint`, `make build`, and `git diff --check` | Pass | 64 frontend and 38 backend tests passed; ESLint, Ruff lint/format, TypeScript, Vite, Python compileall, JSON parsing, and diff checks passed |

### Live Realtime evidence

Complete. Client-secret minting, WebRTC connection, session acknowledgement, two-way voice, dummy-tool continuation, layered cost controls, and five consecutive playback-backed interruptions passed. The final trace contains no stale-output event and passed the strict metadata allowlist audit.

The final 45.7-second acceptance trace used 5,378 tokens, or 26.9% of the per-connection guardrail. Future live checks keep the same narrow budget policy: mini model, short responses, no automatic retries, and prompt disconnect after the required evidence.

Configuration used:

| Field | Observed value |
|---|---|
| Date/time | Final trace generated 2026-07-15T23:01:10+0530 |
| Browser and version | Chrome 150.0.0.0 on macOS, from the exported user agent |
| Realtime model | `gpt-realtime-2.1-mini` |
| Voice | `marin` |
| VAD type/settings | `server_vad`; threshold 0.5, prefix padding 300 ms, silence 500 ms, create/interrupt response enabled; acknowledgement observed through connected state |
| Session payload (redacted) | Second export captured audio-only output, 256 output-token cap, server VAD, 4,000-token/0.8-retention truncation, and disabled input transcription |
| Connected/session events observed | `session.created`, client `session.update`, and `session.updated` |
| Output transcript event observed | `response.output_audio_transcript.delta` and `.done` metadata observed |
| Tool-call/output events observed | Function-call argument deltas/done, local `tool.output_sent`, client `conversation.item.create`, client `response.create`, and local `tool.round_trip_confirmed` |
| Interruption cancellation/truncation events observed | Five `output_audio_buffer.cleared` events immediately after their speech starts, each followed by `conversation.item.truncated` |
| Response trigger after tool output | Yes; the client sent `response.create` and continuing output was observed |
| Redacted trace location | Full traces remain user attachments; checked-in aggregate is `artifacts/evidence/m1-realtime-acceptance-summary.json`. Final trace: 297 entries generated 2026-07-15T17:31:10.193Z |

Second-trace token usage: 3,507 total; 2,687 input; 820 output; 1,984 cached input; 184 input-audio; and 472 output-audio tokens. This is 17.5% of the per-connection guardrail. The approximate dollar range above is an inference because the trace retains total cached tokens but not their cached audio/text split; the API dashboard remains authoritative.

Final-trace token usage: 5,378 total; 4,008 input; 1,370 output; 3,200 cached input; 354 input-audio; and 888 output-audio tokens. This is 26.9% of the per-connection guardrail.

Dummy-tool result: **pass**. The trace contains the function-call arguments completion, validated function output, explicit `response.create`, and continuing assistant output confirmed by `tool.round_trip_confirmed`.

Pre-fix interruption audit: the trace contains four user speech turns, but only the last began while output audio was still playing. That turn produced an immediate server buffer clear and conversation-item truncation, matching the user's perceived result. The UI did not create a marker because it had cleared `activeResponseId` at `response.done`, roughly 8.7 seconds before playback was interrupted. The corrected client now follows output-buffer playback events; the table below remains pending until retested.

Second-trace audit: five local markers settled as success with zero stale events, but only markers 1, 2, 4, and 5 had prior `output_audio_buffer.started` evidence. Marker 3 was created 0.2 ms after `response.created`, before playback, and its `response.done` was cancelled with zero usage. It is treated as a pre-playback turn collision rather than an audible interruption.

Final-trace audit: every marker had prior matching `output_audio_buffer.started` evidence. Each speech start synchronously deactivated local teaching state, then received `output_audio_buffer.cleared`, a successful settlement, and `conversation.item.truncated`. No stale-output metadata followed any marker. The trace dropdowns remained `not-recorded`; the owner separately supplied the overall perceptual judgment “Wonderful. Worked well.” This is recorded as an overall judgment, not misrepresented as five per-run “Immediate” selections.

Five-interruption record:

| Run | Active response before speech | Speech-start marker | Local teaching state stopped | Stale continuation absent | Local stop latency | Perceived audio stop | Result |
|---:|---|---|---|---|---|---|---|
| 1 | Yes; playback started | Yes | Yes | Yes | 0.0 ms | Worked well (overall owner report) | Pass |
| 2 | Yes; playback started | Yes | Yes | Yes | 0.0 ms | Worked well (overall owner report) | Pass |
| 3 | Yes; playback started | Yes | Yes | Yes | 0.1 ms | Worked well (overall owner report) | Pass |
| 4 | Yes; playback started | Yes | Yes | Yes | 0.0 ms | Worked well (overall owner report) | Pass |
| 5 | Yes; playback started | Yes | Yes | Yes | 0.0 ms | Worked well (overall owner report) | Pass |

Do not infer perceived audio-stop latency from the local-state timing. Do not claim the original `<300 ms` target unless the relevant metric was actually measured.

### Known limitations and skipped checks

- M1 live acceptance is complete. The separate OBS/system-audio recording setup remains unverified and belongs to later rehearsal work.
- Account access to `gpt-realtime-2.1-mini` is verified; the optional larger Realtime model and future board model remain unverified.
- Microphone permission and WebRTC stability passed in Chrome 150. OBS/system-audio capture and the eventual recording setup remain unverified.
- Backend tests currently emit one upstream Starlette TestClient deprecation warning suggesting an unfamiliar `httpx2` package. It does not affect production runtime; the package was not added without a justified dependency review.
- This localhost prototype has no authentication, persistence, multi-user isolation, deployment hardening, or production child-safety review.
- OpenAI receives live audio during use. No claim of local-only processing is made.
- No student audio, images, names, or raw utterances should be retained as evidence; use synthetic test speech and redacted event metadata.
- The API key was supplied through the conversation for this run. It is stored only in ignored `.env`, but it should be revoked and replaced after validation because chat disclosure is outside the intended secret-handling path.

### Discoveries and corrections

- The initially proposed root command `uv run --project backend uvicorn app.main:app ...` failed because selecting a uv project does not change the process working directory. The documented Make target now passes `--app-dir backend`; it was retested from the repository root with `/health` returning HTTP 200.
- Root pytest likewise needed the backend config and test path explicitly; `make test` now uses `-c backend/pyproject.toml backend/tests`.
- Pydantic field limits do not enforce a byte cap before JSON parsing. A middleware-level 4 KiB body cap now rejects both declared and streamed oversized requests.
- A configurable upstream host could exfiltrate the standard API key. The backend now pins `https://api.openai.com/v1/realtime/client_secrets`, disables redirects, and ignores proxy environment variables.
- Browser smoke testing exposed `Illegal invocation` because native `fetch` lost its receiver when stored. The client now binds the native function and includes a regression test.
- The final lifecycle audit found late-media leaks, incomplete terminal cleanup, reconnect state carryover, cancelled-tool execution, over-trusting trace IDs, and an arbitrary frontend API base. Each was corrected and covered before the final root suite.
- OpenAI's MIT-licensed TypeScript Agents SDK is a credible way to avoid greenfield Realtime transport work. For this branch, migrating before live validation would discard acceptance-specific coverage and still require custom trace/interruption logic, so it is recorded as a post-M1 consolidation option.
- The supplied trace disproved the assumption that `response.done` means audible playback has stopped. One response completed generation at 33.747 s but remained audible until speech at 42.471 s caused `output_audio_buffer.cleared`. The client now keeps teaching state active through the output-buffer lifecycle and retains settled-response mappings long enough to invalidate late stale deltas.
- The original exporter intentionally dropped the upstream `response.done.usage` object wholesale, so the first live run cannot be priced exactly from the retained trace. The exporter now keeps only bounded numeric token counts and still drops transcripts, audio, tool arguments, and credentials.
- The second trace exposed the opposite boundary: `response.created` can be cancelled by nearly simultaneous speech before any output begins. Such a zero-token pre-playback cancellation must not count toward an audible interruption streak. Marker creation and the visible “speaking” state now both require confirmed output-buffer playback.

### Rollback

- Keep all Realtime protocol payloads and event names inside the frontend adapter.
- If semantic VAD is unstable, revert to documented server VAD and record the comparison.
- Stay on `gpt-realtime-2.1-mini` during development unless measured behavior requires escalation.
- If WebRTC fails, diagnose the handshake and account/model access. Do not silently substitute a different transport.
- Revert root setup with a normal Git revert only after it is committed; do not destructively reset user work.

### Next smallest evidence-backed actions at M1 completion

1. Implement and validate the M2 shared lesson schema and minimal hardcoded projectile op set.
2. Build the deterministic seeded board renderer and fixed concurrent sync without spending live API tokens during routine development.

## 2026-07-15 — M2 established

M1 remains preserved at commit `e6822f5`, and M2 is isolated on `codex/m2-deterministic-board`. The M2 contract was re-audited against `AGENTS.md`, `ARCHITECTURE.md`, `PLANS.md`, and the original build plan. The audited contract overrides the original sequential fallback: fixed mode must begin narration and ink together and retain a partial stroke on interruption.

The dependency audit selected rough.js for stable seeded sketch geometry, KaTeX for formula layout with `trust: false`, mathjs for browser-side compilation after a stricter CHALK expression allowlist, and Ajv for runtime validation of the shared JSON Schema. These libraries replace commodity geometry/typesetting/parsing work; CHALK still owns schema budgets, reference validation, deterministic layout, per-op isolation, animation, state transitions, and Realtime coordination.

Live API use is not required for routine M2 implementation. Credentials remain local, ignored, and outside source control.

### M2 deterministic implementation evidence

The frontend now loads a four-step projectile program through the shared JSON Schema and generated TypeScript types. The minimal M2 DSL contains only `text`, `equation`, `sketch`, `axes`, and `curve`. Ajv validates the wire contract; the defensive decoder separately salvages valid sibling ops while rejecting over-budget steps, duplicate IDs, dangling anchors/axes, unsafe LaTeX, invalid axis ranges, and expressions outside CHALK's allowlist. KaTeX runs with `trust: false`; mathjs compiles only after the stricter AST walk and bounded finite sampling.

The SVG renderer resolves the 1600 × 900 region/anchor layout, caches rough.js geometry by validated op and stable element-ID seed, and reveals immutable paths with normalized dash offsets. The fixed-sync reducer begins animation only after narration activity, weights ops across the word-count duration, freezes without changing progress, rejects stale request/step/cycle events, and advances only after animation, response generation, audio-buffer stop, and a 260 ms drain guard. Realtime narration correlation retains both completion signals in either arrival order.

At 2026-07-15T23:34:37+0530, `make test`, `make lint`, `make build`, `npm --prefix frontend audit --omit=dev`, schema regeneration, and `git diff --check` passed: 91 frontend and 38 backend tests, zero production npm audit findings, and a clean local browser load with no console warning/error. The renderer suite proves stable paths and a visible one-third partial cannon stroke across rerender; the reducer suite completes three consecutive four-step runs. Vite reports a non-blocking chunk-size warning because the restricted mathjs/KaTeX application bundle is about 988 kB uncompressed (298 kB gzip).

At this stage the milestone was not yet accepted. Three live mini-model runs, human judgment of concurrent voice/ink and audible non-overlap, and one microphone interruption during a visibly partial stroke still remained. Deterministic tests were not substituted for that perceptual gate.

## 2026-07-16 — M2 seam audit and hardening

The independent M2 infrastructure audit in `artifacts/audit/2026-07-16-m2-infra-audit.md` was checked against the implementation rather than accepted wholesale. Seven M2-critical findings were confirmed and fixed: rejected narration now releases its correlation lock and resets the lesson safely; an in-progress lesson resets when its Realtime connection ends; the decoder enforces the shared 240-character script cap; lesson responses use bounded Realtime response metadata so an unrelated VAD response cannot claim the pending narration; animation starts only on `output_audio_buffer.started`, not transcript generation; curve validation and rendering share the axes domain and sample density while clipped runs render as separate segments; and dense region layout remains inside its region.

The response-correlation design follows the current official Realtime contract: client `event_id` identifies a rejected request, while response `metadata` disambiguates simultaneous responses. Metadata contains only CHALK request/step/cycle identifiers and purpose—never narration, transcript, audio, credentials, or tool arguments. Resume remains deliberately step-level: ink continues from its frozen position while the short current script restarts, but the button now remains disabled until Q&A generation/playback is idle. Word-level alignment is still out of scope.

The audit's request to commit immediately was rejected because `AGENTS.md` requires the relevant acceptance gate to pass first. Backend streaming/ASGI concerns belong to M3, while axes decoration and bundle splitting are non-gating cosmetics/performance work. `.env` remains ignored and no environment file is tracked.

At 2026-07-16T13:04:01+0530, 100 frontend and 38 backend tests passed. Frontend ESLint, TypeScript, Vite production build, backend Ruff lint/format, Python compileall, deterministic schema regeneration during `npm test`, `npm audit --omit=dev` (zero findings), `git diff --check`, and a disconnected in-app browser smoke passed. The browser rendered the M2 shell with the logical `1600 × 900` board, no board warning, and no console warning/error. The Vite chunk-size warning remains non-blocking. At that point the three-run microphone/perceptual gate remained pending, so no M2 commit had been created.

## 2026-07-16 — M2 live three-run evidence captured

The hardcoded four-step projectile lesson reached `DONE` three times in the Codex in-app browser using `gpt-realtime-2.1-mini` with voice `marin`. A playback-backed interruption froze visible ink at 19%, retained the partial stroke, settled with zero stale output, and resumed to completion. Later speech detections exercised the same recovery path repeatedly. Resume remained unavailable while Q&A audio was active and became available after `output_audio_buffer.stopped`; no simultaneous playback buffers were observed. The final session ended at 13,589 / 20,000 tokens and was disconnected immediately after `DONE 3 / 3`.

ID-free machine evidence is checked in at `artifacts/evidence/m2-deterministic-board-live-summary.json`. On 2026-07-16 the owner explicitly confirmed that ink felt concurrent with narration and that consecutive narration did not overlap. That confirmation closes the final live acceptance item; M2 now satisfies every exit condition and is eligible for its checkpoint commit.

## 2026-07-16 — M2 accepted

M2 is complete. The deterministic five-op whiteboard, validated renderer, fixed concurrent synchronization, response correlation, partial-stroke freeze/resume, disconnect/rejection recovery, three consecutive live four-step runs, and owner perceptual gate all pass. A final local checkpoint gate then passed with 100 frontend and 38 backend tests, lint/format, TypeScript/Vite build, Python compileall, zero production npm audit findings, valid evidence JSON, secret-pattern scanning, and clean diff hygiene. The passing checkpoint is the baseline for subsequent visual or pacing fine-tuning; response-coordinator, VAD-policy, out-of-band narration, manifests, live generation, and paced-sync changes remain deliberately outside this checkpoint.

## 2026-07-16 — M4 cached interaction slice

Status at this implementation checkpoint: **deterministic implementation complete; one minimal live rehearsal pending**. Superseded by the accepted live retest recorded below.

### Scope and decisions

- Default demo mode now uses a product tutor prompt, hides protocol evidence panels, and exposes no diagnostic tool. `VITE_CHALK_MODE=diagnostics` retains the M1/M2 evidence workflow and `debug_echo`.
- Sketch source strokes reveal sequentially by deterministic path-length weight; rough variants of one source stroke remain concurrent.
- A bounded response coordinator assigns manual narration/checkpoint prompts by metadata and VAD-created answers by an explicitly armed purpose. Resume clears a matching unbound Q&A reservation so a false detection cannot poison a later checkpoint.
- The tutor receives a compact manifest built only from successfully rendered, fully revealed geometry. Context and temporary checkpoint guidance replace session instructions serially and wait for `session.updated` before a dependent scripted response.
- Step 2 now has explicit checkpoint asking, listening, and feedback phases. Early student speech safely moves directly from asking to feedback, and advancement still requires generation, playback-stop, and drain settlement.
- Full-script resume remains the accepted M2 fallback. Word slicing was rejected because board progress is not spoken-word alignment. Transcript-delta pacing and duration-only false-freeze auto-resume remain deferred until measurement provides a reliable correction/classifier. Static whole-lesson context was rejected because it exposes future board state.

### Validation evidence

| Date/time (Asia/Kolkata) | Check | Command/procedure | Result | Notes/evidence |
|---|---|---|---|---|
| 2026-07-16T14:58+0530 | M4 deterministic implementation gate | `make test`; `make lint`; `make build`; `npm --prefix frontend audit --omit=dev`; `git diff --check` | Pass | 115 frontend tests in 16 files and 38 backend tests passed; ESLint, Ruff lint/format, TypeScript, Vite, Python compileall, production audit, and diff hygiene passed. The known non-blocking ~996 kB uncompressed Vite chunk warning remains. |
| 2026-07-16T14:58+0530 | Local serving check | Start Vite and request `http://localhost:5173/` with `curl --fail` | Pass | Vite served the current HTML on localhost. This is not visual browser evidence. |
| 2026-07-16T14:58+0530 | Disconnected browser smoke | Reload the existing localhost in-app browser tab after starting Vite | Blocked by browser policy | The browser-control surface rejected the localhost reload by URL policy. No workaround or credentialed API call was attempted; the human browser and live checkpoint/perception gate remain pending. |

The deterministic M4 slice was committed as `232a828` on `codex/m4-cached-interaction-loop`. M1 (`e6822f5`) and M2 (`4f3d9ed`) remain preserved as rollback points. Documentation was then reconciled across the repository; historical audit reports and the original product brief retain their original dated content with explicit status notices rather than rewritten history.

## 2026-07-16 — M4 microphone feedback hardening

The first owner rehearsal visibly froze in `QA` during step 1 and the tutor appeared to answer itself. The state evidence confirms a VAD speech-start event—not a checkpoint transition—so the most credible cause is the continuously enabled microphone capturing speaker output or ambient audio. Browser echo cancellation is retained, but is not treated as a sufficient demo-control boundary.

Commit `c0d6f48` implements deliberate one-turn input gating. The captured track remains muted after connection; **Speak** enables it; `input_audio_buffer.speech_stopped` automatically mutes it at the documented end of the user turn; assistant playback also force-mutes as a safety backstop. This preserves intentional barge-in without using the rejected sub-400 ms false-alarm heuristic.

At 2026-07-16T15:37+0530, `make test`, `make lint`, `make build`, `npm --prefix frontend audit --omit=dev`, and `git diff --check` passed: 116 frontend and 38 backend tests, zero production vulnerabilities, and the existing non-blocking Vite chunk warning. Live confirmation that self-triggering is gone remains pending.

## 2026-07-16 — M4 cached interaction slice accepted

The owner reloaded and reran the published post-fix checklist, then reported “passed.” This closes the cached-interaction D6 gate: deliberate **Speak** input no longer produced the observed self-response loop, interruption/recovery remained usable, and the tutor-initiated checkpoint accepted the answer, responded, and advanced. This entry records owner-observed acceptance only; no machine trace, exact latency, token usage, or broader three-run claim is inferred.

The completed execution plan is now `docs/exec-plans/completed/m4-cached-interaction-loop.md`. The broader M4 work—deixis overlays, annotation, two additional cached lessons, and its full three-run gate—remains pending. M3 live lesson generation is the next product-enabling milestone if approved.

## 2026-07-16 — M3 started

M3 is isolated on `codex/m3-live-lesson-generation` from the accepted cached-interaction checkpoint `e0c0aa8`. The active execution record is `docs/exec-plans/active/m3-live-lesson-generation.md`. The audited scope is a real vertical slice: topic request, server-owned Responses API streaming, per-line schema and semantic validation, at most two scoped repairs, CHALK-owned NDJSON envelopes, browser cancellation/stale-event rejection, generated lesson playback, and a cached fallback.

The current official OpenAI documentation was checked before implementation. It confirms `POST /v1/responses` with `stream: true`, typed SSE events including `response.output_text.delta` and `response.completed`, and the documented `gpt-5.6-terra` model. This verification changed no runtime code and made no credentialed request. The ten-topic live evaluation remains an explicitly controlled later gate; starting M3 is not treated as approval to spend that batch budget.

## 2026-07-16 — M3 deterministic implementation passed

The bounded live-generation vertical slice is implemented. `POST /lesson` terminates upstream Responses SSE in the backend and projects only CHALK-owned `application/x-ndjson` envelopes. Each candidate step passes the checked-in JSON Schema, semantic budgets, accepted-ID/reference state, axes checks, and a non-evaluating Python AST expression allowlist. Invalid candidates receive at most two scoped JSON-mode repair attempts and are revalidated; no raw model line is forwarded. Stream time, bytes, candidate count, repairs, concurrency, request bodies, output tokens, topics, and logs are bounded or redacted.

The browser validates the stream schema and complete accepted lesson prefix before rendering, handles arbitrary UTF-8/chunk boundaries and final lines, rejects stale request IDs, aborts replaced requests, and accepts only the expected NDJSON media type. A terminal failure after useful output retains the validated prefix; zero surviving steps load the accepted cached projectile path. A manual topic form and the Realtime tutor's nonblocking `teach` tool both enter the same generation path. Ten deterministic golden lessons now cover representative calculus, trigonometry, mechanics, vector, exponential, and wave topics.

At 2026-07-16T18:21+0530, `make test`, `make lint`, `make build`, `npm --prefix frontend audit --omit=dev`, and `git diff --check` passed: 140 frontend and 68 backend tests, current generated schema types, ESLint, Ruff lint/format, TypeScript/Vite, Python compileall, zero production npm findings, and clean diff hygiene. The final audit added explicit invalid UTF-8, upstream transport failure, generation-timeout, zero-step terminal failure, and partial-prefix retention regressions before accepting the deterministic gate. Vite retains its known non-blocking large-chunk warning. The owner reported the current browser smoke “passed.” Because that report did not include a board-model ID, timing, trace, ten-topic outcomes, or reviewer screenshots, it is recorded only as a browser smoke—not as the M3 live exit gate.

M3 therefore remains active. The only acceptance work left is explicitly controlled live evidence: one bounded Terra access/smoke call, then (with owner approval) the ten-topic rubric, first-valid-visible-stroke timing, redacted artifacts, and human layout review. At least eight of ten topics must pass and the renderer must have zero crashes before M3 can be committed as accepted.

## 2026-07-16 — M3 live-evaluation path prepared without API spend

The remaining live gate no longer depends on ad hoc commands. `app.m3_evaluation` contains the fixed ten-topic rubric and refuses to start without `--approved-by-owner`. When approved, it sends one request per topic sequentially, never retries or parallelizes, stops on access/configuration failures, validates every returned CHALK envelope again, and retains the raw synthetic-topic NDJSON. Its summary records only topic keys, model and prompt hashes, first-valid-step/terminal timings, accepted-step/repair/drop counts, terminal codes, and empty screenshot/human-review fields. The standard API key, authorization headers, client UUID, student context, and logs are not written to the summary.

The product diagnostics now covers the other timing boundary: the backend returns bounded model and SHA-256 prompt metadata, the browser timestamps the first validated step, and the board reports only when geometry is actually visible. **Copy M3 timing** exports the redacted request-to-step and step-to-ink measurements after completion. A diagnostics-only importer revalidates captured NDJSON and reveals it step by step for screenshots and human layout review, avoiding a duplicate ten-topic generation batch.

The harness refusal path was exercised without the approval flag and correctly exited before any network request. Deterministic tests cover raw capture, localhost-only routing, metadata allowlists, captured-stream request-ID integrity, and one-shot visible-ink measurement. A fresh local diagnostics load displayed **Review captured lesson without regenerating** and produced no browser console warning/error. At 2026-07-16T18:37+0530, the expanded root gate passed with 143 frontend and 73 backend tests, lint/format, TypeScript/Vite build, Python compileall, zero production npm vulnerabilities, secret-pattern scanning, and clean diff hygiene. No credentialed request was made in this preparation work.

## 2026-07-16 — M3 evidence acceptance made mechanical

`app.m3_evidence` is a read-only final gate over the future live evidence directory. It revalidates every retained raw envelope, request-ID and terminal/count consistency, exact fixed-topic order, Terra and prompt-hash identity, screenshot existence and file signature, bounded reviewer notes, explicit schema/render/layout/crash verdicts, and the representative browser timing components. It requires zero renderer crashes, at least eight complete human passes, a non-partial representative lesson, and request-to-first-visible-ink below 6,000 ms. Summary totals and the explicit exit-gate flag must match the underlying evidence; missing values never default to success.

Synthetic-package tests prove a complete package passes while missing human layout review, slow first ink, and evidence-path traversal fail. This closes the last deterministic ambiguity around D9 but does not substitute for the approved live calls or human judgment.

At 2026-07-16T18:42+0530 the final no-spend gate passed with 143 frontend and 76 backend tests, lint/format, TypeScript/Vite build, Python compileall, zero production npm vulnerabilities, secret-pattern scanning, and clean diff hygiene. The known non-blocking Vite chunk-size warning remains.

## 2026-07-16 — M3 qualification moved to Luna

The owner chose `gpt-5.6-luna` as the first board-model qualification tier. Current official model guidance positions Luna as the efficient GPT-5.6 tier, and its standard input and output rates are 60% below Terra. This is a cost decision, not a weaker acceptance decision: the live gate remains ten fixed topics, at least eight full schema/render/layout passes, zero renderer crashes, and representative first visible ink below six seconds.

The checked-in and local `BOARD_MODEL` defaults now use Luna, while the runtime allowlist retains Terra and Sol for explicitly approved escalation. `GET /health` exposes only the non-secret configured board-model ID and configured boolean. The live harness checks that response before creating an evidence directory or issuing any lesson call, then rechecks response headers during the batch in case configuration changes. An unconfigured or stale Terra process therefore spends zero lesson calls and cannot be mislabeled as Luna evidence. If Luna fails, only the failed topics should be compared on Terra under a new explicit approval; mixed-model evidence cannot satisfy the Luna gate.

Targeted model-switch checks passed: 21 backend tests covering generation, evaluation, and evidence plus all 11 lesson-stream client tests. One initially mistyped Vitest path found no tests and was corrected immediately; it made no network request. After adding the zero-spend health preflight, the final no-spend gate passed with 143 frontend and 81 backend tests, ESLint, Ruff lint/format, TypeScript/Vite production build, Python compileall, zero production npm vulnerabilities, checked-in secret scanning, and clean diff hygiene. The known non-blocking Vite chunk-size warning remains. No credentialed request was made.

## 2026-07-16 — M3 one-call smoke made structurally safe

The documented order required one bounded Luna access smoke before deciding on the ten-topic rubric, but the prepared CLI exposed only one approval flag and that flag launched the entire batch. That was an operator-safety defect: an instruction to run “one smoke” had no one-call implementation.

`app.m3_evaluation` now has explicit `smoke` and `batch` subcommands. Both require their own `--approved-by-owner` acknowledgement after the mode name. Smoke performs the free health/model preflight and then exactly one projectile `POST /lesson`, with no retry, no parallelism, and no Realtime/narration session. It retains validated raw NDJSON and a distinct `chalk.m3-live-smoke.v1` summary; that artifact is diagnostic and cannot pass the ten-topic evidence verifier. Batch behavior and its fixed topic order remain unchanged.

Focused tests prove both subcommands refuse before calling a runner without their acknowledgement, approved smoke cannot route to batch, smoke invokes exactly one topic, and its summary records one expected and attempted topic. The real unapproved smoke command exited with the expected refusal before creating its output directory. The complete no-spend gate then passed with 143 frontend and 85 backend tests, ESLint, Ruff lint/format, TypeScript/Vite build, Python compileall, zero production npm vulnerabilities, checked-in secret scanning, and clean diff hygiene. No credentialed request was made.

## 2026-07-16 — First Luna smoke failed safely

The owner explicitly approved one Luna smoke and no broader spend. The backend was started without reload, the free `/health` preflight reported a configured `gpt-5.6-luna` board model, and the `smoke` subcommand issued exactly one `POST /lesson`. It did not connect Realtime, did not narrate, did not retry, and could not route to the batch. The backend was stopped after evidence inspection.

The retained package is `artifacts/evidence/m3-smoke-20260716-202350/`. Luna access succeeded. The validated CHALK stream contains three accepted steps with 14, 13, and 17 spoken words; their op sets are text/equation, equation/axes, and curve/equation. There were zero repairs and zero drops. The smoke still failed: the first valid step arrived at 8,947.8 ms, the terminal arrived at 10,765.7 ms as `invalid_stream`, and `smoke_pass` is false. This cannot be counted as the M3 access/stream pass, the six-second gate, or batch approval.

Current official Responses documentation was checked after the failure and still specifies typed `response.output_text.delta` events followed by `response.completed`; the implementation therefore does not accept an undocumented terminal substitute. The best-supported local inference is a byte-accounting defect: the 128 KiB model-output limit was applied to the entire SSE transport, whose terminal event includes the full response object. The smoke did not retain upstream event sizes, so this cause is not claimed as live-proven.

The fix keeps three independent safety bounds: 2 MiB for complete upstream SSE transport, 128 KiB for cumulative model-authored text deltas, and 16 KiB per JSONL line. Regression tests prove terminal-event overhead above 128 KiB no longer consumes the model-text budget while text and transport remain separately bounded. The low-effort smoke also missed latency before rendering. Official GPT-5.6 guidance supports `reasoning.effort: none` and identifies it as the latency baseline, so `BOARD_REASONING_EFFORT=none` is now explicit in config, health, upstream requests, response metadata, captured evaluation summaries, browser timing export, and final evidence verification. `low` remains allowlisted only for a measured quality comparison.

The corrected path passes the complete no-spend gate: 143 frontend and 95 backend tests, ESLint, Ruff lint/format, TypeScript/Vite build, Python compileall, zero production npm vulnerabilities, checked-in secret scanning, clean diff hygiene, and an explicit assertion over the retained failed-smoke summary. The known non-blocking Vite chunk warning remains. No second live call was made. A fresh one-call smoke approval is required; the ten-topic batch is not justified.

## 2026-07-16 — Corrected Luna smoke passed

The owner separately approved exactly one corrected Luna smoke. Before spending, the command path, `.env` model/effort values, split byte limits, and diff hygiene were inspected; 71 relevant backend tests passed. A free `/health` preflight then confirmed the running server was configured for `gpt-5.6-luna` with `reasoning.effort: none`. The smoke issued exactly one `POST /lesson`, with no retry, Realtime session, narration, or batch. A harmless zsh wrapper error occurred only after the harness had written its passing result; the request was not repeated.

The retained package is `artifacts/evidence/m3-smoke-corrected-20260716-204203/`. Its summary and raw NDJSON were independently asserted after the run: one start, four schema-valid steps, one normal `lesson.done`, zero errors, zero repairs, and zero drops. The first valid step arrived in 2,865.1 ms and the terminal in 5,156.2 ms, so the backend stream was both correct and inside the six-second first-step target. The backend was stopped immediately after inspection. The production frontend decoder then loaded that exact retained NDJSON as one complete, non-partial four-step lesson. All 24 focused stream/board/golden rendering tests passed, and a local diagnostics load produced no console warnings or errors. No additional model request was made, and the temporary verification script and diagnostics server were removed/stopped.

This passing smoke satisfies the M3 one-call access/stream prerequisite and provides live evidence for the split byte-accounting correction and `none` latency baseline. It does not substitute for the ten-topic 8/10 rubric, human layout review, screenshots, or actual browser first-visible-ink timing. Those remain unrun and require separate approval; no batch authority is inferred from this smoke approval.

## 2026-07-16 — First Luna batch attempt stopped after one topic

The owner separately approved the fixed ten-topic Luna batch. Before spending, `git diff --check`, the CLI mode and fixed-topic loop, the runtime `gpt-5.6-luna`/`none` configuration, 71 relevant backend tests, and the free live health identity check all passed. The batch began sequentially with no retries and no Realtime usage. Its fail-fast rule stopped after the first derivative request returned a terminal `upstream_rejected`, so the approval resulted in exactly one paid lesson call, not ten. The backend was stopped immediately and no retry was attempted.

The retained package is `artifacts/evidence/m3-luna-batch-20260716-210607/`. The derivative stream is useful but not passing acceptance evidence: three schema-valid steps arrived with zero repairs and zero drops, the first at 2,503.1 ms, followed by `lesson.error` with code `upstream_rejected` at 4,375.0 ms. Model, reasoning effort, and both prompt hashes matched the qualification contract. Valid output rules out an initial primary HTTP rejection, but it does not rule out a later repair-call rejection or a collapsed streaming terminal. The old evidence therefore cannot establish whether access/configuration played any part after generation began.

The audit found a diagnostic and harness classification gap. `_stream_model_lines` maps an HTTP error, `response.failed`, `response.incomplete`, and a generic streaming `error` into the same `upstream_rejected` code. `ACCESS_FAILURE_CODES` then treats that collapsed code as an access failure and stops the batch. Current official Responses documentation states that `response.incomplete` includes the incomplete Response and its `incomplete_details`; the adapter did not retain an allowlisted terminal category or reason, so the exact upstream outcome of this call cannot be recovered. Existing deterministic tests cover ordinary completion and transport failure but not incomplete/failed termination after valid step deltas.

No inference that the response hit a token limit is recorded, and no code fix or second live call was made under the consumed approval. That approval ended with this attempt. The deterministic follow-up below distinguishes terminal classes without retaining content, covers post-valid-output failure, and separates a failed topic from repeatable identity/access/configuration/transport stop conditions. Any fresh batch still requires new explicit approval.

## 2026-07-16 — Upstream terminal classification fixed

The deterministic follow-up is complete; no credentialed request was made. The backend now maps HTTP rejection, `response.incomplete`, `response.failed`, generic streaming `error`, transport unavailability, and local parsing/timeout outcomes to distinct CHALK-owned terminal codes. Upstream detail is reduced to one closed reason category (`max_output_tokens`, `content_filter`, `rate_limit`, `authentication`, `permission`, `server_error`, `invalid_request`, or `unknown`). Arbitrary upstream codes, messages, and response bodies are neither forwarded nor logged.

The stream schema now separates errors that may carry an upstream reason from local errors that cannot. Frontend types were regenerated from that schema, the browser keeps a validated reason on both partial-prefix results and zero-step failures, and the evaluation summary records the same bounded value. Existing evidence remains valid and unchanged. In particular, `artifacts/evidence/m3-luna-batch-20260716-210607/` still says only `upstream_rejected`; because the server discarded the original upstream event under the old contract, its precise cause cannot be recovered after the fact.

The batch policy was also corrected. It proceeds to the next fixed topic without retry only when the bounded reason is clearly topic-scoped: `max_output_tokens` or `content_filter`. It stops early on a board-model or reasoning mismatch, missing configuration, HTTP rejection, transport unavailability, or any other, missing, or unknown upstream reason. This preserves useful topic-level quality evidence while preventing an ambiguous, repeatable, or infrastructure fault from consuming the remaining call budget.

Regression coverage includes incomplete, failed, and generic error terminals after accepted output; terminal events arriving during final SSE flush; allowlisted and unknown reason mapping; upstream message/body redaction; HTTP status classification; schema rejection of arbitrary reasons and reasons on local failures; browser propagation; and both batch continuation and fail-fast behavior with no retry. The complete no-spend gate passes 146 frontend and 115 backend tests, ESLint, Ruff lint/format, TypeScript/Vite build, Python compileall, zero production npm vulnerabilities, tracked-secret scanning, and `git diff --check`. The existing Vite bundle-size warning and Starlette TestClient deprecation warning remain non-blocking. The next action is not another code fix: it is a fresh, explicit approval for a new ten-topic Luna batch, followed by local evidence review, browser first-visible-ink measurement, screenshots, and human layout judgments.

## 2026-07-16 — M3 spend and evidence hardening passed

An independent audit correctly identified prospective evidence and budget gaps around repair calls and batch termination. Its stronger historical suggestion—that the 21:06 failure probably occurred during repair—is not supported by the retained stream: the old adapter also collapsed multiple streaming terminal classes. The prior cause remains unknown, and no historical artifact was rewritten.

The implementation now owns one four-call repair budget per lesson in addition to the primary generation call. Each repair is counted before dispatch, including HTTP rejection, transport failure, and timeout. Every current terminal envelope carries only a closed `generation` or `repair` origin and the bounded repair count; the schema keeps those fields optional solely to decode historical streams. The browser and evaluator preserve the fields without forwarding upstream detail. Output arriving after `response.completed` is now rejected as an invalid stream rather than silently accepted.

The ten-topic harness now stops at the third machine failure because the required 8/10 result is mathematically unreachable. If a paid topic path raises locally, it recovers only safe counts from already-written valid envelopes, reduces the exception to a closed category, writes a `chalk.m3-live-evaluation.v2` summary, and stops; private exception text is not retained. The evidence verifier requires v2, no stop reason, and at least eight independently recomputed machine-complete topics. Future smoke summaries use `chalk.m3-live-smoke.v2` and `one_topic_no_retry`, making clear that bounded repairs are calls within one topic rather than topic retries; retained v1 smokes remain unchanged. Automatic resume remains deliberately absent because it could duplicate paid calls. The backend also rejects non-local Host headers before `/lesson`, closing the localhost DNS-rebinding path to the paid endpoint.

The complete no-spend gate passes 147 frontend and 128 backend tests, ESLint, Ruff lint/format, TypeScript/Vite build, Python compileall, zero production npm vulnerabilities, tracked-secret scanning, and `git diff --check`. Coverage includes repair HTTP/transport/timeout attribution, aggregate repair exhaustion, historical-envelope compatibility, third-failure stops across local and upstream categories, redacted crash summaries with partial-count recovery, output after terminal, evidence-v2 enforcement, and hostile Host rejection before an upstream call. The existing Vite bundle-size and Starlette TestClient deprecation warnings remain non-blocking. No live API call was made. A new ten-topic Luna batch still requires fresh explicit approval.

## 2026-07-16 — Second Luna batch isolated a repair-request rejection

The owner explicitly approved one fresh fixed ten-topic Luna batch. Before spending, `git diff --check`, 65 focused backend tests, local `gpt-5.6-luna`/`reasoning.effort: none` configuration, a free live health check, and the three circuit-breaker paths passed. The backend ran without reload. The harness made topic requests sequentially, never retried, and stopped before topic five when the fourth topic met an immediate-stop condition. The backend was then shut down; port 8000 was confirmed free.

The retained `chalk.m3-live-evaluation.v2` package is `artifacts/evidence/m3-luna-batch-20260716-222005/`. Derivative, chain rule, and integral area each completed with four accepted steps, zero repairs, zero drops, and first valid output at 3,981.1 ms, 1,649.2 ms, and 1,994.7 ms respectively. Unit circle produced no accepted step: its first repair request returned `upstream_rejected` with the closed reason `invalid_request`. The new origin/count fields prove this was repair—not primary generation—and that exactly one repair request occurred. The run made four primary topic requests plus one rejected repair request; there was no retry or fifth topic. The evidence does not establish whether the rejected request was billed. The standard evidence verifier rejects the package as intended because only four topics ran and human/timing review is absent. It is diagnostic evidence, not M3 acceptance.

## 2026-07-16 — Repair path corrected and isolated probe prepared

Current official OpenAI documentation says GPT-5.6 Luna supports the Responses API and Structured Outputs, and documents `text.format` as the Responses formatting surface. The live failure nevertheless isolated `invalid_request` to the repair-only request shape; primary requests with the same model, effort, authentication, input family, and output-token controls completed. The repair request's nonessential `text.format=json_object` field was therefore removed. Repair now uses the same plain-text Responses surface as primary generation. The repair prompt still demands exactly one JSON object, and every result must still pass JSON parsing, the checked-in schema, semantic/reference validation, and lesson budgets before acceptance. No safety boundary was weakened.

To avoid consuming another batch as a repair probe, `app.m3_evaluation repair-smoke` is now a separate owner-gated mode. It sends one fixed synthetic invalid step through the production repair function, performs exactly one repair call with no retry or primary generation call, validates the returned step, and writes only model/effort, prompt hash, timing, and closed pass/failure metadata. Generated repair content is never retained, and the command cannot route to topic smoke or batch. Deterministic tests prove refusal without its own approval, one-call execution, content-free evidence, and route isolation. The complete no-spend gate passes 147 frontend and 131 backend tests, lint/format, build/compile, zero production npm vulnerabilities, tracked-secret scanning, and diff hygiene. No further live call was made. The next permitted spend, if separately approved, is exactly one repair smoke—not another batch.

## 2026-07-16 — Corrected Luna repair path passed

The owner separately approved exactly one Luna repair smoke. Before spending, `git diff --check`, 63 focused backend tests, local Luna/`none` configuration, route isolation, and the absence of a running backend passed. `repair-smoke` then issued exactly one direct production repair request. It made no primary lesson request, topic smoke, batch request, Realtime connection, or retry.

The repaired step passed the checked-in schema and semantic validator. The request completed in 2,767.0 ms. The retained artifact is `artifacts/evidence/m3-repair-smoke-20260716-223721/summary.json`; it records `repair_pass=true`, one attempted repair call, Luna/`none`, the repair-prompt SHA-256, and null terminal/harness errors. Its exact key set and values were asserted after the call. The directory contains only the 498-byte summary: scans found no credential, authorization value, synthetic input, generated repaired content, or probe IDs. No backend process was running before or after the probe.

This closes the repair-path prerequisite created by the 22:20 batch failure. The repair-smoke approval is consumed and does not authorize another request. The next live action is a newly approved fixed ten-topic Luna batch; if that completes, the remaining work is local captured-stream rendering, screenshots, human layout verdicts, and representative browser first-visible-ink evidence.

## 2026-07-16 — Fixed ten-topic Luna batch passed the machine gate

The owner separately approved one fixed ten-topic Luna batch. Before spending, `git diff --check`, 68 focused backend tests, local Luna/`none` configuration, a free health identity check, and the absence of another backend passed. The backend ran without reload. The evaluation harness made exactly ten sequential topic requests, never retried, and did not stop early. It then exited successfully and the backend was stopped; port 8000 was confirmed free.

All ten fixed topics completed with four accepted steps each: 40 accepted steps, zero repairs, zero drops, no terminal error, and no harness error. First-valid-step latency ranged from 1,161.6 ms to 3,012.7 ms; the slowest topic was unit circle, still below the six-second request-to-first-valid-step component of the target. The retained `chalk.m3-live-evaluation.v2` package is `artifacts/evidence/m3-luna-batch-20260716-224159/`. Its summary and ten small raw NDJSON files passed independent machine identity/completeness checks, and secret scanning found no credential.

This is a machine-generation pass, not yet the complete M3 acceptance gate. The read-only evidence verifier now fails only the deliberately empty local fields: per-topic render, layout, renderer-crash, screenshot, and bounded reviewer-note evidence, plus one representative product-path first-visible-ink record. No further model call is authorized by the consumed batch approval. The next work is local captured-stream review without regeneration, followed by a separately authorized representative connected product check only if one is still required to obtain honest first-visible-ink evidence.

## 2026-07-17 — M3 local render and human-layout gate passed 9/10

The retained ten-topic Luna batch was replayed locally through the production NDJSON decoder and board renderer without contacting the backend, Realtime API, or board model. The first visual pass exposed a deterministic renderer defect rather than a model-quality miss: long handwritten labels and KaTeX equations clipped inside fixed boxes, and broad `left`/`right`/`full` placements could overlap grid-cell placements. The renderer now wraps and size-fits handwritten text, size-fits equations, avoids material cross-region collisions while preserving curve/axes overlays, and separates axis names from endpoint values. Focused coverage proves broad/grid collision avoidance, long-label wrapping, the ten golden renderer fixtures, and existing stable partial-stroke behavior.

All ten captured streams then loaded locally with no board warning, console warning/error, or renderer crash. Final screenshots and bounded human notes are retained under `artifacts/evidence/m3-luna-batch-20260716-224159/`. Nine topics pass schema, render, and human layout review. Exponential growth/decay remains an explicit layout failure: the combined doubling-time/half-life equation is present but too small for comfortable demo readability. The evidence summary records `human_pass_topics=9`, zero crashes, per-topic verdicts, and `exit_gate_pass=false`.

The full frontend gate passes 149 tests across 18 files, plus ESLint, TypeScript, and the Vite production build. The existing bundle-size warning remains non-blocking. The read-only backend verifier now reports exactly two expected issues: the summary does not mark the exit gate passed, and the representative timing file is missing. No credentialed call was made. Current relevant runtime behavior remains diagnostics-only local replay plus the normal demo path; no evidence-directory serving hook remains in product code. The next smallest task is one explicitly authorized connected product-path first-visible-ink measurement. Until that exists, M3 remains open and no timing claim is made.

## 2026-07-17 — Accumulated-whiteboard prompt iteration prepared

The default `BOARD_PROMPT_VERSION=v2` prompt now explicitly asks for one progressive spatial argument: top-left-to-bottom-right teaching order, adjacency through anchors, coherent graph/explanation reservations, reuse of visible context, and no filler. It directs short identities and labels to the handwritten `text` op and reserves KaTeX equations for genuinely structured notation. The worked derivative example follows that rule. Remaining structured KaTeX output uses the existing chalk palette with a subtle chalk-softening treatment rather than stark pasted-document styling. The exact qualified prompt remains available as the runtime `v1` fallback; both the upstream request and response prompt hash follow the selected version.

This prompt edit creates a new prompt SHA-256 and therefore a new live experiment. The retained ten-topic package at `artifacts/evidence/m3-luna-batch-20260716-224159/` remains unchanged and comparable only to its captured `v1` prompt hash; none of its verdicts or screenshots were relabeled. The demo UI still exposes no narration transcript, and synchronization/evidence chrome remains diagnostics-only, so no subtitle bar was added or moved. A local demo-mode browser load confirmed zero sync/diagnostic strips and no console warning or error, then the preview server and tab were closed. Verification passed with 149 frontend tests and 134 backend tests, ESLint, Ruff lint/format, TypeScript, Vite production build, and diff hygiene; the existing Vite chunk-size warning remains non-blocking. No credentialed request was made. Requalifying `v2` or collecting a hash-matched representative connected timing record requires its own explicit owner approval under the documented call ceilings.

## 2026-07-17 — Accumulated-whiteboard v2 passed the 8/10 rubric

After the exact batch ceiling was stated, the owner approved one v2 ten-topic Luna batch. Before spending, 71 focused tests, diff hygiene, exact v1 evidence-hash preservation, the distinct v2 prompt hash, Luna/`none`/v2 settings, configured-key boolean, and idle ports all passed. The harness free health preflight then succeeded. It made exactly ten sequential primary topic calls, no topic retries, no repair calls, and did not stop early. All ten topics completed with 39 accepted steps, zero drops, no terminal or harness error, and first-valid-step latency from 1,421.8 to 2,583.3 ms. The backend was stopped immediately; port 8000 was confirmed free. Identity, stream completeness, and credential scans passed.

The retained package is `artifacts/evidence/m3-luna-v2-batch-20260717-0635/`, with board prompt SHA-256 `bdcb2d54250af75cec3877a684f46292e79f52b54bca4705302885275aeaaa5c`. All ten raw streams were replayed locally through the production decoder and renderer at the normal browser viewport. Ten screenshots and bounded notes are retained. There were no board warnings, console warnings/errors, or renderer crashes. Exactly eight topics pass schema, rendering, and human layout review. Unit circle fails because lower-right identities and explanation collide; standing waves fails because node, antinode, and amplitude labels stack into an unreadable block. These failures were recorded rather than excused. Temporary local evidence-serving code was removed, the browser tab and preview server were closed, and ports 5173 and 8000 are free.

The read-only verifier now reports exactly two expected issues: `exit_gate_pass` remains false and the representative timing path is absent. M3 therefore meets its unchanged 8/10 quality and zero-crash thresholds but is not accepted yet. The next smallest task is one separately approved connected v2 product-path timing run: one primary board-model call with at most four repair calls, plus a short `gpt-realtime-2.1-mini` session needed to start visible ink. The consumed batch approval authorizes neither action.

## 2026-07-17 — First v2 timing attempt stopped before credential minting

The owner approved one v2 topic attempt with at most four repair calls plus one short mini-Realtime session, with no retry. The no-spend gate passed 74 focused backend tests, diff hygiene, the hash match against the v2 evidence package, Luna/`none`/v2 and mini-Realtime configuration, configured-key boolean, and idle ports. The backend and diagnostics frontend then started locally.

The in-app browser opened `http://127.0.0.1:5173/`, while the backend's exact allowed frontend origin is `http://localhost:5173`. The first **Connect microphone** action therefore failed at the CORS preflight: the backend recorded only `OPTIONS /session` with HTTP 400. No `POST /session`, OpenAI client-secret request, board-model request, repair request, Realtime connection, lesson generation, or retry occurred. The browser retained only the closed local `connection.failed`/`TypeError` metadata and displayed `Failed to fetch`; no timing was recorded or claimed.

Per the live-check stop policy, the run was not retried under the same approval. Both services were stopped, the browser tab was closed, and ports 5173 and 8000 are free. The deterministic correction for a future separately approved attempt is operational, not architectural: open the product at the configured `http://localhost:5173` origin. The M3 evidence remains unchanged and still lacks only the representative hash-matched timing record.

## 2026-07-17 — M3 accepted with hash-matched first-visible-ink evidence

The owner freshly approved the same bounded timing run: one Luna v2 topic attempt with at most four repair calls plus one short mini-Realtime session, with no further retry. Preflight confirmed clean diff hygiene, the exact v2 evidence hash, configured server key, `http://localhost:5173` origin, v2 prompt selection, mini Realtime, and idle ports. The corrected browser origin connected successfully. The backend minted one ephemeral client secret; the browser observed `session.created` and `session.updated` for `gpt-realtime-2.1-mini` with `marin`.

The product then made exactly one derivative lesson attempt. It completed with four accepted steps, zero repairs, zero drops, and non-partial output. Diagnostics measured 1,355.7 ms from request to first validated step, 1,363.4 ms from validation to first visible ink, and 2,719.1 ms request-to-first-visible-ink. The session used 1,987 total Realtime tokens at disconnect. No topic retry or second lesson call occurred. The Realtime session, browser tab, frontend, and backend were closed immediately after capture; ports 5173 and 8000 are free.

CHALK displayed `Timing copied`, but the browser automation clipboard bridge returned empty. The exact visible product measurements were therefore retained in `timing/representative.json` with a redacted nonessential request-ID suffix and supporting `timing-browser.png`; model, reasoning, and prompt hashes match the v2 batch package. The read-only verifier now passes with ten topics, exactly eight human layout passes, zero renderer crashes, and first visible ink at 2,719.1 ms against the 6,000 ms target. M3 is complete. The next active milestone is broader M4: two additional cached lessons, deixis/annotation, and three full cached MVP rehearsals.

## 2026-07-17 — Broader M4 execution plan activated

The active plan is `docs/exec-plans/active/m4-full-interruption-grounding.md`. It preserves the accepted fixed-sync, manifest, checkpoint, and turn-gated microphone paths. The remaining MVP scope is a committed visible-target inventory; four instant local deixis tools with soft unknown-ID failures; a bounded stale-safe annotation overlay endpoint; curated derivative and unit-circle caches alongside projectile; manifest-publication timing and hash agreement evidence; and three consecutive cached projectile interruption/grounding/resume rehearsals.

Paced synchronization, partial-stroke targeting, widgets, student drawing, and new lesson DSL primitives remain outside this gate. The planned live acceptance ceiling is one freshly approved short `gpt-realtime-2.1-mini` connection for three cached loops, with no board-model or annotation-model call and no automatic retry. No credentialed request was made while planning.

## 2026-07-17 — Broader M4 deterministic implementation

The committed board snapshot now produces both the bounded tutor manifest and the exact fully revealed element inventory used for grounding. `point_at`, `circle_el`, `underline`, and `flash` are strict Realtime tools that render stable browser-local rough overlays and soft-fail unknown, future, failed, or partial IDs. Temporary marks auto-expire and never enter manifest state. Context publication now retains only bounded send-to-acknowledgement latency and an eight-hex factual fingerprint; diagnostics can prove the current visible manifest matches the last acknowledged context without retaining instruction text.

Annotation uses a separate `shared/schema/annotation.schema.json` rather than widening the lesson DSL. It permits at most five target-relative circle, underline, arrow, text, or equation overlays, forbids axes/curves/regions/absolute coordinates/styles/URLs, and validates every target against the request's committed visible IDs on both backend and frontend. `POST /annotate` has a 6 KiB request cap, 32 KiB response cap, 15-second timeout, one-request concurrency lane, one primary call, and at most two counted repairs. Cancellation, replacement, resume, new lesson, reset, and disconnect discard stale results. Local deixis and voice remain the fallback; no annotation call is required for the M4 live gate.

Derivative and unit-circle caches now join projectile under `demo/cached_lessons/`. All three load through the production decoder and render locally without a network path; simple identities use handwritten text. A disconnected diagnostics browser pass selected and loaded all three caches with no console warning/error. That pass exposed an empty-board offline preview, so disconnected cached lessons now deliberately show the fully committed board as `PREVIEW` while the connected teaching path still resets grounding and animates from an empty board. A final visual recheck of that correction remains pending.

The complete no-spend gate passes 179 frontend tests across 22 files and 148 backend tests, ESLint, Ruff lint/format, TypeScript, Vite production build, Python compileall, current generated tracked schema types, zero production npm vulnerabilities, secret-pattern review, and diff hygiene. The secret scan's only key-shaped match is the deliberate `sk-secret-placed-in-wrong-variable` rejection fixture in `backend/tests/test_api.py`; it is not a credential. The existing Vite chunk-size and Starlette TestClient deprecation warnings remain non-blocking. One malformed narrow Vitest invocation found no files before the corrected cache suite and full suite passed; this was a command-path error, not a product failure. No credentialed request was made. Final cache screenshots, retained M4 rehearsal evidence, and the three-loop owner-approved mini-Realtime gate remain pending.

## 2026-07-17 — Space-to-interrupt shortcut

One unmodified Space keydown outside form controls now enters the existing deliberate Speak path. It enables the microphone once, ignores held-key repeats and modified shortcuts, and leaves VAD responsible for speech detection, interruption, automatic microphone shutoff, and the tested freeze/QA transition. The visible guidance now says to press Space; the Speak button remains as an accessible fallback and can still stop listening. Seven focused shortcut tests, frontend ESLint, the TypeScript/Vite production build, and `git diff --check` pass. No credentialed request was made; the running local frontend can be used for the perceptual check.

## 2026-07-17 — Natural-drawing feature plan: deterministic phases implemented

The audit-driven plan `docs/exec-plans/active/natural-drawing.md` executed its five deterministic phases in one session. Browser lesson decoding is now incremental (`decodeStep` plus a decode context): a streamed step the browser rejects costs only that op or step, is counted as `browserDroppedSteps` in stream progress and diagnostics, and the cached fallback activates only when zero streamed steps survive. The `lesson.done` cross-check now compares the server's accepted count against received step envelopes, and a synchronous generation token closes the double-`teach` re-entrancy window.

The backend now mirrors the browser's rendering truth so repair can fire before an unrenderable step streams: `expression_runtime.py` samples every curve at 121 points with a bounded interpreter over the already-validated AST (non-finite/complex, |y| budget, discontinuity, and two-contiguous-visible-samples rules), `latex_lint.py` structurally lints equations (forbidden/unknown commands, unbalanced groups, unpaired `\left`, math-mode `$`), normalization rewrites `**` to `^` and enforces the browser expression charset, scripts must contain a spoken word, and a lesson carries at most one checkpoint. `shared/fixtures/curve-parity.json` and `latex-parity.json` pin the two-sided contract; both suites consume them. The repair prompt names the new issue vocabulary.

Board prompt v3 (`BOARD_PROMPT_VERSION=v3`, prior prompts retained as v1/v2) adds the spatial contract: column/row grid geometry with real proportions, broad-region overlaps, y-down sketch coordinates, axes sizing guidance, curve domain rules, a sketch worked example validated against the production validator, and `visible_board` declared non-anchorable; the browser now sends an empty board state for fresh lessons. Layout switched from count-division slots to flowing per-region cursors and is prefix-stable by construction — a corpus-wide property test over all thirteen cached/golden lessons proves streaming a later step never moves committed ink. Axes and curves joined sketches in sequential stroke reveal with content-length animation weights, cubic ease-in-out per stroke, and axis labels held until their strokes near completion. `teach` during QA now aborts the current lesson (QA → GENERATING as documented), the tutor prompt explains mid-lesson switching, and the live-failure fallback picks the keyword-matched cached lesson instead of always projectile.

Gate status: 250 frontend tests across 27 files, 197 backend tests, ESLint, Ruff lint/format, and `tsc` all pass; no credentialed request was made. Still pending under the plan's verification gates: owner visual re-approval of the three cached lessons under the new layout/choreography, the separately approved prompt-v3 smoke plus ten-topic extended-rubric batch, and the mid-lesson topic-switch live rehearsal.

## 2026-07-18 — Playback-gated paced drawing wired

The reported narration/drawing mismatch exposed a real implementation gap: architecture and configuration documented `SYNC_MODE=paced`, but the browser always ran the fixed word-count clock and discarded transcript progress. The backend now validates `SYNC_MODE` as `fixed` or `paced` and projects it in `/health` and the normalized `/session` response. Review then confirmed that transcript generation can race ahead of audible playout, so fixed remains the default and paced is retained only as an experimental comparison.

Both modes still wait for the documented WebRTC `output_audio_buffer.started` event before starting ink. Paced mode retains only a bounded cumulative transcript-character count and uses it as an approximate 0.5×–3× rate hint; transcript generation never starts drawing. When `output_audio_buffer.stopped` arrives with ink pending, either mode completes the remainder within 400 ms, preventing a long silent drawing tail. A missed start event also recovers from the stronger observed stop signal. The disconnected cached board is now labeled `STATIC PREVIEW` so a completed preview is not mistaken for a synchronized run. Diagnostics display the backend-selected sync mode.

Deterministic verification passes: 256 frontend tests across 26 files, 197 backend tests, frontend ESLint, Ruff lint/format, TypeScript, and the Vite production build. Focused coverage proves transcript progress cannot start ink, pacing-rate clamps, bounded character-only retention, stale correlation, missed-start recovery, and the 400 ms catch-up window. The existing Vite chunk-size and Starlette TestClient deprecation warnings remain non-blocking. No credentialed API request was made. One short owner-approved mini-Realtime cached rehearsal remains required for perceptual acceptance; deterministic tests cannot prove audible word-to-mark alignment.

## 2026-07-18 — Fixed sync restored and shared-canvas physics drawing added

Review of the paced controller confirmed that transcript deltas can complete ahead of audible WebRTC playout, so `SYNC_MODE=fixed` is again the runtime, example, and local default. Paced mode remains behind its explicit flag as an experimental comparison. The topic-switch path now creates the replacement request ID before generation begins, clears the interrupted lesson state, and makes every late old-request event stale. Curve exponent evaluation is recursively capped before exponentiation, closing the nested-power resource-exhaustion path.

Schema 1.1 adds deterministic `line`, `arrow`, `point`, and `angle_arc` operations with closed solid/dashed styling. The first primitive claims a board region; related primitives inherit its normalized y-down coordinate space through an already accepted `canvas_id`. Layout retains a canvas-level occupancy box and a specific element box, so multi-step diagrams remain registered while labels and later anchors target the actual ray, point, or angle. Dashed marks are individual stable rough strokes, arrowheads and angle arcs reveal sequentially, labels wait for most of their diagram ink, and manifest summaries expose only bounded semantic descriptions. The v3 prompt includes the contract and a validated total-internal-reflection example. All three cached lesson files remain untouched.

Deterministic verification passes: 263 frontend tests across 26 files, 201 backend tests, frontend ESLint, Ruff lint/format, Python compileall, TypeScript, and the Vite production build. The local backend was restarted on `127.0.0.1:8000`; `/health` reports `sync_mode: fixed`, and the existing frontend dev server remains on `localhost:5173`. No credentialed API call was made. Remaining live gates are unchanged: a separately approved prompt-v3 smoke/batch, two mid-lesson topic-switch rehearsals, and the measured remote-audio analyser spike before replacing fixed scheduling.

## 2026-07-18 — M4 drawing intelligence techniques implemented

CHALK now borrows the useful control techniques from tldraw's agent template
without adopting its editor or runtime. The current v3 and repair prompts
expand a deterministic 2,371-character wire contract generated from
`lesson.schema.json`; it covers every op variant, field, enum, range, ID rule,
region, and budget. Prompt v1/v2 remain byte-identical, while response evidence
hashes the fully expanded current prompt so prior batches cannot be mixed.

A safe-only sanitizer now runs before schema validation in Python and at the
browser decode boundary. Shared fixtures prove parity for surrounding
whitespace, `**` normalization, and normalized point/anchor-gap clamps within
0.05 of `[0,1]`. It explicitly leaves fuzzy IDs, case, numeric strings,
overlong content, duplicates, inferred geometry, and materially invalid
coordinates untouched. Accepted corrections emit a closed `step_sanitized`
warning plus optional terminal step/field totals; diagnostics display those
separately from repairs and drops, and retained evidence contains no corrected
model text.

Annotation grounding now sends up to 30 committed `{id, kind, bounds}` records,
with three-decimal normalized y-down board bounds, instead of a redundant ID
list. Backend validation derives the target allowlist from that structure and
rejects duplicate, non-finite, zero-size, or off-board elements. The compact
Realtime tutor manifest is unchanged, a worst-case request still fits the 6
KiB cap, and cached lesson files were not edited.

An evaluation-only `python -m app.annotation_vision_smoke` harness is present
but was not run live. It refuses execution without `--approved-by-owner`, uses
one retained synthetic board, performs one structured control followed by one
structured-plus-Base64-image call with `detail: low`, `store: false`, and no
retry, and never retains the image data URL. Structured bounds remain
authoritative; product `/annotate` sends no screenshot. Product integration
requires a separate plan after a human A/B verdict.

The deterministic gate passes: 270 frontend tests across 26 files, 220 backend
tests, frontend ESLint, Ruff lint/format checks, Python compileall, TypeScript,
the Vite production build, generated schema types, and `git diff --check`. The
existing Vite chunk-size and Starlette TestClient deprecation warnings remain
non-blocking. No credentialed API call was made. Next: owner approval for the
two-call annotation vision comparison, or continue the existing prompt-v3 and
M4 live rehearsal gates independently.

## 2026-07-18 — Exponent asymmetry and diagram-quality observations pinned

The shared curve fixture now documents the intentional backend-stricter exponent
cap: `x^40` is a finite, visible curve accepted by the browser sampler, while the
bounded Python interpreter rejects exponents above 32 before evaluation. Optional
per-runtime expectations make that asymmetry explicit without weakening the rule
that every unmarked curve case must agree across runtimes.

The pending prompt-v3 live rubric now explicitly records primitive-label collisions
and diagram fragmentation/cramping. The general four-op step limit remains unchanged
until retained live screenshots show repeated pressure; any later change should be a
tightly bounded diagram-primitive allowance, not a global budget increase. No live
or credentialed request was made.

## 2026-07-18 — Checkpoint cutoff hardened and deterministic visual lints added

Checkpoint prompts no longer treat every `response.done` as successful completion.
An unprompted `cancelled` or `incomplete` checkpoint emits a correlated failure,
stays out of listening, and receives exactly one bounded retry; a cancellation caused
by detected student speech remains the intentional early-answer path. Checkpoint
answer-evaluation guidance is cleared while the question is requested and installed
only after prompt audio begins, removing the contradictory "student is answering"
instruction from question generation.

The browser now computes closed, deterministic layout findings from resolved geometry:
primitive-label overlap, labels escaping their shared diagram canvas, and handwritten
text that cannot fit at the minimum font size. These findings appear only in diagnostics
and never move committed or partially revealed ink. Prompt v3 now chooses a visual
structure appropriate to the concept and applies a word-removal test with evidence-
bearing values. Its fully expanded SHA-256 is
`1ef5b74244e997ba58e3040ae9861f3186d430a7cde78780afd957bc6c9396e6`;
future v3 evidence must use that hash rather than earlier v3 evidence.

Deterministic verification passes: 278 frontend tests across 27 files, 222 backend
tests, frontend ESLint, TypeScript, and the Vite production build. The existing Vite
chunk-size and Starlette TestClient deprecation warnings remain non-blocking. No live
or credentialed request was made. Remaining acceptance is perceptual: the M4 cached
three-loop gate and the separately approved prompt-v3 smoke/batch.

## 2026-07-18 — Blank teaching-step response race closed

The reported run—one short framing sentence followed by `TEACHING · step 1` on an
empty board—was a response-coordination race, not an empty lesson. The filler
`response.create` was registered before the service returned `response.created`, but
the public snapshot exposed only active IDs. Auto-start could therefore enter teaching
during that invisible pending window; the later narration request correctly refused to
overlap the filler, then had no state change that would make it retry.

Realtime snapshots now expose pending registrations immediately. All lesson start,
replay, resume, and generation gates treat pending, active, or playing responses as
busy. Auto-start also rechecks the client's current authoritative snapshot after the
asynchronous board-context acknowledgement, closing the check/use window. Scripted
narration refuses any coordinator in-flight work and emits its current snapshot on a
busy rejection, so the lesson hook retries only after a real busy-to-idle transition.
An eight-second `response.created` watchdog releases an unbound request, while a
twenty-second settlement watchdog releases a created response that never completes
both generation and playback. Scripted failures return through their existing safe
state path; a missing filler response simply allows lesson auto-start to continue.

Regression coverage reproduces the exact pending-filler race, the transient narration
rejection/recovery sequence, a missing `response.created`, and a created response that
never settles. The full deterministic frontend gate passes 283 tests across 27 files,
ESLint, TypeScript, and the Vite production build. The existing Vite chunk-size warning
remains non-blocking. No credentialed request was made. A connected cached/live lesson
rehearsal remains necessary to confirm the audible filler-to-narration handoff in the
selected browser; deterministic tests do not claim that perceptual evidence.
