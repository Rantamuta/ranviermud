# Plan Conventions

Companion goal: turn a brainstormed implementation design into a formal, checklist-ready plan that is reviewable, traceable, and safe for this repository.

## Status

- Status: normative-v1
- Scope: Planning conventions and approval gating for tasks in this repo
- Binding: yes

## Applicability

This process applies when a maintainer explicitly requests a plan using this document (for example: "Write the plan per `docs/normative/Plan.md` and stop for review.").

Related policies:

- `AGENTS.md` (approval, validation, and stop-rule guardrails)
- `docs/ADR_POLICY.md` (decision-record requirements)
- `docs/CHANGELOG_POLICY.md` (user-visible change logging)
- `docs/normative/checklist.md` (checklist-authoring phase)

## Source of Truth

The approved plan is the source of truth for checklist authoring and implementation intent.

If implementation fails the approved plan intent, implementation has failed even if code compiles/tests pass.

Plans MUST NOT override or conflict with `docs/normative/**` or ADRs. If a conflict exists, revise the plan before approval or create/update the relevant ADR per `docs/ADR_POLICY.md`.

## Collaboration Requirement

Plan refinement is collaborative by default.

Do not treat a brainstorm draft as finalized plan scope without stepping through details together.

Before checklist authoring, collaborators MUST explicitly confirm:

- intended outcomes
- scope boundaries
- acceptance criteria
- unresolved ambiguities/deferments

## Explicit Approval Gate

Implementation MUST NOT begin until the maintainer grants explicit approval using one of these phrases:

- "Implement this."
- "Proceed."
- "Create the PR."
- "Apply the change."

If explicit approval is absent, remain in discussion/analysis mode.

## Repository Constraints

Plans must respect repository guardrails:

- This repo is the runnable wrapper and integration surface for the Rantamuta engine.
- No changes to engine internals (`Rantamuta/core`) unless explicitly approved.
- For `bundles/bundle-rantamuta`, preserve the runtime/content boundary:
  - `lib/**` and `commands/**` are content-agnostic runtime layers.
  - `areas/**` contains content-specific behavior and IDs.
  - Runtime layers MUST NOT depend on area content.

## Plan Sections

Include whatever sections are necessary to surface goal and intent clearly. More than that is noise that can hinder clarity.

### Required

A formal plan MUST include:

- `Goal` (plain-language objective)
- `Intent` (plain-language, human-readable statement of what success means, without jargon)
- `In Scope`
- `Out of Scope`
- `Acceptance Criteria`

### Possible

A formal plan MAY include:

- `Constraints` (technical/process constraints)
- `Risks and Mitigations`
- `Open Questions / Assumptions`
- `Validation Strategy` (required when the plan changes behavior, contracts, or build outputs)

## Plain-Language Intent Standard

The `Intent` section must be understandable by a contributor who did not write the plan.

Clarity rules:

- prefer everyday language over specialized shorthand
- define unavoidable technical terms in-line
- avoid overloaded terms without context
- avoid stacked clauses that hide multiple decisions

If neither collaborator can rewrite intent in plain language, pause planning and simplify before proceeding.

## Ambiguity and Risk Surfacing

During plan refinement, explicitly surface:

- ambiguous wording
- hidden assumptions
- cross-surface coupling risks
- potential contract/behavior conflicts

Any unresolved ambiguity MUST be either:

- resolved in the plan text, or
- captured as an explicit deferment with owner/follow-up phase

## Validation Strategy (When Required)

When a plan changes behavior, contracts, or build outputs, include a `Validation Strategy` section that states required evidence.

The strategy should specify applicable evidence levels:

- unit
- integration/smoke
- contract/parity
- non-functional checks (performance/size/timing), only when in scope

For each required evidence type, define what is considered pass/fail in plain language.

If behavior is changed, the strategy MUST reflect the required validations in `AGENTS.md` ("Validation requirements by task type").

## Compatibility and Records

If the plan introduces a compatibility-impacting change, it MUST include:

- the affected compatibility boundary,
- the required update to the relevant `docs/normative/**` contract (or why no update is needed),
- the required `CHANGELOG.md` update per `docs/CHANGELOG_POLICY.md`,
- whether an ADR is required per `docs/ADR_POLICY.md`.

## Plan QC Modes

Two QC modes are supported:

- `Conformance QC` (default): fidelity to user intent, scope, and required plan structure
- `Advisory QC` (optional): optional improvements beyond current plan

Conformance QC output format:

- `Intent clarity issues`
- `Missing required sections`
- `Ambiguities/assumptions to resolve`
- `Validation strategy gaps`
- `Traceability readiness`
- `Pass/Fail: ready for checklist authoring`

Advisory suggestions MUST be separated under a distinct `Advisory` section.

## Exit Criteria for Checklist Authoring

Checklist authoring under `docs/normative/checklist.md` may begin only when:

- required plan sections are present
- plan text contains clear, quotable statements under stable section headings so checklist items can cite source intent directly
- acceptance criteria are explicit and testable/checkable
- if required, `Validation Strategy` defines checkable evidence expectations
- plain-language intent is approved by collaborators
- conformance QC result is `Pass`
