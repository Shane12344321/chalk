# CHALK execution plan

Status: active  
Owner: repository team  
Started: 2026-07-15  
Last updated: 2026-07-18
Target: working localhost demo and three-minute hackathon video

## How to use this plan

This is the living execution record for CHALK. It complements:

- `chalk-build-plan.md`: product brief and original seven-day schedule;
- `AGENTS.md`: audited implementation rules and quality gates;
- `ARCHITECTURE.md`: system boundaries, flows, and architecture decisions.

At the start of each work session:

1. read `AGENTS.md` and the active milestone below;
2. update the progress ledger with the next smallest verifiable outcome;
3. confirm unresolved assumptions that affect that outcome;
4. work only within the active milestone unless a dependency forces a documented change.

At the end of each work session:

1. mark only evidence-backed checklist items complete;
2. record commands and manual checks actually run;
3. add discoveries, decisions, and failed approaches;
4. state the next action and any blocker;
5. update `PROGRESS.md` once it exists, keeping this file as the milestone-level record.

Use ISO timestamps with the local timezone. Do not rewrite history: append corrections and mark superseded decisions rather than deleting the reason a choice was made.

When a feature grows beyond one milestone or needs independent ownership, create `docs/exec-plans/active/<feature>.md` and link it from this file. Do not create feature plans for small tasks that fit cleanly here.

## Outcome and non-goals

CHALK succeeds when a student can request a math or physics topic, see synchronized live whiteboard ink, interrupt the tutor mid-sentence and mid-stroke, receive a board-grounded answer, and resume. The final recording must be repeatable using three cached demo lessons and must demonstrate live generation once.

Non-goals: accounts, authentication, persistence, deployment, mobile, multi-user support, lesson history, internationalization, non-math/physics domains, or production readiness.

## Current state

| Area | State | Evidence |
|---|---|---|
| Product brief | Complete | `chalk-build-plan.md` |
| Audited agent guidance | Complete | `AGENTS.md` |
| Architecture baseline | Current through M4 drawing intelligence | `ARCHITECTURE.md`, ADR-026..028, and the active natural-drawing plan |
| Git repository | M1, M2, and accepted cached-interaction checkpoints preserved; M3 isolated | M1 `e6822f5`; M2 `4f3d9ed`; accepted cached slice `e0c0aa8`; M3 branch `codex/m3-live-lesson-generation` |
| Frontend application | M4 deterministic slice implemented and feedback-hardened | 116 tests, product/diagnostic modes, turn-gated microphone, sequential sketches, visible manifest, response coordinator, and checkpoint state machine |
| Backend scaffold | Complete for M1 | 38 tests, lint/format, compile, health, CORS, safe failures, and live client-secret minting |
| Shared schema | Schema 1.1 plus closed sanitization evidence | JSON Schema, generated TypeScript types, three parity fixture families, and decoder/stream tests |
| Realtime API smoke test | Complete | Mint, WebRTC, voice, dummy-tool continuation, live cost controls, and five consecutive playback-backed interruptions passed on 2026-07-15 |
| Board renderer | M2 complete; deterministic and live perceptual gates passed | Seeded rough.js SVG, KaTeX, safe mathjs sampling, layout, animation, defensive tests, and three accepted live runs |
| Live lesson generation | Complete | `docs/exec-plans/completed/m3-live-lesson-generation.md` |
| Cached demo lessons | Projectile lesson powers the accepted M2 path and accepted M4 cached-interaction slice | `demo/cached_lessons/projectile-range.lesson.json` |
| M4 cached interaction slice | Accepted | Deterministic gate plus owner-observed turn-gated microphone, interruption, checkpoint response, and automatic advancement |
| Video workflow | Not started | No script, rehearsal, or recording evidence |

## Milestone summary

| ID | Milestone | Exit condition | Status |
|---|---|---|---|
| M0 | Planning and repository baseline | Planning documents committed on a clean repository | Complete |
| M1 | Scaffold and Realtime vertical slice | Browser voice loop, five successful interruptions, dummy tool round trip | Complete |
| M2 | Deterministic board and fixed sync | Hardcoded projectile lesson speaks and draws concurrently without crashes | Complete |
| M3 | Live lesson generation | Validated NDJSON streams; 8/10 golden topics pass the rubric | Complete |
| M4 | Full interruption and grounding loop | Three consecutive cached MVP rehearsals pass | Active; cached slice accepted, broader gate pending |
| M5 | Optional widget spectacle | Projectile widget and reactive tutor moment pass, or milestone is explicitly cut | Pending |
| M6 | Optional student draw-back and freeze | Fallback critique passes, or milestone is explicitly cut; features frozen | Pending |
| M7 | Demo, documentation, and submission | Final video, uncut proof take, README, and submission complete | Pending |

Only one milestone may be active at a time. M5 and M6 are optional; M7 may not be consumed by feature work.

Planned follow-on feature plan (after the M4 gate): `docs/exec-plans/active/natural-drawing.md` — live-generation resilience, backend/browser validation parity, board-engine prompt v2 spatial contract, prefix-stable layout and stroke choreography, and mid-lesson topic switching, based on the 2026-07-17 bug audit.

Proposed post-hardening roadmap: `docs/exec-plans/active/drawing-intelligence-roadmap.md` — evidence promotion, density-aware and measured-first placement, universal geometric constructions, renderer-failure recovery, attention choreography, audible-position experiments, adaptive Q&A, one simulation-backed widget, and a later tool-driven board-agent experiment. It does not supersede the active M4 gate or authorize live spend.

## M0 — Planning and repository baseline

Objective: establish a versioned, internally consistent starting point before application code.

### Work

- [x] Audit the original build plan rather than copying its assumptions.
- [x] Create `AGENTS.md` with durable implementation and validation rules.
- [x] Create `ARCHITECTURE.md` with boundaries, flows, fallbacks, and spike labels.
- [x] Create this living execution plan.
- [x] Initialize Git in `/Users/shanesarosh/Desktop/chalk` without initializing a parent directory.
- [x] Commit the four planning documents as the repository baseline.
- [x] Confirm the post-commit worktree is clean.

### Validation

- All four Markdown files exist and are non-empty.
- `AGENTS.md` is below the default 32 KiB Codex project-instruction limit.
- Markdown fences are balanced.
- `git status --short --branch` is clean after the baseline commit.

### Rollback

If repository initialization targets the wrong directory, stop before staging and remove only the newly created incorrect `.git` directory after confirming its absolute path. After a successful commit, use `git revert` for content changes; never rewrite or reset shared history.

## M1 — Scaffold and Realtime vertical slice

Objective: prove the riskiest external dependency before building the board engine.

### Work

