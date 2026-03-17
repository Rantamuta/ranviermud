# Artifact Lifecycle

## Status

- Authority: non-normative draft
- Scope: document lifecycle vocabulary and workflow transitions for plans, checklists, implementations, and related working artifacts

## Goal

Define a clear lifecycle model for non-normative working documents so planning artifacts, execution artifacts, and archive material use consistent terminology and predictable transitions, while normative documents use a separate and simpler status model.

## Intent

People working in this repository should be able to tell two things apart immediately:

- where a working artifact is in its working life, and
- what authority that artifact has for its scope.

Normative documents and working artifacts should not share the same status vocabulary. Lifecycle belongs to working artifacts. Normative documents use a separate status model.

## In Scope

- lifecycle vocabulary for non-normative working artifacts,
- lifecycle transition rules for design docs, plans, checklists, and implementation artifacts,
- scope-aware authority rules derived from artifact class and lifecycle,
- archive cleanup expectations,
- normative document status conventions as a separate artifact class,
- proposed workflow insertion points for `docs/normative/plan.md`, `docs/normative/checklist.md`, and `docs/normative/implementation.md`,
- header conventions for new or revised documents.

## Out of Scope

- ADR status vocabulary,
- changelog policy,
- user-visible runtime behavior contracts unrelated to document workflow,
- mandatory migration of every historical document in one pass.

## Working Artifact Lifecycle

Lifecycle applies only to non-normative working artifacts.

It does not apply to documents in `docs/normative/`.

### Lifecycle values

The lifecycle field for working artifacts should use only these values:

- `draft`
- `planning`
- `active`
- `archived`

### Lifecycle meanings

#### `draft`

The artifact is exploratory or under discussion.

Characteristics:

- content may still change substantially,
- it is not yet the approved basis for checklist authoring or execution,
- it is not archive-only historical material.

#### `planning`

The artifact has been selected as a current planning input, but work is not yet being executed directly from it.

Characteristics:

- it is the current reviewed basis for planning and/or checklist derivation,
- it may be cited as an active planning source,
- implementation is not yet being performed directly from the artifact itself.

Typical examples:

- an approved plan,
- a design draft that is still the active planning basis for a derived plan,
- a checklist that has been authored and approved but not yet entered execution.

#### `active`

Work is currently being performed from this artifact.

Characteristics:

- contributors are directly executing work from it now,
- it is part of the currently active workstream rather than merely historical planning context,
- it is not yet archive material.

Typical examples:

- an implementation checklist during active execution,
- a plan that maintainers explicitly continue to execute from directly.

An `active` artifact is authoritative for its scope.

#### `archived`

The artifact is retained for historical reference only.

Characteristics:

- it is no longer an active planning or execution source,
- it must not be treated as an active authority source,
- it belongs under `docs/archive/**`.

## Authority by Artifact Class and Lifecycle

Lifecycle answers:

- where is this artifact in its working life?

Authority answers:

- what role may this artifact play as a source of truth for its scope?

Authority is derived from two things together:

- artifact class, and
- lifecycle.

### Scope matters

When this policy says an artifact is authoritative, it means authoritative for its scope.

Examples:

- an active checklist is authoritative for the current implementation workstream,
- a planning-stage approved plan is authoritative for planning and checklist derivation while that plan remains the approved planning source,
- a normative document is authoritative for the repository behavior or workflow surface it governs.

These are all authoritative, but not in the same way and not over the same scope.

### Artifact classes

This policy uses these high-level classes:

- non-normative working artifacts such as designs, plans, and checklists,
- archived historical artifacts,
- normative documents in `docs/normative/`.

### Authority rules

Rules:

- `draft` artifacts are exploratory and are not authoritative sources for execution.
- `planning` artifacts are authoritative planning inputs for their scope, but work is not yet being executed directly from them unless another workflow rule says so.
- `active` artifacts are authoritative for their scope because work is currently being performed from them.
- `archived` artifacts are not authoritative and must not be used as active source-of-truth documents.
- normative authority comes from documents with `Status: normative` in `docs/normative/`.
- workflow authority for a task comes from the active approved artifacts for that task.
- lifecycle values must not be assigned to normative documents.
- documents must not use `Status: normative` as a lifecycle value.
- documents must not invent authority-like lifecycle values.

### Practical result

Examples:

- a design draft in `docs/drafts/` can be `Lifecycle: draft` and non-authoritative for execution,
- an approved plan can be `Lifecycle: planning` and authoritative for planning scope,
- an executing checklist can be `Lifecycle: active` and authoritative for the current implementation workstream,
- an archived implementation checklist can be `Lifecycle: archived` and historical only,
- a document in `docs/normative/` can use `Status: normative` and be authoritative for the behavior or workflow surface it governs.

## Header Convention

For non-normative working artifacts governed by this policy, prefer a `Lifecycle` field instead of using `Status` as a lifecycle label.

Recommended shape for a working draft:

```md
## Status

- Lifecycle: draft
- Scope: ...
```

Recommended shape for an archived working artifact:

```md
## Status

- Lifecycle: archived
- Scope: historical reference only
```

Recommended shape for normative documents:

```md
## Status

- Status: normative
- Scope: ...
```

Notes:

- the section heading may remain `## Status` for continuity,
- non-normative working artifacts should use `Lifecycle: ...`,
- normative documents are the exception and should use `Status: normative`,
- historical documents may retain older `Status:` usage until touched,
- when an in-scope working artifact is materially revised, it should be migrated to the `Lifecycle:` form.

## Transition Rules

### Draft to planning

A working artifact moves from `draft` to `planning` when maintainers explicitly adopt it as an active planning source.

Examples:

- a design doc becomes the basis for plan refinement,
- a plan becomes the approved source for checklist authoring,
- a completed checklist is approved and waiting for execution.

### Planning to active

A working artifact moves from `planning` to `active` when work is explicitly being performed from it.

Examples:

- checklist execution begins from an approved checklist,
- a plan is explicitly being followed directly for current work.

### Any working state to archived

A working artifact moves to `archived` when it is no longer an active planning or execution artifact.

Examples:

- implementation is complete and the checklist is no longer the active execution artifact,
- a plan has been superseded by a newer plan,
- a draft is abandoned,
- a design doc has historical value but is no longer part of the active workstream.

## Workflow-Specific Transition Rules

### Design doc -> plan

If a plan is derived from a design doc that carries lifecycle metadata, and that design doc remains part of the active planning basis, the design doc must be moved to `planning` when the derived plan is moved to `planning`.

This keeps the source design artifact and the approved plan aligned while planning is still actively using both.

### Plan -> checklist

When a plan becomes the approved source for checklist authoring, the plan must be `planning`.

If the checklist includes lifecycle metadata, it should also be `planning` once authored and approved but before implementation begins.

### Checklist -> implementation

When maintainers explicitly approve checklist execution, the checklist must move to `active`.

If implementation is still being performed directly from the source plan or design doc, those artifacts may also be `active`. If they are no longer being worked from directly, they should remain `planning`.

### Completion cleanup

When implementation completes, the completed checklist and any completed implementation-specific planning artifacts that are no longer part of an active workstream must:

- move to the appropriate location under `docs/archive/**`, and
- update lifecycle to `archived`.

If a design doc or plan remains an active source for future follow-on work, it should not be archived solely because one implementation pass completed.

Archive movement should reflect active use, not just age.

## Normative Documents

Normative documents do not participate in lifecycle metadata.

Rules:

- documents in `docs/normative/` should use `Status: normative`,
- documents in `docs/normative/` with `Status: normative` are authoritative for the repository behavior or workflow surface they govern,
- if a normative document is retired from the active normative set, it should be moved out of `docs/normative/`,
- once moved out of `docs/normative/`, it may adopt lifecycle metadata if it becomes a non-normative working or archived artifact,
- normative status must not be expressed as a lifecycle token.

## Archive Rules

Archived documents are historical reference only.

When a working artifact moves to archive:

- lifecycle must be `archived`,
- the document must live under `docs/archive/**`,
- active workflow docs must not treat it as the current source of truth.

This aligns archive placement, lifecycle, and repository policy.

## Incremental Migration Strategy

This policy should be adopted incrementally.

Recommended order:

1. establish this lifecycle vocabulary,
2. establish that normative docs use `Status: normative`,
3. update workflow norms to reference the lifecycle model,
4. use `Lifecycle:` for newly touched planning and execution artifacts,
5. migrate older working artifacts opportunistically when they are already being edited,
6. avoid broad archive cleanup or header-only churn unless explicitly requested.

## Proposed Insertions Into Existing Workflow Docs

### `docs/normative/plan.md`

Suggested insertion near `Source of Truth`:

> If the plan or any source design document includes lifecycle metadata, the approved plan must be `planning`. If a source design document remains part of the active planning basis for that plan, it must also be `planning`.

### `docs/normative/checklist.md`

Suggested insertion near `Plan prerequisite` or `Traceability`:

> If the approved plan includes lifecycle metadata, it must remain `planning` during checklist authoring. If the checklist includes lifecycle metadata, it should be `planning` once authored and approved, until implementation execution begins.

### `docs/normative/implementation.md`

Suggested insertion near `Final validation`:

> When implementation begins, the executed checklist must be `active` if it carries lifecycle metadata. When implementation completes or the work is explicitly abandoned or superseded, implementation artifacts that are no longer part of an active workstream must be moved under `docs/archive/**` and updated to `Lifecycle: archived`.

### `docs/archive/README.md`

Suggested addition:

> Archived working artifacts should use `Lifecycle: archived` when they carry lifecycle metadata. Archive placement and archived lifecycle must agree.

## Open Questions

1. Should approved-but-not-yet-executing checklists always be `planning`, or should they become `active` immediately on approval?

Current recommendation: `planning` until execution begins. `active` should mean work is currently being performed from the artifact.

2. Should archived docs with older `Status:` values be normalized in a separate archive cleanup task?

Current recommendation: yes, but as a distinct cleanup task rather than hidden drive-by churn.

## Acceptance Criteria

- The draft defines a lifecycle vocabulary for non-normative working artifacts.
- The draft states that normative documents use `Status: normative` and do not carry lifecycle metadata.
- The draft explains authority as a function of artifact class plus lifecycle, with explicit scope distinctions.
- The draft names explicit lifecycle transitions for planning, execution, and archive cleanup.
- The draft provides concrete insertion text for `plan`, `checklist`, `implementation`, and archive guidance.
