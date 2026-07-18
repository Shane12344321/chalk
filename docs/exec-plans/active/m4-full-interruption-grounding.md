# M4 full interruption and grounding loop

Status: active  
Planned: 2026-07-17  
Implementation branch: create `codex/m4-full-interruption-grounding` from `70add19`  
Accepted baseline: M3 commit `70add19`  
Rollback baseline: cached-interaction checkpoint `e0c0aa8`

## Objective

Close the MVP gate with a repeatable cached lesson flow: speech and ink run together,
the student deliberately interrupts mid-stroke, the board freezes, Chalk grounds its
answer to a valid visible element, and the lesson resumes and finishes without stale
audio, state, or network work.

M4 builds on the already accepted cached-interaction slice. It does not rework the
Realtime connection, renderer, fixed synchronization, checkpoint lifecycle, or
turn-gated microphone unless new evidence demonstrates a regression.

## Accepted starting point

- Product and diagnostics modes, acknowledged board-context publication, response-
  purpose coordination, checkpoint asking/listening/feedback, sequential sketch
  reveal, and the turn-gated **Speak** interaction have passed deterministic checks
  and one owner-observed cached projectile rehearsal.
- M3 live lesson generation is accepted at `70add19`; the retained v2 Luna package
  passes 8/10 human layout review with zero renderer crashes and 2.72-second first
  visible ink.
- Only `demo/cached_lessons/projectile-range.lesson.json` is currently a recording
  cache. Derivative and unit-circle caches remain to be curated.
- The lesson wire contract has five drawing ops. Runtime deixis is deliberately not
  part of that lesson schema.

## Scope and non-goals

In scope:

- four instant browser-local deixis tools: `point_at`, `circle_el`, `underline`, and
  `flash`;
- strict validation against fully committed visible elements;
- a bounded, stale-safe `POST /annotate` path whose output renders only on the
  annotation overlay;
- validated derivative and unit-circle recording caches;
- manifest-publication timing and final manifest/visible-state agreement evidence;
- three consecutive cached projectile MVP rehearsals.

Not in scope:

- partial-stroke targeting, word-level narration alignment, raw transcript storage,
  new lesson DSL primitives, widgets, student drawing, pagination, dynamic layout,
  larger Realtime models, or a new board-model quality batch;
- `SYNC_MODE=paced` unless the accepted fixed path fails three consecutive
  perceptual rehearsals. Fixed mode remains present and is the M4 default;
- using annotation generation as a prerequisite for the grounded-answer gate. Local
  deixis is the dependable path; annotation failure falls back to voice plus local
  pointing.

## Design decisions

### Visible target inventory

Extend the renderer's visible-state output from a manifest string to a small factual
snapshot containing the manifest, a monotonically increasing version, and the IDs,
kinds, and logical bounding boxes of successfully rendered elements at progress
`1.0`. The manifest continues to be derived from that same snapshot.

Frozen partial geometry remains visible but is not targetable in M4. A tool call for
an absent, failed, future, partial, or erased ID returns
`{"ok":false,"reason":"unknown_element"}` and creates no overlay.

### Overlay lifecycle

Render a dedicated SVG layer above lesson ink and below future widget/student layers.
Local deixis overlays use deterministic geometry derived from the target box, appear
immediately, and auto-expire after a bounded duration. Model annotations remain for
the current QA exchange and clear on resume, new topic, lesson reset, or disconnect.
Neither temporary deixis nor annotations enter the lesson manifest in M4.

### Annotation contract

Add `shared/schema/annotation.schema.json` as the sole wire contract for annotation
requests and responses. A request carries `request_id`, a bounded math/physics
question, the acknowledged manifest version, and the compact manifest. A response
contains the same request ID and at most five overlay ops.

The annotation schema uses five target-relative overlay shapes: `circle`,
`underline`, `arrow`, `text`, and `equation`. It excludes `axes`, curves, raw markup,
URLs, styles, regions, and absolute coordinates. Every target must be in the supplied
visible-ID inventory. Backend validation and frontend decoding both enforce the
contract; the renderer never consumes raw model output.

