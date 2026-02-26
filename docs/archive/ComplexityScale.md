# Complexity Scoring

When scoring a task for complexity, use the Fibonacci scale. Choose one of: 1, 2, 3, 5, 8, 13, 21, defined here:

## Definition (for this project)

### 1 — Trivial

* Single file, localized change
* No behavior change
* Verification: existing `npm test` or a quick command
* Examples: fix a README link, adjust a log message, correct a typo in config docs

### 2 — Small

* 1–3 files
* Low risk, minimal surface area
* Might add a small unit test
* Examples: tighten a small validation, add a missing guard, tweak a script argument

### 3 — Medium

* Several files but within one subsystem
* Clear contract, clear done condition
* Adds or updates tests
* Examples: add a focused unit test suite for one module, refactor a tiny utility with tests

### 5 — Large

* Cross-cuts one repo but still one “theme”
* Requires careful tests and rollback plan
* Examples: update a dependency with compatibility tests, adjust boot script behavior with tests, add a new `ci:local` step

### 8 — Very large (max “atomic”)

* Multiple subsystems or a full workflow, but still completable in one PR if tightly scoped
* Requires tests + careful failure logging
* Your anchor example fits: **“Implement an API endpoint”** (or equivalently: “add a new smoke test flow” if minimal)
* Done condition must be extremely explicit
* Rule: if you cannot state the done condition in one sentence, it is not an 8, it is 13+

### 13 — Epic

* Spans subsystems or requires multiple PRs
* Any of:

  * unclear done condition
  * needs new infrastructure
  * needs nontrivial design decisions
* Must be decomposed into 3–8, 5–8, or smaller items before work proceeds

### 21 — Initiative

* Multi-week / multi-repo / architectural coordination
* Definitely not an agent “pick one task” item
* This becomes a milestone with its own checklist

## Decision rule

* Allowed for “pick one task” loop: **1, 2, 3, 5, 8**
* If the agent estimates **13 or 21**, it must output a breakdown and stop.

## How to compute the score (deterministic-ish)

Have the agent score via the max of these dimensions:

* **Files touched:** 1–2 (1), 3–5 (2–3), 6–10 (5), 10+ (8+)
* **Subsystems touched:** 1 (≤3), 2 (5), 3+ (13)
* **Verification complexity:** existing test (≤3), add tests (5), new harness/smoke with timing (8), CI infra changes (13)
* **Behavior risk:** none (≤3), guarded (5), potential externally observable (8), ambiguous (13)

Take the highest bucket hit.

That gives you a scale that doesn’t pretend “10” is a maximum difficulty, and it forces decomposition when it should.
