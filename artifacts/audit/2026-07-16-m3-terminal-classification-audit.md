# Adversarial audit — M3 upstream terminal classification and batch-stop policy

Date: 2026-07-16 · Auditor: independent (no authorship of the reviewed code) · Method: full read of
the named modules, schemas, tests, evidence packages, and project docs at the current worktree;
`make test` re-run; no files modified, no live API calls.

---

## Executive verdict

**Safe to approve another ten-topic Luna batch, with two conditions.** No blocker-severity defect
was found. The terminal classification is correctly implemented and genuinely well-tested, the
privacy boundary holds under adversarial reading, and the fail-fast harness cannot retry or exceed
its topic list. However, two high-severity gaps directly threaten the *purpose* of the next batch —
producing unambiguous, diagnosable evidence at bounded cost:

1. **A repair-path upstream failure is indistinguishable from a primary-path failure and its
   attempts vanish from the evidence.** The most plausible reconstruction of the un-diagnosed
   2026-07-16T21:06 failure is exactly this path. If it recurs, the new evidence will again be
   ambiguous in the same way, and the approval will again be consumed without a diagnosis.
2. **Systemic local failures (`invalid_stream`, `generation_timeout`, `no_valid_steps`) never stop
   the batch**, so a broken world burns all ten paid calls and exits 0.

Both fixes are small. Running without them risks wasted spend and ambiguous evidence — not
leakage, not unbounded cost.

---

## Findings

### High

**H1 — Repair-path failures are misattributed and uncounted.**
`_repair_step` raises the *same* codes as the primary stream: HTTP error → `upstream_rejected`
([lessons.py:431-435](backend/app/lessons.py:431)), transport → `upstream_unavailable`
([lessons.py:429-430](backend/app/lessons.py:429)), malformed body → `invalid_stream`
([lessons.py:436-441](backend/app/lessons.py:436)). Meanwhile `repairs += repair_attempts`
([lessons.py:179](backend/app/lessons.py:179)) executes only when `_accept_or_repair` *returns* —
when `_repair_step` raises, the attempt is never counted, and the `step_dropped` warning never
emits.

*Concrete failure scenario:* topic streams 3 valid steps; line 4 is invalid; the repair POST gets
HTTP 429. The lesson terminates `upstream_rejected`/`rate_limit` with `repairs: 0`,
`dropped_steps: 0` — byte-for-byte the shape of the retained 21:06 evidence (minus the reason).
The batch stops (`terminal:upstream_rejected`), the approval is consumed, and the analyst cannot
tell whether the *primary* generation or a *side-channel repair call* was rejected.

Two aggravating facts: (a) in the current code, `upstream_rejected` after ≥1 emitted step is
**only possible from the repair path** — the primary status check
([lessons.py:298](backend/app/lessons.py:298)) precedes all iteration — yet this decisive
inference is documented nowhere; (b) no test exercises a repair call returning an HTTP error or
transport failure after valid steps (the only repair-failure test,
[test_lessons.py:197](backend/tests/test_lessons.py:197), uses HTTP 200 with invalid content).

*Fix:* attribute origin — either distinct codes (`repair_rejected`/`repair_unavailable`) or an
`origin: "primary"|"repair"` field on the error envelope (schema + generated-type change), plus
count attempted repairs before raising, plus a test for repair-429-after-valid-steps.
*Tradeoff:* the schema ripple is real but small; the alternative policy (drop the step instead of
terminating the lesson when only the repair failed) is more invasive and changes spend semantics —
defensible later, not required now.

**H2 — Systemic local failures never stop the batch; a dead batch runs to completion.**
`_batch_stop_reason` ([m3_evaluation.py:263-274](backend/app/m3_evaluation.py:263)) evaluates only
the three access codes and the three upstream codes. `invalid_stream`, `generation_timeout`, and
`no_valid_steps` are unreachable by any stop rule.

