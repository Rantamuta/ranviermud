# Entity Resolution

## Status

- Status: `proposed-v1`
- Binding: No (in review)

## Purpose

Define how the engine identifies and binds concrete targets for diegetic commands.

## Scope

Specifies entity resolution behavior for bundle-layer diegetic verbs from parsed command artifact through concrete role binding, including scope search, disambiguation, and resolver-owned failures.

## Purity Requirement

Entity Resolution is a read-only phase. Policy veto hooks run in Capture, not Entity Resolution.

It must not:

- mutate world state
- invoke mutation or reaction hooks
- emit player-visible output
- perform external side effects (I/O, timers, network)

Policy veto hooks run in Capture, not Entity Resolution.

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
  - `indirect` (relation token + indirect target, no direct target). Example: "sing to the baby".
  - `directIndirect` (direct + indirect roles). Example: "sing a lullaby to the baby".
  - `relationOnly` (relation token required, no direct or indirect target roles). Example: "keep off".
- A verb declaration can provide any or all of the rule keys, but it must provide at least one.
- Declaring zero rules is a command-load (`compile-time`) error.
- Relation acceptance is rule-specific.
- Relation-bearing rule keys must declare a non-empty `acceptedRelations` array:
  - `indirect`
  - `directIndirect`
  - `relationOnly`
- Missing rule-level `acceptedRelations` for a relation-bearing rule is a command-load (`compile-time`) error.

Runtime form-matching implications:

- Unsupported input shape for a declared verb returns form failure.
- Missing required role span returns form failure.
- Relation token not present in the selected rule's `acceptedRelations` returns form failure.

Recommended runtime codes:

- `FORM_NOT_SUPPORTED`
- `MISSING_REQUIRED_ROLE`
- `UNSUPPORTED_RELATION`

### Relation Normalization

Relation handling is locked in v1:

- Entity Resolution must preserve the raw relation token as typed by the actor (`relationTokenRaw`).
- Entity Resolution must also produce a canonical relation token for logic (`relationTokenCanonical`).
- Rule validation, scope logic, hooks, planner logic, and semantic event identity use `relationTokenCanonical`.
- Renderer text may use `relationTokenRaw` where strict-text/user wording fidelity requires it.

Human note:

Treating `in` and `into` as distinct semantic relationships can create unintended divergence where "put x in y" and "put x into y" behave differently. Canonicalization prevents that divergence while preserving actor-authored wording for output.

### Intransitive offramp

If the selected verb rule is `intransitive` and the input satisfies that rule, Entity Resolution succeeds immediately with an empty binding set. No scope search, role binding, or object disambiguation is performed, and command flow continues to Capture/Target using the intransitive resolution result.

### Scope Declaration

- Scope must be declared per role, not as one combined list.
- v1 recommended shape:
  - `scopeProfile.direct = [...]`
  - `scopeProfile.indirect = [...]`
- Resolver must search only declared scopes, in declared order.
- Resolver must remain deterministic for identical input/state.
- Verbs may define scope profiles at declaration time (including rule-specific variations).
- Runtime verb handlers must not override scope resolution or bypass shared resolver scope logic.

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
- bound: `{ directTarget, indirectTarget?, relationTokenRaw?, relationTokenCanonical? }`

### Disambiguation

- Disambiguation runs after candidate matching when more than one candidate remains for a required role.
- Outcomes:
  - exactly one candidate: bind and continue
  - zero candidates: role not-found failure
  - multiple candidates: ambiguous failure unless an explicit interchangeable policy applies
- v1 default policy for multiple candidates is ambiguous failure.
- Optional convenience policy may allow first-pick only when all matching candidates are declared interchangeable.

Canonical candidate ordering must be deterministic. v1 tie-break sequence:

1. scope order
2. match score
3. declaration/enumeration order within scope
4. UUID lexical order

This ordering defines the canonical candidate list for prompts, diagnostics, and optional first-pick policies.
If ambiguity policy is active, resolver still returns `AMBIGUOUS_TARGET`; it does not auto-bind solely because deterministic ordering exists.

Recommended optional metadata for ambiguous-prompt quality:

- `metadata.resolution.disambiguationLabel: string`
  - Human-readable label used in "which one?" prompts.
  - Does not affect matching eligibility.
- `metadata.resolution.descriptors: string[]`
  - Optional descriptors used to generate comparative prompt text when labels are absent.
