# Drawing intelligence roadmap: resolver first, agency second

Status: active — implementation authorized by project owner; live/paid gates remain separately owner-approved
Planned: 2026-07-18
Milestone home: M4 reliability and grounding first; optional M5 widget only after the M4 gate
Dependencies: ADR-036 renderer boundary, ADR-040 resolved-prefix continuation, ADR-042 bounded Q&A overlays
Rollback baselines: `VITE_LESSON_GENERATION=one-shot`, `VITE_QA_DIRECT_DRAW=off`, `SYNC_MODE=fixed`, `VITE_BOARD_RENDERER=rough-svg`

## Objective

Raise CHALK's general drawing intelligence without adding topic-specific renderers or
weakening its trust, interruption, and cached-demo paths. The shared investment is a
smarter deterministic resolver: the model names teaching intent and geometric
relationships, while the browser measures, constructs, places, scores, animates, and
reports exact renderer truth.

This roadmap is accepted only when novel math and physics topics improve under a
fixed human rubric without increasing renderer crashes, moving committed ink, causing
lesson-buffer stalls, or making the voice loop less reliable. Passing unit tests alone
does not promote an experimental path.

## Current foundations — do not rebuild

- Resolved-stepwise continuation already sends actual normalized bounds, semantic
  summaries, committed/buffered state, and closed layout findings on every continuation.
- `BoardRenderer` separates geometry truth from React painting; `BoardPatch` provides
  reversible candidate diffs.
- Schema-1.2 relations move only new roots and preserve committed-prefix stability.
- Text/KaTeX measurement and deterministic overlap/overflow lints already exist in
  bounded form.
- Q&A direct drawing already supports at most two target-relative disposable marks
  behind `VITE_QA_DIRECT_DRAW`; `/annotate` remains the fallback.
- Rough.js/SVG, one-shot generation, fixed sync, cached lessons, and the explicit
  interruption state machine remain the dependable demo path.

## Non-negotiable invariants

1. No topic keywords, fixed optics layouts, long-division renderer, or production
   coordinates specialized to a lesson family.
2. Committed ink never moves. Measurement and candidate selection happen before a
   new root commits; later steps may not relayout an accepted prefix.
3. The browser remains renderer truth. FastAPI remains the only standard board-model
   client and the authority for lesson validation, repair, budgets, and accepted-prefix replay.
4. Realtime tool arguments are untrusted. Overlays remain bounded; any permanent Q&A
   step must pass backend prefix replay and browser validation before commitment.
5. No transcript delta is treated as audible word position. `SYNC_MODE=fixed` stays
   available until an audio-position alternative wins a perceptual gate.
6. Every async request carries a request ID and accepted-prefix/manifest version;
   cancellation and stale-result rejection are mandatory.
7. Cached lessons stay byte-identical. No live or vision call runs without fresh owner
   approval for the exact bounded mode and call ceiling.
8. Experimental flags receive predeclared promote, park, and remove criteria. A flag
   that is not promoted must not silently become the demo default.

## Phase 0 — Promotion harness and baselines

Purpose: stop adding experimental paths without comparable evidence.

### Work

1. Define one reusable experiment record containing configuration and prompt hashes,
   retained topic IDs, request/call ceilings, latency, repair/drop/sanitizer counts,
   renderer findings, buffer stalls, crashes, and a human rubric.
   The record must also preserve a stopped run through a closed aborted attempt rather
   than losing counted dispatches, and must pin every applicable Realtime, browser,
   annotation, schema, and resolver identity used by a live comparison.
2. Require each experiment to declare before execution:
   - the primary success metric;
   - maximum acceptable latency/call regression;
   - safety/reliability invariants that allow no regression;
   - promote, park, and remove criteria.
3. Re-score retained synthetic NDJSON and golden/cached fixtures with new deterministic
   lints without model spend.
4. Define the live comparison for one-shot versus resolved-stepwise on the same small,
   owner-approved topic set. Do not assume pairing eliminates model nondeterminism or
   authorizes a twenty-topic batch.
5. Keep vision scoring optional and paid. It may become a proxy only after a bounded
   comparison demonstrates useful correlation with retained human ratings. The
   calibration itself is defined: score the already-retained rubric batch once with a
   board-only crop and the fixed rubric text, compare rank agreement against the human
   ratings, and record the correlation in the experiment record. A single bounded
   calibration either earns vision a regression-proxy role or documents that it is not
   ready; both outcomes are evidence and neither is repeated ad hoc.
