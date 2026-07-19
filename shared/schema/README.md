# CHALK lesson schema

`lesson.schema.json` is the sole lesson wire-format source of truth. Frontend
types are generated from it with `npm run schema:types` in `frontend/`; do not
hand-edit `frontend/src/board/lesson.generated.ts`.

`lesson-stream.schema.json` defines the backend-to-browser NDJSON envelope.
Its `lesson.step` payload references `lesson.schema.json#/$defs/step`; it does
not duplicate the lesson DSL.

The stream also reserves `lesson.ink_delta` for an evaluation-only,
append-only pen-prefix experiment. It is not emitted by the backend or cached
lesson path. A browser may expose a delta only after separately registering a
fully accepted operation header with request/step/op identity, stroke count,
and total point budget. Sequence numbers are monotonic per stroke, each point
is a finite normalized coordinate, cancellation removes the provisional ink,
and a failed terminal operation never becomes committed board state. This
dedicated envelope does not authorize parsing partial lesson JSON.

`lesson-plan.schema.json`, `resolved-board-scene.schema.json`, and
`lesson-continuation.schema.json` define the opt-in resolved-stepwise
generation loop. The opening response emits one bounded narrative/visual plan
and one or two validated steps, targeting two when both are safe. For each
continuation, the browser sends the exact server-issued `receipt_prefix`, its
browser-accepted projection, and renderer-resolved element bounds, concise
summaries, committed/buffered state, and closed lint/recovery findings. FastAPI
remains the only board-model client and reconstructs `LessonValidationState` by
replaying the accepted prefix on every request. The scene is capped at 30
unique elements, 12 layout findings, and 8 recovery findings; contains no raw
renderer records or student utterances; and is limited to 12 KiB before
entering a prompt. A continuation returns exactly one validated step or a
closed clean-terminal reason; it never leaves the lesson waiting for an empty
buffer.

A lesson plan may additionally select one optional closed
`composition_archetype`: `single_large_figure`, `derivation_plus_diagram`,
`worked_example_column`, `comparison_pair`, or `graph_with_summary`. Historical
plans that omit it remain valid. The schema admits no model-authored zone,
rectangle, bound, coordinate, or percentage fields. Browser-owned
`compositionPlan.ts` deterministically maps the closed name to semantic zones
using only existing lesson regions and qualitative occupancy expectations;
that mapping is planning input and cannot reposition committed ink.

The continuation schema is the shared browser/backend authority for requests,
successful one-step responses, and terminal reasons. It also carries the
board, repair, and continuation prompt hashes plus one configuration hash, so
evidence from different model/prompt configurations cannot be silently mixed.
Every continuing `lesson.done` carries an opaque HMAC receipt bound to the
request and client IDs, exact canonical server-issued prefix and plan hashes,
prefix version, a content-free topic/student-context digest, cumulative repair
count, and configuration hash. A successful response rotates the receipt over
the newly accepted prefix. The accepted browser prefix may differ from the
authenticated prefix only as an ordered, immutable projection whose every
omitted op or step is covered by closed recovery evidence; insertion, mutation,
reordering, uncovered filtering, modified plans/context, repair-budget
downgrade, configuration drift, and exact receipt reuse in the current server
process fail closed before a board-model call. The replay ledger is bounded and
digest-only; it intentionally resets on a backend restart, while receipt
authenticity and state binding remain restart-verifiable. Rotating the
server-only `OPENAI_API_KEY` rotates the derived receipt key and invalidates
outstanding continuations. No receipt claim is a browser API and no model or
student content is logged by the receipt layer.

The browser reserves scene capacity for every accepted root before adding any
optional composite subpart. Composite subpart IDs remain renderer-owned and do
not yet carry an explicit root identity. FastAPI therefore accepts their tightly
bounded virtual-ID form only when the replayed prefix contains a composite
diagram root; all ordinary scene elements must match accepted root IDs exactly,
and missing or phantom ordinary roots fail closed.

`recovery_findings` is an append-only, redacted account of visual intent that
did not become visible ink after browser decoding or renderer preparation. A
finding contains only a closed failure code, semantic op intent, source step and
op indexes, unavailable element IDs, a normalized board zone, and up to four
currently visible nearby IDs. It can never contain model text, exception text,
SVG/HTML, screenshots, or arbitrary renderer state. Only `pending` findings ask
for one fresh-ID re-expression; `recovered` and `abandoned` findings remain as
bounded tombstones so later steps cannot resurrect or reference failed IDs. If
recovery fails, is stale, or cannot be validated, the endpoint emits the closed
`recovery_abandoned` terminal and the browser finishes the accepted prefix
cleanly.