Only one annotation request may be active. A new question, resume, new lesson,
clear, or disconnect aborts it. Results with a stale request ID or manifest version
are discarded. The endpoint may make bounded repair attempts under the same
count-before-dispatch and redaction rules as lesson generation, but no live repair or
annotation call is authorized by this plan.

### Resume and synchronization

Keep the current baseline: restart the current narration while continuing frozen ink.
The first acceptance attempt includes an explicit human coherence verdict. If it is
confusing, stop the gate, change only the current step to reset-and-replay, rerun the
deterministic checks, and require fresh approval before another live rehearsal. Do
not infer a word boundary from transcript progress.

## Delivery sequence

- [x] D1 — Baseline and contracts
  - Create the M4 branch from `70add19`; preserve untracked root `node_modules/`.
  - Record current flags and run the full no-spend gate before implementation.
  - Add the annotation JSON Schema and deterministic generated frontend types.
  - Document exact request, response, byte, op, timeout, repair, and concurrency
    budgets before adding the route.

- [x] D2 — Committed visible-target inventory
  - Produce one renderer-owned snapshot for both manifest text and target boxes.
  - Keep only successfully rendered, fully revealed elements.
  - Version snapshots only when factual visible state changes.
  - Prove future, partial, failed, and erased IDs are absent and the manifest remains
    within its existing budget.

- [x] D3 — Instant local deixis
  - Add the four tool declarations only inside `frontend/src/realtime/`.
  - Extend strict tool routing and machine-readable success/failure results.
  - Render stable point, circle, underline, and flash overlays from target boxes.
  - Auto-expire overlays and clear them on lesson/session boundaries.
  - Preserve explicit tool-output continuation required by the Realtime flow.

- [x] D4 — Bounded annotation path
  - Add `POST /annotate` with localhost Host/CORS protection and a dedicated body
    limit.
  - Generate with the configured board model behind a separate concurrency guard.
  - Validate schema, budgets, IDs, anchors, expression/LaTeX safety, and the no-axes
    rule before returning anything.
  - Add at most two repairs for one invalid annotation result and count each attempt
    before dispatch; retain only closed failure origin/count metadata.
  - Add an `annotate` Realtime tool whose handler returns promptly and lets the
    request continue independently.
  - Render accepted annotations on the overlay layer; discard stale or cancelled
    results without changing lesson state or the manifest.

- [ ] D5 — Three recording caches
  - Keep the accepted projectile cache unchanged unless a demonstrated defect
    requires a focused correction.
  - Curate derivative and unit-circle caches from checked-in validated fixtures, not
    from the two known failing live-layout screenshots.
  - Load all three through the production schema decoder and renderer path with no
    network availability.
  - Capture final local screenshots and record human readability verdicts; fix any
    known crash or critical overlap before rehearsal.

- [ ] D6 — Diagnostics and retained evidence
  - Measure each board-context `session.update` send-to-`session.updated` latency
    without storing instruction text.
  - Record final visible-manifest hash and last acknowledged-manifest hash and require
    equality.
  - Add an M4 evidence export containing only bounded metadata: runtime mode, model,
    voice, VAD and sync flags, browser/date, state transitions, partial-stroke
    progress, valid target/result, stale-event count, publication timings, final
    hashes, completion state, usage totals, and human verdicts.
  - Never retain raw utterances, transcripts, audio, credentials, upstream messages,
    or full session payloads.

- [x] D7 — No-spend acceptance gate
  - Run focused schema, validation, routing, overlay, manifest, reducer, cancellation,
    cache, and renderer tests.
  - Run `make test`, `make lint`, `make build`, Python compile, production dependency
    audit, schema regeneration check, secret scan, and `git diff --check`.
  - Exercise annotation HTTP rejection, timeout, invalid result, repair exhaustion,
    cancellation, and stale-manifest paths with deterministic fakes only.
  - Render all three cached lessons headlessly with zero uncaught errors and no known
    critical layout defect.

