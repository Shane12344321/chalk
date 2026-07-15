# CHALK — Voice-Interruptible AI Whiteboard Tutor

**Build plan for an autonomous coding agent. Timeline: 7 days. Deliverable: working app + 3-minute demo video for a hackathon (education track, video submission).**

---

## 0. How to use this document (instructions to the builder agent)

1. Read this entire document before writing any code.
2. Work phase by phase (Section 9). Do not start a phase until the previous phase's acceptance criteria pass.
3. Maintain a `PROGRESS.md` at repo root: after each work session, log what's done, what's broken, what's next.
4. **Verify API surfaces before wiring.** OpenAI's Realtime API event names and session config evolve quickly. Where this doc says `VERIFY:`, check the current official docs (developers.openai.com) before implementing. Event/field names in this doc are indicative, not gospel.
5. Commit at every acceptance criterion. Small commits, descriptive messages.
6. When a decision is ambiguous, prefer the option that de-risks the demo video, not the option that generalizes better.

---

## 1. Product in one paragraph

Chalk is an AI tutor that teaches math and physics on a live whiteboard. The student talks to it; it talks back **while drawing** — axes, curves, vectors, equations — stroke by stroke, like a human at a chalkboard. The student can **interrupt mid-sentence**; Chalk stops mid-stroke, answers (pointing at and circling the exact elements it's referring to), and resumes. Stretch goals: Chalk can spawn interactive simulation widgets (sliders the student drags, which Chalk reacts to), and the student can draw back on the board and have Chalk critique the sketch.

**Why it wins:** voice + synchronized live drawing + real barge-in interruption is a category above chat tutors, and it's built on GPT-Realtime-2.1 (released days before the hackathon) with GPT-5.6 doing live codegen of lessons — maximally on-theme.

---

## 2. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Domain | Math & physics only | DSL stays small; deixis moments ("why does it peak *there*?") are native to graphs |
| Voice model | `gpt-realtime-2.1` (record), `gpt-realtime-2.1-mini` (dev) | Native barge-in, verbatim script reading, spoken preambles during tool calls; mini for cheap iteration |
| Board engine | GPT-5.6 (start with the mid tier; escalate tier via env var if lesson quality lacks) | Lesson generation is codegen against a DSL |
| Frontend | React 18 + Vite + TypeScript | Types catch agent-written bugs; owner reads function components + hooks |
| Backend | Python 3.12 + FastAPI | Owner's debugging home turf |
| Renderer | SVG + rough.js, stroke reveal via dash-offset; KaTeX for equations | Hand-drawn look hides layout imprecision; misaligned crisp vectors read as broken, wobbly strokes read as human |
| Transport | WebRTC (browser ↔ Realtime API) via server-minted ephemeral client secret | Standard pattern; lowest latency |
| Judging | Video submission | Latency is editable but authenticity must be proven: one continuous uncut take is mandatory |
| Deployment | localhost only | Video is recorded locally; deployment is out of scope |

---

## 3. Architecture

```
┌──────────────────────────── Browser (React) ────────────────────────────┐
│                                                                          │
│  Mic/Speaker ⇄ WebRTC ⇄ [OpenAI Realtime API: gpt-realtime-2.1]          │
│                   │  (voice, barge-in, tool calls, transcript deltas)    │
│                   ▼                                                      │
│  RealtimeClient ──► ToolRouter ──► instant tools (point_at, circle…)     │
│        │                    └────► backend tools (teach, annotate…)      │
│        ▼                                                                 │
│  SyncEngine (paces stroke animation against transcript deltas)           │
│        ▼                                                                 │
│  Board: DSL executor → layout resolver → rough.js SVG renderer           │
│    layers: [ink] [highlights/deixis] [widgets] [student ink]             │
│        ▼                                                                 │
│  BoardManifest (text inventory) ──injected back──► Realtime session      │
└──────────────────────────────────────────────────────────────────────────┘
                    │ HTTPS (SSE for lesson streaming)
                    ▼
┌──────────────────────────── FastAPI backend ─────────────────────────────┐
│  POST /session   → mints Realtime ephemeral client secret                │
│  POST /lesson    → GPT-5.6 generates lesson program (JSONL, streamed)    │
│  POST /annotate  → GPT-5.6 generates ≤5-op overlay batch                 │
│  POST /widget    → selects + parameterizes a widget template (stretch)   │
│  POST /vision    → GPT-5.6 describes student sketch (stretch fallback)   │
│  Validation + auto-repair loop on all generated programs                 │
└──────────────────────────────────────────────────────────────────────────┘
```

**The core architectural rule: the voice model never draws.** GPT-Realtime-2.1 owns conversation, personality, and interruptions. GPT-5.6 owns all ink, generated as programs against the DSL below. They communicate through tool calls and the board manifest.

---

## 4. The DSL (single most important contract)

Define once in `shared/schema/` as JSON Schema + generated TS types + Pydantic models. Both brains and the renderer must agree on this exactly.

### 4.1 Board model

- Logical canvas: **1600 × 900**.
- Named regions on a 4×3 grid: `A1..D3` (A1 top-left), plus `left` (cols A–B), `right` (cols C–D), `full`.
- The model **never emits absolute pixel coordinates**, with two exceptions: data-space coords inside an `axes` element, and normalized 0–1 coords inside a `sketch`. The client's layout resolver maps region → bounding box and stacks elements within a region top-to-bottom with padding. This constraint is what makes generated layouts reliable.
- Z-layers bottom→top: board ink, deixis overlays (temporary), widgets, student ink.

### 4.2 Lesson ops (emitted by GPT-5.6)

Every element has a unique short `id` (e.g. `ax1`, `c1`, `eq2`). Ops:

```ts
axes(id, region, x: {min, max, label}, y: {min, max, label})
curve(id, axes_id, expr, domain?: [a, b], style?: {color?, dashed?})
   // expr is a mathjs-safe expression in x, e.g. "v^2 * sin(2*x*pi/180) / g"
   // constants may be inlined; NEVER eval() — compile with mathjs
point(id, axes_id, x, y, label?)
vector(id, region | anchor, dx, dy, label?)      // rendered as arrow w/ head
arrow(id, from: anchor, to: anchor, label?)      // annotation arrow between elements
shape(id, region | anchor, kind: "circle"|"rect"|"triangle", w, h, label?)
angle_arc(id, at: anchor, from_deg, to_deg, label?)
text(id, region | anchor, content)               // handwriting-style font
equation(id, region | anchor, latex)             // KaTeX, wipe-reveal animation
sketch(id, region, strokes: [[x,y],...][])       // normalized 0–1; escape hatch for
                                                 // cannons, inclined planes, pulleys.
                                                 // Cap: ≤ 6 strokes, ≤ 40 points each
erase(ids: string[])
clear(region?)
widget(id, region, kind, params)                 // stretch — Section 8.1
```

`anchor` = `{el: id, side: "above"|"below"|"left"|"right", gap?: number}`.

### 4.3 Lesson program format — **JSONL, one step per line**

Streamed generation requires line-independent parsing. Each line:

```json
{"id":"s1","script":"Here's the question: fire a cannonball at different angles — which angle sends it farthest?","ops":[{"op":"sketch","id":"cannon1","region":"A2","strokes":[...]},{"op":"text","id":"t1","region":"A1","content":"Projectile range"}],"checkpoint":null}
{"id":"s2","script":"Range depends on angle like this. Notice anything about where it peaks?","ops":[{"op":"axes","id":"ax1","region":"right","x":{"min":0,"max":90,"label":"angle θ"},"y":{"min":0,"max":1,"label":"range"}},{"op":"curve","id":"c1","axes_id":"ax1","expr":"sin(2 * x * pi / 180)"}],"checkpoint":{"question":"Where do you think the peak is?","expected_gist":"45 degrees"}}
```

Constraints enforced by the validator (Section 6.2): ≤ 8 steps per lesson, ≤ 4 ops per step, `script` ≤ 30 words, all id references resolve, expressions compile in mathjs, regions valid.

### 4.4 Deixis ops (runtime-only, called by the voice model, executed instantly client-side)

`point_at(id)` (animated hand/dot for 2s), `circle_el(id)` (rough.js ellipse overlay), `underline(id)`, `flash(id)`. These render on the overlay layer, auto-fade, and **never hit the backend** — that's why they feel instant.

### 4.5 Board manifest (how a blind voice model "sees" its board)

After every executed step (and widget event, and student sketch), regenerate and inject into the Realtime session as a system-role conversation item:

```
BOARD STATE — topic: projectile motion — step 3/6
- t1 (text, A1): "Projectile range"
- cannon1 (sketch, A2): cannon on ground
- ax1 (axes, right): x=angle 0–90°, y=range
- c1 (curve on ax1): sin(2θ), peaks at θ=45°
- eq1 (equation, B1): R = v² sin 2θ / g
Student may refer to any element; use point_at/circle_el with these ids.
```

Keep it under ~120 tokens; replace the previous manifest item rather than appending (VERIFY: item update/delete semantics in current Realtime API; if replacement is awkward, append and instruct the model that the latest BOARD STATE supersedes).

---

## 5. Voice layer (GPT-Realtime-2.1)

### 5.1 Session setup

- Backend `POST /session` mints an ephemeral client secret (`/v1/realtime/client_secrets`); browser connects via WebRTC. API key never touches the client. (VERIFY: exact endpoint + session config shape.)
- Session config: model per env (`REALTIME_MODEL`), server VAD on, `reasoning.effort: low` (raise only if tool-call quality suffers — latency matters more here), voice: audition **Marin** and **Cedar**, pick warmer.
- Subscribe to: audio out, output transcript deltas, input speech start/stop events, tool call events, response done. (VERIFY names.)

### 5.2 Tools exposed to the voice model

```
teach(topic: string, student_context: string)   → backend /lesson (streamed)
annotate(request: string)                        → backend /annotate (≤5 ops)
point_at(element_id) | circle_el(element_id) | underline(element_id) | flash(element_id)
resume_lesson()                                  → SyncEngine resumes frozen step
end_lesson(summary: string)
spawn_widget(concept: string)                    → stretch, backend /widget
```

### 5.3 Tutor system prompt (draft — iterate on day 3+, keep in `backend/app/prompts/tutor.md`)

```
You are Chalk, a warm, sharp tutor teaching math and physics at a whiteboard.

VOICE & STYLE
- Short conversational turns: ≤ 2 sentences, then let the student react.
- Socratic bias: before revealing an answer, ask the student to predict it.
- Energetic but never rushed. Address the student directly.

SCRIPTS
- When you receive "SAY EXACTLY:" content, read it verbatim with natural
  performance. Do not paraphrase scripts.

THE BOARD
- You cannot see the board directly. Trust the latest BOARD STATE message
  completely. Never claim ink exists that is not in BOARD STATE.
- Whenever you refer to any element, ground it physically: call point_at or
  circle_el with its id AS you mention it ("this curve here…").

TEACHING FLOW
- When the student asks to learn something: ask ONE quick diagnostic question
  OR acknowledge enthusiastically, then call teach(topic, student_context).
- While the board is being prepared, keep talking naturally — set up the
  motivating question, ask what they already know. Never mention tools,
  loading, or generation.

INTERRUPTIONS
- If the student speaks, stop instantly — even mid-word. Answer their actual
  question first. Use annotate() only if the answer truly needs new ink.
  When resolved, ask "shall we keep going?" and call resume_lesson().

NEVER
- Never lecture more than 2 sentences outside a script.
- Never describe the drawing process ("now I'm drawing…"); just teach.
```

### 5.4 Interruption state machine (client-side)

States: `IDLE → GENERATING → TEACHING(step_i) → FROZEN(step_i, progress) → QA → TEACHING…  → DONE`

- On input speech start during `TEACHING`: cancel the in-flight response, **freeze the stroke animator mid-stroke** (the half-drawn line sells the illusion — do not complete or clear it), enter `QA`.
- In `QA`: the voice model answers with manifest context; deixis tools execute instantly; `annotate` ops render immediately on completion.
- On `resume_lesson()`: re-issue the current step's script from the beginning; the animator continues from frozen progress. (Known trade-off: narration restarts but ink doesn't — acceptable; do not over-engineer.)

