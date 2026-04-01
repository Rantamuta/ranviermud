# Authored Effects Transposer Design

Status: active

## Purpose

This document defines a small, mechanical transposer for authored effect data.

The transposer exists to turn YAML-authored effects into the existing runtime instruction sets:

- mutation operations for the mutator
- render instructions for render dispatch

It is intentionally narrow.
It does not execute effects.
It does not invent new behavior.
It only validates authored shape, resolves references from context, and emits canonical instructions.

## Why This Exists

The codebase already has canonical runtime instruction sets.

On the mutation side, the mutator accepts a known set of mutation operations.
On the render side, render dispatch accepts a known set of render instructions.

What the codebase does not yet have is one shared layer that can take authored YAML effect data and transpose it into those canonical instruction sets.

Conversation-directed speech is the first consumer that clearly needs this.
Other future consumers are expected:

- quest systems
- a planned narrative system
- future room DSL
- future item DSL

## Core Idea

The transposer is not a game engine inside the game engine.

It is a mechanical bridge:

1. read one authored effect entry
2. identify the effect name
3. validate the payload shape for that effect
4. resolve symbolic references from an explicit runtime context
5. emit canonical mutation ops and/or render instructions

The output of the transposer should already look like the output that ordinary commands produce today.

## Authoring Shape

Each authored effect entry is a single-key object.

Example:

```yaml
onEntry:
  effects:
    - broadcast:
        audience: room
        message: "Here you go."
    - transferItem:
        item: widget
        from: inventory
        to: player
    - semanticEvent:
        template: "{actor.You} {verb:hand} {object.direct} to {target.you}."
        audiencePolicy: self_target_and_others
        participants:
          actor:
            selector: currentActor
          target:
            selector: entityByContextRole
            role: indirectTarget
        objectText:
          direct: "the widget"
```

This means the transposer can read each effect entry as:

- one effect name
- one payload

That makes dispatch simple:

```js
switch (effectName) {
  case 'transferItem':
    // validate payload
    // resolve refs
    // emit canonical transferItem instruction
    break;
}
```

## Important Design Rule

The YAML payload shape should match the transposer contract for that effect.

If an effect expects:

- `item`
- `from`
- `to`

then the authored YAML must provide:

```yaml
- transferItem:
    item: widget
    from: inventory
    to: player
```

The transposer should not require a second hidden schema layer.
The author-facing shape, the validator shape, and the implementation shape should all match.

This means the authored DSL should expose the real runtime instruction names and field names directly.
If the runtime supports `broadcast`, the DSL should say `broadcast`.
If the runtime supports `setRoomMetadata`, the DSL should say `setRoomMetadata`.

The design goal is "code determines YAML", not "YAML invents a parallel vocabulary".

## DSL Alignment

The transposer should follow the DSL rules now documented in [`ConversationDSL.md`](/home/rendall/mud/ranviermud/docs/plans/ConversationDSL.md).

Those rules are:

- the exact runtime instruction name should be available in the DSL
- the exact runtime field names should be available in the DSL
- object-bearing fields are authored as symbolic values and resolved during transposition
- some fields may be omitted when the transposition contract defines a safe implicit value from current context
- room-targeting bare ids are current-area relative unless otherwise specified

Examples:

```yaml
- movePlayer:
    toRoom: start

- movePlayer:
    toRoom: "codex:start"

- setRoomMetadata:
    key: bells.rung
    value: true

- setRoomMetadata:
    roomRef: "codex:start"
    key: bells.rung
    value: true
```

This means:

- `toRoom: start` resolves to `<currentAreaId>:start`
- `toRoom: "codex:start"` resolves to that explicit room
- `setRoomMetadata` may target the current room implicitly
- `setRoomMetadata` may target a remote room explicitly with `roomRef`

## Narrow Scope

For now, the transposer only handles two kinds of output:

- mutation ops
- render instructions

It does not:

- execute anything directly
- perform command parsing
- mutate game state on its own
- send output on its own
- own conversation state persistence

