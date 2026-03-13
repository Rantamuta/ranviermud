# Actor Command Architecture Plan

## Status

- Status: `draft-v1`
- Scope: bundle-layer command execution flow in `bundle-rantamuta`, limited to adding `canActor` and `planActor` alongside the current command architecture

## Goal

Add actor-level `canActor` and `planActor` hook surfaces that fit the existing command pipeline without replacing current command metadata gating or other existing plan surfaces.

## Intent

An acting entity should be able to contribute to command handling in two narrow, phase-correct ways:

- During Capture, `canActor` may explicitly allow, deny, or make no decision about whether the actor may attempt a verb.
- During Plan, `planActor` may contribute plan operations and render messages using the same data-only rules already used by `planDirect` and `planIndirect`.

This change should layer cleanly into the current command architecture rather than redesign it.

## In Scope

- Update `docs/normative/CommandArchitecture.md` to define `canActor` and `planActor`.
- Add runtime support in `bundles/bundle-rantamuta/lib/session/command-dispatch.js` for:
  - `canActor(actor, verbId, context)` during Capture
  - `planActor(actor, verbId, context)` during Plan
- Keep `metadata.actorKindsAllowed` in place as an existing canonical Capture mechanism.
- Define precedence and merge behavior so the new hooks coexist with:
  - `metadata.actorKindsAllowed`
  - `captureChecks`
  - ordered capture subject policy hooks
  - `planDirect`
  - `planIndirect`
  - command metadata `reactions`
- Add focused test coverage in `bundles/bundle-rantamuta/tests`.
- Include discussion and planned authored coverage in:
  - `bundles/bundle-rantamuta/areas/test`
  - `bundles/bundle-rantamuta/areas/codex`

## Out of Scope

- Removing or deprecating `metadata.actorKindsAllowed`
- Replacing or redesigning `setplayermetadata`
- Adding or wiring `reactActor`, `reactDirect`, or `reactIndirect`; future discussion lives in `docs/drafts/EntityReactHooksDiscussionStub.md`
- Parser changes
- Engine/core changes under `Rantamuta/core`
- Scheduler, queueing, or broader NPC action redesign
- Renaming existing `target*` runtime identifiers beyond what is strictly necessary for the new hooks

## Constraints

- Preserve current phase boundaries from `docs/normative/CommandArchitecture.md`:
  - Capture is veto/policy only
  - Plan is data-only
  - Commit is the only mutation phase
  - Render/Dispatch is the only audience-output phase
- Preserve deterministic behavior for identical input and state.
- Preserve runtime/content layering:
  - runtime in `lib/**` and `commands/**`
  - authored behavior in `areas/**`

## Implementation Surfaces

- `docs/normative/CommandArchitecture.md`
- `docs/drafts/CanActorCaptureGateProposal.md`
- `bundles/bundle-rantamuta/lib/session/command-dispatch.js`
- `docs/normative/NpcActionArchitecture.md` if cross-references need alignment
- Dispatcher tests and authored coverage under `bundles/bundle-rantamuta/tests`
- Authored examples in `bundles/bundle-rantamuta/areas/test` and `bundles/bundle-rantamuta/areas/codex`

## Proposed Behavior

### `canActor`

Use the proposal's Capture ordering:

1. `canActor(actor, verbId, context)` explicit decision
2. command metadata gate `metadata.actorKindsAllowed`
3. command-level `captureChecks`
4. existing ordered entity policy checks

`canActor` remains additive. Existing commands that only use `metadata.actorKindsAllowed` remain valid.

Runtime discovery should mirror the current direct/indirect Capture-hook model:

- runtime checks whether `canActor` exists as a function on the actor object itself
- if present, runtime invokes `actor.canActor(actor, verbId, context)`
- no separate adapter or registry layer is introduced for `canActor` in this change
- `canActor` executes in Capture only and is not introduced as a callable surface in Plan, React, Commit, or Render

`canActor` policy return handling should match the proposal's normalization model:

- allow: `true`, `'allow'`, `{ ok: true }`, `{ allow: true }`
- deny: `false`, `'deny'`, deny message string, `{ ok: false, ... }`, `{ allow: false, ... }`
- no decision: `undefined`, `null`, or unrecognized values