- [x] Scaffold React 18 + Vite + TypeScript in `frontend/`.
- [x] Scaffold Python 3.12 + FastAPI in `backend/`.
- [x] Add root developer commands or a short README section for starting both services.
- [x] Add `.gitignore`, `.env.example`, and explicit localhost CORS.
- [x] Implement `GET /health` without exposing secret values.
- [x] Implement `POST /session` with server-only `OPENAI_API_KEY`.
- [x] Send a non-PII `OpenAI-Safety-Identifier` when minting the client secret.
- [x] Complete the browser WebRTC handshake using `REALTIME_MODEL`.
- [x] Centralize Realtime payloads and event strings under `frontend/src/realtime/`.
- [x] Configure tutor instructions, VAD, voice, and one dummy tool.
- [x] Capture a redacted event trace for connect, response, tool call, and interruption.
- [x] Exercise five interruptions and record perceived and measured behavior separately.

### Exit gate

- Browser and backend start from documented commands on a clean checkout.
- The browser can converse with `gpt-realtime-2.1-mini`.
- Five consecutive interruptions stop local teaching state without a stale response continuing.
- A dummy tool call returns its function output and the conversation continues.
- Standard API keys and client-secret values are absent from the frontend bundle and logs.
- Exact observed events, model, voice, VAD settings, browser, and date are recorded in `PROGRESS.md`.

### Validation record

Deterministic validation passed on 2026-07-15. A partial live API check also passed: the backend minted a client secret with HTTP 201, the browser reached `connected` only after its `session.updated` acknowledgement, and a complete assistant audio response produced live response and transcript metadata. Evidence collected:

- root `make install`, `make test`, `make lint`, and `make build` from the repository root;
- 38 backend tests for health, strict session contracts, request caps, CORS, safety identifiers, exact credential routing, allowlisted public configuration, and redacted failures;
- 64 frontend tests for protocol decoding, UUID identity, session acknowledgement, media cleanup, localhost-only routing, tool routing, bounded trace redaction, playback-aware interruption settlement and ordering races, stale-output rejection, token accounting, budget enforcement, and the five-success interruption streak/reset;
- local service smoke for health, explicit CORS, missing-key correlation, oversized-body rejection, and the rendered browser UI;
- production bundle and source scans for standard-key values, test secret values, raw test content, and console logging.

The first supplied metadata-only trace proved the `debug_echo` continuation and one real server-side barge-in (`output_audio_buffer.cleared` followed by `conversation.item.truncated`) in Chrome 150. It exposed that `response.done` can precede the end of audible playback, and a second trace exposed that `response.created` can be cancelled before playback starts. Both false-negative/false-positive boundaries were corrected and covered. The final trace then captured five consecutive playback-backed interruptions: five output-buffer clears, five conversation-item truncations, five successful settlements, zero stale-output events, and 0–0.1 ms measured local handler-state stop latency. The owner separately judged the run “Wonderful. Worked well.” The trace used 5,378 of the 20,000 session-token guardrail and passed the metadata allowlist audit. Aggregate, ID-free evidence is checked in at `artifacts/evidence/m1-realtime-acceptance-summary.json`.

Live budget policy remains in force for future reruns: use `gpt-realtime-2.1-mini`, keep responses short, disconnect after evidence, and do not automatically retry. The client caps each response at 256 output tokens, truncates post-instruction conversation history at 4,000 tokens with a 0.8 retention ratio, leaves separately billed input transcription disabled, displays cumulative `response.done` usage, and auto-disconnects at 20,000 session tokens. Any larger-model run, extended conversation, or topic batch needs explicit owner approval.

### Rollback

- Keep Realtime code behind a single adapter so payload changes do not affect UI components.
- If semantic VAD behaves poorly, return to documented server VAD.
- If the recording model is costly or unstable during development, remain on `gpt-realtime-2.1-mini`.
- If WebRTC fails, stop and diagnose; do not silently replace it with a materially different transport without a new architecture decision.

## M2 — Deterministic board and fixed concurrent sync

Objective: prove the product feel with no board-model dependency.

### Work

- [x] Create `shared/schema/lesson.schema.json` as the lesson wire source of truth.
- [x] Define the minimal ops required by the hardcoded projectile lesson before the full DSL.
- [x] Add deterministic schema fixtures and invalid cases.
- [x] Implement region/anchor layout with normalized dimensions.
- [x] Implement stable-seeded rough.js SVG rendering.
- [x] Implement KaTeX rendering with trust disabled.
- [x] Implement safe frontend mathjs compilation and domain sampling.
- [x] Isolate failures per op so the step continues.
- [x] Implement reducer-driven lesson state and stale-event rejection.
- [x] Implement `SYNC_MODE=fixed` with concurrent narration and weighted animation.
- [x] Implement freeze that retains a partial stroke.
- [x] Create the hardcoded projectile lesson and wire it to the live narration path.

### Exit gate

- The hardcoded lesson completes three times without an uncaught error.
- Ink and speech start concurrently enough to satisfy a recorded perceptual check.
- Rerenders do not move or regenerate committed rough paths.
- Invalid equations, expressions, references, and ops are skipped safely.
- Student speech freezes the current animation and leaves a visible partial stroke.
- The next step does not audibly overlap the prior narration in the recording browser.

### Validation record

Deterministic implementation passed on 2026-07-15, seam hardening passed on 2026-07-16, and the live three-run/perceptual gate passed on 2026-07-16. Current evidence:

- 100 frontend tests and 38 backend tests pass;
- shared-schema fixture, per-op salvage, budget, dangling-reference, unsafe LaTeX, and expression rejection tests pass;
- deterministic layout, anchor, seeded geometry identity, and partial SVG stroke tests pass;
- state-transition, stale request/cycle, audio/generation ordering, four-way advancement gate, and three consecutive reducer-run tests pass;
- root lint/build, schema regeneration, npm production audit, diff check, and clean in-app browser load pass;
- three captured voice/ink runs and a human mid-stroke interruption pass;
- three four-step runs reached `DONE`, partial ink froze at 19% and resumed, and machine-observed playback did not overlap;
- the owner confirmed that ink felt concurrent with narration and consecutive narration did not overlap.

### Rollback

- Keep a plain deterministic SVG renderer available while rough.js integration is isolated.
- If audio-activity detection is unreliable, use a calibrated drain guard and document its value.
- Do not fall back to ink-then-voice for the final demo; fixed concurrent sync is the minimum acceptable mode.

## M3 — Live lesson generation

Objective: replace the hardcoded lesson source with validated streaming without weakening renderer safety.

### Work

