# Semantic Messaging

## Status

- Status: `draft-v1`
- Binding: Proposed (in review)
- Scope: Bundle-layer semantic event rendering and audience dispatch
- Related:
  - [CommandArchitecture.md](CommandArchitecture.md)
  - [EntityResolution.md](EntityResolution.md)

## Purpose

Define a deterministic messaging model where one canonical semantic event is rendered into perspective-correct text for different recipients (actor, target, bystanders) and delivered through the existing command pipeline.

This specification is greenfield. It does not require compatibility with legacy token systems.

## Scope

This document defines:

- semantic event instruction shape
- perspective-aware template language
- render and dispatch ordering
- validation and failure ownership

This document does not define:

- mutation operations
- parser/entity-resolution behavior
- command-specific prose style

## Core Model

Messaging follows three steps:

1. Event formation: command/hook contributes one semantic event payload.
2. Perspective render: renderer produces recipient-specific text from one canonical template.
3. Audience dispatch: dispatcher delivers rendered lines to deterministic recipient sets with de-duplication.

One semantic event is the source of truth for all audience variants.

## Normative Rendering Invariants

The following invariants apply to all semantic-event rendering in v1:

1. One semantic event drives all audience variants for that event dispatch.
2. Audience template overrides may change phrasing, but must preserve semantic meaning and participant roles.
3. If a template references a missing required participant, the event fails with structured diagnostics and is skipped.
4. Semantic-event dispatch must not mutate world state.
5. Recipient set membership/order is frozen before send for that event dispatch.

## Phase Ownership

Semantic messaging is delivery-phase behavior under `Render/Dispatch` (Command Architecture phase 6).

Rules:

- semantic event instructions are data contributions only
- no semantic event delivery occurs before successful commit
- delivery failures are best-effort and do not roll back committed state

## Instruction Contract

v1 adds a post-commit instruction type:

- `type: 'semanticEvent'`

Illustrative shape:

```js
{
  type: 'semanticEvent',
  template: '{actor.you} {verb:wave} to {target.you}.',
  audiencePolicy: 'self_target_and_others',
  participants: {
    actor: { selector: 'currentPlayer' },
    target: { selector: 'entityByContextRole', role: 'indirectTarget' },
    direct: { selector: 'entityByContextRole', role: 'directTarget' },
    indirect: { selector: 'entityByContextRole', role: 'indirectTarget' }
  },
  objectText: {
    direct: 'the bronze clapper'
  }
}
```

Required fields:

- `type`
- `template`
- `audiencePolicy`
- `participants.actor`

Optional fields:

- `participants.target`
- `participants.direct`
- `participants.indirect`
- `objectText`
- audience-specific template overrides (see below)

Participant constraints in v1:

- `participants.actor` is required.
- At most one perspective-differentiated non-actor recipient is supported: `participants.target`.
- `participants.direct` and `participants.indirect` are supported as role/object references, but v1 does not introduce indexed or multi-target audience differentiation.

## Participant Selector Contract (v1)

Selector shape remains object-based in v1, with a closed set of allowed values.

Allowed selectors:

- `{ selector: 'currentPlayer' }`
- `{ selector: 'entityByContextRole', role: 'directTarget' | 'indirectTarget' }`

Rules:

- Unknown selector values are invalid.
- Missing required selector fields are invalid.
- Unknown role names are invalid.
- Invalid participant declarations are rejected as dispatch diagnostics and the semantic event instruction is skipped.

## Audience Policies

v1 supported audience policies:

- `self` (actor only)
- `others` (room bystanders only; excludes actor)
- `self_and_others` (actor + bystanders)
- `self_target_and_others` (actor + target + bystanders excluding actor/target)
- `target_and_others` (target + bystanders; excludes actor)

Recipient set construction and output order must be deterministic.

## Recipient Construction and Ordering (v1)

For a single semantic event instruction:

1. Resolve actor from `participants.actor`.
2. Resolve target from `participants.target` when present.
3. Build the base `others` set from `actor.room.getBroadcastTargets()` in its iteration order.
4. Remove null/invalid recipients.
5. De-duplicate recipients by identity (first occurrence wins).
6. Apply audience-policy exclusions (`self`/`target`) to derive final recipient partitions.

`others` definition in v1:

- `others` means recipients from the actor room broadcast-target set after applying policy exclusions and de-duplication.
- `others` is room-scoped in v1.

Scope extensibility note:

- Future versions may introduce configurable audience roots (for example `area` or explicit room/entity roots).
- Unless and until such roots are declared normatively, `others` remains room-scoped.

Deterministic recipient output order in v1:

1. actor (when included by policy)
2. target (when included by policy and distinct from actor)
3. others in stable `getBroadcastTargets()` iteration order after exclusions/de-dup

## Template Language (Greenfield v1)

v1 template syntax uses explicit named placeholders only.

### Base placeholders

- `{actor}`
- `{target}`
- `{direct}`
- `{indirect}`

Base placeholder defaults in v1:

- `{actor}` is equivalent to `{actor.you}`.
- `{target}` is equivalent to `{target.you}`.
- `{direct}` resolves to `objectText.direct` when provided, otherwise direct participant display label.
- `{indirect}` resolves to `objectText.indirect` when provided, otherwise indirect participant display label.

If a placeholder references a missing participant/object role, render fails for that instruction with diagnostics and the instruction is skipped.

### Perspective variants

- `{actor.you}`
- `{target.you}`
- `{actor.name}`
- `{target.name}`
- `{actor.poss}`
- `{actor.name_poss}`
- `{target.poss}`
- `{target.name_poss}`
- `{actor.refl}`
- `{target.refl}`

Perspective variant behavior in v1:

- `.you` is recipient-relative:
  - resolves to `you` when recipient is that participant
  - otherwise resolves to participant display name
- participant display names in v1:
  - `actor` display name is treated as a proper name and capitalized
  - `target` display name is kind-sensitive:
    - character-like targets (player/NPC shape) => capitalized proper name
    - non-character targets (objects/details) => preserve authored casing
- `.name` resolves to participant display name using the rules above
- `.poss`:
  - resolves to `your` when recipient is that participant
  - otherwise uses participant pronoun possessive when `pronoun` is declared (`he -> his`, `she -> her`, `it -> its`)
  - otherwise falls back by entity kind:
    - character-like entities (player/NPC shape) => name possessive (for example `Bar's`)
    - non-character entities => `its`
- `.name_poss`:
  - always resolves to name possessive form derived from participant display name (for example `Bar's`)
  - does not use recipient-relative `your`
  - does not use pronoun possessive forms
- `.refl`:
  - resolves to `yourself` when recipient is that participant
  - otherwise uses participant pronoun reflexive when `pronoun` is declared (`he -> himself`, `she -> herself`, `it -> itself`)
  - otherwise falls back by entity kind:
    - character-like entities (player/NPC shape) => `themself`
    - non-character entities => `itself`

Placeholder capitalization in v1:

- `actor.*` and `target.*` placeholders support optional title-case token segments to capitalize the resolved token value.
  - examples: `{actor.You}`, `{target.Poss}`, `{target.Name_poss}`
- capitalization is token-local (only that placeholder output is capitalized).
- capitalization does not apply to `{verb:...}` or `{object.*}` tokens in v1.

Supported participant pronouns in v1:

- `he`
- `she`
- `it`

### Verb inflection

- `{verb:<baseVerb>}`
  - example: `{verb:wave}`
  - renderer inflects by recipient perspective and subject role

Verb inflection rules in v1:

1. Subject rule:
  - v1 default grammatical subject is `actor`.
  - if recipient is the subject, verb remains base form.
  - if recipient is not the subject, renderer inflects to third-person singular.
2. Inflection pipeline (deterministic order):
  - explicit irregular dictionary (highest priority)
  - targeted suffix rules
  - deterministic fallback rules
3. Contraction handling:
  - contractions are treated as one lexical unit for inflection (for example `don't`, `aren't`).

v1 explicit irregular dictionary:

- `were -> was`
- `don't -> doesn't`
- `aren't -> isn't`
- `possum -> possums`
- `staff -> staves`
- `die -> dies`
- `barf -> barfs`
- `hum -> hums`

v1 targeted suffix rules (after irregular dictionary):

- if verb ends with `ff`, append `s`
- if verb ends with `penis`, append `es`

v1 deterministic fallback rules (after targeted suffix rules):

- if verb ends with consonant + `y`, replace `y` with `ies`
- if verb ends with `s`, `sh`, `ch`, `x`, or `z`, append `es`
- otherwise append `s`

### Object text slots

- `{object.direct}`
- `{object.indirect}`

Values come from `objectText` in instruction payload.

### Escaping

- `{{` and `}}` represent literal braces.

No other escape forms are supported in v1.

## Audience Template Overrides

The canonical `template` is required.

Optional overrides may be provided for edge phrasing:

- `templates.actor`
- `templates.target`
- `templates.others`

If override is absent, canonical `template` is used.

Override constraints in v1:

- overrides are phrasing-only
- overrides must not change participant graph semantics
- overrides must not introduce new required participants beyond the canonical instruction participant set

## Validation

Two validation points:

1. Instruction validation at enqueue/dispatch boundary.
2. Template validation at first use (or compile-cache load).

Invalid instructions or templates must not crash command execution.

Failure handling:

- log structured error
- skip invalid instruction
- continue remaining post-commit instructions

## Determinism Requirements

For identical committed state and identical instruction payload:

- recipient sets must be identical
- recipient order must be identical
- rendered text per recipient must be identical

Renderer/dispatcher must not use:

- wall-clock time
- randomness
- network/filesystem side effects
- nondeterministic external state

## De-duplication Rules

A recipient appearing in multiple candidate sets receives one message line per semantic event.

Dedup identity is stable player/NPC/entity identity, not display name.

## Failure Ownership and Codes

Failure ownership remains dispatch-layer.

Recommended stable codes for telemetry:

- `SEMANTIC_EVENT_INVALID`
- `SEMANTIC_TEMPLATE_INVALID`
- `SEMANTIC_PARTICIPANT_MISSING`
- `SEMANTIC_AUDIENCE_POLICY_INVALID`
- `SEMANTIC_DISPATCH_FAILED`

These are diagnostics codes. Player-facing fallback messaging remains command/dispatch owned.

## Integration With Existing Post-Commit DSL

`semanticEvent` is additive. Existing `broadcast` instructions remain valid.

Queue ordering:

1. command `postCommit` contributions
2. bubble `postCommit` contributions

Within each contribution list, declaration order is preserved.

## Examples

Canonical event:

```js
{
  type: 'semanticEvent',
  template: '{actor.you} {verb:place} {object.direct} into {target.you}.',
  audiencePolicy: 'self_and_others',
  participants: {
    actor: { selector: 'currentPlayer' },
    target: { selector: 'entityByContextRole', role: 'indirectTarget' }
  },
  objectText: {
    direct: 'the clapper'
  }
}
```

Possible renders:

- actor: `You place the clapper into the reliquary.`
- others: `Rendall places the clapper into the reliquary.`

## Deferred

- richer grammatical operators (articles/plurals/list joins)
- mention-tracking across multi-line events
- template lint CLI
- strict-text compatibility modes
- multi-target indexed participants
