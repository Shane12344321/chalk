# CHALK lesson schema

`lesson.schema.json` is the sole lesson wire-format source of truth. Frontend
types are generated from it with `npm run schema:types` in `frontend/`; do not
hand-edit `frontend/src/board/lesson.generated.ts`.

`lesson-stream.schema.json` defines the backend-to-browser NDJSON envelope.
Its `lesson.step` payload references `lesson.schema.json#/$defs/step`; it does
not duplicate the lesson DSL.

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

The implemented contract intentionally contains only the five operations
required by the cached projectile lesson. M4 reuses its existing checkpoint
shape without widening the drawing DSL. Later renderer or overlay operations
must extend this schema before they are accepted as lesson wire data.