*Concrete failure scenario:* an upstream SSE format change (or a request-parameter problem with
the qualification model) makes every topic terminate `invalid_stream`. The batch runs all ten paid
calls, writes `stopped_early: false`, and `main()` exits 0 printing JSON that omits
`machine_complete_topics` ([m3_evaluation.py:379-386](backend/app/m3_evaluation.py:379)) — an
operator glancing at the CLI output sees an apparently clean run that produced zero usable topics.

*Additional mathematical point:* the gate needs 8/10. The **third** machine failure of any kind
makes `exit_gate_pass` unreachable; every call after that is spent on a batch that cannot pass.
The current policy would continue through ten `max_output_tokens` incompletes.

*Fix:* stop when failures make the gate unreachable (total machine failures ≥ 3) — a provable stop
condition needing no upstream taxonomy — and include `machine_complete_topics` in the printed
result. *Tradeoff:* none meaningful; three topic-local flukes also kill the gate, so stopping is
correct in every world.

### Medium

**M1 — PROGRESS.md overstates what the historical evidence shows.**
[PROGRESS.md:293](PROGRESS.md) says of the 21:06 failure: *"Because valid output had already
streamed, this is not evidence of an access/configuration rejection."* That inference covers only
the primary call. A repair-call rejection — 401/403/429, or a 400 on the repair request's
*different* parameter set (`text.format: json_object`, no `stream`) — is an access/configuration
failure that produces precisely the retained signature, because failed repair attempts are
invisible (H1). [PLANS.md:231](PLANS.md) and [PROGRESS.md:303](PROGRESS.md) say it correctly
("its exact upstream cause cannot be recovered"). *Fix:* soften the :293 sentence; document the
"error-after-steps implies repair path" inference for current-code evidence.

**M2 — Worst-case repair spend is unbudgeted and contradicts the "ten calls" framing.**
`MAX_REPAIR_ATTEMPTS = 2` is per *line* ([lessons.py:38](backend/app/lessons.py:38)); up to 8
processed lines means up to 16 repair POSTs (1,200 max output tokens each) per topic — a
worst-case batch is ~170 paid calls, while the approval language frames it as ten
([PROGRESS.md:291](PROGRESS.md): "exactly one paid lesson call, not ten"). A systematically
malformed generation (every line invalid) triggers repair storms and then, per H2, continues to
the next topic. *Fix:* per-lesson aggregate repair budget (e.g., 4) and honest worst-case spend in
the approval language. *Tradeoff:* a tight budget drops more steps on genuinely noisy topics;
4 still permits two fully repaired steps.

**M3 — Harness abnormal exits write no summary; spend leaves no record and reruns re-spend.**
`raise_for_status` ([m3_evaluation.py:127](backend/app/m3_evaluation.py:127)), media-type check
(:129), envelope validation/mismatch (:143-146), and duplicate-terminal checks (:158-167) all
propagate out of `run_batch` before the summary write (:252). The output directory keeps partial
raw files but no summary; `mkdir(exist_ok=False)` (:199) then forces a fresh directory, and there
is no resume, so a batch that crashed at topic 7 re-spends topics 1–6. *Fix:* wrap
`evaluate_topic`, record a `harness_error` result, stop, and always write the summary; optionally
add `--topics` for scoped resumption under the same approval discipline.

**M4 — (Pre-existing, stakes raised) unvalidated Host on a now-paid endpoint.**
Uvicorn accepts any Host; CORS only gates browser reads. A DNS-rebinding page can POST `/lesson`
same-origin and trigger paid board-model calls with attacker-chosen `topic`, `student_context`,
and `board_state` — spend plus a prompt-injection surface into the board prompt (output still
passes validation; injection cannot reach the renderer unvalidated). Flagged previously for
`/session`; `/lesson` adds real per-request cost. *Fix:* five-line Host/Origin allowlist in the
middleware. Dev-only exposure, but the batch requires the server running with a configured key.

### Low

