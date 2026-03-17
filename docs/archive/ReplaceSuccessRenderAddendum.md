# Replace Success Render Addendum (`renderPolicy.replaceSuccess`)

## Status

- Status: archived
- Scope: bundle-layer command pipeline render behavior (`bundle-rantamuta`)
- Type: spec addendum proposal for review (not yet implemented)
- Intended normative targets:
  - `docs/normative/CommandArchitecture.md`
  - `docs/normative/VirtualDoor.md` (designer-facing door facade guidance reference)

## Summary

Add an explicit Plan-phase render-assembly policy flag so target plan hooks can replace generic command success narration when needed.

Proposed field:

- `renderPolicy.replaceSuccess: true`

Source:

- `planDirect(...)` contribution payload
- `planIndirect(...)` contribution payload

This solves duplicate narration such as:

1. base command success line (`You close the south door.`)
2. facade flavor line (`You fold the shutter leaves inward until the chart seals.`)

## Problem Statement

Current render merge order is additive:

1. command success `render.messages`
2. plan contribution `render.messages`
3. react contribution `render.messages`

This is correct for most hooks, but facade-style authored content needs a principled way to replace generic success lines, not append to them.

## Goals

1. Keep command runtime generic and content-agnostic.
2. Let Plan hooks replace generic success narration when explicitly requested.
3. Preserve deterministic ordering for all remaining rendered output.
4. Keep mutation authority unchanged (render policy only, no state semantics change).

## Non-Goals

1. No per-message selective suppression in v1 (all-or-none only).
2. No React-phase control over base command success rendering.
3. No changes to commit/mutation ordering or rollback behavior.

## Locked Decisions

1. Flag name is `renderPolicy.replaceSuccess`.
2. Granularity is all-or-none suppression of base command success render.
3. Scope is Plan contributions only (`planDirect`, `planIndirect`).
4. If override is requested but no Plan render messages are contributed, runtime must warn with code `RENDER_POLICY_REPLACE_EMPTY` and fall back to base command success render.
5. Explicit empty string messages are valid authored output (not treated as missing).
6. If both direct and indirect request replacement, there is no conflict:
   - base success render is suppressed once
   - direct then indirect Plan render order remains unchanged.

## Proposed Behavioral Contract

Given a successful command result and successful commit:

1. Collect Plan contributions as today.
2. Compute `replaceSuccessRequested` as:
   - `true` if any Plan contribution sets `renderPolicy.replaceSuccess === true`
   - otherwise `false`.
3. Compute Plan-render presence from extracted Plan `render.messages` after standard validation/parsing.
4. Render queue composition:
   - If `replaceSuccessRequested === false`:
     - keep current behavior (command success + Plan + React).
   - If `replaceSuccessRequested === true` and Plan-render presence is non-empty:
     - suppress command success `render.messages`
     - render Plan + React only.
   - If `replaceSuccessRequested === true` and Plan-render presence is empty:
     - log warning code `RENDER_POLICY_REPLACE_EMPTY`
     - fall back to current behavior (command success + Plan + React).

## Payload Shape (proposed)

Plan contribution payload (direct or indirect) may include:

```js
{
  renderPolicy: {
    replaceSuccess: true
  },
  render: {
    messages: [
      // existing line/instruction entries
    ]
  }
}
```

Notes:

1. `replaceSuccess` is opt-in and only meaningful when `=== true`.
2. Missing/false/invalid values are treated as not requested.
3. This is a render-assembly policy surface, not a mutation plan operation.

## Determinism and Compatibility

1. Determinism is preserved:
   - same inputs -> same suppression decision and render ordering.
2. Backward compatibility:
   - existing content without `renderPolicy.replaceSuccess` is unchanged.
3. Phase boundaries:
   - Capture unchanged
   - Plan/React contracts unchanged except this additional Plan render policy signal
   - Commit unchanged
   - Render/Dispatch queue assembly rule extended.

## Classification

This proposal defines a Render/Dispatch assembly rule controlled by a Plan-contributed policy bit. It does not add a new phase, mutation type, veto surface, or React authority.

## Example (facade door)

```js
this.planDirect = (actor, verbId, context) => {
  if (verbId !== 'close') return null;

  return {
    renderPolicy: { replaceSuccess: true },
    render: {
      messages: [
        {
          type: 'semanticEvent',
          templates: {
            actor: 'You fold the shutter leaves inward until the chart seals.',
            others: '{actor.name} folds the shutter leaves inward until the chart seals.',
          },
          // remaining semanticEvent fields...
        }
      ]
    }
  };
};
```

Expected actor output:

1. facade-authored close line
2. no generic `You close the south door.` line

## Test Plan Addendum

Add/adjust tests in `bundles/bundle-rantamuta/tests/command.dispatch.test.js`:

1. Plan contribution with `renderPolicy.replaceSuccess: true` suppresses base command success render.
2. Both direct and indirect request replacement:
   - base render suppressed
   - direct Plan render appears before indirect Plan render.
3. Replacement requested but no Plan render messages:
   - warning logged
   - base command success render preserved.
4. Replacement requested with explicit empty string message:
   - no fallback
   - base command success render suppressed.
5. React cannot request replacement (ignored if present in React payload).

## Suggested Normative Patch Points

`docs/normative/CommandArchitecture.md`:

1. In Render/Dispatch rules, add Plan replacement policy semantics.
2. In Hook Kinds section, clarify this is a Plan-only render policy.

`docs/normative/VirtualDoor.md`:

1. In facade guidance, mention `renderPolicy.replaceSuccess` for replacing generic door success narration.

## Review Questions

1. Should warning message text be standardized now for tooling assertions in addition to code `RENDER_POLICY_REPLACE_EMPTY`?
2. Do we want this contract generalized in wording (all commands) with facade door as example, or documented as door-focused first and generalized later?