---

## 6. Board engine (GPT-5.6)

### 6.1 `POST /lesson` flow

1. Input: `{topic, student_context, board_state}`.
2. Prompt = DSL spec (compressed) + layout rules + constraints + **one full worked example lesson** (write "derivative as slope at a point" by hand on day 3 — this single example does more for output quality than any instruction) + the request.
3. GPT-5.6 streams JSONL; backend parses per line, validates per line, forwards valid steps to the client over SSE immediately. **Client starts animating step 1 while steps 2+ are still generating.**
4. Target time-to-first-stroke: **< 6s**. The tutor's natural vamping (Realtime-2.1 keeps talking through tool calls) covers this window.

### 6.2 Validator + repair loop

For each step line: JSON parse → schema validate → referential check (ids resolve) → `mathjs.compile()` every expr → region check → budget check (op/step/word caps). On failure: re-prompt GPT-5.6 with the failing line + validator errors, max 2 repair attempts, else drop the step and log. A dropped middle step is survivable; a crashed renderer is not. **The renderer must also be defensive: any single op failing to render logs and skips, never throws.**

### 6.3 `POST /annotate`

Same pipeline, scoped: input includes current manifest + the student's question; output ≤ 5 ops, no new `axes`, prefer anchoring to existing elements.

---

## 7. Sync engine (hardest component — build the fallback first)

