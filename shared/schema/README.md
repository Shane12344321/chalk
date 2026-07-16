# CHALK lesson schema

`lesson.schema.json` is the sole lesson wire-format source of truth. Frontend
types are generated from it with `npm run schema:types` in `frontend/`; do not
hand-edit `frontend/src/board/lesson.generated.ts`.

M2 intentionally contains only the five operations required by the hardcoded
projectile lesson. Later milestones must extend this schema before adding new
renderer behavior.
