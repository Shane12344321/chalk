# CHALK infrastructure audit — 2026-07-16

> Historical audit status: this report describes the pre-checkpoint M2 worktree and preserves its original line references and test baseline. The confirmed M2-critical findings were resolved before accepted commit `4f3d9ed`. The later response-purpose coordinator, visible manifest, demo/diagnostic split, sequential sketch reveal, and checkpoint loop are checkpointed at `232a828`; full-script resume remains a deliberate fixed-sync fallback pending rehearsal evidence.

Scope: the committed M1 realtime slice plus the uncommitted M2 deterministic-board work on
`codex/m2-deterministic-board`. Every file under `backend/app`, `frontend/src`, `shared/schema`,
and `demo/` was read; no code was changed. The deterministic baseline was re-verified:
`make test` passes with 91 frontend and 38 backend tests, matching `PROGRESS.md`.

Overall assessment: the codebase is unusually disciplined for a hackathon — layered input
validation, playback-aware interruption semantics, bounded traces, and honest evidence logging.
The defects below are mostly in the seams that only a live run exercises: narration lifecycle
error paths, connection-loss propagation, and divergence between the two lesson validators.

---

## Part 1 — Edge cases the implementation missed

### High severity

**1. A rejected narration `response.create` deadlocks the lesson with no recovery.**
`RealtimeClient.handleServerEvent` handles the server `error` event only by setting
`lastError` ([client.ts:480](frontend/src/realtime/client.ts:480)). `pendingNarration` is set
before the send ([client.ts:260](frontend/src/realtime/client.ts:260)) and is cleared only by
matching `response.done` + playback-stopped events for a response that never gets created when
the create itself is rejected. Every later `requestNarration` then throws
"A lesson narration is already active" ([client.ts:257](frontend/src/realtime/client.ts:257)).
The hook catches the throw and resets `narrationKeyRef`
([useFixedLessonSync.ts:44](frontend/src/sync/useFixedLessonSync.ts:44)), but the effect only
re-runs on a state change that will never come — the reducer sits in `TEACHING` with no ink and
no audio, permanently.

Most likely live trigger: clicking **Resume frozen step** while the tutor is still speaking its
Q&A answer. `requestNarration` checks only `status === "connected"` and sends `response.create`
while another response is active, which the Realtime API rejects with an error event
(`conversation_already_has_active_response`). This is the exact interrupt → ask → resume flow
the M2/M4 demo rehearses.

**2. Disconnects are never propagated to the sync reducer; the lesson cannot restart.**
The reducer defines a `RESET` event, but nothing in production code dispatches it, and
`useFixedLessonSync` never observes connection status. If the client auto-disconnects at the
20,000-token budget ([client.ts:464-471](frontend/src/realtime/client.ts:464)), the data channel
closes, or the user disconnects mid-step, the reducer stays in `TEACHING` waiting for narration
events that can never arrive. The **Start lesson** button requires phase `IDLE`/`DONE`
([App.tsx:133](frontend/src/App.tsx:133)), so after reconnecting the lesson is unstartable until
a page reload. This directly threatens the "three consecutive runs without an uncaught error"
exit gate — a mid-run budget disconnect on run 2 strands runs 2 and 3.

**3. The decoder accepts scripts the narration path will refuse.**
[decode.ts](frontend/src/board/decode.ts:72) enforces ≤ 30 words but not the schema's 240-char
cap; `createNarrationResponse` throws for scripts over 240 chars
([protocol.ts:165](frontend/src/realtime/protocol.ts:165)). Thirty long words (> 240 chars)
therefore pass decoding and then stall the lesson through the same dead-end path as finding 1.
Benign for the checked-in lesson (longest script is 108 chars); a live trap once M3 generates
scripts.

**4. Narration/tool correlation binds to the first `response.created`, whoever caused it.**
`pendingNarration.responseId` (and `pendingToolRoundTrip.responseId`) is claimed by the *next*
`response.created` event ([client.ts:373-380](frontend/src/realtime/client.ts:373)). Server VAD
with `create_response: true` can create a speech-triggered response at nearly the same instant —
the project's own second M1 trace recorded a 0.2 ms race between `response.created` and speech.
If the VAD response wins the race, lesson tick/advancement tracks the wrong response: the step
can advance off a Q&A answer's playback, or never advance. A correlation token (e.g., matching
`response.metadata`, which the Realtime API echoes back) would make the binding deterministic.

### Medium severity

