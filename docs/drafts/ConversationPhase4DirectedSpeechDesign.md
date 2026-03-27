# Conversation Phase 4 Directed Speech Design

## Status

- Status: draft
- Scope: collaboration outline for phase 4 directed event speech integration

## Purpose

This document is a draft design outline for collaboration.

It is not a formal plan.
It does not authorize implementation by itself.
Its purpose is to make the intended shape of phase 4 concrete enough that collaborators can find misalignment before checklist or implementation work begins.

## Problem Statement

Phase 3 delivered the conversation evaluator.

That evaluator can:

- read the current conversation state
- match an authored event
- choose the next state
- return authored effects and entry behavior as data

It does not:

- save the new conversation state
- apply authored effects
- dispatch authored output
- integrate with `say <event> to <npc>`

As a result, the runtime can decide what should happen in a conversation, but it cannot yet carry that decision through the command pipeline as live gameplay behavior.

## Design Goal

Make directed speech the first real executable conversation surface.

Target behavior:

- `say <event> to <npc>` is intercepted only when the addressed NPC has a bound conversation and that conversation can receive the event for the speaking player
- if intercepted, the command advances the conversation for real
- if not intercepted, `say` behaves exactly as it does today

In plain language:

- when the game clearly recognizes directed speech as a conversation choice, it should carry that choice through
- when it does not recognize a conversation route, it should remain ordinary speech

## Scope

### In Scope

- directed speech interception for addressed `say`
- reuse of the existing conversation definition service and evaluator
- persistence of the selected conversation `settledState`
- lowering and execution of only the smallest authored render/effect subset needed for directed-speech bring-up
- explicit failure when a matched conversation route uses authored behavior that phase 4 does not support yet

### Out of Scope

- `talk`
- menu generation
- numeric selection
- engagement invalidation and lifecycle cleanup
- multiplayer visibility policy changes beyond the current `say` surface
- broad DSL expansion
- broad query-surface expansion unless separately approved

## Core Behavior

### Interception Rule

When the player uses:

```text
say <event> to <npc>
```

the runtime should:

1. resolve the NPC normally through the existing `say` command syntax
2. check whether that NPC has a valid bound conversation
3. evaluate the current conversation state for that specific player/NPC pair
4. intercept the command if the current state can receive the exact event, or if an authored hidden `events.default` fallback would handle it
5. otherwise, preserve ordinary `say`

### What Interception Means

If the command is intercepted, it should stop behaving like ordinary speech.

Instead it should:

- evaluate the conversation event through the existing conversation runtime
- save the resulting settled conversation state
- lower and apply only the minimal supported authored subset
- emit the resulting visible output through the normal command render path

### What State Gets Saved

Phase 4 should persist the evaluator's `settledState`, not only the immediate destination state.

Reason:

- phase 3 already defines deterministic `auto` settling
- the saved conversation state should reflect where the machine actually ended after that settling is complete

## Minimal Supported Authored Subset

The first directed-speech bring-up should remain intentionally narrow.

This draft recommends supporting only:

- persisted conversation state update
- NPC reply rendering from returned authored effect data for a very small approved subset
- one initial render effect, likely `messageRoom`

This keeps the first runnable conversation slice simple:

- player says an authored event
- the conversation advances
- the NPC reply is rendered
- the new state is saved

Everything more complex should remain deferred unless collaborators explicitly decide it is required for the first runnable slice.

## Failure Behavior

### No Conversation Route Exists

If the target NPC has no bound conversation, or the current state can receive neither the exact event nor an authored `events.default` fallback:

- do not intercept
- preserve ordinary `say` behavior exactly

### Matched But Unsupported Behavior

If the runtime successfully recognizes a conversation route, but that route requires authored behavior phase 4 does not support yet:

- fail explicitly
- do not silently fall back to normal `say`
- do not mutate conversation progress

Reason:

- silent fallback would hide real runtime/content mismatches
- players and maintainers would see misleading behavior