**L1 —** A `validate_envelope` failure inside `_encode_envelope`
([lessons.py:552-554](backend/app/lessons.py:552)) escapes the generator uncaught; the ValueError
message embeds envelope content — which for `lesson.step` includes model-generated text — into
framework exception logs. Bug-only path (server-built envelopes), but the privacy posture
elsewhere is stricter than this. Sanitize or catch.

**L2 —** Dead schema surface: warning code `truncated_output`
([lesson-stream.schema.json:48](shared/schema/lesson-stream.schema.json),
[stream.generated.ts:138](frontend/src/lessonStream/stream.generated.ts)) is never emitted by the
backend. Same failure class as the M2 checkpoint field. Emit it on `_JsonlBuffer` byte-budget
truncation or remove it.

**L3 —** `run_batch` added `stop_reason` ([m3_evaluation.py:238](backend/app/m3_evaluation.py:238))
without bumping `chalk.m3-live-evaluation.v1`; the retained Luna summary lacks the key under the
same schema id. Version the evidence schema when its shape changes.

**L4 —** `LessonStreamResult.complete` is hardcoded `true` even when `partial`
([client.ts:306-319](frontend/src/lessonStream/client.ts:306)), and progress callbacks emit
`complete: true` on a server error. The `complete`/`partial` pair invites misreading; rename
(`terminated`?) or derive `complete = !partial`.

**L5 —** Output deltas arriving *after* `response.completed` are still processed as normal lines
([lessons.py:317-318](backend/app/lessons.py:317) only sets a flag). Bounded and validated, but
ignoring post-completion deltas is one line of cheap strictness against a misbehaving upstream.

**L6 —** `evaluate_topic` overwrites its own warning-derived `repairs`/`dropped_steps` tallies
with the `lesson.done` values without cross-checking them
([m3_evaluation.py:163-164](backend/app/m3_evaluation.py:163)), unlike `accepted_steps` which is
verified (:161-162). Cross-check both; a server counting bug would currently pass unnoticed.

---

## Policy review (task points 7–10)

**The implemented policy is sound in direction and fail-closed where it matters.** Stopping on
model/effort mismatch, missing configuration, HTTP rejection, transport failure, `server_error`,
`invalid_request`, `authentication`, `permission`, `rate_limit`, `unknown`, and *missing* reasons
is correct — every one of those is plausibly systemic, and "unknown/missing stops" is the right
polarity. The continue set matches the API's documented request-scoped incomplete reasons.

**Q8 — should `max_output_tokens` continue?** Conditionally yes. Cost per incomplete topic is
capped by the 3,200-token limit and partial prefixes still yield layout evidence. But if the limit
is *globally* undersized, incompletes recur — and after the third, the 8/10 gate is mathematically
dead (see H2). The gate-unreachable rule resolves this cleanly without deciding whether the reason
"is" systemic: continue on the first two, stop on the third regardless of reason.

**Q9 — should `content_filter` continue?** Weakly yes, once. On this fixed list of ten math and
physics topics, a single content-filter termination is already anomalous; two is a prompt- or
system-level signal, not a topic property. A per-reason cap of one continuation (or simply the
gate-unreachable rule, which caps everything at two) fits the evidence-first posture better than
unconditional continuation.

**Q10 — better mechanisms, ranked:**
1. **Gate-unreachable stop (recommended, primary):** stop when machine failures ≥ 3. Provable,
   taxonomy-free, subsumes "one diagnostic continuation," and caps worst-case waste at ~30% of a
   doomed batch.
2. **Repair-origin attribution (H1)** — more valuable than any threshold tuning, because it fixes
   evidence quality rather than spend quantity.
3. **Per-reason caps** — worth it only for `content_filter` (cap 1); otherwise subsumed by (1).
4. **Circuit breaker / consecutive-failure threshold** — (1) is the correctly parameterized
   version of this; a generic consecutive counter adds nothing.
5. **Preflight** — already good (free `/health` identity check of model, effort, configuration;
   [m3_evaluation.py:330-348](backend/app/m3_evaluation.py:330)).
6. **Reduced probe before resuming** — adopt as process, not code: after any stopped batch, the
   next approval runs one smoke before ten. This matches what the team already did (failed smoke →
   corrected smoke → batch).