- [x] Add backend loading of the shared JSON Schema.
- [x] Implement safe Python AST validation for the restricted curve grammar.
- [x] Implement accepted-ID reference tracking with no forward references.
- [x] Define and validate NDJSON stream-envelope schema.
- [x] Implement `POST /lesson` using `application/x-ndjson` over streaming fetch.
- [x] Parse board-model JSONL incrementally without forwarding raw lines.
- [x] Implement at most two scoped repairs per invalid step.
- [x] Abort and ignore stale lesson requests by `request_id`.
- [x] Keep `teach` nonblocking: start generation, return `status=started`, then request bounded filler speech.
- [x] Write the worked derivative example used in the board prompt.
- [x] Create deterministic fixtures for all ten golden topics.
- [x] Run one explicitly approved Luna access smoke and retain its failed evidence.
- [x] Pass a corrected bounded Luna smoke and retain both passing and failed evidence.
- [x] Obtain separate approval for the first live ten-topic attempt and retain its safely stopped one-topic evidence.
- [x] Correct the upstream terminal classification exposed by that attempt and pass the complete deterministic gate.
- [x] Attribute generation-versus-repair failures, count repair calls before dispatch, and cap each lesson at four repairs in aggregate.
- [x] Stop the batch when three machine failures make 8/10 unreachable and retain a redacted summary after paid-path harness failures.
- [x] Reject non-local Host headers before they can reach the paid lesson endpoint.
- [x] Run the separately approved second batch attempt and retain its safely stopped four-topic v2 evidence.
- [x] Remove the repair-only JSON formatting parameter rejected by Luna and prepare a one-call repair-path probe.
- [x] Obtain separate approval and pass exactly one repair-path smoke with content-free evidence.
- [x] Obtain separate approval for a fresh live ten-topic rubric; repair-smoke approval does not authorize it.
- [x] Run the complete live ten-topic machine rubric and retain redacted artifacts.
- [x] Complete local render/layout/crash review and screenshots.
- [x] Requalify accumulated-whiteboard prompt v2 on the unchanged ten-topic rubric and retain its hash-matched local review.
- [x] Capture representative product-path first-visible-ink evidence.

### Exit gate

- Arbitrary NDJSON chunk boundaries, final lines without newline, cancellation, and truncated final lines are handled.
- Raw model output never reaches the renderer.
- A dropped step does not make a later dangling reference renderable.
- Eight of ten live golden topics pass schema, render, and human-layout checks.
- Time from lesson request to first valid visible stroke is measured; target is under six seconds.
- Zero-valid-step and timeout paths activate a cached or hardcoded fallback.

### Validation record

Luna access and the corrected stream path are verified. The failed smoke remains at `artifacts/evidence/m3-smoke-20260716-202350/`; the passing corrected smoke is retained at `artifacts/evidence/m3-smoke-corrected-20260716-204203/`. The first separately approved batch attempt is retained unchanged at `artifacts/evidence/m3-luna-batch-20260716-210607/`. It made exactly one derivative request before the fail-fast harness stopped: three accepted steps, zero repairs/drops, first valid step in 2,503.1 ms, then the old collapsed `upstream_rejected` terminal at 4,375.0 ms. No retry or second topic occurred. Because that evidence predates the fix, its exact upstream cause cannot be recovered and it is not M3 acceptance evidence.

The adapter now distinguishes HTTP rejection, `response.incomplete`, `response.failed`, generic streaming `error`, and transport unavailability. It projects only an optional closed reason category, never arbitrary upstream code/message content. The shared schema prevents local failures from carrying upstream reasons; generated TypeScript types preserve the same union; the browser retains the reason only on validated terminal envelopes. Generation and repair failures retain only a closed origin and repair count, every repair is counted before dispatch, and the aggregate repair budget is four calls per lesson in addition to the one primary call. The second approved batch at `artifacts/evidence/m3-luna-batch-20260716-222005/` proved this attribution: derivative, chain rule, and integral area completed with four steps each and zero repairs/drops; unit circle then stopped with zero accepted steps when its first repair request received `upstream_rejected`/`invalid_request`. Exactly four topic requests and one rejected repair request ran; there was no retry or fifth topic. Billing for the rejected request is not inferred. The evidence is valid v2 diagnostic evidence, not acceptance.

Official docs report that Luna supports the Responses API and Structured Outputs, so the broader capability is not rejected. The failed request was isolated to the repair-only shape. The nonessential `text.format=json_object` field has been removed; repair now uses the same plain-text Responses surface as primary generation while prompt constraints plus the checked-in schema and semantic validator remain the trust boundary. A new `repair-smoke` mode is structurally limited to one synthetic repair call, validates the result, retains no generated content, and cannot route to topic smoke or batch. The complete no-spend gate passes 147 frontend and 131 backend tests, lint, build, Python compileall, zero production npm vulnerabilities, tracked-secret scanning, and `git diff --check`. The complete ten-topic quality/layout rubric, human review, and browser first-visible-ink gate remain unrun.

The separately approved repair smoke passed and is retained at `artifacts/evidence/m3-repair-smoke-20260716-223721/`. It made exactly one production repair request, no primary lesson request, no retry, and returned a locally valid repaired step in 2,767.0 ms. The 498-byte summary contains only Luna/`none` identity, the repair-prompt hash, timing, one-call count, and closed pass/error fields; no generated repair content or credential is retained. This closed the repair-path prerequisite.

The subsequently approved fixed batch is retained at `artifacts/evidence/m3-luna-batch-20260716-224159/`. All ten topics completed with four accepted steps each: 40 accepted steps, zero repairs, zero drops, no retry, no terminal or harness error, and first-valid-step latency from 1,161.6 ms to 3,012.7 ms. The harness attempted exactly ten topics, did not stop early, and the backend was shut down immediately afterward. Secret scanning found no credential in the package. Local replay then exposed and corrected deterministic label/equation clipping plus broad/grid region collisions. Final screenshots, zero-crash verdicts, and bounded notes are retained: 9/10 topics pass human layout review, with exponential growth/decay explicitly failing because one combined equation is too small for comfortable demo reading. The verifier now fails only because the representative connected product-path timing file is absent and the exit gate therefore remains false.

The separately approved accumulated-whiteboard v2 batch is retained at `artifacts/evidence/m3-luna-v2-batch-20260717-0635/`. It made exactly ten sequential primary topic calls and zero repair calls. All topics completed with 39 accepted steps, zero drops, no retry, and no terminal or harness error; first-valid-step latency was 1,421.8–2,583.3 ms. Local production-path replay produced ten screenshots, no board warning, no console warning/error, and zero renderer crashes. Exactly eight topics pass the unchanged human layout rubric. Unit circle fails for a lower-right equation/explanation collision, and standing waves fails for stacked node/antinode/amplitude labels. The verifier now reports only the intentionally false exit flag and absent representative timing file. The batch approval is consumed.

The first separately approved connected timing attempt stopped at an origin-mismatched CORS preflight and made no credentialed request. A fresh approved retry used `http://localhost:5173`, minted one mini-Realtime client secret, connected with `gpt-realtime-2.1-mini` and `marin`, and made one Luna v2 derivative lesson call with four accepted steps and zero repairs/drops. Product diagnostics measured 1,355.7 ms to the first valid step, 1,363.4 ms from validation to ink, and 2,719.1 ms request-to-first-visible-ink. The session was disconnected immediately after capture. The final read-only verifier passes all ten topics, exactly eight human layout passes, zero renderer crashes, matching model/reasoning/prompt hashes, non-partial timing, and the six-second target. M3 is complete.

### Rollback

