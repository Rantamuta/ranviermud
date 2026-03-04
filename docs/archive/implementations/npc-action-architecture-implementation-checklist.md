# NPC Action Architecture v1 — NPC Dispatch Wiring Checklist (Draft)

## Status

- Status: draft-v4
- Scope: remaining NPC dispatch wiring work for v1 execution semantics
- Binding: no
- Audience: maintainers implementing the post–pre-flight slice

---

## Execution Status

- [x] 0) Confirm touchpoints and constraints
- [x] 1) Add NPC intent normalization into existing command artifact
- [x] 2) Wire NPC dispatch into the exact existing Phase 1–6 path
- [x] 3) Enforce Capture contract for actor-kind privilege gating
- [x] 4) Migrate Tomo speech to dispatcher + shared `say`
- [x] 5) Validation and compatibility checks (minimal required)
- [x] 6) Small-scope rollout and rollback notes

---

## Pre-flight dependency note (already done)

Treat the following as completed dependencies and **do not re-implement/redesign them in this task**:

1. shared `say` command exists,
2. semantic messaging supports `currentActor`.

This checklist covers only the remaining wiring/enforcement work.

---

## Scope guard (must read first)

In scope:

1. add NPC dispatch wiring that enters the exact same Phase 1–6 pipeline as player commands,
2. support NPC intents in `text` and `structured` forms by normalizing both to the existing command artifact consumed by the resolver,
3. enforce Capture-based actor-kind gating using the existing veto contract,
4. migrate Tomo NPC speech off direct `Broadcast.*` usage through dispatcher + shared `say`,
5. add minimal guardrails/tests to prevent NPC speech bypass regressions,
6. preserve existing player-dispatch behavior.

Out of scope:

- command queuing,
- drain loops,
- fairness policy,
- cooldown systems,
- autonomy loops/scheduling,
- broad dispatcher redesign,
- re-implementation of `say` or semantic selector systems.

If work expands beyond this list, stop and request explicit approval.

---

## 0) Confirm touchpoints and constraints

### Objective

Pin the exact code surfaces needed for wiring only.

### Deliverables

Discovery note identifying current files/functions for:

- player dispatch entrypoint and phase orchestration,
- parse/canonicalization path used by players,
- parse artifact shape consumed by Entity Resolution,
- capture policy/veto handling,
- NPC speech callsites (Tomo) currently using direct `Broadcast.*`,
- shared `say` command invocation path.

### Acceptance Criteria

- Every in-scope item maps to concrete touchpoints.
- No unrelated subsystems are added.

### Discovery note (completed)

- Player dispatch entrypoint + phase orchestration:
  - `bundles/bundle-rantamuta/lib/session/command-dispatch.js`
  - `handleCommand(...)`, `runCaptureChecks(...)`, `collectTargetPlanContributions(...)`, `collectReactContributions(...)`, `renderSuccess(...)`
- Parse/canonicalization path used by players:
  - `bundles/bundle-rantamuta/lib/parse-input.js` (`parseInput(...)`)
  - `bundles/bundle-rantamuta/lib/input-canonicalizer.js` (`canonicalizeInput(...)`)
- Parse artifact shape consumed by Entity Resolution:
  - `bundles/bundle-rantamuta/lib/session/entity-resolution.js` (`resolveEntityContext(..., parsedInput)`)
- Capture policy/veto handling:
  - `bundles/bundle-rantamuta/lib/session/command-dispatch.js`
  - `runCaptureChecks(...)`, `runCapturePolicyHooks(...)`, `capturePolicySubjects(...)`, `resolveErrorMessage(...)`
- NPC speech callsites (Tomo) currently using direct `Broadcast.*`:
  - `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js` (`sayToPlayer(...)` uses `Broadcast.sayAt(...)`)
- Shared `say` command invocation path:
  - `bundles/bundle-rantamuta/commands/say.js`
  - Executed today through `handleCommand(...)` in `lib/session/command-dispatch.js`

---

## 1) Add NPC intent normalization into existing command artifact

### Objective

Allow NPC callers to provide `text` or `structured` intents while still feeding the existing resolver artifact.

### Deliverables

1. Normalization path for:
   - `text` intent,
   - `structured` intent.
2. Normalization output is byte-for-byte compatible with the artifact the player path currently passes into Entity Resolution (same field names, same optional fields, same raw/canonical preservation behavior).
3. For `text` intents, normalization reuses the same canonicalization and parsing rules/functions used by player intake (no second text normalization model).
4. Validation that rejects:
   - pre-bound runtime entity objects,
   - pre-resolved role bindings or short-circuit binding fields that bypass normal resolution.

### Acceptance Criteria

- No new resolver artifact variant for NPCs.
- Structured intents are token/span/string input only and always proceed through normal Phase 1 resolution.
- Invalid input fails with established structured failure envelope style (not uncaught throw).

---

## 2) Wire NPC dispatch into the exact existing Phase 1–6 path

### Objective

Ensure NPC commands execute through the same Resolution, Capture, Plan, React, Commit, Render/Dispatch flow as players.

### Deliverables