**Fallback mode (build day 2, keep forever behind `SYNC_MODE=sequential`):** draw the step's ops at a fixed pleasant speed, then narrate the script, then next step. This demos acceptably and is the safety net.

**Paced mode (`SYNC_MODE=paced`, day 4):**
1. For the current step, request narration: `response.create` with `SAY EXACTLY: {script}`.
2. Assign each op a weight (sketch=3, curve/axes=2, others=1). Op *k* should complete when spoken-fraction ≈ cumulative-weight-fraction.
3. Spoken fraction = transcript-delta chars received ÷ total script chars. Ease the animator's playback rate toward the target (simple proportional controller, clamp 0.5×–3×).
4. If audio finishes with strokes pending: sprint to completion in 400ms. If strokes finish early: idle.
5. On `response.done` (VERIFY name): advance to next buffered step.

If paced mode is janky by end of day 4, ship sequential. Do not let sync perfectionism eat days 5–6.

---

## 8. Stretch goals (strict order; each is skippable)

### 8.1 Interactive sim widgets (day 5) — highest wow-per-hour

Pre-built React components mounted into a board region via the `widget` op. **Exactly three templates:**

- `projectile` — params `{v0, angle, g, drag}`; canvas anim + range readout; sliders for angle & v0
- `grapher` — params `{expr, params: [{name, min, max, default}]}`; mathjs-driven plot with parameter sliders
- `pendulum` — params `{L, theta0, damping}`; anim + period readout