- Disable live generation and load a cached lesson using the same validated renderer path.
- Keep `BOARD_MODEL=gpt-5.6-luna` through the unchanged rubric. If it fails, compare only failed topics on Terra after explicit approval; consider Sol only if both lower-cost tiers are materially inadequate.
- If streamed JSONL remains unreliable, generate a complete bounded lesson object before playback; document the latency trade-off and preserve cached lessons.

## M4 — Full interruption and grounding loop

Objective: pass the MVP demo gate.

Completed cached-interaction slice: `docs/exec-plans/completed/m4-cached-interaction-loop.md`.
Active broader execution plan: `docs/exec-plans/active/m4-full-interruption-grounding.md`.

### Work

- [x] Implement visible-state-derived board manifests under the token budget.
- [x] Publish manifest state through `BoardContextPublisher`.
- [x] Require and deterministically test serialized `session.updated` acknowledgement before dependent scripted responses.
- [ ] Measure instruction-publication timing in the live rehearsal.
- [x] Implement `point_at`, `circle_el`, `underline`, and `flash` as local overlay tools.
- [x] Validate all deixis IDs against committed or deliberately partial visible state.
- [x] Implement bounded `POST /annotate` with overlay-only output.
- [x] Complete the `TEACHING -> FROZEN -> QA -> TEACHING` path and add one checkpoint asking/listening/feedback loop.
- [x] Gate microphone input behind **Speak** and auto-mute at `speech_stopped`/assistant playback to prevent self-response loops.
- [ ] Decide, from rehearsal evidence, whether resume continues frozen ink or replays the current step.
- [x] Implement `SYNC_MODE=paced` as a bounded transcript-progress controller while preserving fixed playback-gated sync.
- [x] Cache projectile, derivative, and unit-circle lessons through the same validation path.

### Exit gate

Three consecutive cached projectile rehearsals each complete this flow:

1. start a lesson;
2. hear narration while ink animates;
3. interrupt mid-stroke;
4. retain the partial stroke;
5. receive an answer grounded with a valid board ID;
6. resume without stale audio, state, or network events;
7. finish the lesson without an uncaught error.

The last acknowledged manifest must match the visible committed board. The three cached lessons must have zero known crashes.

### Validation record

The deterministic slice passed on 2026-07-16 and the first live attempt exposed an always-open-microphone feedback loop. Commit `c0d6f48` keeps input muted until **Speak** and auto-mutes at the documented VAD turn boundary or assistant playback. The post-fix gate passes 116 frontend and 38 backend tests, lint/format, TypeScript/Vite build, Python compileall, zero production npm vulnerabilities, and clean diff hygiene. The owner then reran the published minimal checklist and reported that the turn-gated microphone, interruption flow, checkpoint response, and automatic advancement passed. This accepts the cached-interaction slice; the broader three-run, multi-lesson, and overlay M4 gate remains pending. Retain future rehearsal checklists, redacted traces, manifest snapshots, and runtime flags when those broader gates run.

The broader deterministic implementation now includes the committed target inventory, four local tools, bounded annotation endpoint and overlay renderer, and all three recording caches. Its 2026-07-17 no-spend gate passes 179 frontend and 148 backend tests, static checks, production build, schema regeneration, compileall, zero production npm vulnerabilities, secret-pattern review, and diff hygiene. The credentialed three-run gate, live publication timing/hash evidence, and final cache screenshot review remain pending.

### Rollback

- Switch from paced to fixed sync after three consecutive paced perceptual failures.
- If instruction-based manifest updates disrupt responses, pause and test a documented alternative through `BoardContextPublisher`; do not scatter a workaround.
- If annotation generation is unreliable, keep instant local deixis and answer verbally without new ink.

## M5 — Optional projectile widget

Objective: add the highest-value spectacle only after the MVP gate remains green.

### Entry condition

M4 passes three consecutive rehearsals with no critical defect.

### Work

- [ ] Implement only the projectile widget first.
- [ ] Validate and clamp widget parameters.
- [ ] Debounce student changes and compute observations locally.
- [ ] Publish a compact versioned widget event to board context.
- [ ] Rehearse angle 45° to 60° and an unprompted tutor reaction.
- [ ] Add grapher and pendulum only if projectile remains stable and schedule slack exists.

### Exit gate

The projectile widget mounts, animates, responds to sliders, produces the correct local observation, and triggers a grounded tutor reaction in three rehearsals without disrupting lesson state.

### Rollback

Disable widgets with a runtime feature flag. Remove the widget beat from the video script before altering MVP code. Cut extra templates before cutting the projectile template.

## M6 — Optional student draw-back and feature freeze

Objective: attempt sketch critique through the safest path, then freeze application features.

### Entry condition

M4 is stable and M5 is either complete or explicitly cut.

### Work

- [ ] Capture bounded student polylines on a separate layer.
- [ ] Produce a redacted, size-limited composite image.
- [ ] Implement backend vision-text fallback first.
- [ ] Inject the resulting description as bounded context.
- [ ] Attempt direct Realtime image input only if the selected model path is proven live.
- [ ] Run a crash-focused bug bash on the three demo lessons.
- [ ] Freeze features and update runtime defaults for recording.

### Exit gate

Either the vision-text fallback critiques the scripted wrong curve three times, or the entire feature is explicitly cut. The three cached lessons have no known crash and no critical privacy leak.

### Rollback

Disable all student-image submission and retain drawing as local-only ink, or remove student drawing entirely. Never persist images as a workaround.

## M7 — Demo, documentation, and submission

Objective: sell the stable product. No feature implementation is allowed in this milestone.

### Work

- [ ] Freeze dependency versions, model defaults, feature flags, and cached lessons.
- [ ] Write and time the three-minute video script.
- [ ] Rehearse the final sequence at least three times.
- [ ] Capture at least three full edited-take candidates.
- [ ] Capture one continuous unedited four-to-five-minute proof take.
- [ ] Keep microphone and system audio on separate recording tracks.
- [ ] Add README pitch, architecture diagram, setup, flags, limitations, and proof-take link.
- [ ] Export and review the final video end to end.
- [ ] Verify public repository contents contain no secret, student payload, or large accidental artifact.
- [ ] Submit and record the submission confirmation.

### Exit gate

The exported video is under the submission limit, the uncut proof take is accessible, setup instructions work from a clean checkout, the repository is public, and submission confirmation is retained.

### Rollback

If a stretch beat fails during recording, remove that beat and use the last passing MVP sequence. If live generation fails, show it once in a separate successful take and use cached lessons for the continuous product sequence. Do not change core code on recording day unless the app cannot launch; prefer reverting to the last passing milestone commit.

## Assumption register