1. A single minimal NPC dispatch entrypoint (documented name + parameters) used by callers for NPC command execution.
2. Minimal wiring from NPC intent dispatch into existing player phase pipeline.
3. NPC dispatch entrypoint calls the same underlying dispatcher function used by players (not a copy). If extraction is needed, do the minimum extraction and keep behavior identical.
4. Tests showing NPC-issued commands traverse all existing phases.

### Acceptance Criteria

- Entity Resolution implementation is shared (not duplicated).
- Plan/React/Commit/Render code paths are shared (not duplicated).
- Player dispatch remains behavior-preserving.

---

## 3) Enforce Capture contract for actor-kind privilege gating

### Objective

Keep privilege/eligibility enforcement in Capture with the same semantics for player and NPC calls.

### Deliverables

1. Actor-kind gating enforced in Capture via command metadata/policy.
2. Actor-kind gating runs before any entity-level capture hooks and before any planner invocation.
3. Capture remains “silent assent unless deny” for hook return behavior.
4. Structured deny/veto envelope shape is identical for player and NPC dispatch.
5. Planner checks, if present, are only redundant backstops (not primary gate).

### Acceptance Criteria

- Disallowed actor kinds are denied before planner execution.
- Capture deny envelopes match the established schema.
- No ad hoc planner-only privilege logic is introduced.

---

## 4) Migrate Tomo speech to dispatcher + shared `say`

### Objective

Remove direct NPC speech broadcasts by routing speech through command dispatch.

### Deliverables

1. Replace Tomo NPC direct `Broadcast.*` speech path with NPC dispatcher call to shared `say`.
2. Preserve player-facing speech behavior except changes required for actor-general dispatch correctness.
3. Add a minimal regression test in the touched Tomo path that spies/stubs the direct speech helper (`Broadcast.sayAt`, or the helper Tomo previously used) and asserts zero calls during NPC speech after migration.

### Acceptance Criteria

- In-scope Tomo speech no longer emits via direct `Broadcast.*`.
- Speech delivery occurs through existing command render/dispatch.

---

## 5) Validation and compatibility checks (minimal required)

### Objective

Demonstrate wiring correctness and no regression in existing player flows.

### Deliverables

Run and record:

1. targeted tests added for Sections 1–4,
2. `npm test`,
3. `npm run ci:local`.

### Acceptance Criteria

- Existing player-dispatch tests remain green.
- New NPC dispatch/capture/speech bypass tests are green.
- Any failure is documented with impact and rollback path.

### Validation results (completed)

1. Targeted tests (Sections 1-4):
   - `cd bundles/bundle-rantamuta && npx mocha tests/npc.intent.normalization.test.js tests/npc.dispatch.pipeline.test.js tests/npc.capture.actor-kind.test.js tests/tomo.caretaker.script.test.js`
   - Result: pass (`15 passing`).
2. Full repository tests:
   - `npm test`
   - Result: pass (all tests + typecheck pass).
3. Local CI parity runner:
   - `npm run ci:local -- --force`
   - Result: blocked at `Install bundles (CI)` with submodule fetch failure because the referenced submodule commit is local-only in this workspace:
     - `fatal: remote error: upload-pack: not our ref 605ddcc...`
   - Impact: local CI worktree cannot fetch `bundles/bundle-rantamuta` at the current gitlink from remote.
   - Rollback for this validation blocker: push/sync submodule commit to configured remote (or point gitlink to a fetchable commit), then rerun `npm run ci:local`.

---

## 6) Small-scope rollout and rollback notes

### Objective

Keep rollout reversible with minimal blast radius.

### Deliverables

PR summary includes:

1. exact files changed,
2. why each change is required for the five in-scope wiring items,
3. validation evidence,
4. risk note: avoid divergence by ensuring NPC text intents reuse player canonicalization/parsing and artifact shape,
5. rollback steps:
   - revert NPC dispatch wiring commits,
   - revert Tomo speech migration commits,
   - rerun tests from Section 5.

### Acceptance Criteria

- Rollback is possible by reverting a small set of commits without touching unrelated systems.

### Rollout + rollback notes (completed)

1. Exact files changed:
   - `bundles/bundle-rantamuta/lib/session/command-dispatch.js`
   - `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`
   - `bundles/bundle-rantamuta/tests/npc.intent.normalization.test.js`
   - `bundles/bundle-rantamuta/tests/npc.dispatch.pipeline.test.js`
   - `bundles/bundle-rantamuta/tests/npc.capture.actor-kind.test.js`
   - `bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js`
2. Why each change is required:
   - `command-dispatch.js`: adds NPC intent normalization, shared NPC/player dispatch pipeline entrypoint, and capture actor-kind gate.
   - `tomoCaretaker.js`: removes direct speech output and routes Tomo speech through dispatcher + shared `say`.
   - New/updated tests: lock normalization, phase traversal, actor-kind gate ordering, and Tomo direct-speech bypass regression.
3. Risk note:
   - NPC text/structured intents are normalized through the same parser artifact shape consumed by Entity Resolution, reducing divergence risk from player intake.
4. Rollback steps:
   - Revert NPC dispatch wiring commits in `bundles/bundle-rantamuta` and corresponding root gitlink commits.
   - Revert Tomo speech migration commits in `bundles/bundle-rantamuta` and corresponding root gitlink commits.
   - Rerun targeted tests, `npm test`, and `npm run ci:local` (after ensuring fetchable submodule ref).
