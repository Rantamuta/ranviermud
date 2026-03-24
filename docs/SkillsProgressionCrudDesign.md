# Skills Progression CRUD Design (Schema-Free)

## Purpose

Define the smallest runtime infrastructure that satisfies the foundational checklist item **"Skills/language progression infrastructure"** without prescribing progression mechanics.

This design is intentionally minimal: it provides first-class storage + CRUD operations only.

## Scope

### In scope

- First-class `skills` storage on `Character` (therefore available to both players and NPCs).
- A runtime CRUD API for skill buckets.
- Persistence through existing entity save/load flow.

### Out of scope

- XP systems, rank formulas, language booleans, or any global progression schema.
- Unlock/prerequisite checks.
- Trainer systems.
- Command/UI features.
- Balance or gameplay policy.

## Current baseline

- Skill definitions and execution already exist (`Skill`, `SkillManager`, `SpellManager`, and bundle `skills/` loading).
- The checklist item remains open because progression infrastructure is not yet provided.
- Existing skill execution behavior remains unchanged by this proposal.

## Data model

Add first-class property on `Character`:

```ts
character.skills: Record<string, Record<string, unknown>>
```

Interpretation:

- Top-level key = `skillId`.
- Value = designer-defined bucket for that skill.
- Runtime does not interpret bucket shape.
- Storage safety requirement: object-backed implementations must avoid prototype-chain mutation risks for skill keys.

Examples:

```json
{
  "common": { "fluency": "broken", "knownWords": 120 },
  "swordsmanship": { "rank": 3, "formsLearned": ["high-guard"] },
  "ritual": { "attunements": ["ash", "salt"], "mastery": { "tier": 2 } }
}
```

## CRUD API contract

Provide a dedicated runtime surface (service/manager/module) with these operations:

- `create(character, skillId, initialBucket = {})`
- `get(character, skillId)`
- `list(character)`
- `update(character, skillId, patchBucket)`
- `remove(character, skillId)`

Behavioral contract (minimal):

- `create`: create if absent, otherwise return existing bucket.
- `get`: return bucket or `null`.
- `list`: return full skills dictionary/bucket map.
- `update`: deterministic merge or replace policy (must be chosen and documented; default recommendation: shallow merge).
- `remove`: delete bucket by `skillId`, return whether deletion occurred.

## Minimal invariants

To keep this schema-free but not fragile, runtime should enforce only:

1. `skillId` is a non-empty string.
2. bucket payloads are objects.
3. prototype-special keys must not be allowed to behave as ordinary skill keys (e.g., `__proto__`, `prototype`, `constructor`). Implementations must either reject these keys or use a null-prototype/`Map` backing that prevents prototype-chain mutation.

No additional validation or policy checks are part of this design.

## Persistence contract

- `Character.skills` must be serialized and hydrated explicitly.
- Legacy saved entities without `skills` default to empty object `{}`.
- Player/NPC save paths continue to rely on existing manager + loader persistence flow.


## NPC persistence status (explicit acknowledgement)

At current runtime baseline, NPC instances are not persisted across reboot as runtime entities. NPCs are re-instantiated from area content definitions on boot/spawn.

Implication for this design:

- `Character.skills` applies to both players and NPCs at runtime.
- Persistent skill buckets are guaranteed only where an existing persistence path exists (players today).
- NPC skill bucket persistence requires separate NPC persistence infrastructure and is not delivered by this design alone.

## Determinism and compatibility

- CRUD behavior must be deterministic for identical inputs.
- This proposal does not alter skill execution, cooldown, effect, or bundle load-order semantics.
- This proposal does not change config keys, CLI flags, or boot order.

## Acceptance criteria

1. Any `Character` (player or NPC) can own first-class `skills` buckets.
2. Runtime CRUD operations function for both players and NPCs.
3. Save/load round-trip preserves `skills` data.
4. No behavior changes to existing skill execution pipeline.

## Deferred follow-ups

- Optional schema profiles per skill family.
- Optional helper conventions for common fields (e.g., `rank`, `mastery`, `tokens`) documented at content layer only.
- Optional command/UI surfacing.