`drawing-experiment-record.schema.json` is the bounded evidence contract for one
homogeneous drawing experiment run. A record contains exactly one complete runtime
configuration, one board/repair prompt identity, a SHA-256 digest over that canonical
configuration, at most 20 retained topic IDs, predeclared request/model-call ceilings
and decision criteria, closed aggregate/topic metrics, numeric human ratings, and one
promote/park/remove decision. Configuration identity includes all current prompt
hashes, exact lesson/plan/resolved-scene schema hashes, and the pinned browser-resolver
policy revision. Applicable live gates also require complete Realtime model, voice,
base-instruction and tool-contract identity, browser engine/version, and annotation
prompt/schema identity; null is accepted only when that path is not enabled.
Browser-dropped steps and renderer-dropped operations remain separate topic and
aggregate counters. The record has no field for raw model output, student utterances,
images, Base64, exception text, or arbitrary renderer records. The backend verifier
recomputes the configuration digest, totals, topic/rating identity, ceilings, and any
optional vision-proxy calibration.

Schema 1.1 also represents a stopped paid run without inventing a completed result.
`status: "aborted"` retains only the completed retained-topic prefix plus one closed
`abort_evidence` object for the next attempted topic. Its bounded request, model-call,
and repair counts are included in aggregate totals, including transport/HTTP attempts
that were counted before dispatch but produced no topic result. An aborted record stays
decision-pending, cannot carry calibration, and cannot retain arbitrary upstream text.

Live experiment runners must also use the backend `ExperimentBudgetGuard`, claiming
requests and model calls before dispatch so timeouts and transport failures count and
the ceiling is enforced before network activity. Record verification alone is not a
runtime spend control.

The optional proxy calibration is one fixed offline calculation over already-retained
scores: tie-aware Spearman rank correlation, 5–20 topics, with a predeclared acceptance
threshold of 0.70 and at least three distinct human score levels. The retained M3
`layout_pass` booleans are not ordinal enough for this check and are rejected rather
than converted into a flattering correlation. The helper does not read screenshots or call a model, and the
verifier requires each human score to equal the record's retained rubric rating.
Running a paid vision scorer remains a separately owner-approved activity.

Offline renderer rescoring remains browser-owned. Run
`npm --prefix frontend run evidence:rescore` to replay the retained validated NDJSON
plus all golden/cached lessons through the production stream decoder, resolver,
renderer, and lints without network access. The closed output separates browser-
dropped steps from renderer-dropped operations and includes the shared pinned resolver
policy revision so different placement policies cannot be mixed. Python deliberately
does not reproduce browser geometry or font measurement.

Accepted near-valid steps may emit a `step_sanitized` warning before their
`lesson.step`. The warning carries only a closed correction-code set and a
bounded field count. Optional `lesson.done.sanitized_steps` and
`sanitized_fields` totals let current clients cross-check those warnings while
retained historical streams remain decodable. No before/after model content is
placed in the warning or logs.

Terminal errors are also a closed wire contract. Upstream HTTP rejection,
failed response, incomplete response, streaming error, and transport
unavailability use distinct CHALK codes. Only the allowlisted
`upstream_reason` categories in the schema may cross into the browser or
retained evaluation evidence; raw upstream messages and arbitrary codes do
not. Local timeout, invalid-stream, configuration, and no-valid-step errors
cannot carry `upstream_reason`.

Every current terminal error includes a closed `failure_origin` of
`generation` or `repair` plus `repair_attempts`, bounded from zero through
four. These fields remain optional in the schema only so retained streams
created before this contract can still be decoded and identified as
historical evidence. `lesson.done.repairs` is likewise capped at four, the
aggregate per-lesson repair-call ceiling; the separate per-line ceiling is
two.

Schema 1.0 remains valid for the untouched cached lessons. Schema 1.1 adds four
standalone physics-diagram primitives: `line`, `arrow`, `point`, and `angle_arc`,
plus a bounded composite `diagram` operation.
The first primitive claims a normal board region; related primitives carry a
`canvas_id` naming an already accepted diagram primitive and inherit its same
normalized y-down coordinate space. This makes interfaces, dashed normals,
rays, labeled points, and angle marks register as one accumulated diagram
without admitting raw SVG or renderer options. Stroke style is the closed enum
`solid | dashed`, and dashed ink is generated as deterministic short strokes so
the existing per-path reveal animation remains valid. The five original ops
and all cached schema-1.0 lesson files are unchanged.

