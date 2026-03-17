# Ambiguous Entity Slot Deferred Plan

## Status

- Status: draft
- Scope: deferred follow-up for bundle-layer verb-local syntax matching
- Posture: discussion stub only; not implementation approval

## Goal

Define a principled replacement for the current unresolved-indirect compatibility bridge in verb-local syntax matching.

## Problem

Verb-local syntax matching now makes entity-bearing slot viability part of rule matching. That is the correct default, but it exposes a real gap for commands that want to capture an entity-like reference without requiring immediate unique resolution.

The concrete pressure point is indirect references in forms such as:

- `unlock ENTITY with ...`
- `open ENTITY with ...`

With ordinary entity-bearing slots, a rule like:

- `ENTITY with ENTITY`

requires the indirect slot to resolve during matching. If that slot does not resolve, or resolves ambiguously, the rule fails before command logic gets a chance to interpret the captured reference.

That behavior is correct for most commands. It is not always correct for commands whose authored logic wants to reason about the unresolved or ambiguous indirect reference later, for example when choosing among keys or other compatible tools.

## Current Bridge

We currently have `allowUnresolvedIndirect` as a compatibility bridge.

That bridge exists to let certain command flows continue even when the indirect slot does not resolve during normal entity-resolution matching.

This is useful as a hotfix and compatibility posture, but it is not a satisfying long-term architecture because:

- it hides important rule behavior in side metadata
- it does not read directly from the authored syntax declaration
- it preserves legacy semantics in a way that is harder to reason about than the new verb-local syntax model

## Proposed Direction

Instead of relying on a side flag such as `allowUnresolvedIndirect`, add an explicit slot kind for entity-intended references that are allowed to remain unresolved or ambiguous at match time.

One candidate name is:

- `AMBIGUOUS_ENTITY`

The reason to consider `AMBIGUOUS_ENTITY` is that it would allow the specific ambiguity condition to pass through the matcher while preserving the available indirect candidates for later command-level interpretation.

Example future rule forms:

- `unlock ENTITY with AMBIGUOUS_ENTITY`
- `open ENTITY with AMBIGUOUS_ENTITY`

In that model:

- `ENTITY` continues to require immediate resolution
- `AMBIGUOUS_ENTITY` is allowed to preserve unresolved or ambiguous entity-reference information for downstream logic
- command logic can inspect the captured reference and candidate set and decide what to do

## Why This Is Better Than The Bridge

An explicit slot kind would be more honest than `allowUnresolvedIndirect` because:

- the rule declaration would describe the intended behavior directly
- the matcher contract would stay declarative
- the exception would be local to the syntax rule rather than hidden in compatibility metadata
- future maintainers could understand the behavior by reading the rule itself

## Deferred Questions

The details are intentionally deferred, but the main questions are:

1. Is `AMBIGUOUS_ENTITY` the right name?
2. Should the slot preserve only ambiguity, or also plain unresolved entity-like references?
3. Should the slot carry:
   - surface text
   - token range
   - candidate list
   - scope information
4. Should the slot be limited to indirect positions at first?
5. How should downstream permissions and indirect hooks behave when the indirect slot is intentionally not resolved?

## Intended Future Direction

Preferred direction for a future change:

1. Keep `allowUnresolvedIndirect` only as an interim bridge.
2. Design an explicit slot kind for deferred entity interpretation.
3. Migrate commands that truly need deferred indirect interpretation to that slot kind.
4. Remove the hidden bridge once the explicit syntax surface exists.

## Records

- Related current runtime bridge:
  - `allowUnresolvedIndirect`
- Related current architecture work:
  - `docs/drafts/VerbLocalSyntaxMatchingPlan.md`
  - `docs/plans/relationTokenCruftectomyPlan.md`