6. Audit every existing experimental flag (`VITE_BOARD_RENDERER=tldraw`, `SYNC_MODE=paced`,
   `lesson.ink_delta`, `VITE_QA_DIRECT_DRAW`, `resolved-stepwise`) against invariant 8:
   each must have written promote, park, and remove criteria and a review-by milestone.
   A flag that reaches its milestone without promotion evidence is parked or removed in
   the same change that records the decision. Flags do not accumulate by default.
7. Define a board-model tier comparison that preserves the existing roles and does
   not globally upgrade by intuition:
   - Luna/`none` remains the qualified latency/cost baseline;
   - compare Luna/`low` on retained hard cases first;
   - compare Terra/`none` on exactly those cases next;
   - compare Terra/`low` only if Terra/`none` shows a material but incomplete gain;
   - consider Sol only for cases still deficient after both lower-cost tiers.
   Record prompt hash, reasoning effort, latency, calls/repairs, renderer findings,
   and the unchanged human rubric. Approval for one tier/case set authorizes no other.

### Gate

- The harness validates redacted, content-bounded evidence and rejects mixed prompt or
  configuration hashes.
- Baseline fixtures can be rescored without network access.
- No experiment flag is promoted merely because deterministic tests pass.

## Phase 1 — Density, whitespace, and deterministic candidate placement

Purpose: improve sparse and cramped boards with renderer-owned evidence rather than
more prompt adjectives.

### Work

1. Build a bounded occupancy grid from resolved visible bounds. Track total occupancy,
   connected occupied components, usable empty rectangles, and per-zone density.
2. Add closed findings with contextual thresholds:
   - `region_crowded` for high occupancy plus insufficient separation;
   - `board_imbalanced` for severe one-sided load when the lesson plan expects balance;
   - `region_sparse` only when the composition plan expects accumulated content there.
   Sparse space is not automatically a defect.
3. For each uncommitted independent root, generate at most three deterministic
   candidate placements. Score them by hard collision rejection followed by label/ink
   overlap, boundary escape, density balance, distance to referenced elements, reading
   order, and movement from the model's preferred region.
4. Use stable tie-breaking derived from element ID. Candidate search may move only the
   new root and its uncommitted dependants. If dense multi-element steps later exceed
   what bounded candidate search can place well, the designated upgrade is the
   resolver-internal constraint-solver swap in "Deferred ideas" — not more probes or
   model-side coordinate nudging.
5. Include severe measured/semantic density findings in resolved continuation context.
   Estimated findings remain diagnostic and cannot authorize paid repair.
6. Add a closed reading-order finding alongside density: when a step's new roots place
   explanatory text or equations above/left of geometry they reference in a way that
   inverts the resolved reveal order, report `reading_order_conflict` as a diagnostic
   finding. It informs candidate scoring and continuation context only; it never moves
   committed ink and has no topic-specific heuristics.

### Gate

- Prefix-stability properties remain bitwise green across cached and golden lessons.
- Candidate scoring never produces a worse hard-finding vector than the original
  placement on the retained corpus.
- Human review confirms improvements are not achieved by scattering related marks.

## Phase 2 — Measured-first text and equation placement

Purpose: prevent text and KaTeX collisions before commitment.

### Work

1. Add a provisional measurement stage for new text/equation roots using the actual
   loaded production fonts, KaTeX configuration, and final width constraints.
2. Resolve `anchor + measured box + candidate score` before geometry enters committed
   renderer state. Never reposition already committed content after a later DOM paint.
3. Bound measurement time and cache by normalized content, style, and width. Font-load
   failure uses the current deterministic estimate and records `measurement_unavailable`.
4. Apply measured-first placement to independent and anchored text/equation roots;
   deliberately positioned diagram text retains authored local coordinates but must
   pass its existing bounds/collision lint.
5. Preserve headless deterministic estimates for tests; browser measurement evidence
   is a separate retained gate.

### Gate

- No cached/golden prefix moves as steps append.
- Browser fixtures eliminate known text/equation overflow without increasing overlap.
- Missing fonts, measurement timeout, and KaTeX rejection fail safely without a blank board.