### Broken Binding

If the NPC declares a conversation but the binding is broken:

- use the existing broken-binding contract
- do not treat the command as ordinary speech
- do not mutate conversation progress

## Recommended Execution Shape

This draft recommends a small command-local integration first rather than a broad dispatcher rewrite.

Preferred shape:

- `say.js` consults a dedicated conversation helper before returning ordinary speech output
- that helper returns either:
  - a no-interception outcome that allows normal `say` to proceed, or
  - a complete command-style result envelope for the conversation path

Why this shape is preferred:

- it is the smallest reversible change
- it keeps phase 4 focused on one command surface
- it avoids introducing a premature generic conversation router inside `command-dispatch.js`

## Proposed File Map

### New File

`bundles/bundle-rantamuta/lib/session/conversation-directed-speech.js`

Responsibilities:

- own directed-speech conversation routing
- load the NPC conversation definition
- call the evaluator
- decide intercept versus fallthrough
- build the mutation plan and render payload for the minimal supported subset
- return a command-style result envelope

### Existing Files Likely Touched

`bundles/bundle-rantamuta/commands/say.js`

- call the directed-speech helper before returning ordinary speech output
- preserve current free-speech behavior when no interception applies

`bundles/bundle-rantamuta/lib/session/conversation-state.js`

- likely reused as-is
- possible small addition only if a convenience helper is needed for saving settled state

`bundles/bundle-rantamuta/lib/session/conversation-definition-service.js`

- likely reused as-is
- possible small helper addition only if command integration needs a cleaner lookup surface

`bundles/bundle-rantamuta/lib/session/conversation-runtime.js`

- likely reused as-is
- touch only if phase 4 uncovers a missing stable output detail needed by the command integration

### Tests Likely Touched Or Added

`bundles/bundle-rantamuta/tests/say.command.test.js`

- command-local interception and fallthrough behavior

`bundles/bundle-rantamuta/tests/command.dispatch.test.js`

- commit and render integration through the full command pipeline

`bundles/bundle-rantamuta/tests/conversation.runtime.test.js`

- only if directed-speech integration reveals evaluator output gaps

`bundles/bundle-rantamuta/tests/conversation.directed-speech.test.js`

- optional focused test file if collaborators prefer to keep phase 4 integration coverage isolated and readable

### Fixture And Content Files Likely Added

`bundles/bundle-rantamuta/areas/test/conversations/directedSpeechBasic.conversation.yml`

- minimal opener and continuation fixture

`bundles/bundle-rantamuta/areas/test/conversations/directedSpeechDefault.conversation.yml`

- fixture proving `events.default` interception

`bundles/bundle-rantamuta/areas/test/conversations/directedSpeechUnsupportedEffect.conversation.yml`

- fixture proving explicit failure for matched but unsupported authored behavior

`bundles/bundle-rantamuta/areas/test/npcs.yml`

- add one or more clean conversation test NPCs without unrelated harness behavior

## Open Questions

- Should phase 4 support only `messageRoom`, or also one actor-private render form?
- Should intercepted directed speech preserve the player's ordinary spoken line, or should phase 4 initially render only the NPC reply?
- Should phase 4 log maintainer-facing diagnostics when a matched route uses unsupported authored effects, and if so what shape should that logging take?
- Should phase 4 use fresh test fixtures and test NPCs rather than extending `actorPlanner`, which already carries unrelated harness behavior?

## Recommendation

This draft recommends:

- keep phase 4 narrow
- integrate through `say.js` using a dedicated helper
- persist `settledState`
- support one tiny authored render subset first
- fail clearly on unsupported matched behavior
- use fresh test fixtures and clean test NPCs rather than overloading existing harness content

## Notes

This document is intentionally a design outline rather than a formal plan.

If collaborators agree with its overall direction, the next step should be to turn the approved parts into a formal plan with explicit scope, acceptance criteria, validation strategy, and traceable implementation surfaces.
