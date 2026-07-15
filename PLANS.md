# CHALK execution plan

Status: active  
Owner: repository team  
Started: 2026-07-15  
Last updated: 2026-07-15  
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
| Architecture baseline | Complete, unimplemented | `ARCHITECTURE.md` |
| Git repository | Initialized; planning baseline committed | Commit `97128fe` on `main` |
| Frontend scaffold | Not started | No `frontend/` directory |
| Backend scaffold | Not started | No `backend/` directory |
| Shared schema | Not started | No `shared/schema/` directory |
| Realtime API smoke test | Not run | No event trace or live-test record |
| Board renderer | Not started | No application code |
| Live lesson generation | Not started | No application code |
| Cached demo lessons | Not started | No `demo/cached_lessons/` directory |
| Video workflow | Not started | No script, rehearsal, or recording evidence |

## Milestone summary

| ID | Milestone | Exit condition | Status |
|---|---|---|---|
| M0 | Planning and repository baseline | Planning documents committed on a clean repository | Complete |
| M1 | Scaffold and Realtime vertical slice | Browser voice loop, five successful interruptions, dummy tool round trip | Ready |
| M2 | Deterministic board and fixed sync | Hardcoded projectile lesson speaks and draws concurrently without crashes | Pending |
| M3 | Live lesson generation | Validated NDJSON streams; 8/10 golden topics pass the rubric | Pending |
| M4 | Full interruption and grounding loop | Three consecutive cached MVP rehearsals pass | Pending |
| M5 | Optional widget spectacle | Projectile widget and reactive tutor moment pass, or milestone is explicitly cut | Pending |
| M6 | Optional student draw-back and freeze | Fallback critique passes, or milestone is explicitly cut; features frozen | Pending |
| M7 | Demo, documentation, and submission | Final video, uncut proof take, README, and submission complete | Pending |

Only one milestone may be active at a time. M5 and M6 are optional; M7 may not be consumed by feature work.

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

- [ ] Scaffold React 18 + Vite + TypeScript in `frontend/`.
- [ ] Scaffold Python 3.12 + FastAPI in `backend/`.
- [ ] Add root developer commands or a short README section for starting both services.
- [ ] Add `.gitignore`, `.env.example`, and explicit localhost CORS.
- [ ] Implement `GET /health` without exposing secret values.
- [ ] Implement `POST /session` with server-only `OPENAI_API_KEY`.
- [ ] Send a non-PII `OpenAI-Safety-Identifier` when minting the client secret.
- [ ] Complete the browser WebRTC handshake using `REALTIME_MODEL`.
- [ ] Centralize Realtime payloads and event strings under `frontend/src/realtime/`.
- [ ] Configure tutor instructions, VAD, voice, and one dummy tool.
- [ ] Capture a redacted event trace for connect, response, tool call, and interruption.
- [ ] Exercise five interruptions and record perceived and measured behavior separately.

### Exit gate

- Browser and backend start from documented commands on a clean checkout.
- The browser can converse with `gpt-realtime-2.1-mini`.
- Five consecutive interruptions stop local teaching state without a stale response continuing.
- A dummy tool call returns its function output and the conversation continues.
- Standard API keys and client-secret values are absent from the frontend bundle and logs.
- Exact observed events, model, voice, VAD settings, browser, and date are recorded in `PROGRESS.md`.

### Validation record

Not run. Planned evidence:

- backend unit tests for `/health`, session error redaction, and configuration;
- frontend tests for protocol decoding and response coordination;
- live browser event trace with sensitive content removed;
- five-run interruption table.

### Rollback

- Keep Realtime code behind a single adapter so payload changes do not affect UI components.
- If semantic VAD behaves poorly, return to documented server VAD.
- If the recording model is costly or unstable during development, remain on `gpt-realtime-2.1-mini`.
- If WebRTC fails, stop and diagnose; do not silently replace it with a materially different transport without a new architecture decision.

## M2 — Deterministic board and fixed concurrent sync

