# Adapting tldraw's Agent Techniques to CHALK

Status: deterministic foundations implemented; risky paths remain gated  
Prepared: 2026-07-18  
Upstream audited: `tldraw/tldraw` commit `203a83b1942cd2bc79c88e68d03cb2e4a2b12c14`  
Decision owner: CHALK project owner

Implementation note (2026-07-18): Phases A–C deterministic foundations are
implemented. The Phase D renderer is an isolated, lazy, exact-version spike and
is not the default. Phase E has board-only capture and a
structured-authoritative request builder, while the existing two-call smoke
remains unrun pending fresh owner approval. Phase F has a dedicated validated
envelope and append-only provisional store, but no producer or product-path
rendering. The rough.js renderer, cached lessons, fixed synchronization, and
structured grounding remain the dependable defaults until the evidence gates
in this guide pass.

## 1. Purpose

This guide describes how CHALK can borrow the most valuable mechanisms from tldraw's
open-source Agent starter kit and, if an SDK migration proves worthwhile, use tldraw
as the board renderer. It is deliberately not an instruction to replace CHALK with
the starter kit.

The desired result is a tutor that:

1. composes legible diagrams rather than independently placed marks;
2. detects and corrects visual mistakes before the student sees them;
3. understands both the factual and visual state of its board during questions;
4. begins producing stable ink earlier without weakening the validation boundary;
5. preserves CHALK's interruption, lesson, narration, and recording reliability.

This work is justified only if it improves the three-minute local demo. It must not
turn CHALK into a general-purpose collaborative canvas.

## 2. Executive recommendation

Adopt the ideas in this order:

1. **Closed visual-quality loop:** run deterministic geometry lints on a candidate
   composition and permit one bounded layout repair.
2. **Relational layout vocabulary:** let the board model request `place`, `align`,
   `stack`, and `distribute` relationships instead of guessing every coordinate.
3. **Dual board grounding:** use exact structured board state as truth and a cropped
   screenshot as optional visual evidence for board-dependent questions.
4. **Renderer spike:** translate one unchanged cached lesson into locked tldraw shapes
   behind a runtime flag and compare it with the current renderer.
5. **Validated partial ink:** only after the renderer decision, prototype streaming
   an immutable prefix of freehand points.

Do not start with a full tldraw Agent template integration. Its Cloudflare worker,
provider abstraction, autonomous task loop, chat UI, infinite-canvas behavior, and
general editor action set do not solve CHALK's core problem.

### 2.1 Correction after implementation-level comparison

The presence of a similarly named CHALK feature does **not** mean the tldraw technique
has already been captured. A second side-by-side audit found the following material
differences:

| Apparent overlap | What CHALK currently does | What is still useful upstream |
|---|---|---|
| Visual lints | Estimates label width from character count; compares rectangular label and ink bounds; emits diagnostics | Measures actual rendered shape geometry, respects transforms and clipping, groups connected overlap failures, remembers which exact findings were already surfaced, then re-enters a review loop |
| Label collision avoidance | Searches fixed offsets for auto-placed diagram labels; deliberate text is treated as immovable; ink is represented by primitive bounding boxes | Uses renderer-owned text wrapping and measured geometry; review can resize, move, shorten or restructure multiple shapes rather than nudging one label |
| Board manifest | Emits committed IDs, summaries and bounds, with completed composite subparts | Maintains compact “blurry” records plus detailed focused records and invisible semantic notes; context is selected for the question rather than treating every shape uniformly |
| Anchors and arrows | Computes a position relative to a prior box; arrow endpoints are coordinates on a shared canvas | Stores real endpoint bindings to shape identities, allowing geometry to remain connected after candidate movement and enabling a deterministic disconnected-arrow lint |
| Safe sanitization | Trims and clamps a closed set of near-valid lesson fields | Maintains a request-scoped map from model IDs to collision-free renderer IDs, plus reversible coordinate offsets and rounding maps so simplified model coordinates do not corrupt internal geometry |
| Prefix stability | Prevents later accepted steps from relaying out earlier boxes | Captures each action as an exact record diff; incomplete versions replace one another transactionally, making rollback, review and provenance explicit |
| Natural strokes | Uses stable rough.js seeds, length-weighted reveals and sequential groups | Densifies sparse pen points before rendering, encodes a true draw stroke, and uses the same provisional shape identity while a safe point prefix grows |
| Schema-generated instructions | Generates the lesson wire contract into prompt v3 | Builds prompt content from independently typed, priority-ordered context parts and dynamically enables only the actions available in the current mode |

Consequently, this guide treats these as partially overlapping areas, not completed
work. The adoption decision must compare algorithms and evidence, not feature names.

### 2.2 Areas where CHALK is already stronger

The re-audit also found places where importing the upstream behavior would be a
regression:

- CHALK validates a small educational DSL on both sides of the network; the Agent
  template accepts a much broader editor action surface and sanitizes some missing or
  conflicting IDs automatically.
- CHALK's accepted-step prefix and request-ID cancellation rules are explicit. The
  Agent template's partial action is recreated from the latest partial object and does
  not itself prove that previously emitted points are immutable.
- CHALK exposes only fully revealed geometry and completed composite subparts to the
  voice model. tldraw's general shape context is not narration/reveal-aware.
- CHALK's fixed synchronization and exact mid-stroke freeze are product invariants;
  the Agent template is not synchronized to audible narration.
- CHALK has hard lesson, op, expression, repair and live-call budgets. The template's
  todo and review loop is intentionally more autonomous and can schedule repeated
  work.
- CHALK's safe math and KaTeX boundaries are domain-specific assets that tldraw does
  not replace.

Adaptation must therefore be selective in both directions: take renderer geometry,
bindings, diffs and context techniques while preserving CHALK's stricter trust and
playback contracts.

## 3. What remains owned by CHALK

The following boundaries must survive any adaptation:

| Concern | Owner after adaptation |
|---|---|
| Conversation, voice, interruption, turn-taking | Realtime model and CHALK Realtime adapter |
| Lesson plan, scripts, checkpoints, drawing intent | Board model through CHALK's lesson DSL |
| Schema, budgets, normalization, repair and safe math | CHALK backend |
| Request IDs, stale cancellation, playback and animation state | CHALK browser |
| Cached lessons and deterministic recording fallback | CHALK |
| Shape geometry, bindings, bounds and optional editor rendering | tldraw only if the renderer spike passes |
| Acceptance evidence and live-call budgets | CHALK |

The voice model must still never emit raw drawing programs. A tldraw action is an
internal renderer command produced from an accepted CHALK operation, not a new wire
format sent by Realtime.

## 4. Upstream mechanisms worth adapting

All upstream links below are pinned to the audited commit so this guide does not
silently drift with tldraw main.

### 4.1 Deterministic lint followed by bounded review

Primary references:

- [`AgentLintManager.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/agent/managers/AgentLintManager.ts)
- [`CanvasLintsPartUtil.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/parts/CanvasLintsPartUtil.ts)
- [`AgentModeChart.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/modes/AgentModeChart.ts)
- [`ReviewActionUtil.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/actions/ReviewActionUtil.ts)

tldraw tracks shapes created during a prompt, calculates visual lints from rendered
geometry, surfaces each lint once, and schedules a follow-up review when necessary.
Its overlap path performs a quick bounds rejection and then geometry-level polygon
testing.

CHALK already has deterministic label-overlap, boundary and text-overflow lints. The
transformative adaptation is not another lint rule; it is making those findings an
input to one constrained correction pass.

That statement needs one qualification: CHALK's current lints are not yet equivalent
to tldraw's. `layoutLint.ts` estimates a label's width as `text.length * fontSize *
0.58`, and `geometry.ts` compares labels with rectangular primitive bounds. This is a
useful conservative check, but it cannot reliably model font shaping, wrapping,
rotation, clipping, a curved path's occupied area, or a label attached to an arrow.
tldraw's linter asks the active shape utilities for their rendered geometry and
transforms polygons into a common coordinate space before checking overlap.

Before enabling model repair, CHALK should therefore divide findings into:

- `measured`: based on actual renderer text/shape geometry;
- `estimated`: based on approximate boxes;
- `semantic`: based on bindings, IDs or reading-order rules.

Only measured and semantic findings should automatically spend a repair call at
first. Estimated findings stay diagnostic until retained evidence establishes a low
false-positive rate.

tldraw also groups transitively overlapping text shapes with union-find. CHALK
currently emits pairwise issues, so three mutually colliding labels can produce three
repair instructions that describe one problem. Grouping findings by connected
component would make the repair smaller and more actionable.

Conversely, tldraw's current linter is not a complete quality oracle. It excludes
arrow text from overlap grouping, checks only three built-in lint classes, and relies
on screenshot review for balance, completeness and many spacing mistakes. CHALK
should borrow its geometry access and finding lifecycle, not copy its lint list as
the definition of visual quality.

#### CHALK adaptation

Add a candidate-board stage between backend acceptance and browser commitment:

```text
generated step
  -> schema and semantic validation
  -> normalize
  -> resolve candidate geometry without committing it
  -> deterministic lint
       -> no material lint: commit and emit
       -> material lint: one scoped layout-repair request
            -> valid repaired candidate: lint again and commit
            -> still invalid: use original if safe, otherwise drop the affected op
```

The repair request should contain only:

- the accepted candidate step;
- closed lint codes;
- IDs and normalized bounds of involved elements;
- current committed-ID inventory;
- explicit permission to change placement, anchors, label text length, or grouping;
- an explicit prohibition on changing mathematical meaning or narration.

Suggested closed lint codes:

```text
text_overflow
label_overlap
label_crosses_ink
element_overlap
out_of_board
friendless_arrow
reading_order_inversion
diagram_too_small
excessive_whitespace
```

The first five can be deterministic. `reading_order_inversion`,
`diagram_too_small`, and `excessive_whitespace` need conservative numeric rules and
must remain advisory until the golden corpus proves their thresholds.

#### Important divergence from tldraw

Do not copy the open-ended autonomous continuation loop. CHALK permits at most one
visual repair for a candidate and counts it before dispatch. A visual repair consumes
the existing lesson repair ceiling or a separately smaller, documented ceiling; it
must never create an unbounded second agent loop.

#### Where this fits in the current code

- Reuse and extend `frontend/src/board/layoutLint.ts` for browser truth.
- Extract candidate geometry from `frontend/src/board/layout.ts` and
  `frontend/src/board/geometry.ts` without committing animation state.
- Keep backend schema and semantic validation in
  `backend/app/lesson_validation.py`.
- If repair remains backend-owned, send only normalized candidate geometry and closed
  findings back to a dedicated endpoint; do not send screenshots for this phase.
- Never move already committed ink. Only the new candidate step may change.

### 4.2 Relational layout operations

Primary references:

- [`PlaceActionUtil.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/actions/PlaceActionUtil.ts)
- [`AlignActionUtil.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/actions/AlignActionUtil.ts)
- [`DistributeActionUtil.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/actions/DistributeActionUtil.ts)
- [`StackActionUtil.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/actions/StackActionUtil.ts)

CHALK's composite diagram op gives multiple marks one local coordinate system, but it
still asks the model to choose most positions. Relational layout moves coordinate
arithmetic from the model into deterministic code.

#### Proposed DSL design

Do not expose general editor mutations. Add a bounded layout section to a diagram or
step:

```json
{
  "layout": [
    {
      "kind": "place",
      "id": "remainder1",
      "relative_to": "subtract1",
      "side": "below",
      "align": "end",
      "gap": 0.04
    },
    {
      "kind": "stack",
      "ids": ["line1", "line2", "line3"],
      "direction": "vertical",
      "align": "start",
      "gap": 0.035
    }
  ]
}
```

Allowed operations:

- `place`: one element relative to an earlier element;
- `align`: align 2–8 elements on `start`, `center`, or `end` of one axis;
- `stack`: order 2–8 elements with a non-negative gap;
- `distribute`: equal spacing for 3–8 already sized elements.

Constraints:

- references resolve only backward within the candidate composition;
- no cycles;
- maximum eight layout relations per step;
- normalized gaps only;
- relations may not move elements from earlier committed steps;
- a relation that cannot fit fails validation rather than shrinking everything;
- explicit content geometry remains renderer-owned.

#### Resolution order

1. Measure intrinsic text, equation and primitive bounds.
2. Place independent roots using the existing prefix-stable region cursor.
3. Build a directed acyclic relation graph.
4. Resolve `place` and `stack` in topological order.
5. Apply `align` and `distribute` within each bounded group.
6. Clamp only the entire new group, never individual children.
7. Run deterministic lints.

This is the general solution for arithmetic workings, derivations, tables, ray
diagrams, free-body diagrams and timelines. It must not contain a `long_division`
operation or any topic keyword routing.

### 4.3 Structured board truth plus a cropped screenshot

Primary references:

- [`ScreenshotPartUtil.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/parts/ScreenshotPartUtil.ts)
- [`BlurryShapesPartUtil.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/parts/BlurryShapesPartUtil.ts)
- [`PeripheralShapesPartUtil.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/parts/PeripheralShapesPartUtil.ts)
- [`FocusedShape.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/shared/format/FocusedShape.ts)

tldraw sends multiple levels of context: a screenshot for visual gestalt, compact
shape records for factual identity and geometry, focused shape detail, selection,
and coarse peripheral clusters. CHALK's board is fixed and capped at 30 elements, so
it does not need the full context hierarchy.

#### CHALK request shape

For an owner-gated board-question experiment, use:

```json
{
  "topic": "total internal reflection",
  "question": "Why does this ray run along the surface?",
  "visible_elements": [
    {
      "id": "critical_ray",
      "kind": "arrow",
      "bounds": [0.42, 0.45, 0.31, 0.03],
      "summary": "critical ray travels right along the interface"
    }
  ],
  "focus_candidates": ["critical_ray", "interface", "normal"],
  "image": "low-detail crop of board drawing area"
}
```

Rules:

- structured IDs, kinds, bounds and summaries are authoritative;
- the screenshot may clarify visual relationships but may not invent a target;
- crop the board drawing surface, excluding controls, captions and the voice orb;
- include only committed and currently visible reveal groups;
- capture at a bounded resolution and low image detail for the first experiment;
- never log or retain the data URL;
- do not send an image on routine narration turns;
- use this only when the student's utterance is board-dependent or deictic;
- if the image path fails, answer from structured state or ask the student to identify
  the element—never hallucinate.

This extends ADR-028 and ADR-035 rather than replacing them. The existing annotation
vision smoke should be generalized only after its two-call comparison is approved and
reviewed.

#### Voice path warning

Do not append screenshots to Realtime instructions. Instructions should remain
compact text. A board image, if supported and proven for the selected current model,
must be a bounded user-role image input associated with the student's question. API
shape and retention behavior require a fresh official-documentation check immediately
before implementation.

### 4.4 tldraw-backed renderer adapter

Primary references:

- [`CreateActionUtil.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/actions/CreateActionUtil.ts)
- [`convertTldrawShapeToFocusedShape.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/shared/format/convertTldrawShapeToFocusedShape.ts)
- [`FocusedShape.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/shared/format/FocusedShape.ts)

The spike should test tldraw as a renderer, not adopt the Agent runtime.

#### Required abstraction

Introduce a renderer-neutral interface before adding tldraw:

```ts
interface BoardRenderer {
  prepareStep(step: NormalizedStep): PreparedStep
  commitPreparedStep(prepared: PreparedStep): void
  setRevealProgress(elementId: string, progress: number): void
  freeze(): FrozenBoardState
  resume(state: FrozenBoardState): void
  clear(): void
  erase(ids: readonly string[]): void
  getCommittedElements(): readonly RenderedElement[]
  getVisibleManifestElements(): readonly ManifestElement[]
  getLayoutFindings(prepared?: PreparedStep): readonly LayoutFinding[]
  captureBoardImage?(options: CaptureOptions): Promise<Blob>
}
```

The current SVG/rough.js renderer becomes `RoughSvgBoardRenderer`. The spike adds
`TldrawBoardRenderer`. `App.tsx`, lesson streaming and the Realtime state machine must
depend on this interface rather than tldraw's `Editor` directly.

#### Proposed operation mapping

| CHALK operation | tldraw representation | Notes |
|---|---|---|
| `text` | locked text shape | Preserve measured wrapping and CHALK ID in metadata |
| `equation` | custom equation shape or SVG-backed custom shape | Do not flatten model LaTeX into unsafe markup |
| `line` | line shape | Use CHALK's stable semantic ID |
| `arrow` | arrow shape plus endpoint bindings | Bind only to accepted targets |
| `point` | small ellipse custom/default shape | Keep targetable virtual ID |
| `angle_arc` | custom shape | Renderer constructs arc; model never supplies SVG |
| `axes` | group/custom shape | Preserve data-space sampling and child target IDs |
| `curve` | draw/line or custom curve shape | Keep CHALK safe-expression sampler |
| `sketch` | draw shapes | One stroke per reveal group |
| `diagram` | group of locked shapes | Preserve part IDs and reveal order |
| `erase`/`clear` | idempotent shape deletion | Unknown IDs remain warnings |

Do not make raw tldraw records part of `lesson.schema.json`. They contain more
capability than the model should control and would create a second wire contract.

#### Identity and metadata

Each rendered shape should carry:

```ts
meta: {
  chalkElementId: string
  chalkPartId?: string
  chalkStepId: string
  semanticSummary: string
  revealGroup: number
}
```

The adapter owns conversion between CHALK IDs and tldraw shape IDs. The board model
never sees the tldraw prefix or internal record IDs.

#### Binding policy

- Bind arrows only after both accepted endpoint shapes exist.
- A missing binding is a lint, not permission to fuzzy-match an ID.
- Locked lesson shapes may be changed only by CHALK animation, erase, clear, or a
  validated annotation action.
- Student-created shapes, if enabled later, live on a distinct layer and have a
  separate provenance marker.
- Shape movement during a candidate repair is allowed only before commitment.

#### Animation policy

tldraw's editor is not the animation scheduler. CHALK retains the scheduler and exact
freeze boundary. The adapter must demonstrate:

- prefix-stable geometry;
- progressive path reveal or progressive point growth;
- immediate freeze on the existing `speech_started` path;
- no jump when React rerenders;
- resume from the exact stored progress;
- labels remain hidden until their associated ink reveal group completes.

If the default tldraw shape rendering cannot satisfy exact mid-stroke freeze without
a custom shape utility, the spike must report that honestly. A prettier static board
does not justify weakening CHALK's signature interruption behavior.

### 4.5 Validated partial freehand streaming

Primary references:

- [`PenActionUtil.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/actions/PenActionUtil.ts)
- [`AgentService.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/worker/do/AgentService.ts)

tldraw repeatedly parses partial structured output and renders the validated prefix of
a pen action. It drops the unfinished final point, validates completed vectors,
densifies long segments, locks the incomplete shape, and replaces it as more points
arrive.

CHALK must not generalize this to arbitrary partial lesson JSON. Its current invariant
is stronger: no raw model line reaches the renderer.

#### Safe CHALK version

Create a separate experimental event type only for a pen-like operation:

```json
{
  "type": "lesson.ink_delta",
  "request_id": "...",
  "step_id": "s2",
  "op_id": "sk1",
  "stroke_index": 0,
  "points": [[0.12, 0.30], [0.14, 0.28]],
  "complete": false
}
```

Before the first delta, the backend must have accepted the operation header: request,
step and op IDs, region/canvas, stroke budget and style. Each delta then enforces:

- monotonically increasing sequence number;
- at most the remaining point budget;
- finite normalized coordinates;
- no change to earlier points;
- no duplicate completion;
- stale request rejection;
- cancellation closes the provisional stroke without adding future points.

The browser may render only the append-only point prefix. If the terminal operation
fails full validation, the provisional shape is removed because it was never
committed. Cached lessons and normal live generation continue to use complete steps.

This experiment improves time-to-first-ink, not semantic drawing quality. It belongs
after the lint and relational-layout work.

### 4.6 Transactional record diffs and reversible candidate work

Primary references:

- [`AgentActionManager.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/agent/managers/AgentActionManager.ts)
- [`UserActionHistoryPartUtil.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/parts/UserActionHistoryPartUtil.ts)

tldraw executes an action inside `store.extractingChanges`, retaining the exact added,
updated and removed records. While an action is incomplete, its newer version replaces
the previous incomplete history item. User diffs are later squashed and converted to
small semantic before/after records.

CHALK currently reconstructs renderer state from accepted lesson steps and reveal
progress. That is excellent for deterministic replay, but it is not equivalent to a
transactional candidate edit. The useful adaptation is a small CHALK-owned patch
layer:

```ts
interface BoardPatch {
  requestId: string
  stepId: string
  added: RenderedElement[]
  updated: Array<{ before: RenderedElement; after: RenderedElement }>
  removed: RenderedElement[]
}
```

Uses:

- apply a candidate layout and roll it back after linting;
- compare the original and repaired candidate exactly;
- prove a repair did not alter committed elements;
- replace a provisional pen prefix without appending history noise;
- later describe a student's board edit as a compact delta rather than resending the
  whole board.

If tldraw becomes the renderer, use its store diff as the low-level source and convert
it immediately into CHALK IDs and closed element fields. Do not leak raw record diffs
into prompts or persistence. If rough.js remains the renderer, implement the same
semantic patch contract over CHALK's geometry store.

### 4.7 Request-local coordinate simplification and stable ID remapping

Primary reference:

- [`AgentHelpers.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/client/AgentHelpers.ts)

