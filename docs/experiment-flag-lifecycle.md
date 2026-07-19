# Experimental flag lifecycle

Status: active audit contract
Reviewed: 2026-07-18
Owner milestone: M4 drawing-intelligence work

CHALK keeps a dependable demo path while experiments earn promotion. In this
document, **promote** means make the path eligible for the demo default after its
named evidence passes; **park** means keep it opt-in with no further implementation
work in the current milestone; and **remove** means delete the flag and unreachable
implementation in a focused change while preserving any still-required wire
compatibility for retained evidence.

Reaching a review milestone without the named promotion evidence produces a park or
remove decision in `PROGRESS.md`; it never silently extends the review date. A passing
unit suite is necessary but is not promotion evidence.

## Lifecycle table

| Experimental surface | Current default and dependable fallback | Promote criteria | Park criteria | Remove criteria | Review by |
|---|---|---|---|---|---|
| `VITE_BOARD_RENDERER=tldraw` | `rough-svg`; tldraw is a licensed lazy chunk and reuses CHALK geometry | A retained rough-svg/tldraw comparison proves at least one required host mechanic (editable student ink, transactional board state, hit testing, paging/camera, undo/export, or widget hosting), a material human-rubric benefit, acceptable load/frame cost, exact mid-stroke freeze/resume, and no manifest or interruption regression | No required host mechanic or human-quality gain is demonstrated, but the lazy path remains useful for a later M5/M6 experiment | Licence delivery becomes unreliable; bundle/runtime cost breaks the declared gate; or native host semantics cannot preserve CHALK geometry, prefix stability, stale rejection, and interruption after one bounded remediation | `drawing-phase-4-gate`, before any M5 renderer choice |
| `SYNC_MODE=paced` | `fixed`; both start ink only after observed output-buffer activity | The Phase 6 bounded perceptual comparison prefers paced/beat alignment in three consecutive cached runs, with no audible overlap, response-gap, interruption, or CPU regression and fixed still available | Transcript progress remains ahead of audible playout, remote-audio activity is inconclusive, or human preference is flat | Three consecutive perceptual failures recur, or a playback-grounded replacement passes and paced retains no diagnostic value | `drawing-phase-6-gate` |
| `lesson.ink_delta` with reserved `VITE_PARTIAL_INK=pen-prefix` | `off`; there is no backend producer or product consumer, and validated complete ops remain authoritative | A separately planned producer and consumer reduce retained median first-visible-ink by at least 15%, keep representative first ink under six seconds, add no model calls, and pass immutable-prefix, invalid-terminal discard, cancellation, stale-request, point-budget, and interruption tests | No qualified producer exists by Phase 6 entry, or the measured median gain is below 15% | Any invalid/cancelled delta becomes committed, identity or sequence checks can be bypassed, or the feature still has no qualified producer at the Phase 6 gate | `drawing-phase-6-gate` |
| `VITE_QA_DIRECT_DRAW=on` | `off`; backend `/annotate` plus local deixis remains the fallback | One predeclared, owner-approved mini-model gate has 100% visible-target validity, no stale/permanent lesson marks, at least 4/5 human placement passes, correct tool/speech ordering, and no interruption or latency regression against `/annotate` | The tool is safe but fails placement, latency, or expressiveness; retain only for later permanent-Q&A research | It invents targets, bypasses the annotation schema, leaks disposable marks into lesson/manifest state, or cannot fail back to `/annotate` after one bounded remediation | `drawing-phase-7-overlay-gate` before `/lesson/qa-step` work |
| `VITE_LESSON_GENERATION=resolved-stepwise` | `one-shot`; cached lessons are unaffected | The same small retained topic set shows a material human-rubric/coherence gain over one-shot, first visible ink remains under six seconds, every continuation stays within its predeclared call/repair ceiling, the buffer never visibly empties, and prefix/stale/cancellation invariants remain green | Quality is flat, call/latency cost is disproportionate, or continuations cannot stay ahead of narration while the one-shot path remains dependable | Accepted-prefix replay, clean early termination, request/version identity, or immutable committed ink can be violated after one bounded remediation | `drawing-phase-4-live-gate` |
| `VITE_ATTENTION_CHOREOGRAPHY=on` | `off`; the existing local point/circle/underline/flash overlays remain available | Three consecutive cached Q&A/checkpoint-feedback loops find one-at-a-time trace/focus actions explanatory, with 100% visible-target validity, automatic restore, and no interruption, manifest, permanent-geometry, or tool-order regression | The rail remains safe but is visually distracting, adds no teaching value, or the human preference is flat | Any stale/future target renders, an interrupted action changes permanent ink, or repeated tool calls can bypass the bounded queue after one remediation | `drawing-phase-5-gate` |
| `VITE_REMOTE_AUDIO_ACTIVITY=on` | `off`; playback-buffer events and fixed sync remain authoritative | The bounded Phase 6A comparison across both candidate voices shows useful speech/pause transition latency, an acceptable false-pause rate and CPU cost, and three cached perceptual runs improve when the signal gates motion | Web Audio support is inconsistent, the signal is too noisy for quiet phonemes/feedback, CPU cost is material, or human preference is flat | Any implementation treats activity as word position, retains audio samples, weakens interruption, or causes playback failure after one remediation | `drawing-phase-6-gate` |
| `ANNOTATION_WHITESPACE=bounded` | `off`; `/annotate` receives the same structured bounds and model chooses a target-relative side | Retained annotation cases improve placement without higher repair/drop latency, every sided mark obeys the exact-bound allowlist, the 6 KiB request ceiling remains intact, and local deixis remains available | Hints are safe but human placement is flat or repairs increase materially | The allowlist can reference unknown IDs, diverge from renderer-compatible boxes, bypass request bounds, or block the dependable flag-off path after one remediation | `drawing-phase-7-overlay-gate` |

## Operational switches excluded from promotion

`VITE_CHALK_MODE=demo|diagnostics` is operational, not experimental. `demo` is the
default; `diagnostics` exposes bounded evidence UI but does not select a different
tutor, renderer, generation, or synchronization behavior. It therefore has no
promote/park/remove lifecycle.

## Audit notes

- Current values are pinned in `.env.example`: `rough-svg`, partial ink `off`,
  `one-shot`, Q&A drawing `off`, attention choreography `off`, remote-audio
  activity `off`, operational `demo`, and backend `SYNC_MODE=fixed`.
  Backend annotation whitespace is also pinned `off`.
- `shared/fixtures/feature-flag-registry.json` is the machine-readable inventory.
  Backend parity tests require its defaults to match `.env.example`, every registered
  experimental surface to appear in the table above, its review milestones to be
  documented, and `VITE_CHALK_MODE` to remain classified as operational.
- `lesson.ink_delta` is a reserved wire envelope, not permission to parse unfinished
  lesson JSON. `VITE_PARTIAL_INK` currently declares intent only; no runtime producer
  or consumer is promoted by its presence.
- Review evidence must use the shared drawing-experiment record and one configuration
  hash per run. Comparisons reference separate homogeneous records rather than putting
  two prompt hashes, models, or flag values into one record.
- Paid, microphone, and vision checks remain separately owner-approved. A review date
  never authorizes its evidence calls.
