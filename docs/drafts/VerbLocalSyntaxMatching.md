# Verb-Local Syntax Matching

## Status

- Status: draft
- Scope: bundle-layer command parsing and rule selection
- Binding: no

## Purpose

Record a command parsing design direction that better fits free-text verbs such as `say` while remaining general enough for other verbs.

This document is descriptive, not normative. It exists to clarify the pressure point in the current architecture and describe a cleaner shape for future work.

## Problem

The current parser assumes structure can be inferred generically from token order:

- verb
- primary span
- optional relation token
- optional secondary span

That is workable for many verbs, especially object-action verbs such as `put`, `give`, or `go`.

It is not a good fit for `say`.

For `say`, words such as `to`, `from`, `in`, `with`, and `under` are usually ordinary speech content. A generic parser that treats relation-like words as structural too early will over-read literal speech and produce incorrect parse forms, unsupported-relation failures, or empty-primary failures.

The deeper issue is ownership:

- a generic parser cannot reliably decide whether relation-looking words are structural for a given verb
- that decision belongs to the verb

## Design Goal

Move structure ownership from the global parser to the verb.

The parser should still tokenize input and resolve the verb, but the verb should declare the syntax patterns it accepts. Literal connector words become structural only because the verb says so.

This is especially important for free-text verbs such as `say`, but the model should also support ordinary action verbs.

## Core Idea

### Command Architecture Compatibility Guardrails

This design is intentionally scoped to parsing and pattern matching only.

Everything else in the current command architecture remains unchanged:

- phase sequencing remains Receive Input (including parse) -> Entity Resolution -> Capture/Veto -> Plan -> React -> Commit -> Render/Dispatch,
- mutation policy remains unchanged (no mutation outside Commit),
- resolution policy ownership remains unchanged (Entity Resolution owns world-binding decisions),
- capture/react/plan/commit/render contracts remain unchanged except for consuming the new syntax artifact.

The migration goal is to change *how rule shape is selected*, not to redesign command phases or mutation semantics.


Parsing becomes a two-stage operation:

1. Resolve the verb from the first token.
2. Match the remaining input against verb-declared syntax rules.

A syntax rule is an ordered pattern composed of:

- literal words such as `to`, `with`, `for`, `in`
- free-text slots
- entity slots
- future slot kinds such as number or single-word if needed

The syntax layer should reuse existing verb rule categories (intransitive/direct/indirect and related forms) as the migration entry point rather than introducing a separate dispatch path.

The first matching rule wins.

Entity Resolution then binds only the entity slots declared by the matched rule.

## Generic Pattern-Matching Model (Detailed)

This section defines the matching behavior as a general mechanism, not a `say`-specific special case.

### Rule Declaration Shape

Each verb declares an ordered `syntaxRules` list. Each rule contains:

- `id`: stable identifier for diagnostics/tests
- `pattern`: ordered array of pattern atoms
- `slots`: slot metadata keyed by slot name (type, constraints, resolver hints)
- `semantics` (optional): rule-local flags used by planner/renderer (not by matcher)

Pattern atoms:

- `LITERAL(word)`: exact normalized token match (for example `to`, `with`, `in`)
- `SLOT(name, kind)`: slot placeholder that consumes part of the remaining input

Slot kinds (extensible):

- `TEXT`: opaque text span; matcher does not interpret internal words
- `WORD`: single token free-text slot
- `NUMBER`: numeric token slot
- `ENTITY`: broad resolvable target slot
- `LIVING`: resolvable NPC + PC target slot
- `ITEM`: resolvable object target slot
- `MULTI_ENTITY`: multi-target entity capture
- `MULTI_LIVING`: multi-target living capture

Compatibility mapping to LIMA/MudOS-style parse tokens:

- `OBJ` -> `ENTITY`
- second `OBJ` (or `OBJ2`) -> indirect entity slot
- `LIV` -> `LIVING`
- `OBS` -> `MULTI_ENTITY`
- `LVS` -> `MULTI_LIVING`
- `WRD` -> `WORD`
- `STR` -> `TEXT`
- `PREP` -> `LITERAL(<connector>)` at declaration time

### Input Normalization Assumptions

Before rule matching:

1. input is canonicalized using existing command input normalization
2. verb token is resolved
3. remainder is preserved as both:
   - token stream (for literal and narrow-slot matching)
   - raw remainder string slices (for opaque `TEXT` capture)

Quoted content remains opaque text and is never structurally re-parsed by the matcher.

### Matching Algorithm

Given ordered rules `R1..Rn`, evaluate in declaration order with a recursive backtracking matcher:

1. **Pre-check literals (fast filter).**
   - For each rule, run a cheap literal-presence/order gate before deep matching (equivalent intent to `check_literal(...)`).
   - If required literal connectors cannot fit, skip rule immediately.
