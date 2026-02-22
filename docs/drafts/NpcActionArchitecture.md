# NPC Action Architecture (Draft)

## Status

* Status: draft-v1
* Scope: NPC action execution model (runtime-level)
* Binding: no
* Related:

  * `docs/normative/CommandArchitecture.md`
  * `docs/normative/EntityResolution.md`
  * `docs/normative/SemanticMessaging.md`
  * `docs/drafts/CombatPlan.md`

---

## Purpose

Define a reviewable baseline for NPC action handling that preserves transactional guarantees:

* deterministic resolution and validation,
* no mutation outside commit,
* no direct audience output outside render dispatch,
* identical failure envelopes for player and NPC calls.

Core intent for v1:

* NPC decision logic may remain script-driven.
* NPC side effects must flow through the same transactional engine phases used by player commands.
* NPC actions must use the same resolution, capture, planning, commit, and render semantics as player commands.

---

## Non-Goals (v1)

The following are explicitly out of scope for v1:

* Per-actor command queues.
* Queue draining policies.
* Fairness scheduling.
* Cooldown enforcement.
* Monotonic tick clock for readiness.
* Combat-driven intent scheduling.
* Autonomous repeated action loops.

v1 defines **how an NPC action is executed**, not how repeated actions are scheduled.

---

## Core Invariant

> NPC-dispatched actions MUST enter the same Phase 1-6 command pipeline used for player commands.

There is no alternate execution path for NPC-caused side effects.

---

# Phase Model

Execution phases are:

0. NPC Intent
   0.5 Intent Normalization
1. Resolution
2. Capture
3. Plan
4. Bubble
5. Commit
6. Render/Dispatch

---

## 0) NPC Intent (decision phase)

Rules:

* NPC behavior scripts decide what they want to attempt.
* Intent must not mutate world state.
* Intent must not emit audience output directly.
* Intent may read deterministic world context and NPC-local memory.

Two supported authoring forms:

### A) Structured Intent

```js
{
  kind: 'structured',
  verb: 'go',
  direct: ['north'],
  relationToken: null,
  indirect: [],
  metadata: { source: 'npc.ai.tomo.patrol' }
}
```

### B) Text Intent

```js
{
  kind: 'text',
  input: 'go north',
  metadata: { source: 'npc.ai.tomo.patrol' }
}
```

Structured intent is not resolved intent. It must not contain pre-bound entity objects.

Allowed: strings, tokens, spans.
Forbidden: runtime entity instances.

---

## 0.5) Intent Normalization (pure structuring step)

Purpose:

Convert either text or structured intent into the same command artifact shape produced by player intake.

Rules:

* Deterministic.
* Read-only.
* No entity binding.
* No mutation.
* No output.

Output must be equivalent to the artifact consumed by Phase 1 (Entity Resolution).

---

## 1) Resolution (binding phase)

NPC-dispatched commands MUST use the same Entity Resolution implementation and contracts used by player commands.

Rules:

* Resolution binds spans/roles to concrete entities in deterministic scope order.
* Resolution remains read-only and side-effect free.
* Resolution failures return structured error envelopes.
* No audience output.
* No mutation.

Entity Resolution is the only binding authority.

---

## 2) Capture (veto phase)

Capture is veto-only and actor-agnostic.

### Return Contract

Capture may return:

* `undefined` / `null` -> silent assent
* A structured deny envelope -> veto

No explicit "allow" return exists.

Everything else is treated as silent assent (with contract warning).

### Structured Veto Envelope

```js
{
  ok: false,
  error: {
    code: 'ERROR_CODE',
    message?: 'Optional player-facing default',
    details?: { ... }
  }
}
```

This envelope shape must be identical for both player and NPC dispatch.

Capture must:

* not mutate world state
* not emit output
* stop at first deny

---

### Privilege Enforcement

Privilege decisions are enforced in Capture via command metadata.

Example:

```js
metadata: {
  actorKindsAllowed: ['npc'] // default: ['player','npc']
}
```

If actor kind is not allowed:

* Capture returns structured veto (`ACTOR_KIND_FORBIDDEN`)
* Planning logic does not execute

Privilege is policy, not planner logic.

---

## 3) Plan (verb phase)

Plan:

* Receives resolved context.
* Performs deterministic validation.
* Returns either:

  * failure envelope, or
  * `{ ok:true, plan?, render? }`.

Plan must not mutate world state.

NPC-only commands are valid, but must follow the same plan/commit/render contract.

---

## 4) Bubble (reaction phase)

Bubble remains render-only.

Rules:

* No veto.
* No mutation.
* Contributions limited to `render.messages`.
* Deterministic.

---

## 5) Commit (mutation phase)

All world mutation occurs here.

Rules:

* Apply mutator operations.
* Rollback on failure.
* No render before successful commit.

NPC and player commits are identical.

---

## 6) Render/Dispatch (output phase)

All audience-visible output must originate from Render/Dispatch.

Direct `Broadcast.*` calls from NPC scripts are prohibited in v1.

Semantic events and other render instructions are the only allowed delivery surface.

---

### Actor Feedback

Render must return structured feedback suitable for actor logic:

```js
{
  ok: true,
  feedback: {
    actor: [ ...structured render events... ]
  }
}
```

* Players receive delivery via transport.
* NPCs receive structured feedback for decision logic.
* Feedback does not mutate world state.
* Feedback is not an audience channel.

---

# Privileged Capability Model (v1)

* Some commands may be NPC-only.
* These commands are declared as such via metadata.
* Capture enforces eligibility.
* Planner may assert defensively but is not the primary gate.

No bypass of phases is permitted for privileged actions.

---

# Determinism Requirements

For identical state and identical intent input:

* Resolution outcome must be identical.
* Capture outcome must be identical.
* Plan result must be identical.
* Commit must be identical.
* Render instruction set must be identical.

Scheduling and fairness are deferred to a future document.

---

# Deferred (Explicitly Out of Scope for v1)

The following are intentionally deferred:

* Per-actor command queues.
* Drain loops.
* Fairness policies.
* Cooldown enforcement.
* Monotonic tick clock scheduling.
* Combat-driven intent queues.

These will be defined in a later "Scheduling and Autonomy" or Combat architecture draft.

---

# Migration Sketch (Tomo-First)

1. Introduce actor-general dispatch entrypoint.
2. Implement `say` as a shared command for players and NPCs.
3. Replace Tomo's direct broadcast usage with dispatcher-based calls.
4. Enforce prohibition of direct broadcast in NPC scripts.
5. Add structured feedback consumption in Tomo AI.

Tomo is a disposable test-bed and may be rewritten entirely.

---

# Open Questions (Remaining)

1. Do we require actor-feedback payloads to include rendered self-text, or only structured semantic-event data?
2. Should semantic messaging introduce `currentActor` selector formally (pre-flight change)?
3. Should NPC-only commands be hidden from player command lookup entirely, or rely solely on Capture veto?

---