**5. Curve expressions are validated on a different domain and density than they are rendered.**
The decoder validates `sample(domain ?? [0, 1], 24)` ([decode.ts:150](frontend/src/board/decode.ts:150));
the renderer samples `domain ?? [axes.x.min, axes.x.max]` at 121 points
([geometry.ts:148-149](frontend/src/board/geometry.ts:148)). A domain-less curve valid on [0, 1]
can blow the output/discontinuity budget on [0, 90] — accepted at decode, silently dropped at
render. Conversely a spike between the 24 validation samples passes validation. Per-op isolation
contains the failure, but "accepted by the decoder" and "renderable" are supposed to be the same
predicate, and for M3 they must be.

**6. Ink can start before audible speech.**
`narration.activity` (which sets `animationStarted`) fires on the first *transcript delta*
([client.ts:427-431](frontend/src/realtime/client.ts:427)), which tracks generation, not playout —
the exact signal class the M1 postmortem chose to distrust (`response.done` vs
`output_audio_buffer.*`). `output_audio_buffer.started` also emits activity, but deltas normally
arrive first. In practice the lead is small, but the M2 perceptual-concurrency gate is judged on
exactly this margin; gating animation start on `output_audio_buffer.started` alone would match
the M1 lesson already learned.

**7. Curves that exit and re-enter the axes range are drawn with a false chord.**
Out-of-range samples are filtered and the survivors joined into one rough curve
([geometry.ts:150-156](frontend/src/board/geometry.ts:150)). Fine for `sin(2θ)` on [0°, 90°];
wrong for any function that leaves the window (an M3 concern, but the renderer is meant to be
the durable safety layer).

**8. Region layout has no overflow control.**
The per-region cursor advances unboundedly ([layout.ts:62-70](frontend/src/board/layout.ts:62)):
box *height* is clamped to the region but *y* is not, so a fourth-or-later op in one region can
render below the region — or off the board. Anchored boxes are clamped into the board but may be
clamped *onto* the element they annotate. Invisible in the four-step projectile lesson; a real
layout hazard for generated lessons.

**9. Resume replays the entire step script while ink resumes from partial progress.**
`RESUME` keeps `currentStepProgress` but the new cycle re-requests narration of the full script
([useFixedLessonSync.ts:39](frontend/src/sync/useFixedLessonSync.ts:39)), so voice restarts from
word one while ink continues from, say, 60%. PLANS.md defers the continue-vs-replay decision to
M4 — legitimately — but M2's own exit gate includes an interrupt-and-resume demonstration, so the
desync will be visible in the pending live check.

### Minor

- **10.** [sessions.py:155](backend/app/sessions.py:155) uses `assert api_key is not None`;
  under `python -O` asserts are stripped and a missing key becomes an `AttributeError` 500
  instead of the intended 503. Unreachable today (guarded by `has_openai_api_key`), but an
  explicit `raise` is the right shape.
- **11.** `SessionBodyLimitMiddleware` sends a fresh 413 when `_RequestBodyTooLarge` propagates
  ([middleware.py:63-65](backend/app/middleware.py:63)); if the app had already started its
  response, a second `http.response.start` is an ASGI protocol violation. Unreachable for the
  current fully-buffered JSON endpoint; worth a guard if `/lesson` streaming (M3) reuses it.
- **12.** Construct-per-render patterns: `useRef(new BoardGeometryStore())`
  ([Board.tsx:16](frontend/src/board/Board.tsx:16)) and `useRef(crypto.randomUUID())`
  ([useFixedLessonSync.ts:20](frontend/src/sync/useFixedLessonSync.ts:20)) evaluate their
  argument every render and discard it. Correct but wasteful; the lazy-init idiom avoids it.
- **13.** `decodeLesson` warnings for the checked-in lesson are silently discarded in
  [App.tsx:39-43](frontend/src/App.tsx:39) — a partially-salvaged lesson (some steps dropped)
  would ship without any signal. Throwing when `warnings.length > 0` for the *cached* lesson
  would be strictly safer.
- **14.** `estimateNarrationDuration` caps at 9 s ([animation.ts:30](frontend/src/board/animation.ts:30));
  a 30-word script takes ~12 s to speak, so ink completes and freezes at 100% while the voice
  continues. Harmless under the four-way advancement gate; slightly weakens the "draws while it
  talks" feel on long steps.
- **15.** Axes render only `y.max` (no `y.min`) and no ticks — cosmetic, but the projectile
  lesson's y-axis reads as starting at 1.1.

---

## Part 2 — Other things the codebase does wrong

**1. The entire M2 implementation is uncommitted.**
~740 insertions plus four new directories (`frontend/src/board`, `frontend/src/sync`, `shared/`,
`demo/`) sit unstaged while PLANS.md marks all twelve M2 work items complete and the validation
ledger records a passed deterministic gate. This contradicts the project's own checkpoint
discipline (M1 was deliberately preserved at `e6822f5` before M2 began) and puts a full
milestone one bad command away from loss. Committing the deterministic checkpoint does not
require the pending live gate to pass — PLANS.md already distinguishes the two.