tldraw translates canvas coordinates relative to a request origin, rounds values sent
to the model, remembers rounding differences, and maps a model-requested shape ID to a
collision-free editor ID for the remainder of that request.

CHALK's fixed 1600x900 normalized canvas already keeps values bounded, so wholesale
viewport-origin machinery is unnecessary. Two parts are still valuable:

1. **Local group coordinates.** For a focused diagram or repair, send coordinates
   relative to that group's exact bounds rather than the entire board. This reduces
   numerical burden and makes relational corrections more stable.
2. **Two-level identity.** Keep the semantic CHALK ID immutable while the renderer
   uses its own collision-free internal ID. Maintain one request-scoped bijection and
   reject ambiguous or missing mappings; never rewrite model references fuzzily.

Do not adopt tldraw's automatic ID correction as a replacement for CHALK validation.
The backend must still reject duplicate semantic IDs. Renderer ID remapping exists
only to isolate implementation namespaces.

### 4.8 Invisible semantic notes and focused context

Primary references:

- [`FocusedShape.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/shared/format/FocusedShape.ts)
- [`convertTldrawShapeToBlurryShape.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/shared/format/convertTldrawShapeToBlurryShape.ts)
- [`convertTldrawShapeToFocusedShape.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/shared/format/convertTldrawShapeToFocusedShape.ts)

tldraw shapes can carry an invisible `note` describing purpose, while compact context
records expose only type, ID, text and bounds. A selected or explicitly targeted shape
can be expanded into a focused record with relationships and exact properties.

CHALK's current manifest summaries are mechanically derived from operation type,
visible label and geometry. That works for factual grounding, but it can lose intent:
two unlabeled arrows may be visually distinct while both summarize as `arrow`.

A bounded semantic field could improve question grounding:

```json
{
  "id": "ray_reflected",
  "semantic_role": "reflected ray after total internal reflection"
}
```

Constraints:

- maximum 80 characters;
- plain text only;
- generated with the lesson and validated like other text;
- never rendered;
- never treated as proof of geometry;
- omitted from routine compact manifests unless the element is a focus candidate;
- cannot mention an ID or fact absent from the accepted step.

This would let a board-dependent question publish a small global inventory and richer
records for the two or three most relevant elements, avoiding both an impoverished
manifest and a full-board prompt dump.

### 4.9 Prompt-part composition rather than prompt concatenation

Primary references:

- [`PromptPartDefinitions.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/shared/schema/PromptPartDefinitions.ts)
- [`buildMessages.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/worker/prompt/buildMessages.ts)
- [`rules-section.ts`](https://github.com/tldraw/tldraw/blob/203a83b1942cd2bc79c88e68d03cb2e4a2b12c14/templates/agent/worker/prompt/sections/rules-section.ts)

CHALK correctly generates the wire contract from its schema, but most behavioral
guidance is still a monolithic prompt. tldraw registers typed context parts, assigns
their placement priority, and builds instructions conditionally from the actions
available in the current mode.

The useful adaptation is deterministic prompt modules, not the AI SDK:

```text
base teaching objective
schema-generated contract
spatial rules
available capability rules
accepted-ID inventory
focused board context
closed lint findings
current request (always last)
```

Each module should declare:

- stable name and version;
- inclusion predicate;
- maximum characters;
- deterministic priority;
- whether it affects the prompt hash;
- redaction policy.

Benefits:

- annotation prompts do not receive irrelevant lesson-generation rules;
- repair prompts include only the action vocabulary they may use;
- future screenshot context cannot silently displace the actual student question;
- evidence identifies the exact expanded prompt, not just the base Markdown file.

This is lower priority than geometry and bindings, but more useful than the original
guide implied.

## 5. Target architecture

```text
Realtime voice model
  | teach / annotate / deixis tools
  v
CHALK lesson backend
  | schema -> sanitize -> semantic validate -> normalize
  | optional candidate visual repair (bounded once)
  v
Validated CHALK step stream
  v
BoardRenderer interface
  +-- RoughSvgBoardRenderer   dependable fallback
  +-- TldrawBoardRenderer     experimental flag
          |
          +-- locked shapes and endpoint bindings
          +-- exact geometry and bounds
          +-- deterministic lints
          +-- board-only screenshot capture
  |
  +-> CHALK animation scheduler and interruption freeze
  +-> committed manifest and virtual subpart IDs
  +-> optional structured-plus-image board-question request
```

The board manifest must be derived from the active renderer's committed state. It
must never be generated from the intended lesson program.

## 6. Runtime flags and rollback

Every risky capability needs an independent flag:

```text
VITE_BOARD_RENDERER=rough-svg|tldraw
VISUAL_REPAIR_MODE=off|lint-only|one-pass
VITE_RELATIONAL_LAYOUT=off|on
BOARD_QUESTION_GROUNDING=structured|structured-image
VITE_PARTIAL_INK=off|pen-prefix
```

Defaults while adapting:

- `rough-svg`
- `lint-only`
- relational layout off for schema-1.0 cached lessons
- structured grounding
- partial ink off

The accepted cached demo path must remain runnable without importing or initializing
tldraw. If bundle construction makes that impossible, use a lazy boundary for the
experimental renderer and verify that the default production bundle does not execute
it.

## 7. Implementation sequence

### Phase A — Pin evidence and define the renderer seam

Scope:

1. Record the audited upstream commit, relevant files and SDK licence/version.
2. Capture current screenshots, render timings, bundle size and lint findings for the
   three cached lessons and three difficult generated fixtures.
3. Introduce the `BoardRenderer` interface without changing output.
4. Wrap the existing board as `RoughSvgBoardRenderer`.
5. Prove all cached/golden behavior is unchanged.

Acceptance:

- no pixel or geometry change on the current renderer;
- interruption/resume tests unchanged;
- manifest output unchanged;
- production default remains rough.js;
- no paid call.

Abort condition: the interface requires Realtime or lesson-state code to depend on a
specific renderer. Refactor the seam before proceeding.

### Phase B — Relational layout in the existing renderer

Scope:

1. Extend schema and generated types with bounded layout relations.
2. Add Python and TypeScript validation parity fixtures.
3. Resolve the relation DAG in the current layout engine.
4. Teach prompt vNext the relational vocabulary with one generic worked example.
5. Keep cached schema-1.0 lessons byte-identical.

Acceptance:

- cycle, forward-reference, overflow and budget tests;
- property test that committed boxes never move;
- arithmetic, derivation and physics fixtures all use the same relation resolver;
- no topic-specific layout branch;
- all deterministic gates pass.

Live gate after explicit approval: compare the same small topic set under the old and
new prompt hash. Score composition, not merely schema validity.

### Phase C — Candidate lints and one-pass visual repair

Scope:

1. Extend current lint output to the closed codes in Section 4.1.
2. Add a candidate-only render path.
3. Add a bounded repair contract that permits spatial changes only.
4. Count and expose visual repairs separately from semantic repairs.
5. Never delay cached lessons with a model call.

Acceptance:

- synthetic collisions trigger the expected closed findings;
- a repair cannot change scripts, equations, expression meaning or IDs;
- discarded repairs do not pollute committed state or evidence totals;
- one repair maximum is enforced before dispatch;
- timeouts fall back to the safe original or drop only the unsafe candidate;
- redacted logs contain no raw image or student utterance.

### Phase D — tldraw renderer spike

Scope:

1. Add the licensed, version-pinned SDK behind `VITE_BOARD_RENDERER=tldraw`.
2. Implement the adapter for one cached projectile lesson first.
3. Add text, line, arrow binding, axes, curve, equation and composite diagram support
   only as required by the three cached lessons.
4. Export committed manifest elements from actual tldraw geometry.
5. Implement board-only screenshot capture.

Acceptance matrix:

| Gate | Required result |
|---|---|
| Cached lesson validity | All three render without network |
| Prefix stability | Later steps never move committed shapes |
| Mid-stroke interruption | Exact freeze/resume passes existing tests and manual rehearsal |
| Text handling | No clipping; wrapping and bounds agree |
| Arrow semantics | Bindings survive candidate movement and expose correct targets |
| Manifest | Only committed/revealed shapes and subparts appear |
| Security | No model HTML/SVG/CSS/URL enters the editor |
| Performance | No visible interaction jank on the recording machine |
| Bundle/startup | Cost measured and accepted explicitly |
| Visual rubric | Material improvement over rough.js on retained screenshots |

Decision after the spike:

- **Adopt:** tldraw wins visual quality and geometry while preserving interruption.
- **Hybrid:** tldraw supplies offscreen geometry/lints/screenshot, rough.js remains the
  visible renderer.
- **Reject:** keep the adapter experiment isolated or remove it if it adds weight
  without material rubric improvement.

Do not decide from enthusiasm or code elegance. Decide from the matrix.

### Phase E — Board-question screenshot grounding

Scope:

1. Reuse the active renderer's board-only capture.
2. Build one retained, synthetic, non-student fixture.
3. Run the existing two-call owner-approved comparison: structured only versus the
   identical structured request plus low-detail image.
4. Evaluate target validity, factual accuracy, placement understanding, latency and
   token usage.

Product gate:

- image materially improves spatial answers;
- no invented element IDs;
- latency remains acceptable for an interrupted voice exchange;
- structured fallback remains available;
- current official image-input behavior is documented.

If the gate fails, retain structured grounding and do not ship screenshots merely
because the SDK makes capture convenient.

### Phase F — Partial pen-prefix experiment

Scope:

1. Add an append-only provisional stroke store.
2. Parse only the dedicated bounded delta envelope.
3. Exercise arbitrary chunking, cancellation and malformed tails.
4. Compare first-visible-ink time with complete-step streaming.

Acceptance:

- already visible points never change;
- interruption freezes the exact visible prefix;
- stale and out-of-order deltas are ignored;
- full op failure removes provisional, uncommitted ink;
- cached/default path remains unchanged;
- measured latency gain is large enough to justify protocol complexity.

## 8. Testing strategy

Tests should protect boundaries, not duplicate library internals.

### Contract tests

- shared schema generates deterministic frontend types;
- tldraw records never appear in lesson or stream schemas;
- every accepted CHALK op has exactly one adapter mapping or an explicit unsupported
  error;
- ID conversion is reversible and collision-free;
- metadata never contains raw student utterances.

### Geometry tests

- exact bounds for text, arrows, curves, arcs and composite children;
- arrow bindings point to accepted shapes;
- collision checks use rendered geometry where available;
- relational groups resolve identically across repeated renders;
- candidate repair cannot move committed elements;
- manifest bounds are normalized and in board limits.

### Animation and interruption tests

- progressive reveal remains monotonic;
- labels wait for relevant ink;
- `speech_started` freezes all renderer implementations;
- resume continues from identical progress;
- erase/clear during frozen and active states are idempotent;
- switching topics rejects late renderer events by request ID.

### Screenshot tests

- crop excludes all application chrome;
- only committed board content appears;
- maximum dimensions and byte limits are enforced;
- data URLs and blobs are never logged;
- capture failure leaves structured grounding intact.

### Visual evidence

Retain paired screenshots for:

1. projectile range;
2. derivative as slope;
3. unit circle to sine wave;
4. total internal reflection;
5. a generic aligned arithmetic derivation;
6. a dense force or standing-wave diagram.

Score both renderers blind on:

- legibility;
- collision/clipping;
- coherent reading order;
- diagram scale and use of space;
- relationship clarity;
- hand-drawn naturalness;
- interruption continuity.

### What not to test

- tldraw's own editor internals;
- arbitrary editor tools CHALK does not expose;
- infinite canvas, multiplayer, persistence or selection UX;
- nondeterministic model text in default CI.

## 9. Security, privacy and trust boundaries

- Pin the licensed SDK version and record the licence key/configuration mechanism
  without committing secrets.
- Never expose general tldraw JSON as model-controlled input.
- Keep all lesson content inside the shared schema allowlist.
- Preserve trust-disabled KaTeX and the safe expression interpreter/sampler.
- Do not accept model-provided SVG, HTML, CSS, URLs, rich-text documents or editor
  commands.
- Use locked shapes for tutor ink.
- Preserve the 30-element manifest and response-size ceilings unless evidence proves
  a narrowly scoped change is necessary.
- Images remain in memory, are sent with `store: false` where supported, and are not
  retained or logged.
- The project remains a localhost prototype with no production or child-safety claim.

## 10. Performance budget

Measure rather than assume:

- added JavaScript and CSS transferred by the tldraw renderer;
- editor initialization time;
- time to prepare and commit a step;
- frame time during curve and multi-stroke reveals;
- freeze latency from detected speech to stopped visual progress;
- screenshot capture latency and encoded size;
- memory after three complete lesson runs and clears;
- time to first visible ink with and without partial pen prefixes.

Recommended spike thresholds on the recording machine:

- no sustained animation frame above 32 ms during the demo path;
- renderer initialization does not delay the cached lesson start perceptibly;
- interruption visual freeze remains within the existing measured gate;
- screenshot capture does not block the UI thread long enough to affect audio controls;
- memory returns close to baseline after clear and lesson replacement.

These are spike criteria, not production claims. Record the actual measurements in
`PROGRESS.md` if implementation begins.

## 11. Dependency and licensing discipline

The Agent template code is MIT-licensed at the audited location, while the tldraw SDK
has its own production licensing terms. The owner has stated that a licence is
available; implementation must still record:

- exact SDK package and version;
- applicable licence configuration;
- copied or adapted template files and their notices;
- whether code was rewritten from the described technique or copied;
- any additional transitive production dependencies;
- upstream commit used for attribution and future comparison.

Prefer using stable SDK APIs over copying editor internals. Copy small Agent-template
utilities only when they implement CHALK-specific orchestration that the SDK does not
provide, and preserve required notices.

## 12. Explicit non-goals

This adaptation does not authorize:

- replacing the lesson DSL with tldraw's action schema;
- giving the voice model editor access;
- an autonomous multi-turn canvas agent;
- Cloudflare Workers or AI SDK provider migration;
- multiplayer, persistence, accounts or lesson history;
- an infinite student canvas;
- general create/update/delete commands;
- changing cached lesson files;
- paid screenshot or live model tests without fresh owner approval;
- removing rough.js before the tldraw spike is accepted.

## 13. Decision checklist

Before implementing a phase, answer yes to every applicable item:

- Does it improve the visible demo rather than general editor capability?
- Is the CHALK schema still the only model-to-board wire contract?
- Is already committed ink immutable?
- Does interruption still freeze the exact visible state?
- Is the cached rough.js path available as rollback?
- Are model calls bounded and separately approved?
- Are structured IDs authoritative over screenshots?
- Are student audio, images and utterances absent from logs?
- Is the expected gain measurable with retained evidence?
- Is the upstream version and attribution recorded?

If any answer is no, stop the phase and fix the design boundary before writing more
integration code.

## 14. Recommended first implementation ticket

The first ticket should be **renderer truth and abstraction without behavior change**,
not SDK installation:

1. classify every current lint as measured, estimated or semantic;
2. add connected-component grouping and surfaced-finding keys without changing
   placement;
3. define `BoardRenderer` around the capabilities CHALK already uses;
4. define the renderer-neutral `BoardPatch` transaction contract;
5. wrap the current board implementation;
6. move manifest extraction and layout findings behind that interface;
7. pin unchanged cached/golden screenshots and interruption tests;
8. document observed performance, bundle baseline and current false-positive lint
   cases.

That ticket makes the later tldraw spike cheap to accept or reject and prevents a
false comparison where approximate CHALK boxes are presented as equivalent to
renderer-owned tldraw geometry. It also improves the current architecture even if
tldraw ultimately fails the demo-quality matrix.
