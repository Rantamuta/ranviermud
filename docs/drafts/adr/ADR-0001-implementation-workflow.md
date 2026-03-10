# ADR-0001: Standardize Implementation Workflow

- Status: proposed
- Date: 2026-02-22
- Owner: maintainers

## Context

Implementation guidance is currently repeated ad hoc per task. This creates drift in how changes are planned, tested, committed, and reviewed.

The repository already treats compatibility and reliability as first-class constraints. A repeatable implementation process is needed so a checklist can be executed by a less-contextual contributor without interpretation.

## Decision

Adopt a normative implementation workflow in `docs/normative/implementation.md` with a two-phase model:

1. Phase A: author an unambiguous implementation checklist and stop for approval.
2. Phase B: execute the approved checklist in strict order with test-first discipline and commit hygiene.

## Consequences

Positive:

- Higher execution consistency across contributors and agents.
- Cleaner audit trail via explicit test and implementation commits.
- Lower interpretation risk for checklist-driven work.

Tradeoffs:

- More process overhead per checklist item.
- More, smaller commits.
- Upfront checklist authoring time.

## Follow-ups

- Confirm whether this policy should be mandatory for all behavior-changing tasks or only checklist-scoped tasks.
- Move this ADR from draft to accepted status once maintainers approve.

## Related

- `docs/normative/implementation.md`
