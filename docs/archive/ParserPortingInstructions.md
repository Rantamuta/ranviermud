# Parser Porting Instructions

This document defines the parser-facing contract for the Rantamuta reference bundle porting work.
It is intentionally narrow: naming, stage boundaries, and first implementation slice.

## Scope

- Applies to bundle-layer command input handling (`bundles/bundle-rantamuta/input-events/main.js`).
- Does not change core engine internals.
- Parser is always on in this feature branch (no runtime flag).

## Nomenclature (spec-aligned)

Use only terms from the behavioral spec in parser artifacts and tests:

- `actorInput`: raw user-entered input string.
- `normalizedInput`: deterministic normalized command string.
- `intentToken`: normalized first token considered for intent lookup.
- `primaryTargetSpan`: token span for direct object phrase.
- `relationToken`: relation keyword token (for example `in`, `on`, `from`, `with`).
- `secondaryTargetSpan`: token span for indirect object phrase.
- `classification`: outcome taxonomy class.
- `errorEnvelope`: `{ class, code, details }`.

Avoid ad hoc names like `directObjectPhrase`/`indirectObjectPhrase` in new parser artifacts.

## Stage Boundaries

### Lexer stage (allowed, recommended)

Purpose: convert `actorInput` into ordered token units with positions.

Minimum viable lexer:

- split by whitespace,
- trim,
- preserve token order.

Required evolution target:

- preserve quoted spans as atomic tokens,
- preserve numeric selectors (`N.term`),
- preserve relation tokens,
- avoid mutating case beyond documented normalization rules.

The lexer is syntax-only and must not resolve entities or mutate state.

### Parser stage

Purpose: map lexer output into a structured parse artifact.

Parser responsibilities:

- produce `intentToken`,
- extract `primaryTargetSpan`, `relationToken`, and `secondaryTargetSpan` when present,
- emit syntax/shape failures as `classification` + `errorEnvelope`.

Parser non-responsibilities:

- no entity resolution,
- no reachability checks,
- no permission checks,
- no world mutation.

### Post-parser (existing path)

Keep in existing command/interpreter flow:

- intent mapping against registered commands,
- target resolution,
- validation,
- execution,
- rendering and dispatch.

## Classification ownership

Parser assigns only syntax/input-shape classes:

- `unknown intent` (no parseable intent token for command lookup),
- `semantic error` (recognized intent family but malformed/incomplete form).

World-dependent classes are assigned later:

- `ambiguous target`,
- `invalid context/target`,
- `forbidden/blocked`,
- `success`.

## Parse Artifact (v0)

```json
{
  "actorInput": "put rusty sword in old chest",
  "normalizedInput": "put rusty sword in old chest",
  "intentToken": "put",
  "primaryTargetSpan": ["rusty", "sword"],
  "relationToken": "in",
  "secondaryTargetSpan": ["old", "chest"],
  "classification": "success",
  "errorEnvelope": null
}
```

Notes:

- Spans are token arrays in v0 to preserve ordering and simplify later resolution.
- Future versions may add token offsets (`startIndex`, `endIndex`) if needed.

## Integration point

Use parser from bundle input handling:

- file: `bundles/bundle-rantamuta/input-events/main.js`
- location: `inGame` command-handling path before command lookup.

Direct command dispatch should consume parser output without changing downstream semantics unless tests explicitly change expectations.

## Test-first sequence (recommended)

1. Add parser unit tests with failing expectations for:
- simple intent (`look`),
- relation form (`put rusty sword in old chest`),
- malformed relation form (`put in chest`),
- unknown intent token.

2. Add scenario tests through `util/scenario-runner.js --throughInput` that assert:
- parser-integrated path still emits expected user-visible outcomes.

3. Only then implement parser internals.

## Open review questions

1. Should `classification` be omitted on successful parse and only set on failures?
2. Should `relationToken` support multi-word forms in v0 (for example `out of`) or defer?
3. Do we want token offset metadata in v0, or wait for resolver needs?
