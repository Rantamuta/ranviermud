# Entity Resolution

## Status

- Authority: normative
- Binding: Yes
- Related:
  - [CommandArchitecture.md](CommandArchitecture.md)

## Purpose

Define the linked `Parsing and Entity Resolution` step for bundle-layer diegetic commands.

This step establishes command meaning by matching verb-local syntax rules and resolving any entity-bearing slots into concrete references before later command phases run.

## Scope

Specifies bundle-layer interpretation behavior from:

- exact verb-key resolution output from `Receive Input`
- ordered syntax-rule matching against the post-verb token stream
- entity-bearing slot interpretation and disambiguation
- production of either:
  - a final interpretation artifact, or
  - a structured ambiguity artifact

## Purity Requirement

Parsing and Entity Resolution is a read-only phase.

It must not:

- mutate world state
- invoke mutation, plan, or reaction hooks
- emit player-visible output
- perform external side effects (I/O, timers, network)

Policy veto hooks run in Capture, not in Parsing and Entity Resolution.

## Inputs

- Actor context (player or NPC/session identity)
- Intake artifact from `Receive Input`:
  - `actorInput`
  - `canonicalInput`
  - tokenized or lexed canonical input
  - resolved exact verb key
- Ordered syntax rules declared for the resolved verb
- Current world context (room, area, relevant environment references)
- Scope policy and resolver support data used by entity-bearing slots
- Candidate metadata for matching (names, aliases, keywords, qualifiers, visible resolution labels when applicable)

## Outputs

Parsing and Entity Resolution produces exactly one of:

- final interpretation artifact
- structured ambiguity artifact
- interpretation failure (no selected rule)

Higher-arity target sets remain deferred. The initial downstream semantic-role model remains limited to actor, direct, and indirect participation, plus non-entity positional slot captures.

## Syntax Declaration Model

The normative command-shape model is verb-local ordered syntax strings.

Rules:

- Each verb declares an ordered `syntaxRules` array.
- Rule priority is declaration order only.
- Keyed rule-form objects such as `intransitive`, `direct`, `indirect`, and `directIndirect` are no longer normative for command-shape declaration.
- `(empty)` is supported as author shorthand for a zero-atom rule.
- All rules require full post-verb token consumption to match.

Illustrative examples:

- `TEXT`
- `TEXT to LIVING`
- `ENTITY in ENTITY`
- `ENTITY with ENTITY`
- `EXIT`

## Slot Model

Initial supported slot kinds:

- `TEXT`
- `WORD`
- `NUMBER`
- `ENTITY`
- `LIVING`
- `EXIT`

Slot behavior:

- `WORD`
  - fixed-width, one token
- `NUMBER`
  - fixed-width, one token, must parse as a valid number under the implementation's accepted numeric format
- `TEXT`
  - variable-width opaque span
- `ENTITY`
  - variable-width entity-bearing span resolved through the shared resolver
- `LIVING`
  - entity-bearing slot kind that behaves like `ENTITY` but is restricted to character-like entities
  - in the current runtime this restriction is implemented by requiring `.isNpc === true`
  - due to current driver behavior, this includes both NPC entities and player-character entities
- `EXIT`
  - entity-bearing slot kind resolved through `room.exits`

Entity-bearing slots are span-based rather than single-token placeholders.

## Matching Model

Parsing and Entity Resolution uses recursive backtracking.

Rules:

- compiled syntax rules are evaluated strictly in declaration order
- a rule is viable only if it consumes the entire post-verb token stream
- matching proceeds left-to-right and recursively
- literal atoms must match canonicalized tokens in exact sequence
- fixed-width slots (`WORD`, `NUMBER`) consume one token
- variable-width slots (`TEXT`, `ENTITY`, `LIVING`, `EXIT`) must try candidate spans greedily from longest to shortest and backtrack as needed to satisfy later atoms
- entity-bearing slots participate in rule viability during matching; they are not deferred to a detached post-pass
- no hidden weighting, precedence, or global relation-word inference is allowed