**The killer mechanic:** on slider change (debounced 800ms), the widget appends an event to the manifest with a computed observation — `EVENT: student set angle=60° on w1; range decreased vs 45°` — injected as a conversation item. The tutor reacts unprompted: "You went past 45 — see how the range dropped?" Script this exact moment for the video.

### 8.2 Student draws back (day 6)

Pen toggle → pointer-event polyline capture on the student-ink layer → on pen-up, composite board+ink → PNG ≤ 1024px.
- **Primary path:** send the image into the Realtime session as an image input conversation item (image input is a GA Realtime API capability — VERIFY current message shape).
- **Fallback path (`DRAWBACK_MODE=vision`):** backend `/vision` → GPT-5.6 describes the sketch in one paragraph → inject as text context.
Build the fallback first; attempt the primary only if day 6 has slack. Demo moment: tutor asks "sketch what you think happens with air resistance" → student draws a wrong symmetric arc → tutor circles the descent and corrects it.

### 8.3 Personality polish (threaded through days 3–7, no dedicated slot)

Voice audition; prompt tuning for warmth/pacing/humor; natural vamping lines; addressing the student by name (ask once, keep in `student_context`); a signature sign-off. Cheap, compounding, do a little daily.

---

## 9. Seven-day schedule with acceptance criteria

| Day | Build | Done when |
|---|---|---|
| **1** | Repo scaffold (frontend+backend+shared schema), `/session` minting, WebRTC voice loop, barge-in | I can converse with the tutor in the browser and interrupt it mid-sentence; it stops < 300ms. Tool-call round trip proven with a dummy tool. |
| **2** | DSL types + validator, layout resolver, rough.js renderer, stroke animator, KaTeX reveal, **sequential sync**, one hardcoded lesson program | The hardcoded projectile lesson plays start-to-finish: ink + voice, hand-drawn aesthetic, no crashes. *This is the "feel" gate — if it doesn't feel alive today, fix aesthetics before adding intelligence.* |
| **3** | `/lesson` with GPT-5.6, JSONL streaming, validator+repair, worked-example prompt, wire `teach()` | 8 of 10 golden topics (Section 10) generate and render acceptably with zero renderer crashes. |
| **4** | Paced sync, interruption state machine, board manifest, deixis tools, `annotate` | Full loop on video-quality: ask topic → tutor vamps → board comes alive in sync → interrupt → it freezes mid-stroke, circles the element it references, answers → resumes. **MVP gate.** |
| **5** | Widgets (8.1) + polish pass | Tutor spawns projectile widget; slider drag triggers unprompted tutor reaction. |
| **6** | Draw-back (8.2, fallback path first), bug bash, cache 3 demo lessons, freeze features | Student sketch → tutor critique works. Zero known crashes on the 3 demo topics. |
| **7** | **Video only. No code.** Script, record, edit, README, submit | Video exported; repo public; uncut raw take linked in README. |

