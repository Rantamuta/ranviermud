# Checklist writing instructions

Companion goal: keep checklist authoring lean and implementation-ready, with no execution drift.

You have been tasked with creating a checklist for a task. These are the instructions for doing that properly.

## Status

- Status: normative-v1
- Scope: Task implementation workflow and commit protocol
- Binding: yes

## Applicability

This process applies when a maintainer explicitly requests implementation through this document (for example: "implement this per `docs/normative/checklist.md`" or "...per `norms/checklist`" for short).

Expected directive form:

- "Create the implementation checklist per `docs/normative/checklist.md` and stop for review."

Rules:

- MUST produce a checklist file under `docs/drafts/checklists/`.
- MUST stop after checklist authoring and wait for explicit approval.
- MUST NOT implement behavior changes during this phase.

Related policies:

- `AGENTS.md` (approval, validation, and stop-rule guardrails)
- `docs/ADR_POLICY.md` (decision-record requirements)
- `docs/CHANGELOG_POLICY.md` (user-visible change logging)

There have been discussions about how to implement the task. This exercise is to write a step-by-step implementation checklist according to those instructions such that an engineer could implement your vision of the plan simply by following the checklist. The intent is to review and discuss specifics so there is no drift between understanding.

Each checklist item MUST be a minimal, imperative, and checkable implementation step.
Use one behavior change per item.
If code is modified, name the exact function/file and the concrete change.
If an item depends on another, state that dependency explicitly.
Prefix each item with a short scope tag (e.g. `[description]`, `[cli]`, `[docs]`).
You MAY add one brief sub-bullet for context.
You MUST NOT include tests or testing in this exercise, as that topic is addressed in a later step.

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
- [ ] [description] Add optional field `basicText?: string` to interface `DescriptionSentence` in `src/pipeline/description.ts`
- [ ] [description] Set `basicText` on the `movement_structure` sentence object in `generateRawDescription` in `src/pipeline/description.ts` (depends on previous item)
- [ ] [cli] Map `sentence.basicText` to `basicText` in structured sentence output inside `attachTileDescriptions` in `src/app/run-describe.ts` (depends on first item)
  - Keeps baseline text available for later transformed rendering.

## Behavior Slices

- `S1`
  - Goal: add `basicText` to description data model and generation path.
  - Items: first and second checklist items above.
  - Type: behavior
- `S2`
  - Goal: wire `basicText` into CLI structured output.
  - Items: third checklist item above.
  - Type: behavior
```
