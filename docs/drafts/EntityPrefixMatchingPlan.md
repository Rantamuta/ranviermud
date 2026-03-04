# Entity Prefix Matching Plan (3+ chars, exact-first)

## Status

- Status: draft-v1
- Scope: bundle-layer entity resolution behavior (`bundle-rantamuta`)
- Type: implementation plan for review (not yet implemented)

## Summary

Add prefix matching for **entity resolution only** (not command/verb lookup) so players can type partial nouns like:

- `x reli` -> resolves like `look reliquary` when unambiguous
- `x reli` -> `AMBIGUOUS_TARGET` when multiple valid matches exist

Behavior remains deterministic and uses the existing resolver/disambiguation pipeline.

## Goals

1. Improve typing ergonomics for repeated interactions with long noun phrases.
2. Preserve exact-key command lookup semantics for verbs/intents.
3. Reuse existing scope precedence, ambiguity behavior, and tie-breaking rules.
4. Keep resolver deterministic and side-effect free.

## Non-Goals

1. No prefix matching for command/verb lookup.
2. No parser grammar changes.
3. No new disambiguation UI in this change.
4. No candidate-list rendering in player-facing ambiguity text in this change.

## Locked Decisions

1. Prefix matching is attempted only when **no exact entity match** exists at the current score tier.
2. Prefix matching applies only when the final noun token length is **>= 3**.
3. Prefix matching uses existing resolver flow (scope/depth/ranking/disambiguation), not a separate pipeline.
4. Existing ambiguous output remains unchanged (`AMBIGUOUS_TARGET` -> current message mapping).
5. For noun tokens shorter than 3 (`r`, `re`), resolver does not prefix match and falls through to normal not-found behavior.

## Behavioral Contract

For role binding (direct/indirect) in resolver:

1. Compute exact matches using existing scoring rules (`name phrase`, `keyword phrase`, `noun+qualifiers`).
2. If exact matches exist, use current behavior unchanged.
3. If exact matches do not exist:
   - If noun length < 3: return normal `TARGET_NOT_FOUND` behavior.
   - If noun length >= 3: evaluate prefix matches.
4. Feed prefix matches into existing tie-break/disambiguation:
   - scope precedence
   - match score tier
   - shallowest depth
   - indistinguishable auto-pick
   - otherwise `AMBIGUOUS_TARGET`

## Matching Semantics (prefix mode)

Prefix mode should be conservative and deterministic:

1. Prefix applies to tokenized item vocabulary already used by resolver (`name` tokens and `keywords` tokens).
2. All adjective qualifiers must still match exactly as they do now.
3. Noun token match in prefix mode becomes `candidateToken.startsWith(nounPrefix)`.
4. Prefix mode should not degrade exact phrase ranking because it is fallback-only.

### Examples

1. `x reli` with only `reliquary` present -> bind `reliquary`.
2. `x reli` with `reliquary` and `relic` present -> `AMBIGUOUS_TARGET`.
3. `x re` -> no prefix attempt, normal not-found path.
4. `take reliq` -> binds `reliquary` if unambiguous under existing scope/ranking rules.

## Architecture Fit

This plan stays within phase boundaries:

1. Receive Input: unchanged.
2. Entity Resolution: adds matching strategy fallback only.
3. Capture: unchanged.
4. Plan/React/Commit/Render: unchanged.

No mutation or output is introduced in resolver.

## Implementation Outline

## 1) Helper-level matching extension

Likely file:

- `bundles/bundle-rantamuta/lib/helpers/entity-resolution-helper.js`

Add a scoring mode or fallback helper used by `computeMatchScore(...)` call sites:

- preserve existing exact scoring behavior
- add prefix-aware fallback scoring when noun length >= 3 and exact score is zero

Possible approach:

1. Keep `computeMatchScore(...)` exact-only.
2. Add `computePrefixMatchScore(...)`.
3. In resolver role binding, run exact pass first; if empty, run prefix pass.

This makes fallback intent explicit and reviewable.

## 2) Resolver binding wiring

Likely file:

- `bundles/bundle-rantamuta/lib/session/entity-resolution.js`

In `bindRole(...)`:

1. Build candidate list with exact `matchScore` as today.
2. If no candidates, conditionally build candidate list with prefix scoring when noun length >= 3.
3. Continue through unchanged downstream filters and ambiguity logic.

No changes to error codes.

## 3) Dispatch/message behavior

No required dispatcher changes.

- `TARGET_NOT_FOUND` and `AMBIGUOUS_TARGET` handling remains as-is.

## Test Plan

## Unit: entity resolution

File:

- `bundles/bundle-rantamuta/tests/entity.resolution.test.js`

Add cases:

1. exact match still wins and behavior unchanged.
2. no exact + noun length >= 3 + single prefix candidate -> resolves.
3. no exact + noun length >= 3 + multiple prefix candidates -> `AMBIGUOUS_TARGET`.
4. no exact + noun length < 3 -> `TARGET_NOT_FOUND`.
5. qualifiers still enforced in prefix mode (e.g., `orn reli` matches only candidates with qualifier token).
6. scope precedence still applies in prefix mode.
7. deterministic tie behavior unchanged in prefix mode.

## Integration: dispatch path

File:

- `bundles/bundle-rantamuta/tests/command.dispatch.test.js` (or scenario test)

Add/adjust:

1. `look reli` resolves successfully when unambiguous.
2. `look reli` surfaces existing ambiguity message when multiple candidates exist.
3. short prefix (`re`) returns existing not-found messaging.

## Regression protections

1. Existing exact-match tests remain unchanged and passing.
2. Existing ambiguity/indistinguishable tests remain passing.
3. Existing parser/canonicalization tests unchanged.

## Acceptance Criteria

1. Entity prefix matching is active only for noun length >= 3.
2. Exact entity matches are unaffected.
3. Prefix ambiguity routes through existing `AMBIGUOUS_TARGET` behavior.
4. No command lookup/verb-prefix behavior changes.
5. Resolver remains pure (no output, no mutation).

## Deferred (explicit)

1. Rich disambiguation text listing candidates (e.g., “Do you mean X or Y?”).
2. Per-verb opt-in/opt-out for prefix mode.
3. Configurable prefix threshold by command or area.
4. Fuzzy matching beyond prefix.

## Risks and Mitigations

1. Increased ambiguity on action verbs.
   - Mitigation: exact-first fallback and 3+ prefix floor reduce noise.
2. Unexpected binding in crowded noun spaces.
   - Mitigation: existing ambiguity/disambiguation path remains authoritative.
3. Hidden regressions in tie-break behavior.
   - Mitigation: explicit determinism/tie tests in resolver suite.

## Validation Commands (when implemented)

1. `cd bundles/bundle-rantamuta && npm test -- --runInBand`
2. `npm test`
3. `npm run ci:local`

## Review Questions

1. Should prefix fallback apply globally to all resolver-bound verbs, or only a defined subset (for example `look` first)?
2. Is noun-length threshold `>= 3` acceptable as a fixed rule for v1?
3. Is current generic ambiguity text sufficient for v1 rollout?
