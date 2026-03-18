# Verb-Local Syntax Matching

## Status

- Status: archived
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

Parsing becomes a two-stage operation:

1. Resolve the verb from the first token.
2. Match the remaining input against verb-declared syntax rules.

A syntax rule is an ordered pattern composed of:

- literal words such as `to`, `with`, `for`, `in`
- free-text slots
- entity slots
- future slot kinds such as number or single-word if needed

The first matching rule wins.

Entity Resolution then binds only the entity slots declared by the matched rule.

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

### Entity Resolution

- bind entity slots declared by the matched syntax rule
- preserve free-text slots without entity binding
- apply rule-specific scope and accepted-relation logic

### Plan

- decide command-specific fallback behavior when binding is unresolved but recoverable
- render literal vs directed speech, or equivalent command outcomes

This keeps the parser generic without forcing it to guess semantics that belong later.

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

- whether syntax matching should replace current generic parse shapes or coexist with them
- how free-text slots should interact with quoted spans
- whether the syntax artifact should reuse current names such as `primaryTargetSpan` / `secondaryTargetSpan`
- how rule ordering should be declared and validated
- whether unresolved entity-bearing syntax forms should be command-configurable as:
  - hard failure
  - fallback to literal
  - disambiguation prompt
- how much of current relation handling should remain in generic parser code once verb-local syntax exists

## Summary

The main lesson from addressed `say` is not that `say` needs a better special case.

The lesson is that some verbs do not fit a globally inferred relation-token parser.

For those verbs, structure should be declared by the verb and matched locally, with Entity Resolution binding only the slots that the selected rule identifies as entity-bearing.
