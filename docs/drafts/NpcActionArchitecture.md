# NPC Action Architecture (Draft)

This draft describes a candidate execution model for NPC-authored actions in the bundle runtime.

## Status

- Status: draft-v1
- Scope: NPC action execution model (runtime-level)
- Binding: no
- Related:
  - `docs/normative/CommandArchitecture.md`
  - `docs/normative/EntityResolution.md`
  - `docs/drafts/CombatPlan.md`

## Purpose

Define a reviewable baseline for NPC action handling that preserves transactional guarantees:

- deterministic resolution and validation,
- no mutation outside commit,
- no direct audience output outside render dispatch.

Core intent for discussion:

- NPC decision logic may remain script-driven.
- NPC side effects should flow through the same transactional engine phases used by player commands.
- Actor scheduling should reuse existing command queue primitives rather than introduce a second parallel dispatcher.

## Problem Statement

Current NPC scripts can perform direct side effects (for example direct `moveTo(...)` or direct `Broadcast.sayAt(...)`).

That creates two behavior models:

- player commands: phase pipeline (`Entity Resolution` -> `Capture` -> `Plan` -> `Commit` -> `Render`)
- NPC scripts: arbitrary side effects in script code

This draft explores collapsing side effects into one model while keeping NPC decision logic ergonomic.

## Core Findings That Constrain Design

Current engine behavior relevant to this draft:

- Runtime creature entities are `Npc` instances; core `Mob*` naming is manager/factory terminology.
- `Npc` and `Player` both expose `commandQueue`.
- Core does not currently provide an automatic queue-drain loop for `commandQueue.execute()`.

Design implication:

- we should treat `CommandQueue` as a built-in scheduling primitive,
- but queue draining policy must be explicitly owned by runtime wiring.

## Design Goals

- Preserve command architecture invariants for NPC-caused effects.
- Keep authored NPC AI scripts practical for designers.
- Avoid introducing area/content coupling into runtime infrastructure.
- Keep event ordering deterministic and testable.
- Allow privileged NPC-only capabilities through explicit policy, not side-effect escape hatches.

## Non-Goals (Draft)

- No requirement that NPCs produce human-typed raw text input.
- No immediate redesign of all quest/NPC authoring APIs in one step.
- No assumption that every future autonomous system must be represented as a "player."

## Phase Model Candidate

Execution phases are:

0. NPC Intent
1. Resolution
2. Capture
3. Plan
4. Bubble
5. Commit
6. Render/Dispatch

### 0) NPC Intent (decision phase)

Rules:

- NPC behavior scripts decide what they want to attempt.
- Intent may be represented as structured action input (candidate default), not necessarily raw text.
- Intent phase must not mutate world state.
- Intent phase must not emit audience output directly.
- Intent phase may read deterministic world context and NPC-local memory.

Candidate structured shape:

```js
{
  actor: npcRef,
  verb: 'go',
  direct: ['north'],
  relationToken: null,
  indirect: [],
  metadata: { source: 'npc.ai.tomo.patrol' }
}
```

### 1) Resolution (binding phase)

Rules:

- Reuse existing entity-resolution contracts where applicable.
- Resolution binds spans/roles to concrete entities in deterministic scope order.
- Resolution remains read-only and side-effect free.
- Resolution failures return structured errors for NPC decision logic to handle.

### 2) Capture (veto phase)

Rules:

- Reuse existing capture policy semantics (`canDirect`, `canIndirect`, metadata permissions).
- Capture hooks remain veto-only and read-only.
- First deny wins.
- NPC actor identity must be explicit in capture context.

### 3) Plan (verb phase)

Rules:

- Reuse command-level planning semantics and result envelopes.
- Plan may return failure or `plan.operations` + `render.messages/instructions`.
- Plan remains side-effect free.
- Any NPC-only verbs/capabilities must still return plan instructions, not mutate directly.

### 4) Bubble (reaction phase)

Rules:

- Bubble remains non-veto, render-only contribution surface.
- No mutation operations from bubble contributions.

### 5) Commit (mutation phase)

Rules:

- All world mutation executes through mutator operations.
- Rollback guarantees apply equally to NPC-caused plans.
- No direct mutation from NPC script bodies.

### 6) Render/Dispatch (output phase)

Rules:

- All audience-visible output uses render dispatch (`semanticEvent` / `broadcast` / line messages).
- No direct `Broadcast.sayAt(...)` calls from NPC scripts in the target model.
- Delivery order and merge semantics remain deterministic.

## Candidate Actor Model

The actor concept should be generalized from "current player" to "current actor":

- Player actor
- NPC actor

Implication for review:

- Render-dispatch and semantic-event participant resolution currently assume an active player in several paths.
- A generalized actor context likely becomes required to make NPC-generated semantic events first-class.