**2. The disclosed API key is still in `.env` and still not rotated.**
`.env` is correctly gitignored (verified with `git check-ignore`) and contains a live key.
PROGRESS.md itself mandated rotation after the M1 validation because the key transited the
conversation; a day later that is still open, and M2's own progress ledger repeats "rotated live
key" as a blocker. The known-compromised credential should be revoked before the next live run,
not merely before recording.

**3. Two diverging sources of truth for the lesson contract.**
`shared/schema/lesson.schema.json` is called the wire source of truth, and Ajv compiles it
([schema.ts](frontend/src/board/schema.ts)) — but the runtime path uses Ajv only per-op, while
lesson/step-level rules are re-implemented by hand in `decodeLesson`. The two have already
drifted: the schema's 240-char script cap is not enforced by the decoder (finding 3), the
30-word rule exists only in the decoder, and `ID_PATTERN` duplicates the schema's regex. The
compiled `isLessonProgram` validator is exported and tested but unused by the application. Either
validate the whole program with Ajv first and layer semantic salvage on top, or document the
decoder as the real contract.

**4. Schema-to-types regeneration only runs inside `npm run build`.**
`schema:types` is chained into `build` but not `test` ([package.json:11-14](frontend/package.json:11)),
so `make test` runs against a possibly stale `lesson.generated.ts`. Someone editing the schema
and running tests gets a green suite that has never seen the new contract; the mismatch only
surfaces at build time (or never, since the generated file is not diff-checked in CI — there is
no CI).

**5. Dead configuration implies flexibility that intentionally doesn't exist.**
`Settings.openai_api_base_url` is pinned by a `Literal` type and passed as httpx `base_url`
([dependencies.py:20](backend/app/dependencies.py:20)), but the only request uses the absolute
`OPENAI_CLIENT_SECRETS_URL`, so `base_url` is dead. The pinning decision is right (ADR'd); the
vestigial setting invites a future edit that "enables" it without revisiting the exfiltration
analysis.

**6. Board SVG re-renders wholesale every animation frame.**
Each RAF tick dispatches a reducer update that re-renders every `<Geometry>` (memoization is
absent; `data-progress` changes on the group each frame). At 4 steps / 7 ops this is nothing; at
M3 scale (8 steps × 4 ops with curves) it's the first place jank will appear. Geometry caching
is already excellent — the render layer just doesn't exploit it with `React.memo`.

**7. Bundle size is acknowledged but unaddressed.**
The ~988 kB uncompressed (298 kB gzip) mathjs/KaTeX chunk is recorded in PLANS.md as
non-blocking, which is fair for a localhost demo; `mathjs/number` is already the slim entry
point. Lazy-loading KaTeX/mathjs behind the first lesson start would remove the Vite warning if
it ever matters.

---

## What was checked and found sound

- Backend: strict UUID contracts, pre-parse 4 KiB body cap (declared *and* streamed), pinned
  upstream URL with redirects and proxy env disabled, `SecretStr` key handling, hashed safety
  identifier, redacted correlated errors, exact-origin CORS with credential-free config, and a
  locked localhost-only `FRONTEND_ORIGIN` validator.
- Realtime client: attempt-token supersession on every async boundary, bound native `fetch`,
  playback-lifecycle-aware interruption markers with late-stale invalidation, bounded
  trace/marker/call-id sets, metadata-allowlisted trace export, layered token cost controls.
- Board: per-op failure isolation, seeded rough.js geometry with signature-keyed cache and
  live-ID eviction, KaTeX `trust: false` + command blocklist + `strict: "error"`, mathjs behind
  a character gate plus AST allowlist with depth/output/discontinuity budgets, duplicate-ID and
  dangling-reference rejection with dropped-ID exclusion.
- Reducer: request/step/cycle correlation rejects every stale-event category I could construct
  on paper; freeze preserves progress; the four-way advancement gate is airtight *given* the
  events arrive (see findings 1–2 for when they don't).
- Evidence hygiene: PROGRESS.md/PLANS.md claims sampled against the code were accurate,
  including the honest separation of deterministic-pass vs pending live gates.

## Suggested order of fixes (if/when changes are approved)

1. Commit the M2 deterministic checkpoint; rotate the key (Part 2 §1–2).
2. Wire disconnect/error → `RESET`/recovery in the sync layer (Part 1 §1–2), including a
   pending-narration timeout or error-event reconciliation in the client.
3. Guard `requestNarration` against an active response (or serialize resume behind
   playback-idle), and correlate narration via `response.metadata` (Part 1 §4).
4. Enforce the 240-char script cap in the decoder and unify the validators (Part 1 §3, Part 2 §3).
5. The remaining items ride along with M3 work, where most of them stop being theoretical.