7. **Topic-local vs systemic distinction** — the honest answer is that upstream taxonomies cannot
   be trusted to make this call; "can the gate still pass" is the only classification that needs
   no upstream honesty at all.

---

## Answers to the remaining focus points

**(1) Classification correctness — verified.** HTTP rejection → `upstream_rejected` with
status-mapped reason ([lessons.py:298-302](backend/app/lessons.py:298), :613-624);
`response.incomplete` → `upstream_incomplete` with `incomplete_details.reason` (:575-581);
`response.failed` → `upstream_failed` with `response.error.code` (:582-586); generic `error` event
→ `upstream_error` with top-level or nested code (:587-594); transport → `upstream_unavailable`
(:347-348); local failures (`not_configured`, `generation_timeout`, `invalid_stream`,
`no_valid_steps`) carry no reason and the schema forbids one (localError,
[lesson-stream.schema.json:101-119](shared/schema/lesson-stream.schema.json)). The synonym table
(:64-82) maps documented variants (`max_tokens`, `rate_limit_exceeded`, `invalid_api_key`,
`model_not_found`) sensibly; everything else collapses to `unknown`, which stops the batch —
fail-closed. One caveat under "unproven" below.

**(2) Leakage — holds.** Reasons are enum-normalized before logging or emission; upstream
codes/messages/bodies are never copied (the dedicated test plants sentinel code+message and
asserts absence from both response and logs,
[test_lessons.py:313-336](backend/tests/test_lessons.py:313)); every outbound envelope is
schema-validated with `additionalProperties: false` at emission (:552-554); HTTP error bodies are
never read; secrets appear only in request headers; `store: false` is set on both upstream calls;
`_step_hint` (:627-645) is charset- and length-gated. Exceptions: L1 (bug-only path) and the
deliberate, documented retention of raw NDJSON evidence (synthetic topics, model content only).

