
```
# Artifact Lifecycle

## Status

- Authority: normative
- Scope: lifecycle vocabulary for non-normative working artifacts

## Policy

Lifecycle status applies only to task-scoped non-normative working artifacts such as design docs, plans, checklists, and implementation working documents.

Reference documents that are not part of a task artifact set, such as manuals or other standing reference docs, do not use lifecycle status unless a more specific normative document explicitly says otherwise.

For a task that has multiple related working artifacts, lifecycle status applies to the task artifact set as a whole.
Related task artifacts MUST keep their lifecycle status synchronized unless a more specific normative document explicitly says otherwise.
When a document enters a task artifact set, it MUST inherit the current lifecycle status of that task artifact set.

Lifecycle status is denoted in the document with:

`- Status: <Lifecycle value>`

Lifecycle does not apply to ADR or normative documents.

All non-archived working artifacts MUST use one of the lifecycle values defined below.

## Lifecycle Values

Working artifacts may use only:

- `draft`
- `planning`
- `active`
- `archived`

## Meanings

- `draft`: exploratory or under discussion
- `planning`: selected as the current planning basis, including approved planning artifacts and their associated checklist artifacts
- `active`: currently being used to guide or track execution work
- `archived`: historical reference only

## Transitions

Working artifacts transition:

- from `draft` to `planning` when a task is adopted as the current planning basis
- from `planning` to `active` when implementation begins for that task artifact set
- to `archived` when no longer used for active planning or execution
  - when transitioning to `archived`, the document must also be *moved* to `docs/archive/**`

## Archive Rule

Archived artifacts must:

- use `Status: archived`
- live under `docs/archive/**`
- be treated as historical reference only

For related design or working documents:

- if the document is fully represented by the task's approved plan/checklist/history and is no longer needed for future phases, it MUST be archived with the rest of that task artifact set
- if the document is still intended to guide later phases or other active work, it MAY remain outside the archive and continue with the lifecycle status of the active task artifact set it belongs to

## Header Convention

Working artifacts:

```md
## Status

- Status: draft
- Scope: ...
