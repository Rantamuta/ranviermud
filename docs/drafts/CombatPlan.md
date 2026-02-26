# Combat System Design Plan

Status: `draft-v1`
Binding: Proposed (non-normative)
Scope: Bundle-layer combat as a deterministic command producer integrated into the existing command pipeline and semantic messaging model.

- Related:
  - `docs/normative/CommandArchitecture.md`
  - `docs/normative/EntityResolution.md`
  - `docs/normative/SemanticMessaging.md`

Related (implementation map): `BundleRantamutaTechnicalManual.md`

---

## 1. Purpose

Define a combat system that:

- Treats combat as **another deterministic command producer**.
- Preserves the existing phase boundaries:

  - Receive Input
  - Entity Resolution
  - Capture (veto only)
  - Target (planner only)
  - Bubble (messaging only, no mutation)
  - Commit (mutator only)
  - Render/Dispatch
- Ensures **all world state mutation** (HP, effects, inventory, position, battle state) occurs only via mutator operations in Commit.

This document is a plan for a future implementation. It prioritizes determinism, testability, and minimal surface-area changes.

---

## 2. Non-negotiable constraints

### 2.1 Combat is not a parallel execution engine

Combat actions must run through the existing command pipeline defined in `CommandArchitecture.md`.

### 2.2 No mutation outside Commit

- Battle scheduling cannot apply damage, effects, movement, or battle state changes directly.
- Bubble remains messaging-only and must not append mutation instructions.
- All changes are expressed as mutator operations and applied atomically in Commit.

### 2.3 Determinism

For identical input and state, combat outcomes must be identical.

- Scheduling order must be deterministic.
- Any randomness, if used, must be derived from battle state (seeded and replayable), never ambient randomness.

### 2.4 No player spam to “interrupt” cadence

When a player is engaged in combat:

- player-input combat directives are **queued intents**, not immediate actions
- the battle cadence decides when a queued intent can be consumed

---

## 3. Combat in the phase model

This system adds **one additional command source** that feeds the existing command dispatcher:

1. Player input (normal)
2. Battle scheduler input (internal commands)

Both sources produce a standard “command artifact” and then run through:

Receive Input -> Entity Resolution -> Capture -> Target -> Bubble -> Commit -> Render/Dispatch

### 3.1 Bubble remains messaging-only

Bubble may add:

- flavor lines
- audience-specific semantic events
- combat log events

Bubble may not:

- apply damage
- apply or remove effects
- advance casting progress
- end battles
- move entities

Mutation is exclusively planned in Target and executed in Commit.  

---

## 4. Core abstraction: Battle and BattleManager

### 4.1 Battle

A battle is a runtime object representing an ongoing encounter.

Minimum fields:

- `id`: unique stable id
- `roomRef`: where the battle exists (initially room-scoped)
- `participants`: ordered list of participant records
- `state`: active | ended
- `clock`: battle-local deterministic time base (derived from engine tick)
- `seed`: optional deterministic seed for any randomized decisions
- `eventIndex`: monotonic integer used for deterministic tie-break and RNG derivation
- `rulesProfile`: reference to a combat rules profile (optional, default profile exists)

Participant record:

- `entityRef` (player or npc reference)
- `side` or `team` (optional)
- `speedMs`: base time between action slots
- `nextActAt`: scheduled absolute time in battle clock
- `intentQueue`: bounded (see below)
- `castingState`: optional (see spells)
- `stanceState`: optional (guard/aim posture)
- `flags`: e.g. incapacitated, fleeing, etc. (derived from effects or status)

### 4.2 BattleManager

BattleManager is the owner of:

- creating and destroying battles
- tracking participants and membership
- determining which participants are due to act
- issuing internal scheduled commands through the command dispatcher

BattleManager must NOT:

- apply damage
- mutate entities
- mutate battle state directly

BattleManager produces internal commands only.

---

## 5. Command ingestion model in combat

### 5.1 Player commands while in combat

Player-issued combat commands are categorized as:

**A) Directives (intent-setting)**
Examples:

- `aim high`
- `guard low`
- `switch target goblin`
- `cast meteor goblin`
- `flee`

These do not immediately cause damage. They commit changes to combat intent state (or casting state) via mutator operations.

**B) Non-combat commands**
Out of scope here, but default policy should be conservative:

- allow safe commands like `look`
- deny or delay disruptive commands based on design goals

### 5.2 Scheduler-issued commands

When a participant is due to act, BattleManager issues exactly one internal command such as:

- `combat.act <battleId> <actorRef>`

The Target planner for `combat.act` selects the concrete action based on:

- queued directive intent (if any)
- casting state (if mid-cast)
- default NPC policy fallback

Then returns a plan that mutates world state via mutator operations.

---

## 6. Intent queue and anti-spam rules

### 6.1 Bounded queue