| ID | Assumption | Status | Validation / consequence |
|---|---|---|---|
| A-001 | An OpenAI API key with access to the selected Realtime and GPT-5.6 models is available | Verified for mini Realtime and Luna | Realtime mini passed on 2026-07-15; one Luna lesson call reached the model and returned three valid steps on 2026-07-16 |
| A-002 | `gpt-realtime-2.1-mini`, `gpt-realtime-2.1`, `gpt-5.6-luna`, and `gpt-5.6-terra` remain valid model IDs | Verified in official docs; mini account access passed on 2026-07-15 | Recheck larger Realtime and board-model account access before wiring or recording |
| A-003 | The recording browser permits microphone capture and stable WebRTC localhost use | Verified for Chrome 150 in-app; recording setup still separate | Voice, tools, and five interruptions passed in the current browser; test the eventual OBS/recording configuration before M7 |
| A-004 | React 18 and Python 3.12 are acceptable locked foundations | Accepted | Revisit only for a concrete dependency incompatibility |
| A-005 | Fixed transcript/word-count synchronization will look convincing enough | Verified for M2 | Three-run perceptual gate passed; owner confirmed concurrent-feeling ink and no consecutive narration overlap on 2026-07-16 |
| A-006 | Session instruction replacement is timely enough for board manifests | Verified for cached slice | Deterministic acknowledgement tests passed and the owner-observed cached interaction run completed; retain timing evidence for broader M4 rehearsals |
| A-007 | Three cached lessons are sufficient recording insurance | Accepted | Add caches only for a demonstrated demo need |
| A-008 | OBS can capture screen, microphone, and system audio separately on the target Mac | Unverified | Test before M7, preferably during M4 rehearsal |
| A-009 | The seven-day schedule starts when implementation begins, not when planning documents were drafted | Assumed | Owner should set actual day/date mapping before M1 |

If A-001 or A-009 is false, update the milestone schedule before claiming the project is on track.

## Decision log

Architecture decisions ADR-001 through ADR-008 live in `ARCHITECTURE.md`. Execution-specific decisions follow.

| ID | Date | Decision | Reason | Revisit when |
|---|---|---|---|---|
| E-001 | 2026-07-15 | Use root `PLANS.md` for the project-wide execution plan | The repository has one active product effort; a feature subplan would add indirection | A feature requires independent milestones or ownership |
| E-002 | 2026-07-15 | Only one milestone is active at a time | Protects the seven-day critical path and makes status auditable | Never during this hackathon unless the plan is explicitly rewritten |
| E-003 | 2026-07-15 | M5 and M6 are optional; M7 cannot absorb feature work | The demo and submission are the deliverable | Only if the submission deadline changes |
| E-004 | 2026-07-15 | Live API validation is opt-in and recorded, not default CI | It is nondeterministic, credentialed, and potentially costly | A stable mocked or recorded harness exists |
| E-005 | 2026-07-15 | Roll back with feature flags or `git revert`, not destructive resets | Preserves evidence and user work | Never |
| E-006 | 2026-07-15 | Keep the audited raw Realtime adapter through the M1 live gate; evaluate OpenAI's Agents SDK after M1 | The open-source SDK now covers WebRTC, media, interruptions, tools, and raw events, but migrating after 57 adapter-specific tests would delay the riskiest live check and would not remove CHALK's custom evidence requirements | The live gate exposes adapter defects, protocol maintenance becomes material, or M2 needs SDK handoffs/guardrails |
| E-007 | 2026-07-15 | Treat credentialed API usage as a minimal, owner-controlled acceptance budget | Live calls consume tokens and audio usage; deterministic tests already cover routine behavior | The owner explicitly approves a larger model, extended session, or batch evaluation |
| E-008 | 2026-07-15 | Enforce layered Realtime token controls in the client | A post-response session ceiling alone can overshoot; per-response output, rolling input context, usage visibility, and a hard disconnect bound different cost drivers | A measured lesson cannot fit within the limits, in which case adjust one bound with recorded evidence rather than disabling all controls |
| E-009 | 2026-07-15 | Reuse rough.js, KaTeX, mathjs, and Ajv for M2 while keeping CHALK-specific validation and orchestration local | Rebuilding seeded sketch geometry, TeX layout, expression ASTs, or JSON Schema validation would add risk without differentiating the product; model expressions still pass a narrower CHALK allowlist before mathjs compilation | A dependency cannot meet determinism, safety, or bundle constraints in measured use |
| E-010 | 2026-07-16 | Correlate manual lesson responses with bounded Realtime response metadata and start fixed ink on output-buffer playback start | Official Realtime guidance recommends metadata for disambiguating simultaneous responses; transcript deltas prove generation but not playout | A live browser trace contradicts metadata echoing or shows playback-start arrives too late for convincing concurrency |
| E-011 | 2026-07-16 | Ship visible-only manifest grounding, response-purpose coordination, sequential sketch strokes, and one checkpoint before broader M4 overlays | These changes are visible, bounded, and testable on the accepted cached lesson; word slicing, transcript-clock pacing, and duration-only VAD recovery rely on signals that do not prove the behavior they infer | A minimal rehearsal shows full-script resume is confusing, fixed pacing visibly drifts, or a measured false-freeze classifier becomes available |
| E-012 | 2026-07-16 | Gate the microphone to one deliberate speech turn | The first M4 rehearsal entered `QA` from an unintended VAD detection and appeared to answer itself; using **Speak** plus the documented `speech_stopped` boundary prevents speaker feedback without guessing whether a short utterance is noise | A headset-only recording setup proves continuous input is stable and materially improves the interaction |
| E-013 | 2026-07-16 | Gate the ten-topic M3 rubric behind a sequential no-retry harness and review captured NDJSON locally | Prevents accidental batch spend and duplicate generation while preserving raw model output, prompt/model identity, machine timing, screenshots, and human rubric evidence | The live gate shows the harness misses required evidence or cannot reproduce a rendered lesson |
| E-014 | 2026-07-16 | Require a read-only verifier before accepting M3 | Prevents missing screenshots, ambiguous human fields, stale totals, crashes, model drift, or incomplete timing from being summarized as a pass | The accepted rubric changes or a required evidence field proves unverifiable |

## Validation ledger

Append validation evidence; do not replace failed entries.