## Phase 3 — Universal geometric constructions

Purpose: replace approximate touching with renderer-computed relationships.

### Initial closed set

- `along(element, t)` with `t` in `[0,1]` for supported line/curve geometry;
- `midpoint_of(a, b)` for points or endpoints;
- `intersection_of(a, b)` for bounded supported primitives with one unambiguous intersection;
- `perpendicular_through(line, point, length)`;
- `offset_from(element, side, gap)` as the geometric form of existing anchor placement.

Schema 1.4 now also supports the post-roadmap `tangent_at(curve,x,length)` extension
under a deliberately narrower contract: only a prior accepted axes-backed curve, an
interior finite data-space x on one contiguous visible segment, and a bounded length.
The browser derives a local line from its rendered sampled polyline and rejects
endpoints, branches, off-visible points, degenerate samples, and corner-like direction
changes. It is not an analytical derivative or a topic-specific tangent renderer.

### Work

1. Add relations to the shared schema rather than creating topic-specific ops.
2. Resolve constructions against earlier accepted geometry only; reject forward,
   cyclic, ambiguous, parallel-without-intersection, degenerate, and off-board cases.
3. Keep derived coordinates renderer-owned and absent from model output.
4. Emit concise semantic summaries so both continuation and voice grounding understand
   the constructed relationship.
5. Add shared fixtures for every successful and rejected construction, including
   floating-point boundary cases.

### Gate

- Exact endpoint/contact assertions replace pixel-tolerance guesses for construction fixtures.
- Invalid constructions cost one op and cannot crash or corrupt later reference state.
- At least three unrelated topic families use the same relations in retained synthetic fixtures.

## Phase 4 — Composition plans and renderer-failure recovery

Purpose: preserve a lesson-wide spatial argument and recover lost teaching intent.

### Work

1. Extend the persistent lesson plan with one optional closed composition archetype:
   `single_large_figure`, `derivation_plus_diagram`, `worked_example_column`,
   `comparison_pair`, or `graph_with_summary`.
2. The renderer maps the archetype to available zones; the model does not emit arbitrary
   rectangles. Continuations may fill declared zones but cannot move committed content.
3. Convert browser drop/repair evidence into closed continuation findings containing
   failure code, affected semantic intent/element IDs where safe, and resolved neighborhood.
   Never send raw exception text, markup, or renderer records.
4. A continuation may re-express the missing idea with fresh IDs in a later step. It
   may not resurrect invalid raw output or mutate accepted history.
5. Preserve clean early termination when the continuation buffer is empty or recovery fails.

### Gate

- Prompt/schema hashes change and old one-shot/prompt evidence is not mixed with it.
- Synthetic browser drops are recovered or explicitly abandoned without dangling references.
- Narrative coherence and buffer-stall rates pass the Phase-0 live gate before
  resolved-stepwise can become the default.

## Phase 5 — Attention choreography

Purpose: make the tutor's visual attention feel intentional without modifying permanent ink.

### Work

1. Generalize existing `point_at`, `circle_el`, `underline`, and `flash` into a bounded
   transient choreography rail: point, trace an existing path, dim unrelated elements,
   and restore.
2. Every action references a currently visible manifest ID and has a fixed duration,
   automatic cleanup, interruption freeze/cancel semantics, and stale request guard.
3. Initially enable choreography only during Q&A and checkpoint feedback. Lesson-time
   choreography waits for the synchronization experiment below.
4. Never include transient emphasis in accepted lesson or persistent manifest state.

### Gate

- Unknown/future targets fail softly.
- Interrupting any transient action leaves permanent geometry unchanged.
- A human run finds the action explanatory rather than distracting in three cached loops.

## Phase 6 — Audible-position and narration-beat experiments

Purpose: improve perceived semantic synchronization without using transcript generation
as playback truth.

### Phase 6A: remote-audio activity spike

1. Attach a Web Audio analyser to the remote WebRTC stream behind a flag.
2. Measure audible activity/silence detection latency and false pauses across the two
   candidate voices and cached scripts. The analyser may gate motion during real pauses;
   it does not claim word or sentence position.
3. Retain fixed playback-event scheduling as fallback if browser support, feedback,
   quiet phonemes, or CPU cost makes the signal unreliable.