Schema 1.2 adds an optional, bounded `layout` array to a step. Its generic
`place`, `align`, `stack`, and `distribute` relations let deterministic code
resolve spatial intent instead of asking the model to guess every coordinate.
Relations may move only independent operations created in that same step;
curves and `canvas_id` children inherit movement from their axes or diagram
root, and committed prior-step ink is immutable. A `place` target must already
be accepted or occur earlier in the same step. Relation arrays contain at most
eight items, member IDs are unique, and normalized gaps are capped at 0.25.
The browser resolves relations in declared order, clamps the new group as one
unit to the 1600x900 board, and then runs deterministic layout lints. Cached
schema-1.0 and physics schema-1.1 lessons remain byte-identical.

Schema 1.2 also permits an optional 3–120 character `meaning` only on a bare
`sketch`, bare `line`, or composite diagram primitive. It is intended for a
conceptual role that cannot be recovered from geometry or an existing label,
not as mandatory boilerplate. Renderer-owned manifest summaries prefer this
field when present, so later continuation and voice grounding retain intent.

Schema 1.3 adds renderer-owned universal geometric constructions without
admitting derived model coordinates. A constructed `point` carries exactly one
closed relation: `along(element,t)`, `midpoint_of(a,b)`,
`intersection_of(a,b)`, or `offset_from(element,side,gap)`. A constructed
`line` carries `perpendicular_through(line,point,length)`. Point references are
either an accepted point element or the named start/end endpoint of an accepted
line/arrow. Construction inputs must come from prior accepted steps, so the
model cannot form a forward edge or cycle and a later step can never move the
source geometry.

The browser resolves the relation from actual laid-out geometry. `along` uses
arc length over one contiguous conceptual line/visible curve; midpoint and
perpendicular inputs must share one inherited renderer coordinate space;
intersection requires one unique bounded crossing; offset gaps are fractions
of the inherited canvas axis; perpendicular length is a fraction of the
canvas's shorter side. Parallel, overlapping, disconnected, cross-canvas,
degenerate, and off-canvas results fail with closed codes. The failing op is
omitted, unrelated sibling ink continues, and the missing ID never enters
resolved geometry or the visible manifest. FastAPI validates the closed schema,
prior-step reference inventory, and referenced element types, but does not
claim browser font/layout geometry. Renderer-derived `at`, `from`, and `to`
coordinates are absent from model output and never cross the lesson wire.

`shared/fixtures/construction-parity.json` is consumed by both suites. It pins
all five relations, floating `t=1` behavior, forward/self reference rejection,
parallel and overlapping intersections, multi-crossing curves, disconnected
paths, coordinate-space mismatch, near-degenerate direction, and off-canvas
output. Successful retained cases span optics, Euclidean geometry, mechanics,
calculus, vectors, and free-body diagrams; the contract contains no topic
keywords or family-specific renderer branch.

Schema 1.4 adds the sixth, deliberately narrower relation:
`tangent_at(curve,x,length)`. It accepts only a prior accepted axes-backed curve
and a finite data-space `x` strictly inside one contiguous visible segment. The
browser derives the line from the exact finite polyline it renders, rather than
claiming a server-side analytic derivative. It rejects endpoints, off-visible
points, disconnected segments, degenerate samples, and corner-like direction
changes with the existing closed construction codes. Length remains a fraction
of the plot box's shorter side. This makes local rate-of-change marks usable for
calculus and motion without adding a topic-specific tangent renderer or model
coordinates. The parity fixture pins smooth success plus endpoint, off-board,
corner, and non-curve rejection.

`diagram` groups 1–16 related semantic primitives on one normalized y-down
canvas: polyline `line`, through-point `smooth`, `rect`, `ellipse`, elliptical
`arc`, `point`, and short positioned `text`. Positioned text has bounded
content, a normalized `at` point, a closed left/center/right alignment, and a
closed small/normal/large size; it lets arithmetic, derivations, and labels
whose meaning depends on alignment stay registered without a topic-specific
renderer. Only closed stroke/fill/arrow/label/text fields are accepted;
model-provided SVG paths, renderer options, CSS, and markup remain impossible.
The browser owns curve interpolation, exact cubic/arc extrema, stable rough.js
seeds, arrowhead construction, incidental-label collision resolution, and
primitive-by-primitive reveal. Deliberately positioned text is never moved by
the label resolver. A composite
diagram is itself a valid `canvas_id` target, so later narrated steps can add
standalone marks without losing registration. Degenerate paths, rectangles,
terminal arrow directions, and sub-degree arcs fail semantic validation before
rendering.

