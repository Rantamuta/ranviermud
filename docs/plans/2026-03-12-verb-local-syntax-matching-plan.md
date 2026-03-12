# Verb-Local Syntax Matching Implementation Plan

## Status

- Status: draft
- Scope: bundle-layer command parsing and rule selection
- Binding: no (planning artifact)

---

## Goal

Establish verb-local syntax matching as the primary model for command shape.

Instead of a global parser attempting to infer structure from relation-like words, each verb explicitly declares the syntax patterns it supports.

The system then matches player input against those patterns and produces a stable interpretation artifact used by later command phases.

This design is motivated by free-text verbs such as `say`, but the model is general and should become the normal command declaration model.

---

## Design Principles

1. **Structure is declared by the verb**

   Command grammar is defined by verb syntax rules rather than inferred globally.

2. **Literal connector words are rule-local**

   Words such as `to`, `with`, `for`, or `in` are structural only when they appear inside a declared syntax rule.

3. **Rules are evaluated in explicit order**

   Rule priority is determined only by declaration order. The first rule that successfully matches becomes the winner.

4. **Parsing and entity resolution are linked**

   Entity-bearing slots participate in rule viability during matching.

5. **Later command phases remain unchanged**

   Veto, Plan, React, Commit, and Render are outside the scope of this effort.

---

## Command Interpretation Model

Input handling is divided into a small preparation step followed by a linked parsing-and-entity-resolution step.

### Receive Input

Responsibilities:

- canonicalize raw input
- tokenize or lex input
- resolve the verb key

No structural interpretation occurs here beyond identifying the verb.

### Parsing and Entity Resolution

This step performs rule matching and entity-bearing slot interpretation together.

Responsibilities:

- load ordered syntax rules for the verb
- match candidate rules against the remaining token stream
- treat literal connector words as structural only when declared by the rule
- capture slot spans during matching
- interpret entity-bearing slots as part of rule viability
- reject rules when structure or entity interpretation fails
- emit a final interpretation artifact

Structural matching and entity-bearing interpretation co-determine rule viability.

---

## Command Architecture Integration

This section describes how verb-local syntax matching fits into the current command architecture and what should be clarified in the command architecture document itself.

The goal is to make the interpretation step explicit without changing the behavior or responsibilities of later phases.

### Recommended architecture wording

The command architecture should describe the early pipeline as:

`Receive Input -> Parsing and Entity Resolution -> Capture/Veto -> Plan -> React -> Commit -> Render/Dispatch`

This does not introduce a new downstream behavior. It clarifies that command meaning is established by a linked parsing-and-resolution step before later phases consume the result.

### Interpretation artifact

Parsing and Entity Resolution should produce a stable interpretation artifact consumed by later phases.

That artifact should contain:

- resolved verb
- matched syntax rule
- captured slot values
- resolved entity references where applicable

Later phases should treat this artifact as the canonical description of the command.

### Required normative update to command architecture

`docs/normative/CommandArchitecture.md` must be updated to:

1. replace wording that implies syntax parsing completes independently before entity resolution begins
2. describe rule matching and entity-bearing interpretation as a linked interpretation step
3. state that later phases consume a completed interpretation artifact
4. keep phase responsibilities after interpretation unchanged

No downstream behavioral change to command execution is required beyond making the interpretation stage explicit in normative wording.

---

## Rule Model

Each verb declares an ordered list of syntax rules.

Rules define the command grammar for that verb.

Rule order is authoritative.

The first rule that matches successfully becomes the selected rule.

Rules are declared as compact space-separated syntax strings.

Example:

```js
syntaxRules: [
  'TEXT',
  'TEXT to ENTITY'
]
```

Each syntax string is compiled at load time into an ordered internal pattern used by the matcher.

This keeps command declarations compact while still allowing the matcher to work with explicit structural patterns.

Authored command declarations should remain compact strings and should intentionally avoid explicit authored rule IDs and authored per-rule metadata unless absolutely necessary.

---

## Syntax Strings

Syntax rules are declared as compact space-separated strings.

Examples:

- `TEXT`
- `TEXT to ENTITY`
- `ENTITY in ENTITY`
- `ENTITY with ENTITY for TEXT`

At load time, each syntax string is compiled into an internal ordered pattern used by the matcher.

Compilation should treat:

- recognized symbolic slot tokens as slot placeholders
- all other words as literal connector tokens

Supported slot kinds for the initial implementation:

- `TEXT`
- `WORD`
- `NUMBER`
- `ENTITY`