| Date/time | Milestone | Check | Command or procedure | Result | Evidence / notes |
|---|---|---|---|---|---|
| 2026-07-15 | M0 | Planning files exist | `ls -la` and `wc` | Pass | Build plan, `AGENTS.md`, and `ARCHITECTURE.md` existed before this plan |
| 2026-07-15 | M0 | `AGENTS.md` instruction size | `wc -c AGENTS.md` | Pass | 18,911 bytes, below 32 KiB |
| 2026-07-15 | M0 | Architecture Markdown fences | Count lines beginning with triple backticks | Pass | 20 fence lines, balanced |
| 2026-07-15 | M0 | Planning baseline checked in | `git log -1 --oneline --decorate` and `git status --short --branch` | Pass | Commit `97128fe` on `main`; worktree was clean immediately after commit |
| 2026-07-15T22:11+0530 | M1 | Deterministic test suite | `make test` | Pass | 57 frontend tests and 38 backend tests passed; backend emitted one upstream Starlette TestClient deprecation warning |
| 2026-07-15T22:11+0530 | M1 | Lint, format, and production build | `make lint`; `make build` | Pass | ESLint, Ruff lint/format, TypeScript, Vite production build, and Python compileall passed |
| 2026-07-15T22:13+0530 | M1 | Dependency and bundle audit | `npm --prefix frontend audit --omit=dev`; scan production bundle for standard-key and test-secret patterns | Pass | npm reported 0 vulnerabilities; no scanned credential or private-content values were present in `frontend/dist` |
| 2026-07-15T22:16+0530 | M1 | Requirement-level completion audit | Reconcile every M1 work item and exit condition against current source/evidence; rerun root tests, lint, build, diff, secret, and credential checks | Deterministic pass; live gate pending | All implementable work is present and deterministic checks pass. No local key is configured, so the browser voice loop, tool continuation, five interruptions, and live trace cannot yet be proven |
| 2026-07-15T22:20+0530 | M1 | Live mint and WebRTC handshake | Configure ignored root `.env`; start documented services; connect in the Codex in-app browser; inspect metadata-only UI and backend access log | Partial pass | `/health` reported configured mini model and `marin`; `/session` returned 201; browser reached connected and observed a completed assistant audio response. Tool, five interruptions, perceived audio judgments, full trace, and exact browser version remain pending |
| 2026-07-15T22:39+0530 | M1 | Supplied live trace audit | Parse the metadata-only `chalk.realtime-trace.v1` export and reconcile event ordering with the acceptance claims | Partial pass; defect found | Chrome 150 trace contained 258 entries over 47.8 s, five completed responses, a confirmed dummy-tool round trip, four user speech turns, and one real interruption with output clear/truncation. Local interruption markers were empty because response generation completed before audible playback ended |
| 2026-07-15T22:46+0530 | M1 | Playback accounting and cost-control regression suite | Add playback-buffer lifecycle tracking, completion/clear ordering coverage, late-stale invalidation, numeric usage accounting, a 256-token response cap, 4,000-token history window, and 20,000-token auto-disconnect; run root tests, lint, build, and diff check | Pass | 64 frontend and 38 backend tests passed; ESLint, Ruff, TypeScript, Vite, compileall, and `git diff --check` passed |
| 2026-07-15T22:45+0530 | M1 | Updated dashboard smoke | Inspect the disconnected localhost UI and browser console without connecting the microphone | Pass | Four metrics render cleanly including `0 / 20,000` session usage; no browser warnings or errors; no Realtime call was made |
| 2026-07-15T22:57+0530 | M1 | Second supplied live trace audit | Reconcile all five markers against response creation, output-buffer playback, clear/truncation, stale events, and numeric usage | Partial pass; false positive rejected | Cost controls were present and 3,507 / 20,000 tokens were used. Four markers followed audible playback and server clear/truncation with zero stale output. Marker 3 preceded playback, cancelled a zero-token response, and does not satisfy an audible interruption gate. Counter/UI semantics were tightened; 64 frontend and 38 backend tests plus lint/build/diff checks pass |
| 2026-07-15T23:01+0530 | M1 | Final live acceptance trace | Audit every marker against prior output playback, server clear/truncation, settlement, stale output, usage, configuration, privacy allowlists, and the owner's separate perception report | Pass | Five playback-backed interruptions each cleared and truncated successfully with no stale output; local handler-state stop was 0–0.1 ms; owner reported “Wonderful. Worked well.”; usage was 5,378 / 20,000 tokens; checked-in ID-free summary records source hashes and aggregate evidence |
| 2026-07-15T23:05+0530 | M1 | Final clean milestone gate | Validate checked-in evidence JSON; run `make test`, `make lint`, `make build`, and `git diff --check` | Pass | 64 frontend and 38 backend tests passed; ESLint, Ruff lint/format, TypeScript, Vite, Python compileall, evidence JSON parsing, and diff checks passed |
| 2026-07-15T23:34+0530 | M2 | Deterministic board implementation gate | Run `make test`, `make lint`, `make build`, schema regeneration, npm production audit, diff check, and a clean in-app browser load | Deterministic pass; live gate pending | 91 frontend and 38 backend tests passed; clean browser load had no warning/error; one non-blocking Vite warning remains for the ~988 kB uncompressed mathjs/KaTeX application chunk |
| 2026-07-16T13:04+0530 | M2 | Independent seam-audit hardening | Verify audit findings, add response rejection/race/disconnect/schema/curve/layout regressions, run deterministic suites, and inspect the disconnected browser runtime | Pass; live gate pending | 100 frontend and 38 backend tests passed; lint, format, compile, build, npm production audit, diff check, schema regeneration, and clean browser smoke passed; live microphone/perceptual evidence is still required |
| 2026-07-16T13:22+0530 | M2 | Three-run live cached-lesson gate | Complete three four-step projectile lessons, exercise mid-stroke freeze/resume, verify playback serialization, and retain ID-free evidence | Machine pass; owner perception pending | `DONE 3 / 3`; partial ink retained at 19%; three final-session interruptions settled with zero stale output; final session used 13,589 / 20,000 tokens and disconnected; owner must still confirm concurrency and audible non-overlap |
| 2026-07-16T13:45+0530 | M2 | Owner perceptual acceptance | Record whether ink felt concurrent and whether consecutive narration overlapped | Pass | Owner confirmed that ink felt concurrent and consecutive narration did not overlap; all M2 exit conditions are now satisfied |
| 2026-07-16T13:52+0530 | M2 | Final checkpoint gate | Run tests, lint/format, build/compile, production dependency audit, evidence parsing, secret scan, and diff hygiene | Pass | 100 frontend and 38 backend tests passed; all lint/build checks passed; npm reported zero production vulnerabilities; evidence JSON and diff/secret hygiene checks passed; only the documented non-blocking Vite chunk-size warning remains |
| 2026-07-16T14:58+0530 | M4 | Cached interaction deterministic gate | Run root tests, lint/format, production build, production dependency audit, diff hygiene, and attempt a disconnected browser reload | Deterministic pass; browser/live pending | 115 frontend and 38 backend tests passed; lint, format, TypeScript, Vite, compileall, audit, and diff checks passed. The Vite server responded on localhost, but the in-app browser URL policy blocked the automated reload; no credentialed call was made. |
| 2026-07-16T15:37+0530 | M4 | Turn-gated microphone regression gate | Add explicit input gating and VAD-boundary auto-mute; run root tests, lint/format, build/compile, production audit, and diff hygiene | Pass; live retest pending | 116 frontend and 38 backend tests passed; the microphone remains muted after connection, opens only through **Speak**, and deterministically closes on `input_audio_buffer.speech_stopped` or assistant playback. |
| 2026-07-16 | M4 | Owner live retest of cached interaction slice | Reload/reconnect; run the published **Speak** interruption and checkpoint checklist; report whether self-triggering, recovery, feedback, and advancement pass | Pass | Owner reported “passed.” This is human acceptance of the checklist, not a retained machine trace or numeric latency/usage measurement. |
| 2026-07-16T18:21+0530 | M3 | Deterministic live-generation gate | `make test`; `make lint`; `make build`; `npm --prefix frontend audit --omit=dev`; `git diff --check`; owner browser smoke | Pass; live rubric pending | 140 frontend and 68 backend tests passed. Schemas/types, streaming parsers, invalid UTF-8/transport/timeout behavior, validation/repair/drop behavior, stale cancellation, partial-prefix retention, cached fallback, ten golden fixtures, lint/format/build/compile, audit, and diff hygiene passed. Owner reported the current browser smoke “passed”; no model/timing/batch evidence is inferred. |
| 2026-07-16T18:37+0530 | M3 | Live-rubric harness and browser evidence preparation | Test owner-approval refusal, sequential parser/evidence output, model/prompt metadata allowlists, first-visible-ink callback, captured-NDJSON importer, diagnostics load, full deterministic gate, and console | Pass; no live request made | 143 frontend and 73 backend tests plus lint/format/build/compile, production audit, secret-pattern scan, and diff hygiene passed. The harness has no retry/parallel path and stops on access failures. Captured lessons can be reviewed without regeneration. Diagnostics loaded locally with the importer visible and no browser warning/error. |
| 2026-07-16T18:42+0530 | M3 | Acceptance-evidence verifier | Verify a complete synthetic package; reject missing human verdicts, slow ink, path traversal, stale totals, crashes, and incomplete identity/timing; rerun the root gate | Pass; no live request made | 143 frontend and 76 backend tests plus lint/format/build/compile, production audit, secret-pattern scan, and diff hygiene pass. The read-only verifier cannot mutate evidence and treats missing or ambiguous fields as failure. |