To prevent spamming and reduce state complexity:

- Each participant has an `intentQueue` with max length `1` (default) or `2` (optional).
- New directive commands:

  - replace the existing queued intent (overwrite policy), or
  - fail with a structured error code, depending on command type

Recommended v1 policy:

- Overwrite for aim/guard/target selection
- Bounded FIFO for “cast” if you want “commit to casting soon”

### 6.2 Consumption timing

- Queued intent is consumed only at the participant’s next action slot.
- If the action fails in Capture (veto), the consumption policy is design-defined:

  - default: intent is still consumed (you lose the slot)
  - optional: intent remains queued only when veto reason indicates “not executed” (more complex, defer)

---

## 7. Deterministic scheduling

### 7.1 Due selection

On each engine tick:

1. Determine `now` in battle clock.
2. Identify participants with `now >= nextActAt`.
3. Sort due participants deterministically by:

   1. `nextActAt` ascending
   2. tie-break: stable participant key (join order, then UUID lexical)

### 7.2 Advancement

After a participant’s action resolves (regardless of success), update next schedule time via mutation plan:

- `nextActAt = nextActAt + speedMs + modifiers`

Modifiers may be derived from effects (haste/slow/stun), stance, burden, etc.

Important: updating `nextActAt` is a mutation and must occur via mutator ops, not in BattleManager.

Practical approach:

- `combat.act` plan always includes “schedule next action” op for its actor.

---

## 8. Stance model (guard/aim)

### 8.1 Minimal state

Per participant:

- `guardZone`: high | mid | low
- optional `aimZone`: high | mid | low (used by next action only)

### 8.2 Verbs

- `guard <zone>` sets `guardZone` (persistent)
- `aim <zone>` sets `aimZone` (consumed on next attack, then cleared or defaults)

### 8.3 Resolution

When an attack occurs:

- if `aimZone == guardZone` => reduced damage (blocked)
- else => bonus damage (exposed)

This is computed in Target and expressed as mutator ops (HP delta, effects).

---

## 9. Attack kinds and damage types

### 9.1 Attack kind (v1)

Support a small set:

- `strike`
- `thrust`
- `bite`
- `grab` (optional, defer if not needed)

### 9.2 Damage types (v1)

- `blunt`
- `slash`
- `pierce`
  (extend later to elemental)

### 9.3 Body types (optional)

If introduced, keep it as a small enum and a lookup table:

- `humanoid`, `quadruped`, `serpent`, `amorphous`

Resolution uses deterministic multipliers, never ad hoc conditional logic.

---

## 10. Spellcasting in combat

### 10.1 Casting is battle-scoped state

A caster’s casting progress is stored on their battle participant record, not in global character state, and is mutated only via Commit.

Casting state:

- `spellId`
- `stepsTotal` (1 = immediate spell)
- `step` (0..stepsTotal-1)
- `targetRef` (bound at cast start or revalidated each step, design choice)
- `params` (element, modifiers, etc.)
- `disruptionProfile` (how disruption is evaluated)

### 10.2 Cast directive

`cast <spell> <target>` is a directive command:

- it sets `castingState` with `step=0`
- it does not deal damage immediately

### 10.3 Step advancement

When the caster’s action slot arrives, `combat.act` detects `castingState != null` and resolves to:

- `combat.advanceCast`

Target for `combat.advanceCast`:

- if `step < stepsTotal - 1`: increment `step` and schedule next action
- else: resolve the spell effect (damage, effects, movement), then clear `castingState`

All via mutator operations.

### 10.4 Disruption without Bubble mutation

Because Bubble cannot mutate, disruption must be handled via one of:

**A) Damage applies an effect that later causes a veto** (recommended)

- Strike planner applies an effect to the victim, e.g. `disruptedCasting`
- Next `combat.advanceCast` is vetoed in Capture based on effects
- After veto, effect lifetime handles clearing (see Effects section)

This keeps “disruption” in the normal policy system: Capture is veto.

**B) Strike planner directly mutates castingState** (allowed but less systemic)

- Strike planner includes mutator ops that decrement casting step or clear casting state
- Still phase-correct, but less composable than effect-based veto

Recommended v1: A.

---

## 11. Effects: lifetime policies

Effects exist in the engine already; combat introduces stronger requirements on lifetime semantics.

This doc proposes adding (or standardizing) a limited set of effect lifetime policies usable by designers:

### 11.1 `ticks`

- expires after N ticks
- decremented by a single authoritative tick handler that produces mutator ops

### 11.2 `consumeOnVeto`

- effect persists until it causes a veto for a specified gate
- when it causes denial, it is consumed

Important: Capture cannot mutate, so consumption must be expressed as mutator ops by an owner outside Capture. Two compatible approaches:

1. Denial envelope includes `consumeOps` to be committed even on failure (requires an explicit architecture extension), or
2. Scheduler issues a follow-up internal command to consume the effect when it detects a veto requiring consumption.

Recommended: choose one approach and make it the only legal mechanism.

### 11.3 Deferred lifetime kinds

Defer until concrete needs:

- `commands` (expires after N commands)
- `gameTime` (expires at a timestamp)
- `untilEvent` (expires when a named committed fact occurs)

---

## 12. Capture policy and veto rules in combat

Capture remains the only veto phase.

Typical veto checks:

- actor incapacitated (effect)
- actor silenced (effect) blocks spell advance
- target invalid or unreachable
- weapon required, disarmed, etc.
- battle membership mismatch

Design rule:

- Veto failures must not mutate.
- Veto message selection is handled in Render/Dispatch mapping (semantic messaging), not in Capture.

---

## 13. Semantic messaging integration

Combat output is semantic-event-driven like all other actions:

- Action commits semantic events (strike landed, blocked, spell step progress, disruption, death)
- Renderer produces perspective-correct text for:

  - actor
  - target
  - bystanders in room
  - other audiences (party, etc.)

No combat narration may be emitted before successful commit.

---

## 14. Mutator operation needs (combat v1)

Combat requires mutator support for a small set of operations. These should be explicit instruction types similar to existing ones.

Likely new ops:

- `applyDamage { targetRef, amount, damageType, sourceRef?, tags? }`
- `applyEffect { targetRef, effectId, durationPolicy, stacks?, metadata? }`
- `removeEffect { targetRef, effectId, count? }`
- `battleCreate { battleId, roomRef }`
- `battleJoin { battleId, entityRef, speedMs, nextActAt }`
- `battleLeave { battleId, entityRef }`
- `battleSetIntent { battleId, entityRef, intent }`
- `battleClearIntent { battleId, entityRef }`
- `battleSetCasting { battleId, entityRef, castingState }`
- `battleUpdateCasting { battleId, entityRef, delta }` (or step increment)
- `battleScheduleNext { battleId, entityRef, nextActAt }`
- `battleEnd { battleId, reason }`

All must be reversible with undo handlers to preserve atomic rollback.

---

## 15. Minimal implementation phases

### Phase 0: Data model and manager skeleton

- Introduce BattleManager (bundle layer).
- Introduce battle state storage strategy:

  - in-memory map keyed by id (v1), with careful cleanup
  - optionally room meta references for discoverability (still mutated via mutator ops)
- Tests for creation/join/leave/end determinism.

### Phase 1: One attack end-to-end

- Add `combat.act` internal command and one concrete action `strike`.
- Strike planner produces:

  - damage op
  - schedule-next op
  - semantic event(s)
- Capture denies invalid states.
- Tests:

  - cadence ordering
  - atomic damage application
  - deterministic results

### Phase 2: Guard and aim directives

- Add `guard` and `aim` directive commands.
- Strike uses stance state in planner.
- Tests:

  - blocked vs exposed damage
  - intent queue overwrite behavior

### Phase 3: Spells with step casting

- Add `cast` directive storing `castingState`.
- Add `combat.advanceCast`.
- Add disruption as effect applied by strike, vetoing advanceCast in Capture.
- Add one-shot effect consumption mechanism (choose approach).
- Tests:

  - step progression
  - disruption veto
  - deterministic scheduling interactions

Stop here. This is a complete combat subsystem suitable for “outer areas” experimentation.

---

## 16. Testing strategy

Add tests at three levels (mirroring existing style in bundle tests ):

1. Unit tests

   - intent queue policy
   - scheduling order
   - stance resolution math
   - casting progression logic

2. Pipeline integration tests

   - internal command issuance path
   - Capture veto behavior and messaging
   - Commit atomicity for damage + schedule-next

3. Scenario tests

   - scripted multi-participant battle with known seed
   - verify transcript and JSON trace outputs remain stable

Determinism tests should assert:

- same initial state and seed produce identical outcomes and event sequences

---

## 17. Open design decisions (explicitly deferred)

- Is battle state persisted across reboot? (likely no for v1)
- Do non-combat commands execute immediately while in battle?
- Do failed actions consume intent and action slot? (recommend yes for v1)
- How to represent “range” and “positioning” if introduced later
- How to define and expose the in-game calendar if `gameTime` effects are desired
- How to unify effect lifetime policies across combat and non-combat systems

---

## 18. Summary

This plan defines combat as:

- a deterministic scheduler that issues internal commands
- a strict user-input throttling model based on bounded intent queues
- a spellcasting system that uses multi-step progress with disruption modeled via effects and Capture veto
- a hard invariant that all state changes occur only through mutator operations in Commit

It is deliberately narrow: it delivers credible combat without compromising the command architecture or turning Bubble into a mutation backdoor.