Additional kinds may be introduced later if required (for example `LIVING` when actor-only targeting constraints are needed).

This representation is intentionally minimal. It avoids legacy rule-form metadata and explicit rule identifiers in command declarations.

---

## Matching Engine

Rule matching uses recursive backtracking.

### Deterministic rule order

Rules are evaluated strictly in declaration order.

The first rule that fully matches and satisfies entity-bearing interpretation wins.

No implicit weighting or hidden precedence rules are used.

### Recursive exploration

Matching proceeds token by token.

Free-text slots may capture larger spans initially and shrink during backtracking in order to satisfy later literals or entity slots.

This allows commands such as:

`say hello there to bob`

to correctly match the rule:

`TEXT to ENTITY`

### Literal pre-check

A fast literal presence check may be performed before deep matching.

This serves only as an optimization gate.

Full positional correctness is verified during recursive matching.

### Entity slot participation

Entity-bearing slots participate in candidate viability during matching.

A candidate rule may be rejected if required entity-bearing slots cannot be interpreted according to the slot type.

### Capture semantics

- quoted and unquoted text is preserved as opaque spans
- text slots use greedy capture with backtracking
- literal connectors must match exact tokens

---

## Syntax Artifact

When a rule succeeds the matcher produces a syntax artifact.

Artifact contents:

- resolved verb
- matched syntax rule
- captured slot values
- token ranges
- resolved entity references where applicable

Compatibility aliases may be produced during migration.

If later phases need stable internal identifiers, those may be derived internally from declaration order or compiled matcher state rather than authored explicitly in command content.

---

## Fallback Policy

Some verbs may declare both:

- a general text form
- a more specific entity-addressed form

If the entity-bearing form fails to resolve its entity slot, a verb may optionally fall back to the less specific text form.

Fallback behavior must be explicitly declared by command semantics.

Current `say` direction in this repository: unresolved addressed forms fall back to literal text.

It is not a global parser behavior.

---

## Example: `say`

Minimal rule set:

- `TEXT`
- `TEXT to ENTITY`

Expected behavior:

- `say hello there` -> `TEXT`
- `say hello there to bob` -> `TEXT to ENTITY`
- `say to be or not` -> `TEXT`

Connector words inside speech remain literal unless the rule explicitly matches an addressed form.

---

## General Use Beyond `say`

The system supports typical command verbs.

Examples:

### `put`

- `ENTITY in ENTITY`
- `ENTITY on ENTITY`

### `give`

- `ENTITY to ENTITY`

### `search`

- `ENTITY`
- `for TEXT`
- `ENTITY with ENTITY`
- `ENTITY for TEXT`

### `look`

- `(empty)`
- `ENTITY`

---

## Migration Strategy

The goal is a single command syntax model.

Migration sequence:

1. implement verb-local syntax rule support
2. implement the recursive matcher
3. migrate `say`
4. convert remaining legacy commands when mappings are straightforward
5. remove the legacy parser once conversion is complete

Legacy parsing exists only as a temporary bridge.

No new command should be authored on the legacy parser model once verb-local syntax exists.

---

## Out of Scope

The following command phases remain unchanged:

- Capture/Veto
- Plan
- React
- Commit
- Render/Dispatch

No mutation semantics or downstream command behavior are modified.

Also out of scope:

- changes to engine internals under `Rantamuta/core`
- CLI, config, boot, load-order, or tick compatibility changes
- broad refactors unrelated to syntax matching and command migration
- narrowing broad compatibility slot behavior without explicit design approval

---

## Risks

### Rule ambiguity

Mitigation: rule ordering and tests.

### Behavior drift during migration

Mitigation: characterization tests for converted commands.

### Parser scope creep

Mitigation: keep later command phases strictly outside parsing and entity resolution.

---

## Acceptance Criteria

1. verbs declare ordered syntax rules
2. rule declaration order determines priority
3. recursive matching handles text spans correctly
4. entity-bearing slots influence rule viability
5. the syntax artifact is produced deterministically
6. downstream command phases remain unchanged
7. `say` migration succeeds
8. legacy commands continue working until converted
9. `docs/normative/CommandArchitecture.md` is updated to reflect linked Parsing and Entity Resolution wording

---

## Validation

Evidence required:

- unit tests for rule matching
- tests for literal ordering behavior
- tests for entity-slot participation
- tests for `say` speech edge cases
- characterization tests for migrated legacy commands

Required commands:

- `npm test`
- `npm run ci:local`

Success condition:

Matching behavior is deterministic and legacy commands remain stable until migration is complete.