### Rule Evaluation Outcomes

Each evaluated rule ends in exactly one of:

- `success`
  - the rule matches structurally
  - the full post-verb token stream is consumed
  - every required entity-bearing slot is uniquely resolved
  - all rule-local semantic checks pass
- `ambiguous`
  - the rule matches structurally
  - the full post-verb token stream is consumed
  - no required entity-bearing slot is missing
  - one or more required entity-bearing slots remain ambiguous
  - all non-ambiguity rule-local checks pass
- `nonViable`
  - the rule fails structural matching, or
  - the rule leaves unmatched post-verb tokens, or
  - one or more required entity-bearing slots are missing, or
  - a required fixed-width slot fails its slot contract, or
  - a required rule-local semantic check fails

`nonViable` remains the top-level outcome class, but implementations may preserve more specific underlying entity-bearing failure reasons for diagnostics or tooling, such as `ENTITY_SLOT_MISSING` or `ENTITY_SLOT_NO_VIABLE_BINDING`.

### Rule Selection Algorithm

The matcher selects rules as follows:

1. evaluate rules in declaration order
2. ignore rules that end as `nonViable`
3. return a final interpretation artifact for the first rule that ends as `success`
4. return a structured ambiguity artifact for the first rule that ends as `ambiguous`
5. do not continue to later rules once an earlier rule yields `success` or `ambiguous`

This means an earlier ambiguous rule blocks later fallback rules.

## Entity-Bearing Slot Interpretation

Entity-bearing slots are interpreted during matching with tri-state results:

- `resolved`
  - exactly one viable candidate remains after normal resolver filtering and deterministic ranking
- `missing`
  - no viable candidates remain
- `ambiguous`
  - more than one viable candidate remains and no deterministic single-winner rule applies

A rule with any missing required entity-bearing slot is `nonViable`.

A rule with one or more ambiguous required entity-bearing slots may yield `ambiguous`, but only if the rule is otherwise structurally complete and has no missing required entity-bearing slots.

Resolver/output separation remains intact:

- entity resolution emits structured ambiguity data only
- it does not assemble player-facing clarification text
- dispatch or command error-message mapping owns clarification output later in the pipeline

## Scope Policy and Resolver Sources

Entity-bearing slots resolve through declared deterministic scope policy.

Requirements:

- resolver search order must be explicit and deterministic
- successful binding semantics must not depend on incidental iteration order
- runtime command handlers must not bypass shared resolver scope logic

Standard resolver scope sources currently supported by shared helpers:

- `player.inventory`
- `room.items`
- `room.npcs`
- `room.details`
- `room.exits`

Standard slot-kind expectations:

- `EXIT` resolves from `room.exits`
- `LIVING` resolves under the same shared resolver contract as `ENTITY`, with the additional character-like constraint described above

Optional diagnostic lookups may exist for clearer messaging, but they must not change successful binding semantics.

### Nested Traversal Policy

- nested traversal is bounded; unbounded traversal is not allowed
- maximum traversal depth is finite and configuration-driven
- traversal order must be deterministic and breadth-first by depth level
- cycle protection is required
- reachability and usability checks remain later-phase responsibilities, not resolver responsibilities

Traversal order is:

1. declared scope order
2. depth level (shallow to deep)
3. declaration or enumeration order within scope level
4. UUID lexical order

## Downstream Role Mapping

Entity-bearing slots must expose stable downstream semantic roles so later command phases preserve current hook behavior.

In the general case, downstream role mapping is derived from syntax shape:

- an entity-bearing slot with no immediately preceding literal connector token maps to `direct`
- an entity-bearing slot immediately preceded by a literal connector token maps to `indirect`

Examples:

- `ENTITY` -> `direct`
- `ENTITY with ENTITY` -> `direct`, `indirect`
- `ENTITY in ENTITY` -> `direct`, `indirect`
- `TEXT to LIVING` -> `indirect`
- `ENTITY to ENTITY` -> `direct`, `indirect`

If a future rule shape cannot be represented correctly by this inference, it must declare an explicit compile-time override rather than relying on positional inference alone.

### Connector Tokens and Canonical Relation

When an indirect entity-bearing slot is introduced by a matched literal connector token, the interpretation artifact must preserve a canonical relation token for downstream logic.

Rules:

- the canonical relation token is derived from the matched literal connector immediately preceding the indirect entity-bearing slot
- this token is used by downstream `canIndirect`, `planIndirect`, and metadata relation-policy logic
- no global relation-word inference is allowed beyond the matched rule itself

Illustrative examples:

- `ENTITY in ENTITY` -> canonical relation token `in`
- `ENTITY with ENTITY` -> canonical relation token `with`
- `TEXT to LIVING` -> canonical relation token `to`

## Disambiguation

Disambiguation runs after candidate matching when more than one candidate remains for a required entity-bearing slot.

Outcomes:

- exactly one candidate: bind and continue
- zero candidates: slot is `missing`
- multiple candidates:
  - resolve with indistinguishability policy when appropriate, else
  - leave slot `ambiguous`

Canonical candidate ranking must be deterministic. Tie-break sequence:

1. scope order
2. match score
3. depth level (shallow to deep)
4. declaration or enumeration order within scope
5. UUID lexical order

Match score definition:

- higher score for exact normalized display-name phrase match
- then exact normalized keyword or alias phrase match
- then token-coverage match (required noun plus all qualifier tokens)

### Indistinguishable Candidate Auto-Pick

Intent:

- prompt only when the actor can meaningfully distinguish candidates
- if candidates are indistinguishable from actor-visible data, auto-pick deterministically

Definitions:

- candidate set: entities remaining after scope search and span-token filtering for one required entity-bearing slot
- visibility signature: deterministic actor-relative summary of visible distinguishing data for one candidate

Visibility signature fields:

- normalized visible display name
- normalized `metadata.resolution.disambiguationLabel` when present and visible
- normalized `metadata.resolution.descriptors` when present and visible
- declared visible state flags used for resolution messaging

Resolver behavior for `|C| > 1`:

1. compute visibility signatures for all candidates
2. if all signatures are equal, bind the first candidate by canonical deterministic ranking
3. otherwise preserve ambiguity and return ordered candidates in the ambiguity artifact

## Failure Classification

Parsing and Entity Resolution owns interpretation, binding, and ambiguity classification failures.

It should return the most specific failure shape available for tooling and downstream mapping.

Recommended failure codes include:

- `FORM_NOT_SUPPORTED`
- `NO_RULE_MATCH`
- `ENTITY_SLOT_MISSING`
- `ENTITY_SLOT_NO_VIABLE_BINDING`
- `AMBIGUOUS_TARGET`

Player-facing text remains downstream ownership.

## Final Interpretation Artifact

When a rule yields `success`, Parsing and Entity Resolution emits a final interpretation artifact.

Minimum required contents:

- resolved verb
- selected rule index
- matched syntax rule text
- compiled-rule identifier derived internally from declaration order or compiled matcher state
- captured slot values
- token ranges
- downstream slot-role mapping
- resolved entity references where applicable

Later phases treat this artifact as the canonical description of the command.

## Ambiguity Artifact

When a rule yields `ambiguous`, Parsing and Entity Resolution emits a structured ambiguity artifact instead of a final interpretation artifact.

Minimum required contents:

- resolved verb
- selected rule index
- matched syntax rule text
- slot-role mapping
- one ambiguity entry for each ambiguous slot
- deterministic candidate ordering for each ambiguous slot

Each ambiguity entry must contain, at minimum:

- slot index
- slot kind
- downstream slot role
- captured surface text
- token range
- ordered candidate list