## Command Queue Integration (Revised)

### Baseline rule

Use the existing per-actor `CommandQueue` as the canonical execution queue for actor actions.

Do not introduce a second generic “NPC action queue” layer parallel to `CommandQueue`.

### Queue layering model

Two queue concepts may coexist without conflict:

- Actor command queue (`CommandQueue`):
  - schedules executable actor actions with lag/backpressure semantics.
  - consumed by a runtime queue-drain loop.

- Domain intent queues (example: combat participant `intentQueue`):
  - store tactical intent for a domain subsystem.
  - resolved into concrete actor actions when that subsystem decides.
  - do not bypass actor command queue or command pipeline.

This matches the combat draft: combat remains a deterministic command producer, not a parallel execution engine.

### Executable shape

Queued NPC executable should call the same actor-general command entrypoint used by players:

```js
queue.enqueue({
  label: 'npc:go:north',
  execute: () => dispatchActorCommand({
    actor: npc,
    verb: 'go',
    direct: ['north'],
    relationToken: null,
    indirect: [],
    metadata: { source: 'npc.ai.tomo.patrol' },
  }),
}, lagMs);
```

Where `dispatchActorCommand(...)` runs the standard:
Resolution -> Capture -> Plan -> Bubble -> Commit -> Render/Dispatch.

## Privileged Capability Model (Draft)

Some NPC actions may not be available to players (for example administrative movement, scripted teleport, forced quest transitions).

Draft rule:

- privileged actions are still expressed as planned operations and still pass through commit/render;
- privilege is granted via explicit policy (actor capability metadata / command declaration), not by bypassing phases.

## Scheduling and Throughput (Draft)

NPC execution requires queueing discipline to avoid bursty tick behavior.

### Queue-drain heartbeat (on-demand)

Recommended model:

- queue-drain heartbeat is inactive when all actor command queues are empty.
- when any actor queue transitions empty -> non-empty, activate drain heartbeat.
- each heartbeat step drains ready commands with deterministic fairness (at most one execution per actor per pass by default).
- when all actor queues become empty, heartbeat self-disables.

This gives event-driven activation without permanent polling cost and avoids introducing a second dispatcher.

### Deterministic drain policy

Candidate rules:

- stable actor ordering for drain passes (e.g., area id -> room id -> actor id/uuid).
- per-pass cap to prevent long-tail starvation.
- bounded command queue length per actor.
- lag/cooldown handled through `CommandQueue` lag semantics.

### Clock source caution

`CommandQueue` lag timing is currently wall-clock (`Date.now()`).

For stronger replay determinism, runtime should eventually decide whether:

- wall-clock lag is acceptable for v1, or
- queue readiness should be driven by an authoritative monotonic tick clock.

## Determinism and Safety Requirements

- identical state + identical intent input must yield identical resolution/capture/plan outcomes;
- no direct side effects in intent/capture/plan/bubble phases;
- all mutation must be representable as mutator operations;
- all player-facing output must originate from render dispatch;
- no hidden area-specific IDs in runtime infrastructure.

## Observability Contract (Draft)

NPC pipeline runs should emit structured traces suitable for replay/debug:

- actor id/reference
- input/intent
- selected rule/form
- resolution outcome
- capture veto/failure (if any)
- planned operations count/types
- commit result
- render instruction counts

## Migration Sketch (Tomo-First, Draft)

A possible low-risk migration sequence:

1. Introduce actor-general execution entrypoint for non-player actors.
2. Add on-demand actor queue-drain heartbeat (shared for players/NPCs).
3. Convert one Tomo behavior (patrol move) to enqueue actor command -> pipeline commit.
4. Convert Tomo speech hints from direct broadcast to render instructions.
5. Add guardrails against direct mutation/direct broadcast in NPC scripts.

This section is sequencing guidance only; not implementation approval.

## Open Questions For Review

1. Should NPC intents be structured-only, text-only, or dual-mode?
2. Should NPC actions reuse existing command modules directly, or use an adapter layer around them?
3. What is the minimum actor-context change needed in render-dispatch to support NPC semantic events?
4. Do we require strict prohibition of direct `Broadcast.*` in NPC scripts, or staged deprecation?
5. Which privileged NPC verbs are explicitly in scope for v1?
6. What fairness policy is required when many actors are ready in one heartbeat pass?
7. Should command queue readiness remain wall-clock based (`Date.now()`) or be moved to monotonic tick time?

## Review Guidance

When reviewing this draft, prefer explicit statements on:

- what invariants are non-negotiable,
- where actor-generalization is required vs optional,
- which migration constraints matter for `bundle-rantamuta` now,
- which pieces belong in normative spec vs ADR.