### Phase 6B: sentence-response comparison

1. Compare one normal scripted response with per-sentence responses on one cached step.
2. Measure inter-sentence gaps, total latency, response failures, interruption behavior,
   and naturalness. Per-sentence requests provide sentence boundaries, not within-sentence
   word alignment.
3. Stop after the bounded comparison; do not convert every lesson before evidence.

### Phase 6C: backward-compatible beats

Only if 6A or 6B passes, design `script` as either the existing string or 1–5 validated
beats containing `say`, `reveal`, and optional transient `point`. Beat execution must be
driven by the winning audible signal, not transcript deltas.

### Gate

- No audible overlap, response-gap regression, or interruption regression.
- Human review prefers beat alignment over fixed mode on three consecutive cached runs.
- `SYNC_MODE=fixed` remains one flag away.

## Phase 7 — Adaptive Q&A beyond disposable marks

Purpose: let questions add meaningful visual explanation without allowing Realtime to
inject raw permanent lesson programs.

### Work

1. First live-gate the existing two-mark direct Q&A overlay on target validity,
   placement, latency, tool/speech ordering, and interruption.
2. Add density-aware whitespace selection to backend `/annotate`; retain local deixis
   for `where/which`, overlays for bounded emphasis/explanation, and no hardcoded
   question keyword classifier.
3. If the overlay gate passes but lacks expressive power, design `POST /lesson/qa-step`:
   - input includes request ID, accepted prefix, plan, renderer scene, question intent,
     and cumulative budgets;
   - FastAPI replays and validates the prefix, asks the board model for exactly one
     micro-step, and returns at most two allowed ops;
   - browser validates again and commits append-only with fresh IDs;
   - no axes, clear, erase, checkpoint, or mutation in the initial contract.
4. Do not promote an overlay by relabeling its schema. Permanent ink requires an
   explicit deterministic conversion or a freshly validated lesson micro-step.
5. Bounded restructure verbs (`restate`, `extend_axes`, erase-and-rewrite) remain out
   of scope until permanent append-only Q&A proves safe; they affect dependent geometry
   and are not small overlay changes.

### Gate

- Current overlay path passes before any micro-step model call is implemented.
- Permanent Q&A additions preserve prefix replay, continuation versioning, global IDs,
  resume, checkpoint accounting, and stale cancellation.
- Failure leaves the disposable annotation/deixis fallback available.

## Phase 8 — One simulation-backed widget

Purpose: deliver a correctness-by-construction interactive moment without turning the
lesson DSL into a physics engine.

### Work

1. Implement only the projectile widget first, per M5 cut policy.
2. Add a closed `widget` lesson op that references a renderer-owned template and
   bounded parameters. Widget internals and simulation geometry are not model-authored.
3. Define the generic contract as `closed parameter schema -> deterministic geometry
   and observations`. Static figure schemas may later reuse the same mechanism without
   becoming the primary general drawing path.
4. Provide one debounced launch-angle control. Browser computation publishes bounded
   parameter values and derived observations to the latest manifest; it never stores
   student identity or raw utterances.
5. Tool and widget events carry request IDs, reject stale lesson state, pause or freeze
   correctly on interruption, and cannot exceed their region.

### Gate

- Computed trajectories and displayed values match deterministic fixtures.
- Slider changes cannot trigger response storms; tutor reaction is grounded in the
  published value and observation.
- Projectile is stable before considering grapher, pendulum, ray, or other templates.

## Phase 9 — Tool-driven board-agent experiment

Purpose: test the higher-ceiling architecture only after renderer truth and the
resolved feedback loop are proven.

### Design boundary

The board agent remains a FastAPI-mediated board-model workflow. The browser publishes
versioned renderer truth upward; it never receives a standard API key and does not make
board-model calls. A server-only scene graph is not treated as equivalent to browser
font metrics or rendered geometry.

### Bridge from resolved-stepwise

The agent loop is designed as an interactive extension of the existing continuation
contract, not a rewrite. The continuation endpoint already replays the accepted prefix
and receives browser-resolved scene truth; the experiment adds the ability for the
board model to ask one or more bounded questions (`query_scene`, `measure_result`)
*within* a single continuation before emitting `propose_step`. Answers come from the
same resolved-scene contract the browser already produces. If the experiment is parked,
nothing built for it is wasted: the question-answering machinery is the same resolver
surface Phases 1–3 construct.

