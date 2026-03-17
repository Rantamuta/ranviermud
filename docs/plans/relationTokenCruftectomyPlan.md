# Relation Token Cruftectomy Plan

## Status

- Status: draft
- Scope: bundle-layer runtime and tests in `bundle-rantamuta`
- Posture: deferred cleanup plan; do not treat this as implementation approval

## Goal

Remove relation-token canonicalization and relation-token compatibility carryover from the bundle command pipeline.

## Problem

The current command flow still carries a legacy distinction between:

- `relationTokenRaw`
- `relationTokenCanonical`

That distinction no longer fits the intended verb-local syntax model.

Under verb-local syntax matching:

- relation words are part of authored syntax rules
- accepted syntax should come from declared literals, not from a normalization bridge
- downstream code should not depend on a separate raw-vs-canonical relation abstraction unless there is a current behavior need for it

The current runtime still contains leftover relation-token machinery in three places:

1. Verb-local syntax compilation
   - compiled rules derive and store `canonicalRelationToken`

2. Entity resolution artifacts
   - interpretation artifacts still emit `relationTokenRaw` and `relationTokenCanonical`
   - legacy fallback code still canonicalizes relation words for old rule handling

3. Structured NPC intent normalization
   - structured NPC intents still accept `relationToken`
   - structured NPC intent reconstruction still relies on that field when building raw input

This is now cruft. It preserves an old compatibility posture that the current design no longer wants.

## Intent

The command pipeline should treat relation literals as ordinary authored syntax, not as a special compatibility abstraction. If a verb wants both `in` and `into`, it should declare both forms explicitly. If a future design wants compact alternatives such as `ENTITY in|into ENTITY`, that should be introduced as an explicit syntax feature rather than preserved through hidden canonicalization.

## In Scope

- Remove runtime use of `relationTokenRaw`.
- Remove runtime use of `relationTokenCanonical`.
- Remove relation-token canonicalization from verb-local syntax compilation.
- Remove relation-token canonicalization from entity-resolution interpretation.
- Remove structured NPC intent support for `relationToken`.
- Update command/runtime code that currently reads canonical relation tokens so it instead depends on:
  - selected syntax rule
  - matched literal structure
  - or another explicit replacement contract
- Update tests that assert relation-token raw/canonical behavior.
- Update docs that still describe the raw/canonical distinction as a supported contract.

## Out of Scope

- Introducing compact alternative-literal syntax such as `in|into`
- Reintroducing legacy keyed parser rules
- Broad command redesign outside relation-token cleanup
- Engine/core changes outside `bundle-rantamuta`

## Current Runtime Surfaces

The following runtime surfaces currently participate in the legacy relation-token model:

- `bundles/bundle-rantamuta/lib/session/verb-local-syntax.js`
  - `canonicalizeRelation(...)`
  - compiled rule field `canonicalRelationToken`

- `bundles/bundle-rantamuta/lib/session/entity-resolution.js`
  - legacy relation canonicalization for old rule handling
  - interpretation artifact fields:
    - `relationTokenRaw`
    - `relationTokenCanonical`

- `bundles/bundle-rantamuta/lib/session/command-dispatch.js`
  - structured NPC intent field `relationToken`
  - indirect permission and hook flow currently consumes `relationTokenCanonical`

- `bundles/bundle-rantamuta/commands/put.js`
  - render wording currently branches on `relationTokenCanonical`

## Behavioral Risks

This cleanup is not just dead-code removal. It changes how indirect-role semantics are carried through the runtime.

The main risks are:

- indirect permission lookup currently keys by canonical relation token
- indirect hook calls currently pass `relationTokenCanonical`
- some commands currently branch on canonical relation values
- tests and docs still encode the old contract

Because of that, this cleanup should be treated as a deliberate contract rewrite, not a blind deletion pass.

## Recommended Replacement Direction

Preferred direction:

1. Relation literals remain authored syntax only.
2. Selected syntax rule becomes the authoritative source of relation semantics.
3. Downstream runtime code should not receive raw/canonical relation-token pairs.
4. Any downstream behavior that still needs to distinguish forms must do so through:
   - selected syntax rule identity
   - matched literal atoms
   - or an explicit new field with a narrower purpose than the old canonicalization model

## Implementation Scope for a Future Change

The eventual cruftectomy should likely proceed in this order:

1. Remove structured NPC `relationToken` support from `command-dispatch.js`.
2. Remove `canonicalRelationToken` from compiled syntax rules.
3. Remove `relationTokenRaw` / `relationTokenCanonical` from entity-resolution artifacts.
4. Replace downstream runtime consumers:
   - indirect permission resolution
   - `canIndirect(...)`
   - `planIndirect(...)`
   - command-specific relation branching such as `put`
5. Update tests to stop asserting raw/canonical relation-token behavior.
6. Update manuals/normative docs to remove the raw/canonical contract.

## Open Questions

- What exact downstream value should replace `relationTokenCanonical` for indirect permission matching?
- Should indirect policy/hook dispatch depend on:
  - selected syntax rule id
  - literal token text
  - or a new verb-defined semantic marker?
- Should commands like `put` branch directly on selected syntax rule text instead of a relation token field?

These questions are intentionally deferred. This stub exists to make the cleanup boundary explicit before implementation resumes.

## Records

- Normative docs likely affected:
  - `docs/normative/CommandArchitecture.md`
- Manuals likely affected:
  - `docs/manuals/VerbDesign.md`
  - `docs/manuals/BundleRantamutaTechnicalManual.md`
  - `docs/manuals/DesignerManual.md`

## Acceptance Criteria For The Future Change

- No runtime code depends on `relationTokenRaw`.
- No runtime code depends on `relationTokenCanonical`.
- No runtime code accepts structured NPC `relationToken`.
- No runtime relation canonicalization path remains.
- Any required indirect-role semantics are carried by an explicit replacement contract.
- Tests and docs no longer describe the raw/canonical relation-token model as supported behavior.
