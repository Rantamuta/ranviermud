# Verb Rules And Hooks Contract (Proposed)

## Status

- Status: `proposed`
- Scope: bundle-layer verb execution model (rule matching, target matching, object hooks, and mutation boundaries)
- Related:
  - `docs/normative/CommandInteractionReferenceProfile-v1.md`
  - `docs/normative/ParserPortingInstructions.md`

This document is a proposed normative extension for discussion before implementation hardening.

## Why This Exists

Current verb implementations can drift toward large per-verb scripts that duplicate:

- token normalization,
- span matching,
- validation ordering,
- error classification logic.

That drift conflicts with reference-profile goals: deterministic behavior, stable failure taxonomy, and reusable command architecture.

This contract separates concerns into:

1. rule declaration,
2. shared matching/validation utilities,
3. object-owned semantic hooks,
4. atomic mutation + canonical result envelope.

## Design Principles

- Verbs orchestrate; verbs do not own all game semantics.
- Rule matching is declarative and deterministic.
- Matching utilities are shared across verb families.
- Object affordances are declared by defaults + explicit hooks.
- Hook outcomes are normalized to one machine-assertable envelope shape.
- First failing rule/hook in declared order determines emitted failure.

## Layered Model

Ordered flow for diegetic verbs:

1. Parser provides `intentToken`, spans, and syntax `classification`.
2. Verb rule matcher selects a declared rule variant for the verb family.
3. Shared target matcher resolves spans to world objects using declared scope precedence.
4. Hook validator runs source/target hooks in deterministic order.
5. Executor applies atomic mutation (commit or rollback).
6. Renderer/dispatcher emits audience strings from one semantic event.

## Verb Rule Declaration Contract

Each verb family declares:

- `verbId` (canonical family id),
- `aliases` (alias-first matching remains normative),
- `rules` (ordered),
- `scopeProfile` (ordered primary/secondary search scopes),
- `hookProfile` (ordered hook names to consult),
- `errorCodes` (stable keys).

Example (`put` family, illustrative):

```js
{
  verbId: 'put',
  aliases: ['insert', 'place', 'stuff', 'hide'],
  rules: [
    { id: 'OBS_WRD_OBJ', slots: ['primaryTargetSpan', 'relationToken', 'secondaryTargetSpan'] },
    { id: 'WRD_STR_IN_OBJ', slots: ['amountToken', 'resourceSpan', 'secondaryTargetSpan'], relation: 'in' },
    { id: 'WRD_STR_INTO_OBJ', slots: ['amountToken', 'resourceSpan', 'secondaryTargetSpan'], relation: 'into' }
  ]
}
```

## Shared Matching Utilities Contract

Bundle utilities own reusable mechanics:

- `normalizeInput` (deterministic, no mutation, no output),
- `matchRule` (selects verb rule variant),
- `matchPrimaryTarget` / `matchSecondaryTarget`,
- `resolveRelationToken` (for canonical relation mapping if needed, for example `into -> in`),
- result-envelope helpers.

Per-verb files must not reimplement utility-level normalize/token/match logic.

## Capability Defaults And YAML Contract

Many objects are YAML-defined. Capability defaults are required so hook coverage is not script-only.

Proposed defaults:

- `type: CONTAINER` implies put-receive capable by default.
- non-container types are not put-receive capable by default.

Proposed metadata overrides (illustrative):

```yml
metadata:
  interaction:
    put:
      accepts: true
      relations: [in, into]
      requiresOpen: true
```

If YAML and hook logic conflict, explicit hook result wins.

## Hook Contract

Hooks can be provided by object behavior/script composition and are consulted through a shared adapter.

Proposed hook points for `put`:

- on primary object: `canBePutBy(actor, relationToken, secondaryTarget, context)`
- on secondary object: `canReceivePut(actor, primaryTarget, relationToken, context)`

Optional mutation hooks:

- `beforeReceivePut(...)`
- `afterReceivePut(...)`

### Canonical Hook Return Shape

Allowed hook returns:

- `true` or `undefined` => allow
- `string` => deny (converted to canonical failure object)
- object envelope:
  - `{ ok: true }`
  - `{ ok: false, class, code, message, details }`

All hook returns are normalized to:

```json
{
  "ok": false,
  "class": "forbidden/blocked",
  "code": "PUT_FORBIDDEN_BLOCKED_RULE",
  "message": "The old chest is closed.",
  "details": {
    "intentToken": "put",
    "relationToken": "in",
    "hook": "canReceivePut"
  }
}
```

Strings are convenience-only; canonical object shape is authoritative for tests and logs.

## Validation And Error Precedence

For `put` family, proposed deterministic precedence:

1. parser `semantic error` / `unknown intent`,
2. primary target resolution failure,
3. secondary target resolution failure,
4. primary object precondition hooks,
5. secondary object precondition hooks,
6. capacity/policy checks,
7. mutation execution errors.

First failure in order determines `classification` and `errorEnvelope`.

## Atomic Mutation Contract

`put` execution is atomic at command granularity:

- remove from source and add to destination as one command transaction,
- if destination add fails, source state is restored,
- no success event/message before commit,
- rollback failures must still emit a deterministic failure envelope.

## Example Hook (Illustrative)

```js
function canReceivePut(actor, object, relationToken) {
  if (this.closed) {
    return {
      ok: false,
      class: 'forbidden/blocked',
      code: 'PUT_FORBIDDEN_BLOCKED_CLOSED',
      message: `${this.name} is closed.`,
    };
  }

  if (object.size > this.size) {
    return {
      ok: false,
      class: 'forbidden/blocked',
      code: 'PUT_FORBIDDEN_BLOCKED_SIZE',
      message: `${object.name} will not fit in ${this.name}.`,
    };
  }

  return { ok: true };
}
```

## Test Expectations

Contract-level tests should cover:

- rule-match selection determinism,
- hook invocation order,
- hook return normalization (`true`, `string`, object envelope),
- failure precedence stability,
- atomic rollback on failed destination mutation.

## Open Questions For Maintainer Decision

1. Hook storage model in Ranvier bundle context:
   - direct methods on hydrated objects,
   - behavior-driven adapter,
   - metadata-declared hook bindings.
2. Canonical relation normalization policy:
   - preserve `in` vs `into`,
   - or normalize `into -> in` before hooks.
3. YAML capability schema final names:
   - keep narrow to `put`,
   - or define generalized `interaction` schema for all verbs.