For Realtime grounding, each fully revealed composite primitive becomes a
renderer-owned virtual manifest element with a stable schema-valid ID, exact
bounds, and a concise semantic description. Future and partially revealed
primitive groups are excluded. The browser republishes this factual snapshot
when student speech starts; the tutor still receives no screenshot and cannot
claim board content absent from the manifest.

Beyond the JSON Schema, both sides enforce a shared runtime contract pinned by
`shared/fixtures/curve-parity.json`, `shared/fixtures/latex-parity.json`,
`shared/fixtures/sanitizer-parity.json`, and
`shared/fixtures/construction-parity.json`:

- Curve expressions are numerically sampled at 121 points over `domain`
  (default: the axes x-range). Non-finite or complex samples, |y| above
  1,000,000, a sampled discontinuity above max(10,000, |previous| × 100), or
  fewer than two contiguous samples inside both axes ranges are rejected. The
  backend samples with a bounded interpreter over the validated AST
  (`backend/app/expression_runtime.py`); the browser samples with locked-down
  mathjs (`frontend/src/board/expression.ts`), and remains the rendering
  authority.
- Exponent magnitude is capped at 32 before exponentiation. The bound applies
  recursively, so a nested model-produced power cannot materialize an enormous
  intermediate value before the normal finite/output-budget checks run.
- The backend normalizes `**` to `^` before emission and enforces the browser
  expression charset, so every emitted expression parses in mathjs.
- Equation LaTeX passes a conservative structural lint on the backend
  (`backend/app/latex_lint.py`: forbidden commands, unbalanced groups,
  unpaired `\left`, math-mode `$`, unknown commands) mirroring the classes
  KaTeX strict mode rejects in the browser.
- A lesson carries at most one checkpoint, and a script must contain at least
  one spoken word after trimming.
- A step the browser still rejects costs only that op or step
  (`browserDroppedSteps` in stream progress); the cached fallback activates
  only when zero streamed steps survive.
- The sanitizer runs before schema validation on a detached candidate. It may
  trim surrounding whitespace, rewrite `**` to `^`, and clamp normalized
  points or anchor gaps only within 0.05 of the `[0,1]` boundary. It never
  fuzzy-matches references, changes case, parses numeric strings, shortens
  content, repairs duplicate IDs, or infers geometry. Material failures remain
  repairable errors, and only corrections on the final accepted candidate are
  counted.

`annotation.schema.json` is a separate M4 overlay wire contract. It cannot add
lesson axes, curves, regions, absolute coordinates, styles, markup, or URLs.
It allows at most five target-relative `circle`, `underline`, `arrow`, `text`,
or `equation` ops. Every `target_id` is validated against the exact committed
visible-element inventory supplied with the request. Each request element is
`{id, kind, bounds}`, where bounds are three-decimal normalized
`[x,y,width,height]` fractions of the 1600×900 y-down board. The backend derives
the target allowlist from this structure, validates unique IDs and positive
on-board bounds, and keeps the compact tutor manifest unchanged. Annotation
IDs must be unique and cannot collide with visible lesson IDs. The backend and browser
both validate this schema and the target inventory before rendering; invalid,
cancelled, or stale annotation output never enters lesson or manifest state.

The optional browser-side Q&A direct-draw experiment reuses this exact contract;
it does not define a second drawing schema. Realtime supplies at most two closed,
target-relative mark intents, while the browser assigns IDs, stamps the current
manifest version, checks the committed target allowlist, and validates the final
annotation program. These disposable overlay marks never enter accepted lesson or
manifest state, and the backend `/annotate` route remains the fallback.

`phase6-sync-evidence.schema.json` is an evaluation-only, content-free contract for
the separately approved synchronization comparisons. An audio-activity record pins
the cached lesson step by SHA-256, selected Realtime model/voice/browser, fixed-sync
fallback, exact RMS-detector configuration, response-call ceiling, alternating
activity timestamps, human-observed audible windows, derived false-pause/latency/CPU
metrics, interruption outcome, and a terminal promote/park/remove decision. A
sentence-response record binds single-response and two-to-five-response trials to the
same exact identity, reconstructs call counts, gaps, latency, failures, abort/stale
termination, and human naturalness preference, and rejects dispatch after the first
failed segment. Script text, transcripts, RMS values, waveform/audio data, tool
arguments, credentials, and arbitrary notes have no schema field and cannot be
retained. This evidence contract does not authorize a live call or alter product
pacing; its browser runners have no built-in dispatcher.
