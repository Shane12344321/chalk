# Natural drawing: resilient generation and a board model that knows the board

Status: active — deterministic phases 0–5 implemented on 2026-07-17; live gates pending
Planned: 2026-07-17
Milestone home: follow-on feature plan after the M4 gate; it does not claim the optional M5/M6 milestone slots
Implementation branch: create `codex/natural-drawing` after the current M4 gate is accepted (stack on `codex/m4-full-interruption-grounding` only if M4 acceptance is imminent and the owner approves)
Rollback baseline: the accepted M4 commit at branch time

## Objective

Live lessons currently fail in ways cached lessons never exercise: one browser-rejected
op discards the entire generated lesson, the board model is never told how the board is
actually laid out or oriented, committed ink can move while later steps stream in, and a
student cannot switch topics mid-lesson. This plan removes those failure modes and then
raises drawing quality until a generated lesson *reads and animates like a human tutor
at a whiteboard*: correct orientation, coherent spatial narrative, stable ink, and
stroke-by-stroke pacing.

"Draws naturally" is accepted when a ten-topic live batch passes an extended human
rubric (Phase 3) at 8/10 with zero renderer crashes, where the rubric now also scores:

1. reading order on the final board matches narration order;
2. no overlapping, clipped, or repositioned ink at any point during streaming;
3. sketches are recognizable and correctly oriented (nothing upside down);
4. labels and conclusions sit adjacent to the element they explain;
5. primitive labels do not collide with other primitive labels;
6. a logical diagram is not cramped or fragmented merely to satisfy the four-op
   step budget; multi-step accumulation should still read as one developing diagram;
7. strokes appear sequentially at a hand-drawn pace, never simultaneously.

## Findings this plan fixes (audit of 2026-07-17)

| # | Finding | Where |
|---|---|---|
| F1 | A single browser-dropped op aborts the whole live lesson and loads the projectile fallback regardless of topic | `frontend/src/lessonStream/client.ts` assembler throws on `warnings.length > 0`; `App.tsx` catch path |
| F2 | Backend accepts curve expressions the browser rejects at runtime: `1/x` across zero, `log`/`sqrt` over non-positive default domains, off-scale curves with <2 visible samples, `**` (backend normalizes `^`→`**` before AST parse, mathjs has no `**`) | `backend/app/lesson_validation.py` vs `frontend/src/board/expression.ts` |
| F3 | LaTeX is never validated server-side (length only); browser renders KaTeX with `strict: "error"` | `shared/schema/lesson.schema.json` vs `frontend/src/board/latex.ts` |
| F4 | Prompt omits every fact needed to draw: region grid geometry, region pixel sizes and overlaps, sketch y-down orientation, axes sizing, expression domain rules; worked example contains no sketch op | `backend/app/prompts/board_engine.md` |
| F5 | The model receives the *previous* lesson's manifest as `visible_board` and is told to "extend marks already on the board," but the board is wiped and anchors to those IDs always fail validation | `App.tsx` `generateLesson`, prompt "Spatial narrative" section |
| F6 | Committed ink can move mid-stream: region slot heights are computed from all currently known steps, so a later step in the same region relayouts earlier elements; geometry cache signature includes the box, so drawn strokes regenerate at the new position | `frontend/src/board/layout.ts` `layoutSteps`, `geometry.ts` cache |
| F7 | `teach` is refused during TEACHING/QA/CHECKPOINT (`lesson_busy`), contradicting the documented `QA → GENERATING: new topic` transition | `App.tsx` `teachHandlerRef` |
| F8 | Live-failure fallback always loads projectile even when the topic matches another cached lesson | `App.tsx` catch path |
| F9 | Re-entrancy window: `teachHandlerRef` gates on last-render `generation.status`; two tool calls in one tick both pass | `App.tsx` |
| F10 | Prompt promises not enforced: at most one checkpoint per lesson; whitespace-only script passes schema but fails browser word count | validators both sides |

## Scope and non-goals

In scope: lesson-stream degradation semantics, backend validation parity, prompt v2
with a spatial contract, prefix-stable layout, stroke choreography, mid-lesson topic
switch, topic-aware fallback, and the listed small validator gaps.