Conversation progress persistence stays separate.
That is conversation infrastructure, not an authored effect.

## Canonical Output Targets

The transposer only emits the existing canonical instruction sets.

### Current supported mutation ops

For now, the full supported mutation-op target set is:

- `transferItem`
- `movePlayer`
- `operateDoor`
- `openDoor`
- `closeAndLockDoor`
- `setPlayerMetadata`
- `setRoomMetadata`
- `setAreaMetadata`
- `setWorldMetadata`
- `deleteRoomMetadata`
- `deleteAreaMetadata`
- `deleteWorldMetadata`

These are the existing mutator-backed operations.
This list is expected to grow as real designer needs are discovered and validated.
It is the current supported set, not an intended permanent ceiling.

### Current supported render instructions

For now, the full supported render-instruction target set is:

- `broadcast`
- `semanticEvent`

The `semanticEvent` payload should match the current semantic render contract rather than inventing a second semantic messaging DSL.
The `broadcast` payload should also match the current render contract rather than inventing a second broadcast DSL.

## Context And Resolution

The transposer will need entity and context resolution of its own.

This should not be free-form world search.
It should be explicit context-driven resolution.

The transposer should receive a runtime scope object supplied by the caller.

The exact shape may evolve, but it should be made of explicit bindings such as:

- `player`
- `actor`
- `npc`
- `room`
- `area`
- `inventory`

It should also include enough identity context to support deterministic reference expansion.
For example, current-area-relative room references need access to the current area identity.

Then each effect transposer resolves its authored fields against that explicit scope.

Example:

```yaml
- transferItem:
    item: widget
    from: inventory
    to: player
```

The authored payload is declarative.
The runtime scope is operational.
The transposer resolves:

- `item: widget`
- `from: inventory`
- `to: player`

against the provided context and emits canonical instructions.

This keeps authored data declarative and keeps resolution deterministic.

For room-targeting fields, the transposer should apply this rule:

- bare room ids are current-area relative
- fully qualified refs remain fully explicit

So:

- `toRoom: start` means `toRoom: "<currentAreaId>:start"`
- `roomRef: "codex:start"` means that exact room

Some effects may impose stricter locality rules than the generic resolver does.
Those restrictions should be documented per effect contract rather than hidden in generic resolution behavior.

## Validation

The transposer layer must include a validator.

The validator should be used in two places:

- at runtime
- through the CLI bundle validator

This does not mean both environments have identical power.

Static validation can check:

- each effect entry is an object
- each effect entry has exactly one key
- the effect name is supported
- the payload shape for that effect is structurally valid

Runtime validation can additionally check resolvability:

- symbolic references can be resolved in the provided scope
- resolved targets satisfy the operation contract

Examples:

- `transferItem.from` resolves to a reversible container
- `transferItem.to` resolves to a reversible container
- `movePlayer.toRoom` resolves to a room object
- `setAreaMetadata.actor` resolves to `actor.room.area`

Where possible, static validation should stay structure-focused and runtime validation should stay resolution-focused.
The validator should not pretend to guarantee live-world resolvability in contexts where only structure is knowable.

The validator should not silently coerce bad authored data into something else.
Unsupported or malformed authored effects should fail explicitly.

## Relationship To Existing Runtime Contracts

This design assumes the codebase already has canonical instruction contracts, even though they are not yet written in one clean maintainer-facing contract document.

Right now those contracts are effectively split across:

- mutator typedefs and apply functions
- render-dispatch typedefs and execution paths

That means the transposer should target the existing canonical instruction vocabulary, not invent a parallel one.

This also means the project should eventually write one explicit instruction contract document for maintainers.
That is adjacent to this design, but not required to start the transposer itself.

## First Consumer: Conversation

Conversation is the first intended consumer.

Today, conversation runtime returns authored `transitionEffects` and `stateEntryEffects` as raw data.
Directed speech currently contains a narrow local lowering shim.

That shim should be replaced by this transposer.

The intended flow for conversation-directed speech is:

1. conversation runtime evaluates state and returns authored effects as data
2. the transposer validates and lowers those authored effects
3. directed speech adds any structural conversation progress mutation separately
4. the command returns a normal `{ ok, plan, render }` envelope

This keeps authored effect handling separate from conversation state persistence.

## Future Consumers

This design is intentionally generic enough to be reused by other authored systems later.

Likely future consumers include:

- quest-authored effect data
- narrative-authored effect data
- room-authored behavior DSLs
- item-authored behavior DSLs

The transposer should be generic enough to serve them, but we should only add effect shapes when a real consumer needs them.

## Failure Policy

The transposer should fail explicitly and deterministically.

That means:

- unknown effect name: fail
- malformed payload: fail
- unresolved required reference: fail
- unsupported instruction subset: fail

It should not partially lower one effect and quietly skip the next.

The caller can decide how to surface that failure.
For directed conversation speech, the current player-facing policy is:

- log maintainer-facing error
- fall through to ordinary addressed speech

## Testing Strategy

This design should be tested in layers.

### 1. Transposer contract tests

Add focused unit tests that feed authored effects plus explicit runtime scope into the transposer and assert exact emitted instructions.

These should cover:

- single supported render effect
- single supported mutation effect
- mixed ordered effects
- unknown effect names
- malformed payloads
- unresolved symbolic references
- no partial lowering on failure

### 2. Shared validator tests

Add focused tests for the validator itself.

These should cover:

- single-key object rule
- supported effect names
- unsupported effect names
- per-effect payload shape enforcement
- static structural findings

### 3. Conversation validation tests

Extend conversation definition validation and bundle-validation tests so authored conversation effects are checked through the shared validator.

These should prove:

- valid effect payloads pass
- invalid effect payloads produce bundle findings
- CLI bundle validation sees the same validator output shape

### 4. Directed-speech integration tests

Extend conversation-directed-speech and `say` command tests so a matched conversation route can return transposed mutation ops and render instructions.

These should prove:

- successful transposition into plan/render
- fall-through on no route
- logged failure plus fall-through on bad authored effects

### 5. Full dispatch tests

Add a few end-to-end command-dispatch tests to prove:

- transposed mutation ops commit through the mutator
- transposed render instructions go through render dispatch
- commit still happens before render
- bad transposed ops fail as system errors, not as partial player success

## Recommended Implementation Shape

The implementation should stay mechanical.

It should also be intentionally easy to extend.
Designer needs will emerge over time, and adding a new supported instruction should be straightforward, reviewable, and low-risk.

That means:

- one registry entry or lowering function per supported effect name
- one validator shape per supported effect name
- shared reference-resolution helpers instead of ad hoc resolution logic scattered through effect handlers
- no hidden conversation-only shortcuts in the generic layer
- no broad switch rewrites when adding a single new effect

The desired maintenance story is:

1. add or amend one effect contract
2. add validator coverage for that contract
3. add transposer coverage for that contract
4. add the lowering implementation
5. wire the new capability into the consumer that needs it

This should make it easy to meet emerging designer needs without destabilizing existing authored behavior.

It should probably expose something like:

- a validator for authored effect entries
- a transposer for authored effect entries

The transposer should return canonical structures such as:

```js
{
  ok: true,
  operations: [...],
  renderMessages: [...],
}
```

or a structured failure.

The validator should be reusable by:

- runtime conversation loading and execution
- CLI bundle validation

## Summary

The key decisions in this design are:

- authored effects are single-key objects
- each effect name owns its own payload schema
- YAML shape should match the transposer contract directly
- the DSL should use runtime instruction names and field names directly
- the transposer only emits canonical mutation ops and render instructions
- it resolves references from explicit provided runtime context
- bare room ids should resolve relative to the current area
- some obvious fields may be implicit when the transposition contract says so
- it includes shared validation for both runtime and CLI use
- conversation is the first consumer
- conversation progress persistence remains separate from authored effects
- the implementation should stay mechanical, deterministic, and easy to extend as new designer needs emerge
