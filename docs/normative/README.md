# Normative Documents

This directory contains behavior contracts that are normative for this repository.

## Purpose

- Make compatibility-impacting behavior explicit in-repo.
- Prevent drift between implementation, tests, and maintainer expectations.
- Provide versioned contracts that can be changed intentionally.

## Current normative set

- `CommandInteractionReferenceProfile-v1.md`
- `ParserPortingInstructions.md`

## Proposed normative extensions (in review)

- `VerbRulesAndHooksContract.md`

## Precedence

When documents conflict, precedence is:

1. Explicit user direction for the active task.
2. `AGENTS.md` repository guardrails.
3. Files in `docs/normative/` (this directory).
4. Non-normative docs under `docs/`.

If two normative docs conflict, the more specific document for the affected subsystem wins.

## Change control

- Treat changes here as compatibility-impacting unless explicitly noted otherwise.
- Any PR that changes files in `docs/normative/` should:
  - state what behavior changed and why,
  - include validation updates/tests if behavior is executable,
  - add or update changelog entries when user-visible behavior changes.