### Initial experiment

1. Evaluation-only, behind a new flag; one retained synthetic topic, no retries.
2. Agent tools are semantic and bounded: `query_scene`, `measure_result`,
   `propose_step`, and `finish`. The browser resolves a proposed step and returns only
   the shared resolved-scene contract and closed validation/lint results.
3. Every proposed step passes backend validation before browser resolution and browser
   validation before commitment. Tool failure asks for a bounded retry within the
   existing aggregate repair/call ceiling.
4. Compare against resolved-stepwise on call count, first ink, buffer stalls, layout,
   teaching coherence, and human quality. Do not replace compiled lessons from one win.

### Gate

- Product integration requires a separate plan after the experiment materially beats
  resolved-stepwise without weakening latency, reliability, privacy, or cost.
- If the experiment cannot stay buffered or spends calls mainly correcting placement,
  park it and retain the simpler continuation loop.

## Deferred ideas and explicit reasons

- **Board paging/new panels:** useful for long lessons, but the hackathon demo is 3–5
  steps and must first stop avoidable crowding through density and measurement.
- **Curated figure retrieval/templates:** may raise the floor but introduces corpus
  maintenance and can turn live generation into a curated player; reconsider as an
  optional widget/figure fast path after resolver improvements. Reconsideration has a
  concrete trigger — see "Quality plateau trigger" below.
- **Few-shot exemplars in the generated prompt:** two or three hand-vetted schema-valid
  figures injected through the ADR-026 prompt renderer would be the cheapest available
  quality lever (no runtime risk, no new trust boundary), but it changes the prompt hash
  and therefore invalidates paired comparisons mid-flight, and it risks masking whether
  resolver improvements themselves work. Deferred until the plateau trigger fires, then
  run as its own Phase-0 experiment with a fresh hash rather than folded into another gate.
- **Vision self-review/scoring:** remains owner-gated, paid, and nondeterministic;
  structured renderer truth stays authoritative. The first visual-feedback experiment
  is the existing two-call structured-only versus identical structured-plus-low-detail
  board crop comparison. Images may find composition candidates but cannot override
  IDs, bounds, validation, mathematical truth, or deterministic lints. OpenAI's vision
  guidance documents limitations with small text, line styles, and precise spatial
  localization: <https://developers.openai.com/api/docs/guides/images-vision>.
- **Image generation in the teaching board:** do not use raster generation for graphs,
  equations, geometry, ray diagrams, free-body diagrams, or other load-bearing ink.
  It lacks stable semantic IDs, deterministic geometry, precise editability, and
  mid-stroke interruption, while current image models still document latency and
  structured text/composition limitations. Reconsider only for an optional bounded,
  non-technical illustration or pre-generated asset after the MVP is stable; it must
  occupy its own layer/region, never enter mathematical truth, and fail without blocking
  the lesson. Reference: <https://developers.openai.com/api/docs/guides/image-generation>.
- **tldraw as the default board host:** retain the licensed lazy experiment but do not
  promote it for visual novelty alone. Its adoption case is scene mechanics—transactional
  shape state, camera/paging, hit testing, editable student ink, durable Q&A additions,
  undo/redo, export, or interactive widgets—not improved model reasoning or layout.
  Promote only if a retained comparison demonstrates a required mechanic plus acceptable
  load/frame/interruption behavior and a material benefit over rough.js/SVG; otherwise
  park or remove the flag at its Phase-0 review milestone.
- **Constraint-solver placement core:** the Phase-1 hand-rolled candidate scoring
  (≤3 probes, hard/soft lexicographic comparison) is deliberately simple and may not
  scale to dense boards where several new roots and their labels interact. A real
  linear/Cassowary-style solver — or a Penrose-style statement-to-layout optimizer —
  could replace `selectPlacementCandidate` internally while everything around it stays
  fixed: the swap lives entirely inside the resolver, changes no schema, prompt hash,
  trust boundary, or model contract, and must preserve the same invariants (solve only
  the uncommitted root group, committed ink immutable, deterministic output for
  identical input, never a worse hard-finding vector than the model's preferred
  placement, bounded solve time with the current scorer as fallback). Deferred until
  the Phase-1/2 machinery is live-gated and its retained corpus shows placements where
  bounded candidate search demonstrably loses to a solvable constraint system —
  typically ≥3 mutually interacting new elements per step. Adopt via a Phase-0
  experiment record comparing solver versus scorer on the same retained fixtures with
  zero model spend; this is a resolver-internal engineering swap, not a model
  experiment, so no live calls are required to evaluate it.
