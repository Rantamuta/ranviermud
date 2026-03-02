# D2 Metadata Query Compatibility Plan (Draft)

## Status

- Status: `draft-v2`
- Type: decision-locked migration plan (not implementation checklist)
- Scope: full migration from legacy `*Flag` helpers/shape to metadata `values` + `q.get*Metadata`

## Goal

Execute immediate migration so that:

- `q.getRoomMetadata(...)` and `q.getAreaMetadata(...)` fully replace `q.roomFlag(...)` and `q.areaFlag(...)` for room/area metadata reads.
- Legacy `q.*Flag` usages are fully replaced with `q.get*Metadata(...)` across code, documents, and authored content.
- Legacy `metadata.flags` usage is fully replaced with `metadata.values` throughout the codebase.
- Boolean state is authored via `set*Metadata` instructions and read via `q.get*Metadata`.
- Write-path preserves authored key casing.
- Read-path resolves metadata keys case-insensitively so casing variants address the same logical path.

## Current State (Observed)

- Metadata value helpers (`q.getRoomMetadata`, `q.getAreaMetadata`) read `metadata.values`.
- Legacy boolean helpers (`q.roomFlag`, `q.areaFlag`) remain in active use across authored predicates.
- Legacy boolean helper compatibility/fallback behavior still exists and must be removed.
- `metadata.flags` references still exist and their key-values must be migrated to `metadata.values`.

## Pre-Implementation Discovery Gate (Required)

Before any D2 runtime changes:

1. Run an intentional repository search for metadata key usage that could collide under case-insensitive reads (same logical path, different casing).
2. Include authored content and runtime callsites in the search scope.
3. Record findings in the implementation artifact for D2.
4. If any collision is found, record the hit list and keep implementation aligned with D2 runtime collision behavior (`warn + return last matched value`) rather than blocking migration.

This gate is required because D2 changes read semantics and can otherwise silently redirect existing lookups.

## Migration Decisions (Locked)

1. Migration timeline is immediate.
2. No staged deprecation: replace all `q.*Flag` usage in this plan with `q.get*Metadata(...)`.
3. Remove `metadata.flags` usage entirely in this plan.
4. Move all relevant boolean reads/writes to metadata APIs (`set*Metadata`, `q.get*Metadata`).
5. No compatibility precedence between `flags` and `values` is retained after migration.
6. Case-insensitive read collision handling is non-fatal: emit warning and return the last matched value.

## Test Sequencing Rule (Locked)

1. Do not modify tests before code/content/docs migration changes are applied.
2. Run existing tests after migration changes to surface breakage/regressions.
3. Record failures as migration evidence.
4. Update tests only after failures are observed and attributed to intended migration.
5. Apply extensive testing for metadata query migration, including:
   - repository-wide callsite replacement verification (no remaining `q.*Flag` usages in active code/content/docs),
   - query behavior tests for booleans and non-booleans through `q.get*Metadata`,
   - case-insensitive read coverage (`foo.bar` vs `Foo.Bar`) with preserved authored casing on write,
   - regression scenarios covering former `flags`-backed paths now resolved via `values`.

## Risks to Watch

- Missed legacy `q.*Flag` or `metadata.flags` references leaving partial migration.
- Case-collision keys causing ambiguous resolution once reads become case-insensitive.
- Mechanical churn across code/docs/content creating unintended regressions outside query semantics.
- Insufficient migration testing allowing silent behavior drift after broad callsite replacement.

## Documentation Requirements

- Add explicit convention guidance that metadata keys must be treated as case-insensitive at read-time to avoid future casing collisions.
- Keep this as convention/documentation guidance (not key-shape enforcement).

## Proposed Next Step

Convert this plan into an implementation checklist with:

- required collision-discovery search and stop/evaluate gate,
- full `q.*Flag` replacement tasks with `q.get*Metadata` (runtime/content/docs),
- full `metadata.flags` replacement with `metadata.values`,
- locked test sequencing (no pre-change test edits) plus extensive post-change regression coverage,
- manual/docs alignment and explicit casing convention notes,
- authored-predicate audit and completion proof (zero remaining legacy `q.*Flag` usages).

## Checklist Review Passes

### Pass 1: Quality Control

- Issue: Checklist coverage for authored `metadata.flags` migration was incomplete (only one file listed) while active authored flags still exist in four files.
- Decision: Expand checklist data-migration scope to include all currently known authored `metadata.flags` locations:
  - `bundles/bundle-rantamuta/areas/codex/manifest.yml`
  - `bundles/bundle-rantamuta/areas/codex/rooms.yml`
  - `bundles/bundle-rantamuta/areas/test/manifest.yml`
  - `bundles/bundle-rantamuta/areas/test/rooms.yml`

- Issue: Discovery gate findings were run but not represented in checklist state.
- Decision: Reintroduce discovery as explicit checklist item and mark it complete with result summary (no case-collision groups found in scanned sources).

### Pass 2: Integration

- Issue: Checklist and plan had potential integration drift around active draft docs still describing transitional `q.*Flag`/`metadata.flags` behavior.
- Decision: Add explicit checklist item to align active draft docs (for example `docs/drafts/ScopedFlagMutatorProposal.md`) with D2 canonical posture.

- Issue: Final audit scope previously omitted active tests, risking residual legacy references after runtime/content/docs migration.
- Decision: Expand final audit item scope to include active tests so the "zero remaining legacy usage" goal can be proved across non-archive active files.

### Pass 3: Sanity

- Result: No blocking contradictions remain between the D2 plan and checklist scope after QC/integration updates.
- Result: Collision policy is explicit and deterministic for D2 (`warn + return last matched value`).
- Result: Discovery pass found no case-collision groups in scanned runtime/content/test key literals and authored metadata paths.
- Result: Post-implementation audit removed active runtime/content use of `q.roomFlag(...)`, `q.areaFlag(...)`, and authored `metadata.flags` storage in area YAML.
- Deferred-by-design references remain only where they are explanatory checks or migration records:
  - negative assertions in active tests that verify `q.roomFlag`/`q.areaFlag` are absent and `metadata.flags` is no longer written/read,
  - D2 planning/checklist draft docs that describe migration scope and completed removals.