2. **Token-by-token recursive match.**
   - Walk pattern atoms against input tokens (`match(ruleIndex, tokenIndex)`).
   - Record successful partial captures, recurse to the next atom, and backtrack on failure.
3. **Accept only full matches.**
   - Candidate success requires pattern exhaustion and input exhaustion, except a terminal `TEXT` slot that intentionally captures the remainder.
4. **Candidate validation and selection.**
   - For each structural candidate, run follow-on validation hooks and relation checks in existing command architecture terms.
   - Select deterministic winner by rule order and quality scoring policy.

Atom matching semantics:

- `LITERAL(word)`: case-normalized equality with current token.
- `SLOT(TEXT)` (LIMA `STR` equivalent): tries one-or-more-token spans and recurses.
  - Operationally this behaves as greedy capture with backtracking to satisfy later literals/slots.
  - Quoted internals remain opaque text and are never structurally re-tokenized.
- `SLOT(WORD|NUMBER)` (LIMA `WRD` analogue for `WORD`): consume exactly one token; validate kind immediately.
- `SLOT(ENTITY|LIVING|ITEM|MULTI_ENTITY|MULTI_LIVING)` (LIMA `OBJ`/`LIV`/`OBS`/`LVS` analogues):
  - capture candidate spans structurally during syntax match,
  - defer world binding (nouns/adjectives/plurals/ordinals/`all`/`self`) to resolver phase.

This ordering preserves the key LIMA property: literal token order is part of rule identity, so `OBJ with OBJ for STR` and `OBJ for STR with OBJ` are different rule shapes with different dispatch outcomes.

### Validation/Dispatch Flow Parity

After structural match, execution flow remains staged:

1. build rule-shape-specific validation targets (conceptually like `can_`, `direct_`, `indirect_` phases),
2. run relation validation for multi-entity forms where required,
3. dispatch planner/executor path for the selected rule shape with arguments in declared slot order.

The matcher does not bypass these phases; it only makes rule-shape selection explicit and verb-local.

### Deterministic Rule Selection and Ambiguity

Selection is deterministic by declaration order with two guardrails:

- Prefer higher-specificity rules earlier (more literals, narrower slot kinds).
- Keep a lint/check that flags equal-shape ambiguous rules whose ordering could hide one another.

If two rules both structurally match, earlier declaration wins; this is intentional and testable.

### Syntax Artifact Contract

Matcher output should be a stable artifact consumed by Entity Resolution and Planner:

- `verb`: resolved verb key
- `ruleId`: matched rule id
- `ruleForm`: existing verb-form category (intransitive/direct/indirect/etc.)
- `slots`: captured slot spans with:
  - `name`
  - `kind`
  - `raw` (exact text)
  - `tokenRange` (start/end indices in remainder token list)
- compatibility aliases for existing parse names (`primaryTargetSpan`, `secondaryTargetSpan`) during migration

### Entity Binding Handoff

Entity Resolution consumes only entity-bearing slots (`ENTITY`, `LIVING`, `ITEM`, future entity-like kinds):

- resolver binds candidates according to slot kind + scope profile
- non-entity slots (especially `TEXT`) are passed through unchanged
- unresolved addressed forms that rely on entity binding fall back to literal interpretation when command policy says so (current `say` direction)

### Extensibility Rules

To add new syntax capability, introduce a new slot kind or literal pattern, not a verb-specific parser branch.

Examples of future-safe extension points:

- add `DIRECTION` slot kind for exits
- add slot constraint metadata (`minTokens`, `maxTokens`, `allowedScopes`)
- add compile-time rule validation (unreachable rule detection, ambiguity checks)

## Why `say` Is the Motivating Case

`say` is the clearest example of a verb whose natural language shape cannot be reliably inferred by generic relation-token scanning.

Examples:

- `say hello there`
- `say hello there to Bar`
- `say to be or not`
- `say go down from the crypt and see what answered the rite`
- `say Hamlet says to be or not to be`

A global parser cannot distinguish these correctly without either:

- verb-specific parser hacks, or
- frequent regressions caused by over-reading literal text as structure

A verb-local syntax model makes the intended behavior explicit.

## `say` Under This Model

A minimal `say` rule set would look conceptually like:

- `TEXT`
- `TEXT to ENTITY`

Near-term migration should keep `ENTITY` as the broad compatibility slot. Longer-term, the slot taxonomy can support narrower forms such as `LIVING` (NPC/PC targets) and `ITEM` without removing `ENTITY`.

Interpretation:

- `say hello there`
  - matches `TEXT`
- `say hello there to Bar`
  - may match `TEXT to ENTITY`
- `say to be or not`
  - remains `TEXT`
- `say go down from the crypt and see what answered the rite`
  - remains `TEXT`
