# Exit-Door Hook Cleanup Plan (Temporary)

## Goal
Move door/facade behavior to the `exit` target hook path (`canDirect`/`planDirect`) so `go` stays generic.

## Scope
- `bundle-rantamuta` only.
- Hook wiring on exits for facade-backed doors.
- Success render replacement via plan contributions.
- Remove facade-specific behavior from `go` where possible.

## Non-Goals
- No engine/core architecture changes.
- No redesign of movement semantics.
- No new command surfaces.

## Checklist
- [x] Confirm current `go` behavior baseline with tests.
- [x] Add/adjust tests for target end-state behavior first (these are expected to fail initially).
- [x] Keep new end-state tests failing during refactor; they must pass only when the full plan is complete.
- [x] Implement/finish exit hook attachment in facade script (`canDirect` + `planDirect` on matching exit).
- [x] Keep exit identity stable (`direction`, `name`, `keywords` remain direction-first).
- [x] In exit `planDirect`, emit facade semantic success messages when used.
- [x] Set `renderPolicy.replaceSuccess: true` when facade success render is contributed.
- [ ] Ensure fallback remains safe: warn and keep base success if replacement requested with no plan render.
- [ ] Remove door cruft from `go` by moving door-specific policy/render work to exit hooks.
- [ ] Remove facade-specific render assembly logic from `go`.
- [ ] Keep runtime/content layering clean (`commands/` and `lib/` stay content-agnostic).
- [ ] Add/adjust tests for:
  - [ ] `planDirect` path invoked for exit target during `go`.
  - [ ] Facade success replaces generic success.
  - [ ] Warning/fallback for empty replacement case.
  - [ ] Direction travel still works (`go north`, etc.).
- [ ] Validate with `npm test`.
- [ ] Validate with `npm run ci:local`.

## Door Cruft Definition (`go`)
The following patterns in `go` are considered door cruft and should be removed/migrated to exit hooks:
- Door lookup in command body (for example `destination.getDoor(currentRoom)`).
- Door policy checks in command body (for example lock/key checks).
- Door mutation planning in command body (`doorMutation` planning, including auto-open/auto-unlock logic).
- Door-specific composed success text assembly (door labels/opposite-door labels and related semantic event composition).

## Risks
- Hidden coupling between exit hooks and room exit lifecycle (`getExits` wrappers, spawn/ready timing).
- Accidental regression in generic `go` movement messages.
- Ambiguity if exit matching behavior is altered.

## Verification
- Automated:
  - `npm test`
  - `npm run ci:local`
- Manual smoke:
  - `go` through a facade-backed virtual door.
  - Confirm only facade success text appears when replacement applies.
  - Confirm non-facade exits still use generic success behavior.

## Rollback
- Revert only the hook wiring and `go` simplification commits.
- Keep `renderPolicy.replaceSuccess` dispatcher support intact unless explicitly rolled back.

## Notes
Temporary implementation plans live under `docs/drafts/plans/` and should be deleted or archived once work is complete.
