# CHALK lesson schema

`lesson.schema.json` is the sole lesson wire-format source of truth. Frontend
types are generated from it with `npm run schema:types` in `frontend/`; do not
hand-edit `frontend/src/board/lesson.generated.ts`.

`lesson-stream.schema.json` defines the backend-to-browser NDJSON envelope.
Its `lesson.step` payload references `lesson.schema.json#/$defs/step`; it does
not duplicate the lesson DSL.

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
bounded physics-diagram primitives: `line`, `arrow`, `point`, and `angle_arc`.
The first primitive claims a normal board region; related primitives carry a
`canvas_id` naming an already accepted diagram primitive and inherit its same
normalized y-down coordinate space. This makes interfaces, dashed normals,
rays, labeled points, and angle marks register as one accumulated diagram
without admitting raw SVG or renderer options. Stroke style is the closed enum
`solid | dashed`, and dashed ink is generated as deterministic short strokes so
the existing per-path reveal animation remains valid. The five original ops
and all cached schema-1.0 lesson files are unchanged.

Beyond the JSON Schema, both sides enforce a shared runtime contract pinned by
`shared/fixtures/curve-parity.json`, `shared/fixtures/latex-parity.json`, and
`shared/fixtures/sanitizer-parity.json`:

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
