# Entity React Hooks Discussion Stub

## Status

- Status: `stub`
- Scope: future discussion of entity-scoped React hooks such as `reactDirect` and `reactIndirect` and `reactActor`
- Binding: no

## Purpose

Capture the current state of entity reaction handling so we do not accidentally assume `reactDirect` or `reactIndirect` already exist in runtime.

This is not an implementation plan. It is a reminder to revisit the design deliberately if we want entity-scoped React hooks later.

## Current State

`reactDirect` and `reactIndirect` and `reactActor` are not implemented in runtime today.

The current normative command architecture mentions them only as accepted-next names:

- `reactActor(actor, verbId, context)`
- `reactDirect(actor, verbId, context)`
- `reactIndirect(actor, verbId, relationTokenCanonical, context)`

The normative note says these names are "not wired in current runtime".

## What Runtime Actually Does Today

React is currently command-scoped, not entity-scoped.

In the current runtime:

- React contributions are discovered only from command metadata `reactions`.
- `metadata.reactions` may be:
  - an array of functions, or
  - a factory function `(context) => function[]`
- Each reaction function is invoked with phase `context`.
- Reaction contributions may add only `render.messages`.
- Reaction contributions may not:
  - veto
  - add mutation operations
  - set `renderPolicy.replaceSuccess`

So an entity does not currently "react" by runtime checking `directTarget.reactDirect(...)` or `indirectTarget.reactIndirect(...)`.

## How Entities Influence Reaction Today

Entities can influence React only indirectly through command-owned reaction functions.

That means a command-level reaction function may inspect:

- `context.entityResolution.directTarget`
- `context.entityResolution.indirectTarget`
- actor, room, area, quest, or other world state reachable from `context`

Then that command-level reaction function may decide what `render.messages` to contribute.

This keeps React command-attached in the current implementation even when the reaction logic depends on entity state.

## Contrast With Capture and Plan

This differs from the current Capture and Plan hook models.

Today, runtime directly discovers entity hooks on the resolved object instance for:

- `canDirect(actor, verbId, context)`
- `canIndirect(actor, verbId, relationTokenCanonical, context)`
- `planDirect(actor, verbId, context)`
- `planIndirect(actor, verbId, relationTokenCanonical, context)`

Those hooks are object-attached and runtime-discovered on resolved entities.

React does not currently follow that pattern.

## Why This Matters

It is easy to assume symmetry across phases:

- Capture has entity hooks.
- Plan has entity hooks.
- Therefore React might also have entity hooks.

That symmetry does not exist yet in implementation.

If we want entity-scoped React hooks in the future, we should discuss them explicitly rather than treating them as already available.

## Questions For Future Discussion

- Should React remain command-scoped, with commands inspecting entity state through `context`?
- Should runtime eventually support object-attached entity hooks such as `reactDirect` and `reactIndirect`?
- If added, should runtime discovery mirror current Capture/Plan hook discovery on resolved objects?
- Should actor-scoped React also be considered at the same time, or deferred separately?
- How would entity-scoped React interact with current command metadata `reactions` ordering and merge rules?
- Should any future entity React surface remain render-only, or would there be pressure to let it influence plan/render assembly in ways that blur current phase boundaries?

## Constraints For Any Future Design

Any future React-hook design should preserve current command architecture constraints:

- no veto in React
- no direct mutation in React
- no direct audience output in React
- deterministic results for identical input and state
- clear ordering relative to command success render and Plan contributions

It should also preserve runtime/content layering:

- runtime behavior in `lib/**` and `commands/**`
- authored content behavior in `areas/**`

## Relevant References

- `docs/normative/CommandArchitecture.md`
- `bundles/bundle-rantamuta/lib/session/command-dispatch.js`
- `docs/plans/actorCommandArchitecturePlan.md`
