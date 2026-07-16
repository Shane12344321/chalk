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