- `say Hamlet says to be or not to be`
  - remains `TEXT` unless the trailing `to <entity>` actually matches a valid addressed form

This keeps literal speech as the default and makes addressed speech an explicit verb-owned form.

## Slot Taxonomy Direction

`ENTITY` should remain available as the broadest entity-bearing placeholder for compatibility and incremental migration.

Syntax matching should also allow narrower slot kinds as optional future constraints, for example:

- `LIVING`: actor-like targets (NPC + PC)
- `ITEM`: object-like targets

The naming and classification should be syntax-facing and gameplay-readable. Engine-specific classes (for example, scriptability internals) should be mapped in entity resolution metadata rather than hardcoded into parser rule matching.

Migration posture for `say`:

- migrate `say` to verb-local syntax with `TEXT` and `TEXT to ENTITY` as the baseline addressed/public forms
- keep `ENTITY` available as the broad slot while supporting optional narrower forms like `TEXT to LIVING` where content policy wants NPC+PC targeting
- avoid removing `ENTITY` until behavior and content expectations are validated

## General Use Beyond `say`

This model is not `say`-specific.

Other verbs could declare patterns such as:

### `put`

- `ENTITY in ENTITY`
- `ENTITY on ENTITY`

### `give`

- `ENTITY to ENTITY`

### `search`

- `ENTITY`
- `for TEXT`
- `for TEXT in ENTITY`
- `ENTITY with ENTITY`
- `ENTITY for TEXT`

### `look`

- empty input
- `ENTITY`

This is close to the LIMA/MudOS pattern-matching approach:

- verbs declare their grammar
- literal connectors are part of the verb rule
- semantic validation happens after pattern match

## Relation to Existing Entity Resolution

Current entity-resolution metadata already captures some verb-driven behavior:

- allowed rule forms
- accepted relations
- scope profiles
- unresolved-indirect policy

That remains useful.

The change here is not “move all parsing into Entity Resolution.”

The change is:

- let verb-local syntax matching decide which spans exist and what they mean
- let Entity Resolution bind only the entity-bearing spans of the matched rule

In other words:

- syntax selection is verb-owned
- binding remains resolver-owned

## Phase Ownership

A likely future phase split is:

### Receive Input

- canonicalize input
- tokenize input
- resolve verb by exact key
- load verb syntax metadata
- match the remaining input against that verb’s syntax rules
- produce a syntax artifact

(Parsing/matching is explicitly represented inside Receive Input; it does not introduce a new downstream phase.)

### Entity Resolution

- bind entity slots declared by the matched syntax rule
- preserve free-text slots without entity binding
- apply rule-specific scope and accepted-relation logic

### Capture/Veto

- consume resolved entities and enforce policy checks
- deny/allow without mutation

### Plan

- decide command-specific fallback behavior when binding is unresolved but recoverable
- produce deterministic planned operations and base render intent

### React

- add post-validation render/reaction contributions without direct mutation

### Commit

- apply planned operations transactionally

### Render/Dispatch

- deliver output after successful commit

This keeps the parser generic without forcing it to guess semantics that belong later. It also preserves existing command architecture boundaries by changing only syntax selection, not downstream phase responsibilities.

## Advantages

- removes pressure to add verb-specific parser hacks
- preserves literal text for free-text verbs more naturally
- makes connector words structural only when verb rules declare them
- improves testability because syntax is explicit and verb-local
- matches established MUD parsing patterns more closely
- provides a cleaner path for richer natural-language verbs over time

## Tradeoffs

- this is more explicit than the current parser model
- verbs need syntax metadata, not just resolver metadata
- command loading and dispatch will likely need a new syntax-matching step
- existing commands may continue to use the simpler parser path for a while, which creates a mixed model during migration

## Migration Direction

A low-risk migration path would be:

1. add verb-local syntax metadata as an optional feature
2. teach only `say` to use it first
3. preserve current resolver metadata during the transition
4. evaluate whether other verbs benefit from migration
5. only later consider replacing generic relation-splitting more broadly

## Open Questions

- for `say`, syntax matching replaces the current generic relation-splitting path (full migration of `say` input handling)
- quoted spans are preserved as opaque `TEXT` placeholders; parser/syntax layers do not reinterpret quoted internals
- for compatibility, syntax artifacts should initially reuse current names such as `primaryTargetSpan` / `secondaryTargetSpan`
- how rule ordering should be declared and validated
- unresolved entity-bearing addressed forms should fall back to literal text
- how much of current relation handling should remain in generic parser code once verb-local syntax exists

## Summary

The main lesson from addressed `say` is not that `say` needs a better special case.

The lesson is that some verbs do not fit a globally inferred relation-token parser.

For those verbs, structure should be declared by the verb and matched locally, with Entity Resolution binding only the slots that the selected rule identifies as entity-bearing.