- **Learned/freehand stroke generation:** no qualified producer exists; keep
  `lesson.ink_delta` evaluation-only.
- **Student-ink-aware drawing:** remains after M5/M6 and requires the existing privacy
  and vision gates.
- **Erase/rewrite and domain mutation:** can invalidate dependent geometry and accepted
  history; append-only intelligence comes first.

## Quality plateau trigger

The phased resolver work raises the floor: fewer collisions, exact contact, recovered
drops. It does not by itself make boards more inventive, and there is a real risk of
optimizing lint vectors past the point where they move perceived quality. Therefore,
after the Phase 1–4 gate and the resolved-stepwise live comparison, one explicit check:

- If human rubric scores on the retained topic set improved materially versus the
  pre-roadmap baseline, continue down the phase order as written.
- If deterministic findings improved but rubric scores plateaued, the bottleneck is
  model-side composition, not the resolver. In that case the next authorized experiment
  is a ceiling lever — few-shot exemplars via the prompt renderer first (cheapest), the
  Phase 9 agent experiment second — before any further deterministic lint work.

This trigger exists so the roadmap cannot silently become an ever-finer validator for
boards that are never bad and never striking.

## Model-tier escalation trigger

Model upgrades are ceiling experiments, not substitutes for missing resolver behavior.
After the same retained hard cases have passed through the current prompt and resolver:

- If Luna failures are schema, collision, measurement, construction, or synchronization
  failures, fix the deterministic substrate; a stronger model cannot supply a missing op
  or repair browser timing.
- If outputs validate and render but show weak visual-structure choice, redundant labels,
  poor use of existing vocabulary, or incoherent continuations, run the Phase-0 tier
  comparison.
- Promote the smallest tier/effort that produces a material human-rubric gain within the
  declared latency and cost ceiling. Do not route every topic to Terra or Sol from a win
  on one complex diagram family.
- A later model router requires a separate plan and a deterministic, testable complexity
  classifier. Until then `BOARD_MODEL` remains one explicit environment choice.

Current official positioning is Luna for efficient high-volume work, Terra for a balance
of intelligence and cost, and Sol for frontier capability. Preserve these workload roles
and re-check the live model guide when the experiment runs:
<https://developers.openai.com/api/docs/guides/latest-model>.

## Verification cadence

For each deterministic phase:

1. shared schema/type regeneration and parity fixtures where applicable;
2. focused unit/property tests for success, failure, cancellation, and stale state;
3. cached/golden render invariants and prefix stability;
4. frontend TypeScript, ESLint, full tests, and production build;
5. backend tests, Ruff lint/format, and compile checks when backend changes;
6. `git diff --check`, credential scan, `PROGRESS.md`, and ADR update.

Do not rerun unrelated full gates after every small edit. Run focused checks while a
phase is in progress, then one complete deterministic gate at the phase boundary.
Live API, microphone, screenshot, vision, and larger-model checks are separate,
owner-approved acceptance activities and never part of default automation.

## Recommended execution order

1. Complete Phase 0 and run the already-pending resolved-stepwise comparison.
2. Implement Phases 1–4 as the shared deterministic resolver investment.
3. Live-gate resolved-stepwise and direct Q&A drawing; promote or park each explicitly.
4. Apply the quality-plateau and model-tier triggers; run only the smallest justified
   prompt/tier comparison rather than upgrading globally.
5. Add Phase 5 attention choreography.
6. Run the bounded Phase 6 sync experiments; retain fixed mode unless they win.
7. Consider Phase 7 permanent Q&A only after overlays pass.
8. Enter M5 for the single Phase 8 projectile widget if the MVP gate is stable.
9. Attempt Phase 9 only as a separate architectural experiment.

At every boundary, the next task is the smallest phase whose prerequisites and
acceptance evidence are satisfied—not the most visually ambitious item remaining.
