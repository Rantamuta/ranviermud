# NPC Action Architecture v1 — Minimal Execution Checklist (Draft)

## Status

- Status: draft-v2
- Scope: narrow implementation checklist for NPC action **execution semantics only**
- Binding: no
- Audience: maintainers implementing the approved v1 slice

---

## Scope guard (must read first)

This checklist intentionally covers only the approved, minimal change set:

1. support `currentActor` in semantic events,
2. implement a shared `say` command path,
3. ensure NPC dispatch uses the existing Phase 1–6 command pipeline,
4. enforce Capture-based actor-kind gating,
5. prohibit direct broadcast for NPC speech.

Out of scope for this checklist:

- command queues,
- scheduler/autonomy loops,
- fairness policy,
- cooldown systems,
- broad dispatcher redesign,
- determinism matrix expansion,
- ADR/process updates not required by this narrow change.

If implementation pressure expands beyond the list above, stop and request explicit approval before continuing.

---

## 0) Preconditions and non-goals lock

### Objective

Freeze execution scope so the change remains surgical and behavior-preserving for existing player flows.

### Deliverables

1. PR/task note that states exactly which five in-scope items are being implemented.
2. Explicit statement that player command behavior is intended to remain unchanged except where shared actor-general semantics are required for `say` and semantic event routing.

### Acceptance Criteria

- In-scope list is copied verbatim into implementation notes.
- No extra feature work is planned in the same change.

---

## 1) Identify existing execution path touchpoints

### Objective

Map the minimum existing files/functions that must be touched to wire NPC `say` into the existing command pipeline.

### Deliverables

1. Discovery note listing current implementations for:
   - semantic event dispatch path,
   - command dispatch entrypoint currently used by player commands,
   - `say` command implementation path,
   - capture checks / metadata policy enforcement,
   - current NPC speech path that uses direct broadcast.

### Acceptance Criteria

- Each in-scope requirement maps to at least one concrete code touchpoint.
- No unrelated runtime subsystems are added to the plan.

---

## 2) Add `currentActor` semantic selector support (minimal)

### Objective

Allow semantic messaging to target the active actor generically so player and NPC actor dispatch share the same semantic route for this change.

### Deliverables

1. Minimal semantic messaging update to support `currentActor` selector in actor-general execution contexts.
2. Tests covering:
   - existing player selector behavior remains unchanged,
   - `currentActor` resolves correctly for player actor,
   - `currentActor` resolves correctly for NPC actor when command is dispatched through normal phases.

### Acceptance Criteria

- No changes to unrelated selector behavior.
- Existing tests for previous selectors still pass.

---

## 3) Implement shared `say` command path (player + NPC)

### Objective

Ensure `say` is executed through one shared command contract for both actor kinds.

### Deliverables

1. Update `say` command flow so NPC `say` uses the same planner/commit/render conventions already used by player `say`.
2. Keep command contract behavior stable for existing player usage.
3. Tests covering:
   - player `say` unchanged,
   - NPC `say` success path through command pipeline,
   - failure envelope parity for invalid `say` input.

### Acceptance Criteria

- There is one `say` behavior path, not duplicated player/NPC command logic.
- Player-visible `say` output format remains consistent unless explicitly required by `currentActor` semantics.

---

## 4) Ensure NPC dispatch uses existing Phase 1–6 pipeline

### Objective

Route NPC command execution into the existing resolution/capture/plan/bubble/commit/render flow without introducing a parallel engine.

### Deliverables

1. Minimal dispatch wiring so NPC-issued command intents enter the same Phase 1–6 path used by player commands.
2. Tests proving NPC dispatch traverses:
   - resolution,
   - capture,
   - plan,
   - bubble,
   - commit,
   - render/dispatch.

### Acceptance Criteria

- No new alternate mutation/output path is created for NPC commands.
- Player entry behavior remains backward-compatible.

---

## 5) Enforce actor-kind gating in Capture

### Objective

Apply actor-kind eligibility in Capture policy (not in planner logic), including NPC-only command capability where required.

### Deliverables

1. Capture policy support/usage for command metadata actor-kind gating.
2. Tests covering:
   - allowed actor kind passes capture,
   - forbidden actor kind fails in capture,
   - planner is not invoked after capture deny.

### Acceptance Criteria

- Actor-kind veto occurs before plan execution.
- Denial envelope uses the established structured failure shape.

---

## 6) Prohibit direct broadcast for NPC speech

### Objective

Ensure NPC speech output is emitted via command render/dispatch, not direct broadcast calls.

### Deliverables

1. Replace in-scope NPC speech callsites (Tomo-first) that directly broadcast.
2. Add a narrow guardrail (test/assertion/lint check) that prevents regressions for direct NPC speech broadcast in the touched area.
3. Tests demonstrating NPC speech reaches audience through command render/dispatch path.

### Acceptance Criteria

- In-scope NPC speech no longer uses direct `Broadcast.*` path.
- Shared `say` path is the speech authority for NPC speech in the migrated scope.

---

## 7) Behavior-preservation checks (minimal set)

### Objective

Verify narrow change safety with emphasis on existing player flow compatibility.

### Deliverables

Run and record:

1. targeted tests added for Sections 2–6,
2. `npm test`,
3. `npm run ci:local`.

### Acceptance Criteria

- Existing player flow tests pass.
- New NPC/say/semantic selector tests pass.
- Any failure is documented with impact and rollback action.

---

## 8) Rollout and rollback notes (small-scope)

### Objective

Provide reversible deployment guidance aligned with minimal scope.

### Deliverables

PR summary includes:

1. Exact files changed and why,
2. Validation evidence,
3. Risks limited to semantic selector/say/capture gating/speech path,
4. Rollback plan:
   - revert shared `say` NPC wiring,
   - revert `currentActor` selector support,
   - restore prior NPC speech path only as temporary fallback if necessary,
   - rerun tests from Section 7.

### Acceptance Criteria

- Rollback can be executed by reverting a small set of commits without collateral subsystem changes.

