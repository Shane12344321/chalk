# M4 cached interaction loop

Status: active — D1–D5 checkpointed; D6 live rehearsal pending
Started: 2026-07-16
Branch: `codex/m4-cached-interaction-loop`
Baseline: accepted M2 checkpoint `4f3d9ed`
Implementation checkpoint: `232a828`

## Objective

Turn the passing deterministic lesson into a convincing tutoring interaction without weakening the M2 voice/ink foundation: product-facing demo mode, grounded interruption answers, one tutor-initiated checkpoint, and deterministic hand-drawn stroke sequencing.

## Scope

- Separate `demo` and `diagnostics` runtime modes. Demo mode uses production tutor instructions, exposes no `debug_echo` tool, and hides the evidence dashboard.
- Keep diagnostics mode available for the M1/M2 evidence workflow.
- Reveal multi-path sketches sequentially with stable deterministic weights.
- Replace ad-hoc response-purpose bookkeeping with a bounded response coordinator before adding checkpoint responses.
- Publish a concise manifest derived from successfully built, fully visible board geometry. Never publish future lesson elements.
- Use acknowledged `session.update` changes to combine the base tutor prompt, latest visible manifest, and temporary checkpoint guidance.
- Implement explicit checkpoint asking, listening, and feedback lifecycle states for the existing step-2 checkpoint.

## Deferred by judgment

- Do not infer narration position by slicing scripts from board progress. Keep full-step resume until rehearsal proves it confusing; if it fails, add authored sentence-boundary resume text.
- Do not drive ink directly from transcript deltas. Fixed sync remains the fallback; paced sync may later make bounded corrections only after measured drift.
- Do not auto-resume sub-400 ms speech detections. Short utterances can be genuine interruptions, and automatic server responses currently prevent that duration rule from being a reliable false-alarm classifier.
- Do not inject a static whole-lesson description. It can expose elements that are not yet visible.
- Deixis overlays and model-generated annotations remain later M4 work.

## Milestones

- [x] D1 — Demo/diagnostics prompt, tool, and UI modes implemented and tested.
- [x] D2 — Sequential sketch reveal implemented without changing cached rough geometry.
- [x] D3 — Response-purpose coordinator replaces narration/tool response binding.
- [x] D4 — Visible-state manifest publisher sends bounded acknowledged instruction updates.
- [x] D5 — Step-2 checkpoint asks, listens, gives bounded feedback, and advances safely.
- [ ] D6 — Deterministic suite, production build, disconnected browser smoke, and one minimal credentialed cached-lesson rehearsal pass.

## Assumptions

- `session.update` replaces session instructions and tools for future responses; every update used for grounding is acknowledged by `session.updated` before a dependent scripted response is created.
- Server VAD remains `create_response=true` and `interrupt_response=true` for the demo.
- Only fully revealed geometry is committed to the manifest in this slice. Partial geometry remains visible locally but is not claimed as grounded context until a later deliberately-partial manifest design is validated.
- The default frontend runtime mode is `demo`; `VITE_CHALK_MODE=diagnostics` restores evidence UI and `debug_echo`.

## Decisions

- The base prompt may tell students to use Resume; it must not offer voice-controlled continuation until a real resume tool exists.
- Checkpoint logic uses distinct asking, listening, and feedback phases rather than one overloaded phase.
- The response coordinator owns response identity, purpose, correlation, and lifecycle. Interruption evidence remains a separate response-to-marker index because it serves a different retention policy.
- Manifest text is derived from renderer geometry that built successfully and has reached progress 1.0, then compacted to a conservative character budget.

## Validation

- Protocol tests prove demo sessions contain no debug tool and diagnostics sessions retain it.
- Renderer tests prove a partial multi-path sketch exposes only the expected sequential path fraction and rerenders retain identical geometry.
- Coordinator tests cover metadata-bound manual responses, armed VAD responses, out-of-order generation/playback completion, rejection, and reset.
- Manifest tests prove future, partial, and failed geometry are omitted and the budget is enforced.
- Reducer/hook tests cover checkpoint prompt interruption, correct lifecycle advancement, stale events, disconnect reset, and no narration/checkpoint overlap.
- Full `make test`, `make lint`, `make build`, production dependency audit, schema regeneration, and `git diff --check` must pass.
- Live rehearsal is intentionally one short cached projectile run; disconnect immediately after the checkpoint/interruption/resume evidence is captured.

## Rollback

- Runtime: use `VITE_CHALK_MODE=diagnostics` only for evidence collection; it is not the product fallback.
- Interaction: disable checkpoint orchestration and retain the accepted M2 narration/interruption/resume path.
- Grounding: retain the last acknowledged manifest; if publication fails, answer without claiming board-specific visibility.
- Rendering: revert sequential per-path progress while retaining M2 stable geometry.
- Git: return to `4f3d9ed` or revert the smallest post-M2 commit; never rewrite the accepted checkpoint.

## Progress

- 2026-07-16: Accepted the audited scope, preserved M2 at `4f3d9ed`, created the post-M2 branch, and rejected unsafe word-slicing, transcript-clock, static-future-context, and duration-only VAD shortcuts.
- 2026-07-16: Implemented D1–D5. The full deterministic gate passed with 115 frontend and 38 backend tests, lint/format, production build, zero production dependency vulnerabilities, and clean diff hygiene. A disconnected in-app browser reload was blocked by the browser URL policy even though the Vite server was reachable over localhost; browser and minimal credentialed rehearsal evidence remain pending under D6.