Non-goals: new sync modes, Realtime transport changes, widget/vision stretch services,
persistence, and any change to the M4 interruption/grounding mechanics. The schema-1.1
op additions (Phase 6) are explicitly optional stretch and must not block acceptance.

## Design decisions to record as ADRs on acceptance

- **ADR-019 (Phase 1):** browser-side lesson decoding degrades per op/step and never
  discards an accepted prefix; the cached fallback is reserved for zero-usable-step
  lessons. The browser remains the final rendering authority; the server remains the
  repair authority.
- **ADR-020 (Phase 2):** curve expressions are numerically pre-sampled on the backend
  by a bounded interpreter over the already-validated restricted AST. This does not
  violate "never evaluate model code": the interpreter executes only CHALK's own
  closed node set, mirroring the browser's sampling contract, so repair can fire
  before the browser ever sees an unrenderable curve.
- **ADR-021 (Phase 4):** layout is prefix-stable by construction: placing step N may
  never change the box of any element from steps 1..N-1. Region packing switches from
  count-division to a flowing cursor.
- **ADR-022 (Phase 3):** the board-engine prompt carries an explicit spatial contract
  (grid map, pixel proportions, y-down sketch orientation, domain rules) and a
  sketch-bearing worked example; `visible_board` is documented as non-anchorable
  context.
- **ADR-023 (Phase 5):** `teach` during QA aborts the current lesson and starts the
  new topic, implementing the documented `QA → GENERATING` transition.

---

## Phase 0 — Parity fixtures and pinned behavior (half day)

Build the shared evidence base first so every later phase flips a failing test rather
than trusting inspection.

1. `shared/fixtures/curve-parity.json`: cases of `{expr, domain?, axes, expect: "accept" | "reject", reason}` including at minimum: `1/x` over `[-2,2]`; `log(x)` and `sqrt(x)` with and without safe domains; `tan(x)` near an asymptote-adjacent sample; `x**2`; an off-scale `exp(x)`; benign accept cases from the cached lessons.
2. `shared/fixtures/latex-parity.json`: strict-KaTeX failures (unknown command, unbalanced brace, unicode) plus every equation from the three cached lessons and ten golden lessons as accepts.
3. Frontend test consuming both fixtures through `compileSafeCurve`/`sampleVisibleCurveSegments` and `renderSafeLatex` — must pass immediately (the fixtures encode current browser truth).
4. Backend test consuming the same fixtures — initially records (as expected-failure assertions) every case where the backend accepts what the browser rejects. Phase 2 flips these to hard assertions.
5. Layout prefix-stability property test over the 3 cached + 10 golden lessons: for every prefix length k, the boxes of steps 1..k under `layoutSteps(prefix)` equal their boxes under `layoutSteps(full)`. Marked expected-failure until Phase 4.

Acceptance: fixtures committed; frontend fixture tests green; backend/layout gaps
captured as expected-failures with the finding IDs (F2/F3/F6) in the test names.

## Phase 1 — One bad op costs one op (F1, F9) (1 day)

Frontend only; no model-behavior change; protects the demo path immediately.

1. Refactor `frontend/src/board/decode.ts` into an incremental core:
   `createDecodeContext()` holding accepted element IDs/ops, plus
   `decodeStep(rawStep, context)` returning `{step?: NormalizedStep, warnings}`.
   `decodeLesson` becomes a thin wrapper (cached lessons and review mode unchanged).
   Dependent-reference behavior is preserved automatically: an op dropped earlier is
   absent from the context, so later anchors/curves referencing it drop with
   `unknown_reference`.
2. Rework `LessonStreamAssembler` (`frontend/src/lessonStream/client.ts`):
   - keep its own decode context; on `lesson.step`, decode only the new step;
   - a step that decodes with dropped ops keeps its surviving ops; a step whose ops
     all drop increments a new `browserDroppedSteps` counter and is skipped — **no
     throw**;
   - `lesson.done` cross-check compares `accepted_steps` against the count of
     `lesson.step` envelopes received (server truth), not the browser-retained count;
   - `finish()` errors (`invalid_lesson`) only when zero usable steps remain, which
     preserves the existing cached-fallback path for genuinely empty lessons;
   - `LessonStreamProgress`/`LessonStreamResult` gain `browserDroppedSteps` and
     surface per-op warning counts for diagnostics.