**Slip rules:** Day 4 overruns eat day 5 (cut widgets before cutting sync quality). Day 6 overruns cut draw-back entirely. Nothing ever eats day 7.

---

## 10. Golden topics (regression set — snapshot generated programs in `tests/golden/`)

1. Derivative as slope at a point · 2. Chain rule intuition · 3. Integral as area · 4. Unit circle → sine wave · 5. Projectile range vs angle · 6. Pendulum SHM · 7. Newton's 2nd law w/ free-body diagram · 8. Vector addition · 9. Exponential growth/decay · 10. Standing waves

Automated check: schema-validate all 10 + headless render with a bounding-box overlap detector (>15% overlap between text/equation boxes = layout regression). Cached demo lessons (pre-generated, load from disk for recording reliability): **#5, #1, #4**.

## 11. Video plan (3:00)

- **0:00 Cold open, mid-lesson:** student interrupts — "wait, why 45?" — tutor stops mid-stroke, circles the peak, answers. Hook first, title card after.
- **0:25** Title + one line: *"A tutor that draws while it talks — and stops when you do."*
- **0:35** Fresh topic asked by voice; board comes alive. Show real latency with the tutor vamping through it — authenticity beats slickness.
- **1:20** Full interruption + deixis sequence.
- **1:50** Widget spawns; student drags slider; tutor reacts unprompted.
- **2:20** Student sketches a wrong curve; tutor critiques it.
- **2:45** 4-topic time-lapse montage + one architecture card (two brains + DSL).
- **2:55** Sign-off.

Record with OBS: screen + mic + system audio on separate tracks, 3+ full takes, **plus one continuous unedited 4–5 min take linked prominently in the README** (this is the anti-"it's canned" proof). README gets: pitch, the uncut take, architecture diagram, 60-second "why the voice model never draws" note — judges of video submissions read repos.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Paced sync janky | `SYNC_MODE=sequential` fallback exists from day 2; still demos well |
| GPT-5.6 malformed programs | Per-line validate + 2-attempt repair + drop-step + defensive renderer |
| Layout overlap ugliness | Region-stacking resolver (no model-chosen pixels) + overlap detector + rough.js aesthetic hides residual imprecision |
| Realtime API surface drift | All `VERIFY:` items checked against live docs before wiring |
| Realtime cost during dev | `gpt-realtime-2.1-mini` for dev; 2.1 only for final recording |
| Recording-day flake | 3 cached lessons load from disk; fresh generation shown once |

## 13. Out of scope (do not build)

Auth, accounts, persistence/DB, deployment, mobile, multi-user, lesson history, i18n, domains beyond math/physics, safety filtering beyond API defaults, lesson export.

## 14. Repo layout & env

```
chalk/
  frontend/src/
    realtime/   client.ts, toolRouter.ts, syncEngine.ts
    board/      dsl.ts, layout.ts, renderer.tsx, animator.ts, manifest.ts
    widgets/    Projectile.tsx, Grapher.tsx, Pendulum.tsx
    ink/        StudentInk.tsx, snapshot.ts
  backend/app/
    main.py, sessions.py, lessons.py, annotate.py, vision.py
    prompts/    tutor.md, board_engine.md, repair.md
    schemas.py, validate.py
  shared/schema/  lesson.schema.json  (single source of truth → TS + Pydantic)
  tests/golden/
  demo/           video_script.md, cached_lessons/
  PROGRESS.md
```

`.env`: `OPENAI_API_KEY` (server only), `REALTIME_MODEL=gpt-realtime-2.1-mini`, `BOARD_MODEL=<gpt-5.6 tier slug>`, `SYNC_MODE=paced`, `DRAWBACK_MODE=vision`.

---

*Build order philosophy: days 1–2 prove the feel with zero intelligence; days 3–4 add the intelligence; days 5–6 add the spectacle; day 7 sells it. The MVP gate is day 4 — everything after it is optional, everything before it is not.*
