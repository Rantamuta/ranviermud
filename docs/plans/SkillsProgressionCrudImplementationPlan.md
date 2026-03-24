# Skills Progression CRUD Implementation Plan

## Purpose

Implement a minimal, first-class Skills Progression CRUD infrastructure that supports both players and NPCs by storing per-skill buckets on `Character.skills`.

This plan intentionally avoids imposing gameplay schema semantics (no required XP/rank/language fields), while still defining deterministic runtime behavior and validation expectations.

## Scope

### In scope

- First-class `skills` storage on `Character` for all characters.
- Runtime CRUD surface for skill buckets.
- Read-path immutability protection using the deep-freeze helper.
- Persistence/hydration updates for player and NPC save/load compatibility.
- Documentation updates including the designer manual.

### Out of scope

- Skill progression policy design (formulas, unlock trees, balance).
- Command/UI for manipulating skills.
- Migration transforms beyond defaulting missing `skills` to `{}`.

## Requirements snapshot

- Storage location: `Character.skills`.
- Skill value type: opaque designer-authored bucket object.
- Read semantics: any bucket returned by read APIs must be deep-frozen before being returned.
- CRUD contract must be deterministic.

## Proposed API surface

Create a dedicated runtime module (service/manager) exposing:

- `create(character, skillId, initialBucket = {})`
- `get(character, skillId)`
- `list(character)`
- `update(character, skillId, patchBucket)`
- `remove(character, skillId)`

Deterministic behavior contract:

- `create`: initialize when absent; return current bucket.
- `get`: return frozen bucket or `null`.
- `list`: return frozen map/object of frozen buckets.
- `update`: deterministic merge policy (shallow merge unless implementation note approves replace semantics).
- `remove`: delete by `skillId`, return boolean indicating deletion outcome.

## Work plan

- [ ] **P1 — Character model wiring**
  - Add `skills` property initialization on `Character` with backward-compatible default `{}`.
  - Ensure `Character` serialization/hydration paths include `skills`.

- [ ] **P2 — CRUD runtime module**
  - Implement CRUD module with the API above.
  - Enforce only minimal invariants:
    - `skillId` is non-empty string.
    - bucket inputs are objects.

- [ ] **P3 — Deep-freeze read protection**
  - Integrate the deep-freeze helper in `get` and `list` outputs.
  - Ensure recursive freeze is applied before returning objects to callers.
  - Preserve deterministic output shape/ordering expectations.

- [ ] **P4 — Runtime composition**
  - Register the CRUD module in `GameState` at boot.
  - Keep existing skill execution systems (`SkillManager`, `Skill`, bundle skill loading) unchanged.

- [ ] **P5 — Documentation updates**
  - Update `docs/manuals/DesignerManual.md` with:
    - first-class `Character.skills` location,
    - schema-free bucket authoring guidance,
    - deep-freeze behavior on reads,
    - examples for both player and NPC usage.
  - Update technical/maintainer docs as needed to reflect runtime wiring.

- [ ] **P6 — Checklist and closure**
  - Update `docs/plans/FoundationalRuntimesChecklist.md` item status once implementation and validation are complete.

## Validation

### Required validation goals

1. **CRUD correctness**
   - Create/get/list/update/remove roundtrips behave as specified.
   - Missing-key behavior is deterministic.

2. **Freeze guarantees**
   - `get` returns recursively frozen bucket.
   - `list` returns recursively frozen container and frozen nested buckets.
   - Attempted mutation of returned structures fails as expected.

3. **Persistence compatibility**
   - Existing saved entities without `skills` load with default `{}`.
   - Save/load roundtrip preserves arbitrary nested bucket data.

4. **No behavioral drift in existing skill execution**
   - Existing ability execution/cooldown/resource behavior remains unchanged.

### Command expectations

As behavior-changing work, implementation PR(s) should run:

- `npm test`
- `npm run ci:local`

If interim work requires it, `npm run ci:local -- --force` may be used during development, with final validation rerun near completion.

## Risks and rollback

### Risks

- Overly aggressive freezing on internal references could break mutable call sites if not clearly read-only.
- Serialization omissions could drop `skills` on save.

### Mitigations

- Freeze only values returned through read APIs.
- Add explicit roundtrip tests.

### Rollback

- Revert CRUD module and `Character.skills` wiring commit(s).
- Retain documentation note of rollback rationale if behavior had shipped.