Objective: prove the product feel with no board-model dependency.

### Work

- [ ] Create `shared/schema/lesson.schema.json` as the lesson wire source of truth.
- [ ] Define the minimal ops required by the hardcoded projectile lesson before the full DSL.
- [ ] Add deterministic schema fixtures and invalid cases.
- [ ] Implement region/anchor layout with normalized dimensions.
- [ ] Implement stable-seeded rough.js SVG rendering.
- [ ] Implement KaTeX rendering with trust disabled.
- [ ] Implement safe frontend mathjs compilation and domain sampling.
- [ ] Isolate failures per op so the step continues.
- [ ] Implement reducer-driven lesson state and stale-event rejection.
- [ ] Implement `SYNC_MODE=fixed` with concurrent narration and weighted animation.
- [ ] Implement freeze that retains a partial stroke.
- [ ] Create the hardcoded projectile lesson and play it start to finish.

### Exit gate

- The hardcoded lesson completes three times without an uncaught error.
- Ink and speech start concurrently enough to satisfy a recorded perceptual check.
- Rerenders do not move or regenerate committed rough paths.
- Invalid equations, expressions, references, and ops are skipped safely.
- Student speech freezes the current animation and leaves a visible partial stroke.
- The next step does not audibly overlap the prior narration in the recording browser.

### Validation record

Not run. Planned evidence:

- JSON Schema fixture tests;
- layout and anchor unit tests;
- renderer no-throw tests for every op;
- math expression rejection tests;
- state-transition and stale-event tests;
- three captured hardcoded-lesson runs.

### Rollback

- Keep a plain deterministic SVG renderer available while rough.js integration is isolated.
- If audio-activity detection is unreliable, use a calibrated drain guard and document its value.
- Do not fall back to ink-then-voice for the final demo; fixed concurrent sync is the minimum acceptable mode.

## M3 — Live lesson generation

Objective: replace the hardcoded lesson source with validated streaming without weakening renderer safety.

### Work

- [ ] Add backend loading of the shared JSON Schema.
- [ ] Implement safe Python AST validation for the restricted curve grammar.
- [ ] Implement accepted-ID reference tracking with no forward references.
- [ ] Define and validate NDJSON stream-envelope schema.
- [ ] Implement `POST /lesson` using `application/x-ndjson` over streaming fetch.
- [ ] Parse board-model JSONL incrementally without forwarding raw lines.
- [ ] Implement at most two scoped repairs per invalid step.
- [ ] Abort and ignore stale lesson requests by `request_id`.
- [ ] Keep `teach` nonblocking: start generation, return `status=started`, then request bounded filler speech.
- [ ] Write the worked derivative example used in the board prompt.
- [ ] Create deterministic fixtures for all ten golden topics.
- [ ] Run the live ten-topic rubric and retain redacted artifacts.

### Exit gate

- Arbitrary NDJSON chunk boundaries, final lines without newline, cancellation, and truncated final lines are handled.
- Raw model output never reaches the renderer.
- A dropped step does not make a later dangling reference renderable.
- Eight of ten live golden topics pass schema, render, and human-layout checks.
- Time from lesson request to first valid visible stroke is measured; target is under six seconds.
- Zero-valid-step and timeout paths activate a cached or hardcoded fallback.

### Validation record

Not run. Record model, prompt version/hash, per-topic outcome, first-step latency, repairs, dropped steps, screenshot, and reviewer note.

### Rollback

- Disable live generation and load a cached lesson using the same validated renderer path.
- Escalate `BOARD_MODEL` from `gpt-5.6-terra` to `gpt-5.6-sol` only after the Terra rubric demonstrates a material quality failure.
- If streamed JSONL remains unreliable, generate a complete bounded lesson object before playback; document the latency trade-off and preserve cached lessons.

## M4 — Full interruption and grounding loop

Objective: pass the MVP demo gate.

### Work

