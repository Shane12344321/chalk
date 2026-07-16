# CHALK lesson schema

`lesson.schema.json` is the sole lesson wire-format source of truth. Frontend
types are generated from it with `npm run schema:types` in `frontend/`; do not
hand-edit `frontend/src/board/lesson.generated.ts`.

The implemented contract intentionally contains only the five operations
required by the cached projectile lesson. M4 reuses its existing checkpoint
shape without widening the drawing DSL. Later renderer or overlay operations
must extend this schema before they are accepted as lesson wire data.
