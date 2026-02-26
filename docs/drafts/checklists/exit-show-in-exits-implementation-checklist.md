# Exit Show-In-Exits Implementation Checklist

## Goal
Add an opt-in exit metadata flag (`metadata.showInExits: false`) that hides exits from room-view `Exits:` output without changing movement/resolution behavior.

## Scope
- Bundle runtime room-view rendering for exit list generation.
- Bundle tests for exit listing behavior.
- Designer manual authoring guidance.
- Changelog entry for user-visible behavior.

## Non-goals
- No change to exit resolution, `go`, capture policy, or door mutation behavior.
- No new alias keys (`isVisible`, `visibility`, etc.).
- No forest data-generation changes in this checklist.

## Checklist
- [x] Add room-view tests for `metadata.showInExits` filtering semantics in `bundles/bundle-rantamuta/tests/room.view.baseline.test.js`.
  - Acceptance criteria: test coverage includes (a) hidden when `false`, (b) visible by default when absent, (c) visible for invalid/non-boolean values.
  - Validation: run `npm --prefix bundles/bundle-rantamuta test -- tests/room.view.baseline.test.js` and observe failure before implementation.
- [x] Implement room-view exit filtering in `bundles/bundle-rantamuta/lib/helpers/room-view-helper.js`.
  - Acceptance criteria: `Exits:` rendering omits exits where `exit.metadata.showInExits === false`; all other exits unchanged.
  - Validation: run `npm --prefix bundles/bundle-rantamuta test -- tests/room.view.baseline.test.js` and observe pass.
- [x] Document the new exit metadata flag in `docs/manuals/DesignerManual.md`.
  - Acceptance criteria: manual includes concise example and explicitly states scope is `Exits:` rendering only.
  - Validation: inspect rendered markdown section for consistency and key naming.
- [x] Add a user-visible changelog entry in `CHANGELOG.md`.
  - Acceptance criteria: entry describes new `metadata.showInExits` behavior and scope.
  - Validation: ensure entry follows existing changelog format and release section conventions.
- [ ] Complete required validation and archive the checklist.
  - Acceptance criteria: `npm test` and `npm run ci:local` pass; checklist is moved to `docs/archive/implementations/` with all items checked.
  - Validation: command output pass and file moved from drafts to archive.

## Verification
- `npm --prefix bundles/bundle-rantamuta test -- tests/room.view.baseline.test.js`
- `npm test`
- `npm run ci:local`

## Approval Gate
Approved by maintainer in-session; proceed with implementation per `docs/normative/implementation.md` phase 2.