On deny, the normalized failure envelope should remain:

```js
{
  ok: false,
  error: {
    code: 'ACTOR_KIND_FORBIDDEN',
    message?: 'Optional override',
    details?: { actorKind, verbId, ... }
  }
}
```

This preserves compatibility with the current actor-kind failure category and message mapping.

`canActor` should preserve the same deterministic and side-effect-free Capture constraints already applied to other policy hooks:

- no world mutation
- no audience output
- no reads from external nondeterministic sources
- identical input and state produce identical outcomes

### `planActor`

Add an additive actor-level Plan contribution surface:

- `planActor(actor, verbId, context)`

Runtime discovery should mirror the current target-hook model:

- runtime checks whether `planActor` exists as a function on the actor object itself
- if present, runtime invokes `actor.planActor(actor, verbId, context)`
- no separate adapter or registry layer is introduced for `planActor` in this change

Return handling should match current plan contribution behavior:

- `null` / `undefined` => no contribution
- failure envelope => fail before Commit
- success envelope => merge accepted fields
- plain contribution object => merge accepted fields

Accepted fields:

- `plan.operations`
- `render.messages`
- `renderPolicy.replaceSuccess`

Planned merge order:

1. base command result
2. `planActor`
3. `planDirect`
4. `planIndirect`

This keeps actor contribution explicit while preserving current target contribution ordering relative to one another.

`planActor` should join the same downstream Plan flow as existing target contributions:

- `planActor.plan.operations` are appended into the same merged Commit plan used by `planDirect` and `planIndirect`
- `planActor.render.messages` participate in the same deterministic Render/Dispatch assembly used for other Plan contributions
- `planActor` may request `renderPolicy.replaceSuccess` under the same safety fallback rules already used for target Plan contributions

## Tests

- Dispatcher contract tests for `canActor`:
  - allow / deny / no-decision normalization
  - precedence against `metadata.actorKindsAllowed`
  - deterministic behavior
- Dispatcher contract tests for `planActor`:
  - merge ordering
  - failure behavior
  - render replacement behavior
  - interaction with `planDirect` / `planIndirect`
- `areas/test` should get a deterministic authored harness that demonstrates `canActor` and `planActor` through loaded content.
- `areas/codex` should get a Codex-authored illustration that shows how an authored NPC or item uses one or both of the new hooks in real bundle content.

## Acceptance Criteria

- `docs/normative/CommandArchitecture.md` normatively defines `canActor` as an additive Capture hook alongside `metadata.actorKindsAllowed`.
- `docs/normative/CommandArchitecture.md` normatively defines `planActor` as an additive Plan contribution hook alongside `planDirect` and `planIndirect`.
- `canActor` deny results normalize to `ACTOR_KIND_FORBIDDEN` with the current failure-envelope shape.
- Runtime dispatch supports both hooks with deterministic phase-correct behavior.
- Existing `metadata.actorKindsAllowed` behavior remains intact.
- Existing commands that rely on `metadata.actorKindsAllowed` continue to work unchanged.
- Test coverage exists for dispatcher-level precedence, normalization, ordering, and failure behavior.
- The plan explicitly includes authored test coverage in `bundles/bundle-rantamuta/areas/test`.
- The plan explicitly includes a Codex-authored example in `bundles/bundle-rantamuta/areas/codex`.

## Validation Strategy

- Unit/contract evidence:
  - dispatcher tests for `canActor` and `planActor`
  - pass when hook discovery, normalization, precedence, merge ordering, and failure behavior match this plan
- Integration/smoke evidence:
  - authored harness coverage in `areas/test`
  - authored illustration coverage in `areas/codex`
  - pass when authored content exercises the new actor hooks through the normal bundle/runtime path
- Repo validation:
  - `npm test`
  - `npm run ci:local`
  - pass when both commands complete successfully for the change set

## Deferred

- Any migration away from `metadata.actorKindsAllowed`
- Any migration away from `setplayermetadata`
- Any actor- or entity-scoped React hook design, including `reactActor`, `reactDirect`, and `reactIndirect`
- Any broader actor-policy redesign beyond `canActor`
- Any broader actor-plan redesign beyond `planActor`
