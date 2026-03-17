# Artifact Lifecycle

## Status

- Scope: lifecycle vocabulary for non-normative working artifacts

## Policy

Lifecycle status applies only to non-normative working artifacts such as design docs, plans, checklists, and implementation working documents.

Lifecycle status is denoted in the document with:

`- Status: <Lifecycle value>`

Documents in `docs/normative/` do not use lifecycle metadata. They use `Authority: normative`.

Lifecycle does not apply to ADR documents.

All non-archived working artifacts MUST use one of the lifecycle values defined below.

Documents under `docs/archive/**` MAY retain older status values but SHOULD use `Status: archived` when modified.

## Lifecycle Values

Working artifacts may use only:

- `draft`
- `planning`
- `active`
- `archived`

## Meanings

- `draft`: exploratory or under discussion
- `planning`: selected as the current planning basis
- `active`: currently being used to guide or track execution work
- `archived`: historical reference only

## Transitions

Working artifacts transition:

- from `draft` to `planning` when adopted as the current planning basis
- from `planning` to `active` when work begins directly from them
- to `archived` when no longer used for active planning or execution
  - when transitioning to `archived`, the document must also be *moved* to `docs/archive/**`

## Archive Rule

Archived artifacts must:

- use `Status: archived`
- live under `docs/archive/**`
- be treated as historical reference only

## Header Convention

Working artifacts:

```md
## Status

- Status: draft
- Scope: ...