- `metadata.resolution.interchangeable: boolean`
  - Declares candidate as interchangeable for optional first-pick convenience policies.

Prompt generation preference:

1. `disambiguationLabel` (if present)
2. descriptor-based comparative phrase
3. fallback to normalized display name

Authoring guidance:

- Keep `keywords` focused on stable lookup nouns/aliases.
- Avoid using `keywords` for decorative adjective prose when possible.
- Use resolution metadata for human-facing disambiguation wording.

Examples:

- Ambiguous by default:
  - Input: "get envelope"
  - Matches: two envelopes
  - Result: ambiguous failure (`code: AMBIGUOUS_TARGET`)
- Label-driven prompt:
  - Candidate A label: "large, green envelope"
  - Candidate B label: "large, blue envelope"
  - Prompt: "Which envelope do you mean: large, green envelope or large, blue envelope?"
- Optional interchangeable first-pick:
  - All matching candidates have `metadata.resolution.interchangeable: true`
  - Policy allows convenience pick
  - Result: first deterministic candidate binds without ambiguity prompt

### Failure Classification

Failure classification defines stable resolver-owned failure codes for target-resolution outcomes.

Goals:

- deterministic behavior across identical input/state
- consistent testing surfaces
- clear phase ownership boundaries

Resolver should emit the most specific failure code available. `FORM_NOT_SUPPORTED` is the generic fallback when a more precise code cannot be determined.

Recommended v1 resolver-owned codes:

- Form/rule failures:
  - `FORM_NOT_SUPPORTED`
  - `FORM_DIRECT_NOT_SUPPORTED`
  - `FORM_INDIRECT_NOT_SUPPORTED`
  - `FORM_MISSING_DIRECT`
  - `FORM_MISSING_INDIRECT`
  - `FORM_MISSING_RELATION`
  - `FORM_UNSUPPORTED_RELATION`
- Binding/disambiguation failures:
  - `TARGET_NOT_FOUND`
  - `AMBIGUOUS_TARGET`

Illustrative example:

- Input: "sing a song"
- Verb rules: `intransitive` only
- Resolver output:
  - preferred code: `FORM_DIRECT_NOT_SUPPORTED`
  - fallback code (if needed): `FORM_NOT_SUPPORTED`

Phase ownership note:

- Entity Resolution owns form/scope/binding/disambiguation failures.
- Capture owns policy veto failures.
- Target phase owns verb-planner feasibility failures after successful binding.

## Integration Points

- Receive Input -> Entity Resolution
  - Consumes parsed artifact, selected verb/rule context, and actor/session context.
- Command module declaration -> Entity Resolution
  - Rule forms, relation policy, and scope profiles are declared with the command for developer ergonomics.
- Helper layer -> Entity Resolution
  - Resolution code should use explicit helper functions for world reads and matching.
  - Prefer helper calls (for example `getPlayerInventory(...)`) over ad hoc deep `gameState` traversal.
- World data access -> Entity Resolution
  - Read-only candidate retrieval from inventories, rooms, containers, and permitted scopes.
- Entity Resolution -> Capture
  - Exports bound context (`directTarget`, `indirectTarget?`, `relationTokenRaw?`, `relationTokenCanonical?`, metadata) to capture checks.
  - Recommended check contract:
    - `CaptureCheck(boundContext) -> { ok: true } | { ok: false, vetoInfo }`
  - Capture evaluates checks in declared order and stops at first veto.
- Entity Resolution -> Target (planner)
  - Success path: pass bound context into command planner.
  - Failure path: return structured resolver failure envelope.
- Non-boundaries
  - Entity Resolution must not invoke policy-veto hooks directly.
  - Enforce the [Purity Requirement](#purity-requirement)
- Observability (optional)
  - May emit diagnostic traces (selected rule, searched scopes, candidate sets, ranking decisions).
  - Diagnostics are non-normative to gameplay behavior.

## Open Questions

- Command declaration shape: should rule declarations be keyed objects or ordered rule arrays?
- Selector support in v1: do we support explicit selectors such as `2.sword` now or defer?
- Nested scope traversal policy: what are the depth limits and deterministic traversal order for nested containers?
- Interchangeable auto-pick policy: is convenience first-pick disabled by default and enabled only by explicit policy, or enabled by default when all matches are interchangeable?
- Failure message ownership: should Entity Resolution emit default player-facing message text, or only `code/details` with renderer-owned text mapping?