3. `App.tsx`: show browser-dropped counts in the diagnostics stream note; add the
   synchronous re-entrancy guard (F9): an `activeGenerationRef` set at
   `generateLesson` entry and cleared on settle; `teachHandlerRef` checks the ref.
4. Tests: assembler streams a 4-step lesson where step 2 contains a browser-rejected
   curve → result has 3 steps, one dropped, no throw; all-invalid lesson still falls
   back; `lesson.done` count check still catches a server/browser envelope mismatch;
   double-`teach` in one tick yields exactly one generation.
5. Update the ARCHITECTURE failure-policy row ("Streamed step fails browser
   validation → drop op/step, warn, continue; fallback only at zero steps").

Acceptance: all Phase-0 frontend fixtures still green; new degradation tests green;
manually killing one op in a captured NDJSON replay renders the remaining lesson.

## Phase 2 — Backend/browser validation parity so repair fires (F2, F3, F10) (1.5 days)

The browser stays the final authority (Phase 1 is the backstop); the backend's job is
to catch the same problems *before* emission so the existing repair budget can fix
them.

1. `backend/app/expression_runtime.py` (new):
   - `evaluate_restricted_ast(tree, x)` — a closed interpreter over exactly the node
     set `validate_curve_expression` already allows (constants, `x`/`pi`/`e`, the five
     binary ops, unary ±, the seven functions). No `eval`, no attribute access.
   - `sample_curve(expr, domain, axes)` mirroring `expression.ts` exactly: 121 samples,
     default domain = axes x-range, reject non-finite, reject `|y| > 1_000_000`,
     reject sampled discontinuity `> max(10_000, |prev| * 100)`, and require at least
     one contiguous run of ≥2 samples inside the axes x/y ranges. Constants defined
     once and cross-referenced in `shared/schema/README.md`.
2. Extend `LessonValidationState.accepted_ids` values from a type string to a small
   record carrying axes bounds, so `validate_step` can sample curves against their
   axes. `inventory()` keeps returning sorted IDs (repair payload unchanged).
3. Expression normalization: rewrite `**` → `^` during step normalization (before
   emission), then enforce the browser charset
   `^[0-9a-zA-Z_+\-*/^().\s]+$` on the stored expression. Emitted steps are therefore
   always mathjs-parseable.
4. `backend/app/latex_lint.py` (new), applied to every `equation` op: length, the same
   forbidden-command regex as `latex.ts`, printable-charset check, balanced braces and
   `\left`/`\right` pairing, and a generous command allowlist seeded from every
   command used in the cached/golden lessons plus standard KaTeX math commands.
   Unknown command → repairable issue naming the command. False-reject risk is
   acceptable because repair rewrites; false-accept risk is acceptable because
   Phase 1 degrades.
5. Close the small gaps (F10): require ≥1 word after trim in `script`; enforce at most
   one checkpoint per lesson via validation state; document both in the schema README.
6. Extend `backend/app/prompts/repair.md` with the new issue vocabulary (singularity
   domains, off-scale curves, unknown LaTeX commands) so one repair round has a real
   chance of succeeding.
7. Flip the Phase-0 backend expected-failures to hard assertions; add unit tests for
   the interpreter (parity against fixture expected values, non-finite handling,
   node-budget respect) and the latex lint.

Acceptance: backend and frontend agree on every parity fixture; a synthetic lesson
containing `1/x` triggers a repair request (observed via the existing counted budget)
instead of streaming an unrenderable step.

## Phase 3 — Prompt v2: the model learns the board (F4, F5) (1 day + one approved live batch)

1. Snapshot the current prompt as `board_engine_v2.md`; author the new
   `board_engine.md` with a **Spatial contract** section stating, concretely:
   - the board is 1600×900 with 48px margins; grid cells are ~358×252 (wide, short);
     columns are letters A–D left→right, rows are digits 1–3 top→bottom;
   - `left` = columns A+B (~740×804), `right` = columns C+D, `full` = the whole board;
     these overlap the grid cells they contain — never place ops in both;
   - **sketch coordinates are y-down**: `[0,0]` is the top-left of the region,
     `[1,1]` the bottom-right; an arc that rises must *decrease* y toward its peak;
   - axes render at roughly 700×430 and belong only in `left`, `right`, or `full`;
     a grid cell squeezes a plot below readability;
   - curve domain rules: for `log`, `sqrt`, or any division, set `domain` so the
     expression is finite and real over the whole interval; keep the curve inside the
     axes y-range for most of the domain;
   - `visible_board` describes what the student saw before this lesson; the board is
     erased when the new lesson starts, and anchors may reference only elements
     created in this lesson.
2. Add a second worked example that includes a multi-stroke sketch drawn y-down
   (projectile: ground line, launcher, arc peaking at low y) with an anchored label —
   the current example covers text/axes/curve/anchor but the hardest op has no
   exemplar.
3. Keep the natural-teaching guidance and tighten it: 3–5 steps, one idea per step,
   label immediately after drawing, top-left → bottom-right argument.
4. Frontend pairing (F5): `generateLesson` sends an empty `board_state` for a fresh
   lesson (the request field stays for a future continuation feature).
5. Verification: prompt SHA already travels in response headers, so evidence is
   attributable. Run, under the standing live-budget rules and with explicit owner
   approval: one one-topic smoke, then the ten-topic batch scored on the extended
   rubric (objective section above). Sketch orientation and step-to-step spatial
   coherence are new rubric line items.

Acceptance: 8/10 on the extended rubric, zero crashes, first-ink latency within the
existing six-second target. If the batch fails, compare only failed topics on the
documented escalation path (ADR-012) before touching model choice.

Keep the general four-op-per-step budget unchanged for this batch. If the retained
screenshots repeatedly show cramped or fragmented diagrams, design a tightly bounded
diagram-primitive allowance rather than raising the budget for every op kind.

## Phase 4 — Prefix-stable layout and stroke choreography (F6, "draws naturally") (1.5 days)

Layout stability (F6):

1. Rewrite region packing in `layoutSteps` from count-division to a flowing cursor:
   each region keeps a y-cursor; an op is placed at the cursor with its intrinsic
   height (clamped to remaining space), then the cursor advances by height + gap.
   Later steps can no longer resize or move earlier slots, making layout
   prefix-stable by construction; the collision resolver is unchanged and now only
   handles cross-region overlap (`left`/`full` vs grid cells).
2. Flip the Phase-0 prefix-stability property test to a hard assertion, and add a
   streaming regression: feed steps through the assembler one at a time and assert
   committed boxes are bitwise stable across arrivals.
3. Re-bless the golden layout snapshots and visually re-approve the three cached
   lessons (they are recording assets; the owner signs off before the old snapshots
   are deleted).

Stroke choreography ("draws naturally"):

4. Generalize the existing sketch `revealGroup` mechanism (`Board.tsx`
   `pathRevealProgress`) to axes and curves: axes reveal x-axis then y-axis; curves
   reveal segments in order. One mechanism, three op kinds, no new state.
5. Replace static `opWeight` (`animation.ts`) with geometry-aware weights: sketch and
   curve weight from actual drawn path length, axes from extent, text/equation from
   visible character count, with the existing min/max clamps. The fixed-sync contract
   is untouched — weights are still normalized within the step.
6. Apply ease-in-out to per-path reveal progress and delay axis labels until their
   axes paths complete, so marks stop appearing at constant robotic speed.
7. Deterministic tests only: monotonicity, completion at progress 1, group ordering,
   and label gating; visual confirmation happens in the Phase 3 rubric run and cached
   rehearsals.

Acceptance: property/streaming tests green; goldens re-blessed with owner sign-off;
one cached rehearsal confirming no ink jumps and sequential stroke feel.

## Phase 5 — Interaction: switch topics like a tutor would (F7, F8) (1 day)

1. Mid-lesson `teach` (F7): add a `NEW_TOPIC` event to the sync reducer that is legal
   from `QA` and `DONE` (a student interruption always lands the lesson in `QA`
   first, so `TEACHING` needs no direct transition): it clears step state, marks the
   old `requestId` stale (existing stale-event guards then ignore its narration
   settlement), and returns to `IDLE`. `teachHandlerRef` accepts `IDLE`/`DONE`/`QA`;
   in `QA` it dispatches `NEW_TOPIC`, cancels the stream client, clears overlays and
   annotations, then starts generation. Generation remains refused while status is
   `generating` (the Phase 1 ref guard).
2. Update `BASE_TUTOR_PROMPT` ("no lesson is running" clause): if the student clearly
   asks for a different topic during Q&A, acknowledge briefly and call `teach` with
   the new topic.
3. Topic-aware fallback (F8): map topic keywords to the three cached lessons
   (derivative/slope, circle/sine/trig, projectile/launch/angle); the failure path
   loads the best match, defaults to projectile, and the status message names the
   loaded lesson.
4. Tests: reducer transitions (`QA → IDLE` via `NEW_TOPIC`, stale narration events
   ignored afterward), handler-level test for interrupt-then-switch, fallback mapping
   table test. Manual rehearsal item: interrupt mid-stroke, say "actually teach me
   integrals," observe old ink cleared, filler spoken, new lesson starting.
5. Record ADR-023 and update the state-model section of ARCHITECTURE.

Acceptance: rehearsal passes twice consecutively with no stale narration or orphaned
HTTP work in the network log.

## Phase 6 — schema 1.1 shared-canvas physics diagrams

Implemented deterministically after an off-corpus optics lesson demonstrated that the
original sketch-only vocabulary could not express direction, normals, or angles.

- `line` and `arrow` accept normalized `from`/`to` points, a closed
  `solid | dashed` stroke, and an optional attached label.
- `point` accepts a normalized location and optional label.
- `angle_arc` accepts a normalized center, bounded radius, start/end degrees, closed
  stroke style, and optional label.
- The first primitive uses a board region. Related primitives use `canvas_id` to inherit
  an already accepted diagram primitive's normalized y-down coordinate space, keeping
  multi-step diagrams registered while each element retains its own anchorable bounds.
- Schema accepts `"1.0" | "1.1"`; cached lessons remain untouched at 1.0, while live
  assembly identifies the extended contract as 1.1.
- Backend/browser semantic validation, stable rough geometry, dashed-stroke reveal,
  animation weights, manifest summaries, prompt contracts, and focused tests are wired.

The deterministic implementation does not qualify prompt v3 live. A fresh owner-approved
smoke remains part of the existing live gate.

## Phase 7 — Drawing intelligence techniques borrowed from tldraw's agent architecture

Reviewed 2026-07-17 against the tldraw AI module and agent template
(<https://tldraw.dev/docs/ai>, <https://github.com/tldraw/agent-template>).
Adopting the library itself remains rejected: it has no sequential/animated
stroke drawing, and rebuilding CHALK's freeze/manifest/choreography guarantees
on a general-purpose editor is schedule risk with no demo payoff. The approved
techniques are implemented inside CHALK's existing pipeline:

1. **Schema-derived prompt contract.** A bounded deterministic renderer reads
   `lesson.schema.json` and injects exact step/op fields, variants, enums,
   ranges, ID syntax, regions, and budgets into prompt v3 and the repair
   prompt. v1/v2 are byte-identical fallbacks; hashes cover expanded bytes.
2. **Safe-only sanitization.** Python and TypeScript share
   `sanitizer-parity.json`. They trim outer whitespace, normalize `**` to `^`,
   and clamp normalized points/gaps only within 0.05 of the legal boundary.
   Fuzzy references, case correction, numeric-string parsing, truncation,
   duplicate repair, and inferred geometry are explicitly forbidden. Accepted
   corrections emit closed `step_sanitized` evidence and terminal totals.
3. **Structured annotation geometry.** `/annotate` replaces its redundant ID
   list with up to 30 committed `{id, kind, bounds}` records. Bounds are
   three-decimal normalized y-down board fractions; the backend derives the
   target allowlist from them. The compact Realtime tutor manifest is unchanged
   and the existing 6 KiB request cap remains proven sufficient.
4. **Gated screenshot A/B harness.** `python -m app.annotation_vision_smoke`
   refuses to run without `--approved-by-owner`. It performs one structured
   control and, only after that succeeds, one identical structured-plus-image
   request with an official Responses `input_image` data URL at `detail: low`.
   It uses a synthetic retained board, `store: false`, no retries, never stores
   Base64 image data, and keeps structured bounds authoritative. No image is
   sent through the product `/annotate` path.

Deterministic acceptance is complete. The two paid A/B calls and human
placement verdict remain pending separate owner approval. Product screenshot
integration requires a new plan and evidence that vision is materially better.

## Verification gates

- [x] Phase 0 fixtures committed. (Executed in one session, so gaps were driven straight to green rather than staged as expected-failures; the fixtures still pin browser truth for both suites.)
- [x] Full frontend and backend suites green after every phase (250 frontend + 197 backend at completion).
- [x] Curve/LaTeX parity fixtures pass identically on both sides (Phase 2).
- [x] Prefix-stability property test green across all thirteen cached/golden lessons (Phase 4). Golden tests are invariant checks and pass unchanged; owner visual re-approval of the three cached lessons under the new layout/choreography is still pending.
- [ ] One approved smoke + one approved ten-topic batch on prompt v3 scoring ≥8/10 on the extended rubric, zero crashes, ≤6s first ink (requires owner approval and credentialed spend).
- [ ] Mid-lesson topic-switch rehearsal passes twice (requires a live mini-Realtime session).
- [x] Diagnostics overlay shows browser-dropped counts; `PROGRESS.md` records the session.
- [x] ARCHITECTURE updated: failure-policy table, validation service, board subsystem, ADR-019..023.
- [x] Phase 6 deterministic schema-1.1 implementation passes shared-canvas validation, layout, geometry, animation, and prompt-contract tests; cached lessons remain unchanged. Live prompt qualification is still pending.
- [x] Phase 7 deterministic prompt generation, sanitizer parity/evidence, and structured annotation bounds are implemented without changing cached lessons or spending API budget.
- [x] Deterministic visual lints report primitive-label overlap, diagram-canvas escape, and minimum-font text overflow in diagnostics without moving committed ink.
- [x] Prompt v3 selects concept-shaped visual structures and applies a word-removal test; its new expanded hash must be used for all future v3 evidence.
- [ ] Owner-approved annotation screenshot A/B smoke completes exactly two calls and receives a retained human placement verdict.

## Live API budget

Deterministic tests and fixtures carry every phase except Phase 3's gate. Planned
credentialed spend: one repair-path exercise observed during Phase 2 development (one
call), one Phase 3 smoke topic, one Phase 3 ten-topic batch, and at most one bounded
re-run of failed topics if the first batch misses the gate. Each requires the standing
explicit owner approval and a `PROGRESS.md` entry; no automatic retries.
The Phase 7 annotation-vision comparison is a separate approval domain: one
structured control call and one structured-plus-image call, sequentially with
no retry. Approval for it authorizes none of the lesson or Realtime gates.

## Risks

| Risk | Mitigation |
|---|---|
| Backend latex allowlist too strict → repair spend rises | Allowlist seeded from real lesson corpus; repair issues name the command; Phase 1 makes residual mismatches cost one op |
| Bounded AST interpreter drifts from mathjs semantics | Single shared fixture file is the contract; parity tests run in both suites; browser remains final authority |
| Cursor-based packing changes cached-lesson layouts | Golden snapshots force review; owner visually re-approves the three recording assets before re-blessing |
| Prompt v2 regresses lesson quality in unexpected ways | v2 snapshot retained; prompt SHA in headers attributes every artifact; single-batch gate with documented escalation, no silent iteration |
| Mid-lesson switch races the response coordinator | Reuse existing stale-request guards; reducer-level tests before any live rehearsal |

## Documentation updates on acceptance

- `ARCHITECTURE.md`: failure-policy rows, state model, ADR-019..023.
- `shared/schema/README.md`: sampling constants, latex lint rules, checkpoint budget.
- `PLANS.md`: current-state row and link to this plan; move to `completed/` with
  evidence pointers when done.
