# Command Interaction Reference Profile v1

This document is the normative command-to-output interaction contract for the Rantamuta reference profile.

## Status

- Profile: `reference-v1`
- Scope: bundle-layer command interpretation, target handling, validation, execution, rendering, and dispatch behavior.
- Intent: deterministic behavior for compatibility and transcript-stable testing where declared.

## System model

Start point: one `actor input` string.

End point: exactly one terminal class:

1. `success` (with delivery),
2. handled failure,
3. `unknown intent` after fallback exhaustion.

## Glossary

- `actor`: issuer of the input.
- `primary target`: direct object/entity of the action.
- `secondary target`: indirect object/entity in relation-oriented actions.
- `resolver`: stage mapping normalized input to intent candidates.
- `target resolver`: stage binding textual references to concrete entities.
- `validator`: stage checking feasibility, permissions, and constraints.
- `executor`: stage applying persistent world mutation.
- `semantic event`: canonical action representation prior to audience rendering.
- `renderer`: stage converting one semantic event into audience-specific strings.
- `dispatcher`: stage delivering rendered strings to eligible recipients.
- `fallback chain`: ordered secondary interpretation attempts triggered only by `unknown intent`.
- `error envelope`: machine-assertable failure payload (`class`, `code`, `details`).

## Outcome taxonomy

- `success`
- `unknown intent`
- `semantic error`
- `ambiguous target`
- `invalid context/target`
- `forbidden/blocked`

## Global pipeline order (normative)

Order is fixed:

1. intake
2. normalization
3. interpretation
4. target/context resolution
5. validation
6. execution
7. rendering
8. dispatch
9. fallback chain (only on `unknown intent`)

Fallback chain is evaluated only when interpretation returns `unknown intent`.

## Input normalization contract

Normalization must run after intake and before interpretation.

Required normalization sequence:

1. trim surrounding whitespace,
2. collapse repeated internal whitespace outside quoted spans,
3. case-fold command words and relation tokens,
4. preserve quoted substrings as atomic tokens,
5. preserve explicit numeric selectors (`N.term`),
6. preserve punctuation only when syntactically meaningful.

Normalization invariants:

- must not mutate world state,
- must not emit player-visible output.

## Target resolution contract

Resolution is deterministic and context-sensitive.

Default precedence order:

1. actor inventory,
2. actor equipped/immediately held items,
3. current locale contents,
4. relation scope (`from`, `on`, `in`, `with`) constrained set,
5. global/remote scope only if command class permits.

Tie-breakers:

1. explicit numeric selector (`2.sword`) if present,
2. exact alias/name over partial match,
3. shortest unambiguous match,
4. `ambiguous target` if unresolved.

Resolution invariants:

- no persistent mutation,
- ambiguity terminates as `ambiguous target` (not `unknown intent`),
- relation mismatch terminates as `invalid context/target`.

## Validation ordering and precedence

Validation order is deterministic:

1. actor preconditions,
2. target existence/reachability,
3. relation/context predicates,
4. permission/policy gates,
5. capacity/load constraints,
6. action-specific guards.

First failing check determines emitted `class` and `error envelope`.

## Fallback chain definition

Ordered strategies:

1. direct intent mapping,
2. alternate shorthand expansion,
3. relation-form reinterpretation,
4. movement/navigation reinterpretation,
5. terminal `unknown intent`.

Termination:

- stop at first non-unknown terminal class,
- emit terminal `unknown intent` only after all strategies return unknown.

## Execution, concurrency, and delivery

### Atomicity

- Command processing is atomic at command granularity.
- State mutations must fully commit before rendering, or fully roll back.
- Partial state must not be externally observable.

### Concurrency

- Default model is single queue per actor session.
- If concurrent execution exists, interleaving must not expose partial command state.

### Recipient snapshot timing

- Recipient eligibility is sampled once after successful execution and before dispatch.
- The full semantic event uses that fixed recipient set.

### Delivery ordering