**(3) Terminal handling across stream states — verified.** Ordinary streaming, final-SSE-flush
classification (terminal event in the unterminated tail is parsed and classified,
[lessons.py:323-337](backend/app/lessons.py:323), test :313), partial JSONL buffering (final line
without newline yielded, :338-340; buffered partial line discarded on terminal failure — correct,
since a failed response's tail is suspect), client disconnect (poll per line, :165-167; no
terminal envelope emitted — the browser's `truncated_stream` handles it), `CancelledError`
re-raised (:227-229), failure-after-valid-steps preserves the streamed prefix and the browser
keeps it as a partial lesson ([client.ts:261-274](frontend/src/lessonStream/client.ts:261)).
Post-`completed` deltas are the one soft spot (L5).

**(4) Cross-layer consistency — verified with three nits.** The 9 error codes and 8 reasons are
identical across the Python `Literal` types, the JSON Schema, and the generated TS union; the
upstream/local reason split is enforced by schema on the backend at emission and by Ajv on the
browser at parse; the evaluation harness revalidates every retained line with the same
`validate_envelope`. Nits: L2 (dead `truncated_output`), L3 (unversioned summary shape change),
and the `Error` type name shadowing TS's global (cosmetic, aliased at import).

**(5) Historical evidence — valid, with one overclaim.** The old package validates against the
current schema (`upstream_reason` is optional on upstream codes — a deliberate and correct
compatibility choice), is excluded from acceptance by the verifier's `stopped_early`/ten-topic
requirements, and the docs mostly say the right thing ("cannot be recovered",
[PLANS.md:231](PLANS.md), [PROGRESS.md:303](PROGRESS.md)) — except the M1 finding above.

**(6) Harness discipline — mostly verified.** No retry anywhere (httpx does not retry; one
`evaluate_topic` per topic; `calls.count("derivative") == 1` asserted in tests); cannot exceed ten
lesson calls (fixed tuple, break-on-stop) — but see M2 for repair calls within a lesson; cannot
run without `--approved-by-owner`, smoke cannot route to batch (tests :370-405); preflight blocks
spend on identity mismatch. Gaps: H2 (continues through systemic local failures), M3 (crash paths
write no summary), L7-class exit-code optics (exit 0 = "not stopped early", not "useful").

**(11) Test coverage — strong, with named negative-case gaps.** 146 frontend + 115 backend pass
(re-ran). The classification matrix, redaction sentinels, HTTP status mapping, invalid UTF-8,
byte budgets (line/output/transport, including the independence of the completed-event overhead
from the model-text budget), arbitrary chunking, final-line-without-newline, deadline, no-retry
batch behavior, preflight, and CLI approval gates are all genuinely tested — this is well above
typical coverage. Missing: repair-path HTTP/transport failure after valid steps (H1), harness
crash → summary behavior (M3), deltas-after-completed (L5), and a compatibility test that an
upstream-coded `lesson.error` *without* a reason (the historical shape) still parses in the
browser client.

**(12) Complexity and drift risk.** The SSE parser is minimal but spec-adequate (ignores
`event:`/`id:` fields; the event type lives in the JSON payload — correct for this API). The
synonym table is the main drift surface: it hard-codes today's reason strings against an upstream
that hasn't promised them. Because unknowns stop the batch (correct), drift degrades to
conservative stops, not misclassification — acceptable. One improvement that costs nothing:
when normalization yields `unknown`, log a short hash of the raw code
(`unknown_reason_hash=sha256(raw)[:12]`) — preserves diagnosability against the provider dashboard
without moving any upstream string across the privacy boundary. The double validation
(backend emission + browser parse, same schema) is redundancy with a purpose; keep it.

---

## Claims independently verified

- 146 frontend and 115 backend tests pass at HEAD (`make test` re-run during this audit).
- All five terminal categories classify as documented, with exact code paths cited above.
- Upstream reason enums are identical across Python, JSON Schema, and generated TypeScript.
- Local error codes cannot carry an upstream reason (schema-enforced at emission and at parse).
- Sentinel upstream codes/messages do not reach responses or logs (test-asserted, code-confirmed).
- The final-flush terminal event is classified; the classification tests cover post-valid-output
  `response.incomplete`, `response.failed`, and generic `error` distinctly.
- The batch continues only for `max_output_tokens`/`content_filter` on request-scoped codes and
  stops otherwise, including on missing reasons and identity mismatch (tests re-read, logic traced).
- The smoke is structurally one call; both CLI modes independently require owner approval.
- The retained Luna batch package validates under the current schema; the verifier correctly
  rejects it as acceptance evidence; the old summary predates `stop_reason`.
- The 21:06 evidence signature (3 steps, 0 repairs, 0 drops, `upstream_rejected`) is reproducible
  in current code **only** via the repair path.
- `/lesson` request bodies are capped pre-parse (8 KiB) by the extended middleware.

## Claims unprovable without another live call

- That the real qualification model's SSE stream emits `incomplete_details.reason` and
  `response.error.code` values matching the synonym table (the table encodes documented strings;
  the provider has not contractually pinned them).
- That the repair request's parameter set (`text.format: json_object`, `reasoning.effort` as
  configured, no `stream`) is accepted by the qualification model — the leading hypothesis for the
  21:06 failure, and untestable retroactively.
- The actual cause of the 21:06 `upstream_rejected` (permanently unrecoverable; the docs say so).
- Repair efficacy: every retained live stream shows `repairs: 0`; the repair prompt has never
  fixed a real invalid step under observation.
- Whether the 30 s generation timeout accommodates a lesson that triggers multiple live repairs.

## Recommended pre-batch actions, in order

1. **H1** — repair-path attribution + attempt counting + one test (small; protects the approval).
2. **H2** — gate-unreachable stop (failures ≥ 3) + `machine_complete_topics` in CLI output (tiny).
3. **M1** — one-sentence doc correction in PROGRESS.md (trivial; keeps the evidence record honest).
4. M2/M3 if time permits; M4/L-items with the next natural touch of each file.