- [ ] D8 — Owner-approved live MVP gate
  - Before any credentialed run, state the exact ceiling and obtain fresh approval:
    one short `gpt-realtime-2.1-mini` connection, three consecutive cached projectile
    loops, no board-model or annotation-model call, no automatic retry, 256 output
    tokens per response, and the existing 20,000-token connection guardrail.
  - Stop immediately on handshake/access failure or a critical first-run defect.
  - In each counted loop: start; hear concurrent narration/ink; use **Speak** to
    interrupt mid-stroke; retain partial ink; receive an answer using a successful
    local deixis target; resume; and finish without stale audio/state/network work.
  - Require the final acknowledged manifest hash to equal the visible snapshot hash.
  - Disconnect immediately after the third passing loop and retain the redacted M4
    evidence package plus a human verdict for audible stop and resume coherence.

- [ ] D9 — Close M4
  - Update `PROGRESS.md`, `PLANS.md`, `ARCHITECTURE.md`, README status, flags,
    evidence paths, known failures, and the next smallest task.
  - Move this file to `docs/exec-plans/completed/` only after D8 passes.
  - Commit the passing scope as a small descriptive M4 checkpoint. Do not begin M5
    in the same commit.

## Deterministic acceptance matrix

- Tool protocol: all four local tools and `annotate` have strict arguments, bounded
  outputs, demo/diagnostics availability, explicit continuation, and soft failures.
- Overlay renderer: stable geometry, correct layer order, timeout cleanup, target
  removal cleanup, and no manifest pollution.
- Visible state: future/partial/failed geometry omitted; committed IDs targetable;
  identical state does not republish; acknowledgement serialization survives races.
- Response coordination: pending `response.create` registrations are visible as busy
  before `response.created`; lesson auto-start rechecks idle state after manifest
  acknowledgement; transient narration rejection retries only after a busy-to-idle
  transition; bounded creation and settlement watchdogs cannot leave a blank
  `TEACHING` step indefinitely.
- Annotation backend: request limits, host/CORS protection, safe schemas, no axes,
  reference order, semantic validation, repair ceilings, timeouts, cancellation, and
  redacted terminal errors.
- Annotation client: arbitrary failure isolation, request/manifest-version matching,
  abort on lifecycle changes, and no stale overlay commit.
- Lesson lifecycle: interruption freeze, QA, local grounding, resume, checkpoint
  phases, disconnect reset, and new-topic cancellation remain passing.
- Cached lessons: projectile, derivative, and unit circle decode and render offline
  with stable paths and zero uncaught errors.

## MVP exit gate

M4 is complete only when all three consecutive cached projectile loops pass the full
interaction sequence, the local grounding tool succeeds with a committed visible ID,
the last acknowledged manifest matches visible committed state, and all three cached
lessons have zero known crashes. A generated annotation need not be used in the live
gate, but its bounded deterministic implementation must pass or be explicitly cut
with local deixis retained.

## Failure policy and rollback

- Unknown deixis ID: return the soft failure and answer verbally.
- Annotation unavailable, slow, invalid, or stale: abort/discard it; keep voice and
  local deixis. Never block resume.
- Context publication failure: retain the last acknowledged context; do not claim a
  newer board state.
- Fixed-sync perceptual failure: investigate the measured cause; only after three
  consecutive failures may a bounded paced-sync experiment begin. Never delete
  fixed mode.
- Resume confusion: reset and replay only the current step. Do not build word-level
  alignment.
- Live handshake/access failure: stop without retry and retain only closed evidence.
- Implementation regression: revert the smallest M4 commit or return to `70add19`;
  cached projectile at `e0c0aa8` remains the interaction rollback path.

## Next after M4

Enter M5 only if the three-run gate is stable. The next candidate is the projectile
widget alone. If schedule or reliability is tight, explicitly cut M5/M6 and move to
the video/rehearsal milestone; interruption, defensive rendering, three caches, and
fixed sync are not cuttable.
