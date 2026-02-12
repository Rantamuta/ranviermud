# Changelog

All entries follow `docs/CHANGELOG_POLICY.md`.

## Unreleased

### Bundle init defaults

Summary:

- Changed `util/init-bundles.js` default bundle installation list to only include `https://github.com/Rantamuta/bundle-rantamuta.git`.
Why:
- This wrapper now treats `bundle-rantamuta` as the canonical reference/base bundle for Rantamuta-first projects.
Impact:
- `npm run init` and `npm run ci:init` now install and enable only `bundle-rantamuta` by default.
- Existing docs, smoke flows, or operator expectations based on the old baseline bundle set must be updated.
Migration/Action:
- If you still need legacy example bundles, install them explicitly with `npm run install-bundle <repo>`.
References:
- None.
Timestamp: 2026.02.12 13:58

### Starting room default

Summary:

- Changed the default `startingRoom` in `ranvier.json` from `limbo:white` to `rantamuta:start`.
Why:
- The wrapper now ships with a minimal Rantamuta-first baseline where `rantamuta:start` is the intended initial spawn room.
Impact:
- Fresh boots that rely on default config now place new sessions in `rantamuta:start`.
- Existing tooling or smoke checks that assumed `limbo:white` must update expected room references.
Migration/Action:
- Update any scripts, tests, or operator docs that reference the old default room.
References:
- None.
Timestamp: 2026.02.12 13:48

## Rantamuta `ranviermud` v1.0.1 - Strict mode

## Rantamuta `ranviermud` v1.0.0 — Salpausselkä

**The Salpausselkä Release**

Salpausselkä refers to a series of prominent glacial ridges found only in Finland, formed at the end of the last Ice Age. They mark a stable boundary where movement slowed, pressure settled, and the landscape took on its lasting shape.

This release serves that role for Rantamuta’s `ranviermud` wrapper: a deliberate stabilization point after rapid movement and structural change, where interfaces harden, boundaries are clarified, and the project’s long term shape is fixed.

This is the initial stable release of the Rantamuta `ranviermud` wrapper.

Rantamuta `ranviermud` v1.0.0 is based on the RanvierMUD `ranviermud` wrapper at version `2.0.0` and is intended to preserve equivalent runtime behavior at the point of the fork, with modernization changes only.

Future releases may diverge in behavior as the Rantamuta project evolves.

### Bundle defaults

- Summary:
  - Restored `bundle-example-areas` and `simple-crafting` to the default bundle set.
- Why:
  - Upstream bundles now include the missing `quests.yml` files.
  - Default bundles should boot cleanly while preserving the engine's strict quest loader.
- Impact:
  - Fresh installs include both bundles again.
- Migration/Action:
  - If you previously removed these bundles, re-run `npm run init` to reinstall the updated bundles.
- References:
  - None.
- Timestamp: 2026.02.11 18:31

### Package identity

- Summary:
  - Documented the decision to change this package name to `rantamuta-ranviermud` from `ranviermud`.
- Why:
  - The fork should be clearly distinguished from upstream RanvierMUD.
  - This package is not consumed as a dependency, so renaming would not provide compatibility benefits.
- Impact:
  - No runtime behavior change.
  - Only affects package metadata for tooling or future publishing decisions.
- Migration/Action:
  - None.
- References:
  - None.
- Timestamp: 2026.02.11 16:26

### Explicit startup failure handling

- Summary:
  - Added an explicit top-level catch around server initialization to handle startup failures from the core engine.
- Why:
  - Core bundle and area load failures now surface as thrown errors rather than terminating the process internally.
  - The wrapper is responsible for deciding how to log and exit on startup failure.
- Impact:
  - Startup failures now reliably result in a non-zero process exit and a visible stack trace.
  - Server startup still fails fast on invalid bundles or hydration errors.
- Migration/Action:
  - None.
  - Existing deployments will see clearer failure signaling and correct exit codes on startup errors.
- References:
  - PR: #15 Add explicit init error handling for core startup failures
- Timestamp: 2026.02.10 16:25