- [ ] Implement visible-state-derived board manifests under the token budget.
- [ ] Publish versioned manifest state through `BoardContextPublisher`.
- [ ] Confirm publication acknowledgement and timing with `session.updated`.
- [ ] Implement `point_at`, `circle_el`, `underline`, and `flash` as local overlay tools.
- [ ] Validate all deixis IDs against committed or deliberately partial visible state.
- [ ] Implement bounded `POST /annotate` with overlay-only output.
- [ ] Complete the `TEACHING -> FROZEN -> QA -> TEACHING` path.
- [ ] Decide, from rehearsal evidence, whether resume continues frozen ink or replays the current step.
- [ ] Implement `SYNC_MODE=paced` only after the fixed path remains passing.
- [ ] Cache projectile, derivative, and unit-circle lessons through the same validation path.

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

Not run. Retain three rehearsal checklists, a redacted Realtime event trace, manifest snapshots, and the runtime-flag set used.

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
| A-001 | An OpenAI API key with access to the selected Realtime and GPT-5.6 models is available | Unverified | Validate before M1; model-access failure blocks live milestones but not deterministic board work |
| A-002 | `gpt-realtime-2.1-mini`, `gpt-realtime-2.1`, and `gpt-5.6-terra` remain valid model IDs | Verified in official docs on 2026-07-15; account access unverified | Recheck before wiring and recording |
| A-003 | The recording browser permits microphone capture and stable WebRTC localhost use | Unverified | Validate in the M1 spike |
| A-004 | React 18 and Python 3.12 are acceptable locked foundations | Accepted | Revisit only for a concrete dependency incompatibility |
| A-005 | Fixed transcript/word-count synchronization will look convincing enough | Unverified | Three-run perceptual gate in M2 |
| A-006 | Session instruction replacement is timely enough for board manifests | Unverified | Measure and resolve in M4 |
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

## Validation ledger

Append validation evidence; do not replace failed entries.

| Date/time | Milestone | Check | Command or procedure | Result | Evidence / notes |
|---|---|---|---|---|---|
| 2026-07-15 | M0 | Planning files exist | `ls -la` and `wc` | Pass | Build plan, `AGENTS.md`, and `ARCHITECTURE.md` existed before this plan |
| 2026-07-15 | M0 | `AGENTS.md` instruction size | `wc -c AGENTS.md` | Pass | 18,911 bytes, below 32 KiB |
| 2026-07-15 | M0 | Architecture Markdown fences | Count lines beginning with triple backticks | Pass | 20 fence lines, balanced |
| 2026-07-15 | M0 | Planning baseline checked in | `git log -1 --oneline --decorate` and `git status --short --branch` | Pass | Commit `97128fe` on `main`; worktree was clean immediately after commit |

Future command baseline, to be finalized in M1 after scaffolding:

```bash
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
python -m pytest backend/tests
```

Do not mark these commands as passing until they exist and were run successfully.

## Progress ledger

| Date/time | Milestone | Progress | Next action | Blocker |
|---|---|---|---|---|
| 2026-07-15 | M0 | Audited build plan and created agent guidance | Create architecture baseline | None |
| 2026-07-15 | M0 | Created architecture baseline with spike gates and ADRs | Create living execution plan | None |
| 2026-07-15 | M0 | Created `PLANS.md` with milestones, registers, validation, and rollback | Initialize Git and commit planning baseline | None |
| 2026-07-15 | M0 | Initialized Git and committed the four-document planning baseline as `97128fe` | Commit this evidence update, then begin M1 | None |

## Discoveries and surprises

- The original plan combined a Python backend validator with `mathjs.compile()`, which is not a Python API. Validation is now deliberately split across a safe Python AST boundary and frontend mathjs.
- Native browser `EventSource` does not issue POST requests. Lesson streaming now uses fetch-readable NDJSON.
- Transcript deltas and `response.done` do not prove remote audio playout position, so synchronization and step advancement require perceptual calibration.
- Dropping an invalid generated step can invalidate later references; accepted-ID state must exclude dropped IDs.
- The project directory initially contained planning files only and was not a Git repository.

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