Current deterministic command baseline:

```bash
make install
make test
make lint
make build
```

The native commands are documented in `README.md`. Passing deterministic commands do not satisfy the live M1 gate.

## Progress ledger

| Date/time | Milestone | Progress | Next action | Blocker |
|---|---|---|---|---|
| 2026-07-15 | M0 | Audited build plan and created agent guidance | Create architecture baseline | None |
| 2026-07-15 | M0 | Created architecture baseline with spike gates and ADRs | Create living execution plan | None |
| 2026-07-15 | M0 | Created `PLANS.md` with milestones, registers, validation, and rollback | Initialize Git and commit planning baseline | None |
| 2026-07-15 | M0 | Initialized Git and committed the four-document planning baseline as `97128fe` | Commit this evidence update, then begin M1 | None |
| 2026-07-15T22:13+0530 | M1 | Implemented and audited the deterministic Realtime vertical slice; root tests, lint, and build pass | Configure a local key and run the live browser/tool/interruption gate | Local `OPENAI_API_KEY` and microphone-assisted human validation |
| 2026-07-15T22:20+0530 | M1 | Live client-secret minting, WebRTC connection, session acknowledgement, and assistant response passed | Speak the debug tool prompt and complete five interruptions | Human voice participation and perceived audio-stop judgments |
| 2026-07-15T22:39+0530 | M1 | Audited the supplied trace, confirmed the dummy tool and one immediate server-side interruption, fixed playback-aware instrumentation, and added layered token controls | Run five brief interruptions on the corrected build and export the updated trace | Human voice participation and perceived audio-stop judgments |
| 2026-07-15T22:57+0530 | M1 | Audited the second trace: four genuine audible interruptions passed, one pre-playback cancellation was rejected, and the counter now requires confirmed audio playback | Run one clean five-audible-interruption session and record perceived stop in the UI | Human voice participation and perceived audio-stop judgments |
| 2026-07-15T23:01+0530 | M1 | Final five-interruption run, privacy audit, cost controls, tool evidence, deterministic suites, and owner perception all passed; M1 complete | Begin M2 only when explicitly requested | None |
| 2026-07-15T23:12+0530 | M2 | Preserved M1 at `e6822f5`, created `codex/m2-deterministic-board`, audited the M2 contract and reusable rendering dependencies, and activated M2 | Implement the shared schema and deterministic board vertical slice | None |
| 2026-07-15T23:34+0530 | M2 | Implemented and deterministically validated the five-op projectile board, fixed sync, semantic Realtime correlation, partial freeze, and three-run counter | Run three short browser lessons with one human mid-stroke interruption and record concurrency/non-overlap judgments | Rotated live key and human microphone/perceptual participation |
| 2026-07-16T13:02+0530 | M2 | Audited and fixed live-seam failures: request rejection recovery, disconnect reset, metadata correlation, shared script cap, playback-start gating, curve clipping/validation, and bounded dense layout | Rotate the disclosed key, then run three short browser lessons with one mid-stroke interruption | Rotated live key and human microphone/perceptual participation |
| 2026-07-16T13:45+0530 | M2 | Recorded the owner's perceptual pass and closed every M2 exit condition | Create the passing M2 checkpoint, then allow owner fine-tuning from that recoverable baseline | None |
| 2026-07-16T14:58+0530 | M4 | Implemented product/diagnostic modes, sequential sketch reveal, visible manifest publication, response-purpose coordination, and one tutor-initiated checkpoint | Complete one short cached-lesson browser rehearsal and record manifest/checkpoint behavior | Automated in-app browser navigation was blocked by URL policy; human microphone/perceptual participation remains required for the live gate |
| 2026-07-16T15:37+0530 | M4 | Diagnosed the first rehearsal freeze as unintended VAD input from an always-open microphone and checkpointed one-turn **Speak** gating at `c0d6f48` | Reload, reconnect, and repeat one short checkpoint run using **Speak** for deliberate turns | Human confirmation that Chalk no longer self-triggers and the checkpoint advances |
| 2026-07-16 | M4 | Owner confirmed the post-fix cached-interaction checklist passed; moved the slice plan to completed | Choose whether to begin M3 live lesson generation | No implementation blocker; broader M4 overlays and three-run/multi-lesson gate remain deferred |
| 2026-07-16T18:21+0530 | M3 | Implemented and deterministically validated the bounded live-generation vertical slice; owner reported the current browser smoke passed | Obtain explicit approval, then run one bounded Terra access/smoke call and the ten-topic rubric | Live board-model quality, layout, and first-stroke latency are not yet evidenced |
| 2026-07-16 | M3 | Prepared the owner-gated sequential evaluation harness, prompt/model identity headers, browser timing export, and local captured-NDJSON reviewer | After explicit owner approval, run one representative product smoke and the single ten-topic batch; review the retained outputs | Approval and human review remain required; no credentialed evaluation was run |
| 2026-07-16T19:55+0530 | M3 | Selected Luna as the lower-cost qualification model without weakening the exit gate; added fail-fast protection against a stale non-Luna backend | Run one bounded Luna product smoke after explicit approval, then separately approve the ten-topic Luna rubric | Luna account access, live quality/layout, and first-visible-ink timing remain unverified |
| 2026-07-16T20:20+0530 | M3 | Split the live CLI into independently approved one-call `smoke` and ten-call `batch` modes after finding the documented smoke had no bounded command | Obtain approval for `smoke` only; inspect its retained stream before considering separate batch approval | No credentialed request was made; live Luna access remains unverified |
| 2026-07-16T20:23+0530 | M3 | Ran exactly one approved Luna smoke; access and three valid steps passed, but first step took 8.95 s and the stream ended `invalid_stream` | Diagnose without retrying; do not approve the batch | Terminal correctness and latency both failed; retained evidence is `artifacts/evidence/m3-smoke-20260716-202350/` |
| 2026-07-16T20:35+0530 | M3 | Kept documented `response.completed`, split transport/text byte budgets, and set recorded qualification effort to `none` after the low-effort latency miss | Obtain fresh approval for one corrected Luna smoke only | Root cause is a supported inference, not live-proven; batch remains unjustified |
| 2026-07-16T20:42+0530 | M3 | Ran exactly one separately approved corrected Luna smoke after code/config/tests and free health preflight checks | Seek separate approval before the ten-topic rubric; do not infer batch authority | Pass: four accepted steps, zero repairs/drops, 2.87 s first valid step, 5.16 s normal completion; evidence retained at `artifacts/evidence/m3-smoke-corrected-20260716-204203/` |
| 2026-07-16T21:06+0530 | M3 | Used the separate batch approval; the fail-fast harness stopped after derivative emitted three valid steps and then `upstream_rejected` | Diagnose and deterministically distinguish upstream terminal outcomes; do not retry under the consumed approval | One call only, 2.50 s first step, zero repairs/drops, terminal at 4.38 s; evidence retained at `artifacts/evidence/m3-luna-batch-20260716-210607/` |
| 2026-07-16T21:29+0530 | M3 | Distinguished upstream terminal classes and allowlisted reasons across backend, schema, browser, and harness; the full no-spend gate passes | Obtain fresh explicit approval before a new ten-topic Luna batch | Prior batch approval is consumed; historical collapsed terminal is not recoverable; 146 frontend and 115 backend tests pass |
| 2026-07-16T22:08+0530 | M3 | Hardened repair attribution and spend bounds, added the three-failure gate-unreachable stop, redacted crash summaries, summary schema v2, and local Host validation | Obtain fresh explicit approval before a new ten-topic Luna batch | No live call was made; the deterministic gate passes 147 frontend and 128 backend tests, and historical cause remains unprovable |
| 2026-07-16T22:20+0530 | M3 | Used the fresh batch approval; three topics completed before unit circle's first repair call was rejected, and the harness stopped before topic five | Verify the corrected repair seam with a separately approved one-call repair smoke before another batch | Four topic requests plus one rejected repair request, no retry; billing of the rejection is not inferred; v2 evidence retained at `artifacts/evidence/m3-luna-batch-20260716-222005/` |
| 2026-07-16T22:30+0530 | M3 | Removed repair-only JSON mode, kept local validation authoritative, and added an independently approved one-call repair probe | Obtain explicit approval for `repair-smoke`; do not infer it from the consumed batch approval | No further live call made; deterministic gate passes 147 frontend and 131 backend tests |
| 2026-07-16T22:38+0530 | M3 | Used the separate approval for exactly one Luna repair smoke; the corrected plain-text repair path passed | Obtain fresh approval before another ten-topic batch | One repair request, 2.77 s, no primary call/retry/content retention; evidence at `artifacts/evidence/m3-repair-smoke-20260716-223721/` |
| 2026-07-16T22:42+0530 | M3 | Used the fresh approval for one fixed ten-topic Luna batch; all ten topics completed cleanly | Review the ten captured streams locally, retain screenshots/verdicts, then collect one representative product-path first-visible-ink record | Machine pass: 40 accepted steps, zero repairs/drops/retries/errors, 1.16–3.01 s to first valid step; evidence at `artifacts/evidence/m3-luna-batch-20260716-224159/` |