Ordering that affects branching outcomes is normative under this profile.

Canonical delivery order:

1. system output (non-diegetic engine output only),
2. actor (second-person),
3. primary target,
4. bystanders (third-person).

`system` includes non-world output such as validation, help, and UI-layer feedback.
World-semantic narration must derive from a single canonical semantic event and follow actor -> target -> bystanders.

## Perspective messaging rules

- All audience output derives from one canonical semantic event.
- Dispatcher applies eligibility filtering before delivery.
- Audience outputs must not come from separate semantic interpretation paths.

Compatibility mode per command family:

1. `semantic-equivalent`: assert intent/class/recipients/order/mutation.
2. `strict-text`: additionally assert exact text.

Each command family declares one mode in test configuration.

## Error envelope contract

Failures expose:

- `class`: taxonomy class,
- `code`: stable implementation-specific key,
- `details`: structured context (for example target token, relation token, rule id).

For identical input and state, `class` and `code` must be stable across runs.

## Normative amendments

### Verb resolution

- Alias-first resolution is normative.
- Abbreviations are aliases.
- Matching proceeds in deterministic command registration order.
- First-registered match wins.
- Shadowing is permitted and deterministic.
- Registration order is part of compatibility.

### Verb-owned grammar and span capture

- Each verb family declares grammar patterns with named slots.
- Relation tokens are recognized only where the selected verb declares them.
- Tokens between grammar markers are captured as variable-length spans per slot.
- There is no global part-of-speech dictionary.

### Target matching

- Matching operates on captured spans.
- Match succeeds if the normalized span is a contiguous normalized substring of display name, or all meaningful span tokens match keywords.
- Ports declare a stable ignore list (for example articles, optionally connectors like `of`).

Within a scope, deterministic ranking is:

1. exact normalized display-name match,
2. fewest unmatched extra qualifiers,
3. more specific matches.

### Verb-specific scope precedence

- Search scopes are declared per verb family and are normative.
- Secondary lookups are allowed only to refine failure class selection and must not alter successful binding semantics.

### Transactional emission timing

- Logic-affecting event emissions occur only after successful transaction commit.
- Failed/rolled-back commands must not emit transactional events.

### Strict-text compatibility scope

- `strict-text` applies only to non-diegetic engine commands.
- Diegetic world verbs operate in `semantic-equivalent` mode.
- Classification is behavioral, not syntactic.
- Ports must not reclassify verbs as commands to expand strict-text scope.
- Strict-text scope is versioned as part of this profile.

## Acceptance examples (canonical)

### `look`

- Expected: actor-only room description output.
- State change: none.

### `look at <target>` success

- Expected: resolved target detail.
- State change: none.

### `look at <target>` missing target

- Expected: `invalid context/target` class.
- State change: none.

### `get <item>` success

- Expected: actor success + eligible bystander output.
- State change: item moves to actor inventory.

### `get <item> from <relation-target>` mismatch

- Expected: `invalid context/target`.
- State change: none.

### `get <item>` blocked

- Expected: `forbidden/blocked`.
- State change: none.

### `help <topic>`

- Expected: actor-only help or help-class unknown-topic output.
- State change: optional bookkeeping only.

### unknown input

- Expected: fallback exhaustion then terminal `unknown intent`.
- State change: none.

### ambiguous target (for example `get sword` with multiple matches)

- Expected: terminal `ambiguous target`.
- State change: none.

## Porting constraints

Must preserve:

- fallback-before-terminal-unknown behavior,
- distinct user-visible failure classes,
- single semantic event driving multi-audience output,
- relation constraint validation before mutation.

Safe to adapt:

- parser internals and storage structures,
- output styling/punctuation/color where strict-text is not required,
- transport protocol details if recipient semantics are preserved.

Forbidden assumptions:

- do not auto-execute every parseable phrase,
- do not collapse unknown/ambiguous/forbidden/invalid-context into generic failure,
- do not emit success before mutation commit.
