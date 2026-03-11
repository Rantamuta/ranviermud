# ADR-0001: Standardize Implementation Workflow

- Status: proposed
- Date: 2026-02-22
- Owner: maintainers

## Context

Implementation guidance is currently repeated ad hoc per task. This creates drift in how changes are planned, tested, committed, and reviewed.

The repository already treats compatibility and reliability as first-class constraints. A repeatable implementation process is needed so a checklist can be executed by a less-contextual contributor without interpretation.

## Decision

Adopt a normative implementation workflow across planning, checklist authoring, and checklist execution:

1. Plan the intended change in a reviewable document that defines scope, acceptance criteria, and required validation evidence when applicable.
2. Author an unambiguous implementation checklist from the approved plan and stop for approval.
3. Execute the approved checklist in strict order with test-first discipline and commit hygiene.

Checklist authoring is plan-driven rather than freeform. The approved plan remains the source of truth for checklist scope and intent, and checklist items should be atomic, traceable to quoted plan text, and prepared with explicit validation handoff to the implementation phase without embedding test steps in the checklist itself.

## Consequences

Positive:

- Higher execution consistency across contributors and agents.
- Cleaner audit trail via explicit test and implementation commits.
- Lower interpretation risk for checklist-driven work.
- Clearer review boundary between approved plan scope and advisory follow-up work.

Tradeoffs:

- More process overhead per checklist item.
- More, smaller commits.
- Upfront checklist authoring time.
- Additional checklist-review overhead to confirm traceability and atomicity.

## Follow-ups

- Confirm whether this policy should be mandatory for all behavior-changing tasks or only checklist-scoped tasks.
- Move this ADR from draft to accepted status once maintainers approve.

## Related

- `docs/normative/plan.md`
- `docs/normative/checklist.md`
- `docs/normative/implementation.md`