## Discoveries and surprises

- The original plan combined a Python backend validator with `mathjs.compile()`, which is not a Python API. Validation is now deliberately split across a safe Python AST boundary and frontend mathjs.
- Native browser `EventSource` does not issue POST requests. Lesson streaming now uses fetch-readable NDJSON.
- Transcript deltas and `response.done` do not prove remote audio playout position, so synchronization and step advancement require perceptual calibration.
- Dropping an invalid generated step can invalidate later references; accepted-ID state must exclude dropped IDs.
- The project directory initially contained planning files only and was not a Git repository.
- The official open-source `@openai/agents` Realtime SDK can now replace much of the raw browser transport, media, interruption, and tool plumbing. It is the preferred starting point for a new implementation, but a migration is deferred because the current M1 adapter is already acceptance-specific and fully covered by deterministic tests.
- Selecting a uv project does not change the command working directory; root backend commands require `--app-dir backend`, and root pytest requires an explicit backend config/path.
- Framework field limits do not cap bytes before request parsing. The session endpoint therefore has an ASGI-level 4 KiB body cap in addition to strict schema validation.
- A configurable upstream API base could route a server key to an unintended host. M1 pins the exact OpenAI client-secret endpoint, rejects redirects, and ignores proxy environment variables.
- Local browser smoke testing caught an unbound native `fetch` call (`Illegal invocation`); the adapter now stores a bound function and has a regression test.
- A proposed `httpx2` install was rejected: it was only suggested by an upstream Starlette TestClient deprecation warning and was not an understood production dependency.
- `response.done` marks generation completion, not necessarily the end of WebRTC playout. The first live trace showed audio continuing for seconds after `response.done`; interruption instrumentation must therefore follow `output_audio_buffer.started`, `.stopped`, and `.cleared` rather than clearing active teaching state on generation completion alone.
- `response.created` alone is also insufficient evidence of an audible barge-in. The second trace included a response created only 0.2 ms before new speech and cancelled before output playback or token generation; the acceptance counter now requires matching `output_audio_buffer.started` state.

## Project-wide rollback policy

Rollback is a planned recovery path, not an admission that a milestone passed.

1. Prefer changing a runtime feature flag to the last passing mode.
2. Prefer cached/hardcoded lesson sources over bypassing validation.
3. Revert the smallest failing milestone commit with `git revert`.
4. Preserve logs, failed validation entries, and the decision that triggered rollback.
5. Never use `git reset --hard`, delete user work, weaken schema validation, expose a server API key, persist student payloads, or disable renderer error isolation to recover a demo.

Last-known-good hierarchy:

```text
MVP + optional features
MVP + fixed sync
cached hardcoded lesson + fixed sync
deterministic silent board (development diagnosis only)
```

Only the first two are acceptable final-demo states.

## Final retrospective

Complete after submission:

- What shipped versus what was cut?
- Which assumptions were wrong?
- Which fallback was used in the final take?
- What validation caught a real defect?
- What remains unsafe or unsuitable for production?
- What would be redesigned with two additional weeks?
- Where are the final video, uncut take, public repository, and submission confirmation?
