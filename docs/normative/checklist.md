# Checklist writing instructions

Companion goal: keep checklist authoring lean and implementation-ready, with no execution drift.

You have been tasked with creating a checklist for a task. These are the instructions for doing that properly.

## Status

- Authority: normative
- Scope: Task checklist-authoring workflow
- Binding: yes

## Applicability

This process applies when a maintainer explicitly requests checklist authoring through this document (for example: "create the checklist per `docs/normative/checklist.md`" or "...per `norms/checklist`" for short).

Expected directive form:

- "Create the implementation checklist per `docs/normative/checklist.md` and stop for review."

Rules:

- MUST produce a checklist file under `docs/drafts/checklists/`.
- MUST include lifecycle metadata per `docs/normative/ArtifactLifecycle.md`.
- the checklist MUST use `Status: planning` to match the related task artifact set.
- MUST stop after checklist authoring and wait for explicit approval.
- MUST NOT implement behavior changes during this phase.

Related policies:

- `AGENTS.md` (approval, validation, and stop-rule guardrails)
- `docs/CHANGELOG_POLICY.md` (user-visible change logging)
- `docs/normative/ArtifactLifecycle.md` (working-artifact lifecycle vocabulary and transitions)
- `docs/normative/plan.md` (plan approval and source-of-truth requirements)

There have been discussions about how to implement the task. This exercise is to write a step-by-step implementation checklist according to those instructions such that an engineer could implement your vision of the plan simply by following the checklist. The intent is to review and discuss specifics so there is no drift between understanding.

## Plan prerequisite

Checklist authoring begins only after plan refinement is complete under `docs/normative/plan.md`.

Before drafting checklist items, lock from the approved plan:

- in-scope statements
- out-of-scope statements
- acceptance criteria
- required evidence types from `Validation Strategy`, when that section is required by `docs/normative/plan.md`

If the plan changes behavior, contracts, or build outputs and does not include the required `Validation Strategy` section, stop and fail checklist conformance review before drafting items.

## Checklist Artifact Lifecycle

Checklists are non-normative working artifacts governed by `docs/normative/ArtifactLifecycle.md`.

Lifecycle rules for checklists:

- checklist authoring from an approved plan produces a `Status: planning` artifact that matches the related plan
- the approved plan and checklist remain `Status: planning` through review and approval for implementation
- when implementation begins from the approved checklist, execution updates the related task artifacts to `Status: active` under `docs/normative/implementation.md`
- when the task is complete, the checklist MUST be updated to `Status: archived` and moved to `docs/archive/**`

## Traceability

The approved plan is the source of truth for checklist authoring.

Every checklist MUST include near the top:

- `Source plan: <path>`
- concise locked scope bullets for approved `In Scope`, `Out of Scope`, and `Acceptance Criteria`

Every checklist item MUST be directly traceable to approved plan text through a short trace block that cites:

- a direct quote from the plan
- the source section heading
- optional line numbers when helpful for review

Checklist items MUST NOT silently add scope beyond the approved plan.

If a useful item is outside the approved plan, label it exactly as `Proposed Add-on (Not in Plan)` and include a one-line rationale. Such items are advisory only until explicit written approval exists.

## Item quality

Each checklist item MUST be:

- atomic
- imperative
- checkable
- scoped with a short tag such as `[dispatch]`, `[docs]`, or `[audit]`
- independently completable, or inseparable within one approved behavior slice

Additional rules:

- Use one behavior change per item.
- If code is modified, name the exact file/function and the concrete change.
- If an item depends on another, state that dependency explicitly.
- You MAY add brief sub-bullets for traceability, locked context, or validation handoff only.
- You MUST NOT include tests, test commands, or testing steps in this exercise, as validation belongs to implementation execution under `docs/normative/implementation.md`.

## Validation handoff

When the source plan includes a `Validation Strategy` or acceptance criteria that require explicit evidence:

- each implementation item MUST name its validation handoff
- the handoff MAY cite a behavior slice and required evidence type such as `unit`, `integration/smoke`, or `contract/parity`
- the handoff MUST stay tied to approved plan intent
- do not introduce test commands, `Txx` items, or speculative validation work in the checklist

## Atomicity gate

A checklist item is ready for approval only if:

- it can be marked complete without also implicitly completing another checklist item, unless the two are inseparable in one approved behavior slice
- it can be implemented without mixing unrelated scope

If an item fails this gate, split it before implementation approval.

## Checklist QC modes

Two QC modes are supported:

- `Conformance QC` (default): verify checklist fidelity to the approved plan and checklist norms only
- `Advisory QC` (optional): propose improvements beyond the current approved plan/checklist

Conformance QC output format:

- `Missing from plan`
- `Extra beyond plan`
- `Atomicity fixes needed`
- `Validation handoff gaps`
- `Pass/Fail: checklist achieves plan goals`

If advisory suggestions are included, place them under a separate `Advisory` section after the conformance results.

After drafting atomic checklist items, you MUST add a final grouping pass as a dedicated section:

## Behavior Slices

This section defines execution bundles for implementation. It does not replace atomic checklist items.

Rules:

1. Add a `## Behavior Slices` section at the end of the checklist.
2. Define slices as `S1`, `S2`, `S3`, etc.
3. Each slice MUST contain:
   - `Goal`: one coherent behavior change.
   - `Items`: explicit checklist items covered by the slice.
   - `Type`: `behavior` or `mechanical`.
4. Every checklist item MUST be assigned to exactly one slice.
5. A slice MAY include multiple dependent checklist items.
6. Slices MUST remain within the approved checklist scope.
7. Do not include tests or testing steps in this section.

e.g.

```md
## Status

- Status: planning
- Scope: add `basicText` to structured description output
- Source plan: `docs/drafts/example-plan.md`
- In Scope:
  - preserve baseline description text in the data model and CLI output
- Out of Scope:
  - any render-time transformation of `basicText`
- Acceptance Criteria:
  - structured output exposes `basicText` when the sentence provides it

## Checklist

- [ ] `C01` [description] Add optional field `basicText?: string` to interface `DescriptionSentence` in `src/pipeline/description.ts`.
  - Trace:
    - "`DescriptionSentence` must preserve baseline text for downstream renderers." (`Data Model`)
  - Validation handoff: `S1`, `unit`
- [ ] `C02` [description] Set `basicText` on the `movement_structure` sentence object in `generateRawDescription` in `src/pipeline/description.ts` (depends on `C01`).
  - Trace:
    - "Generation must populate baseline text where movement sentences are produced." (`Generation`)
  - Validation handoff: `S1`, `integration/smoke`
- [ ] `C03` [cli] Map `sentence.basicText` to `basicText` in structured sentence output inside `attachTileDescriptions` in `src/app/run-describe.ts` (depends on `C01`).
  - Trace:
    - "CLI structured output must expose `basicText` when present." (`Output Surface`)
  - Validation handoff: `S2`, `contract/parity`

## Behavior Slices

- `S1`
  - Goal: add `basicText` to description data model and generation path.
  - Items: `C01`, `C02`.
  - Type: behavior
- `S2`
  - Goal: wire `basicText` into CLI structured output.
  - Items: `C03`.
  - Type: behavior
```
