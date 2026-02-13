# Target Resolution

## Status

- Status: `proposed-v1`
- Binding: No (in review)

## Purpose

Define how the engine identifies and binds concrete targets for diegetic commands.

## Scope

Specifies target resolution behavior for bundle-layer diegetic verbs from parsed command artifact through concrete role binding, including scope search, disambiguation, and resolver-owned failures.

## Inputs

- Actor context (player/session identity).
- Parsed command artifact (`intentToken`, role spans, relation token, normalized input).
- Verb/command rule declaration (expected form and target roles).
- Scope policy per role (declared search spaces and precedence).
- Current world context (room, area, and relevant environment references).
- Candidate collections (player inventory, room contents, other permitted inventories/containers, including nested items when enabled by scope policy).
- Candidate metadata for matching (names, aliases, keywords, qualifiers).
- Normalization and ignore-token policy used by matching.
- Optional selector tokens (for example explicit numeric selectors), when supported.
- Resolver options/profile flags (for example strictness and compatibility mode).

## Outputs

- Success output:
  - `directTarget` (required when verb form requires a direct role)
  - `indirectTarget` (optional, only when verb form requires an indirect role)
- Failure output:
  - no target bindings
  - resolver message/failure payload explaining why binding failed
- v1 target count assumption:
  - at most two concrete targets (`directTarget`, `indirectTarget`)
  - higher-arity target sets are deferred to a later version

## Phase Responsibilities

### Form Matching

- Form matching consumes parsed artifact fields and the selected verb family/rules.
- It must deterministically decide whether the parsed shape is valid for resolution.
- Invalid form must return a structured failure payload (code/details), not only ad hoc text.
- v1 recommended failure shape:
  - `{ ok: false, code, details, message? }`
- Successful form match returns a rule-selected artifact for resolution.
- v1 recommended success shape:
  - `{ ok: true, ruleId, directSpan?, relationToken?, indirectSpan? }`

Form matching owns syntax/shape failures such as missing required spans for a selected rule.

#### v1 Verb Rule Set

- Allowed rule keys:
  - `intransitive` (no target roles). Example: "sing".
  - `direct` (direct role only). Example: "sing a lullaby".
  - `indirect` (indirect role only). Example: "sing to the baby".
  - `directIndirect` (direct + indirect roles). Example: "sing a lullaby to the baby".
  - `relationOnly` (relation token required, no direct or indirect target roles). Example: "keep off".
  - `relationIndirect` (relation token + indirect target, no direct target). Example: "drink from the river".
- A verb declaration can provide any or all of the rule keys, but it must provide at least one.
- Declaring zero rules is a command-load (`compile-time`) error.
- Relation acceptance is rule-specific.
- Relation-bearing rule keys must declare a non-empty `acceptedRelations` array:
  - `indirect`
  - `directIndirect`
  - `relationOnly`
  - `relationIndirect`
- Missing rule-level `acceptedRelations` for a relation-bearing rule is a command-load (`compile-time`) error.

Runtime form-matching implications:

- Unsupported input shape for a declared verb returns form failure.
- Missing required role span returns form failure.
- Relation token not present in the selected rule's `acceptedRelations` returns form failure.

Recommended runtime codes:

- `FORM_NOT_SUPPORTED`
- `MISSING_REQUIRED_ROLE`
- `UNSUPPORTED_RELATION`

### Intransitive offramp

If the selected verb rule is `intransitive` and the input satisfies that rule, Target Resolution succeeds immediately with an empty binding set. No scope search, role binding, or object disambiguation is performed, and command flow continues to Capture/Target using the intransitive resolution result.

### Scope Declaration

- Scope must be declared per role, not as one combined list.
- v1 recommended shape:
  - `scopeProfile.direct = [...]`
  - `scopeProfile.indirect = [...]`
- Resolver must search only declared scopes, in declared order.
- Resolver must remain deterministic for identical input/state.

Optional diagnostic lookups may exist for more helpful messaging, but they must not change successful binding semantics.

Illustrative examples:

- `put`: direct typically prefers player-held scopes; indirect typically prefers room/container scopes.
- `get`: direct typically prefers room/container scopes before already-held scope checks.

### Role Binding

- Role binding maps parsed role spans to concrete world entities.
- Binding is rule-driven per verb: not all verbs require all roles.
- v1 role model:
  - `direct` role maps to `directTarget`
  - `indirect` role maps to `indirectTarget` when required by the selected rule
- Required roles must bind to exactly one concrete entity.
- Optional roles may remain unbound when omitted by a valid rule form.
- Binding output is either:
  - successful role bindings (`directTarget`, optional `indirectTarget`), or
  - structured binding failure payload.

Illustrative shape:

- parsed: `intentToken + directSpan + relationToken + indirectSpan`
- bound: `{ directTarget, indirectTarget?, relationToken? }`

### Disambiguation

### Failure Classification

## Integration Points

## Open Questions
