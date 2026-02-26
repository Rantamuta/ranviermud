# ADR Policy

This policy defines how Architecture Decision Records (ADRs) are created, stored, and maintained in this repository.

ADRs are decision context records, not behavior contracts.
Binding behavior belongs in `AGENTS.md` and `docs/normative/`.

## Canonical locations

- Policy: `docs/ADR_POLICY.md` (this document)
- Accepted/superseded ADRs: `docs/adr/`
- Draft/proposed ADRs: `docs/drafts/adr/`

## Purpose

- Preserve long-term decision context and tradeoffs.
- Record why constraints changed without rewriting history.
- Provide maintainers and contributors with rationale for architectural direction.

## When an ADR is required

Create an ADR when a task changes or establishes:

- architecture boundaries or layering rules,
- long-term project constraints,
- compatibility posture,
- implementation/process policy,
- CI/validation policy with project-wide impact,
- significant runtime/platform support direction.

## When an ADR is optional

An ADR is usually not needed for:

- local implementation details inside established constraints,
- routine bug fixes,
- small refactors with no architectural or policy consequence.

## ADR file naming

Use `ADR-<NNNN>-<short-kebab-title>.md` (example: `ADR-0001-implementation-workflow.md`).

- `<NNNN>` is a zero-padded sequence.
- Titles should describe the decision, not the task ticket.

## Required ADR fields

Each ADR MUST include:

- Status (`proposed`, `accepted`, `superseded`, or `withdrawn`)
- Date (YYYY-MM-DD)
- Context
- Decision
- Consequences/tradeoffs

Recommended:

- Related links (normative docs, issues, PRs, superseding ADRs)

## ADR lifecycle

- Drafts start in `docs/drafts/adr/` with `Status: proposed`.
- Accepted ADRs move to `docs/adr/` with `Status: accepted`.
- Superseded decisions are recorded in a newer ADR; older ADR content is preserved.

## Permanence and supersession

ADRs are permanent records and MUST NOT be rewritten to reflect new decisions.

When direction changes:

- create a new ADR,
- mark the new ADR as superseding the older ADR(s).

Supersession annotations on older ADRs are optional and lazy:

- older ADRs MAY be annotated as superseded when maintainers notice the relationship,
- these updates MUST be append-only metadata (for example: `Superseded by: ADR-0007`),
- these updates MUST NOT rewrite original context, decision, alternatives, or consequences.

## Relationship to normative docs and changelog

- If executable behavior contracts change, update `docs/normative/`.
- If user-visible behavior changes, update `CHANGELOG.md` per `docs/CHANGELOG_POLICY.md`.
- ADRs capture rationale and decision history; they do not replace normative guidance.
