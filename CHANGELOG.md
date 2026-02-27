# Changelog

All entries follow `docs/CHANGELOG_POLICY.md`.

## Unreleased

### Exit metadata showInExits room-view filtering

Summary:

- Added support for `exits[].metadata.showInExits: false` to hide specific exits from room-view `Exits:` output.
- Added room-view baseline coverage for hidden exits, default-visible exits, and invalid/non-boolean flag values.
- Updated designer documentation with an exit authoring example using `showInExits` plus a `go` veto message.
Why:
- Content authors need to hide blocked or gated exits from room-view listings while preserving movement policy hooks.
Impact:
- Room-view exit listing now omits exits only when `metadata.showInExits` is explicitly boolean `false`.
- Exit resolution and movement policy behavior (`go`, permissions, capture hooks) are unchanged.
Migration/Action:
- Optional: set `metadata.showInExits: false` on exits you want hidden from `Exits: ...`.
References:
- `bundles/bundle-rantamuta/lib/helpers/room-view-helper.js`
- `bundles/bundle-rantamuta/tests/room.view.baseline.test.js`
- `docs/manuals/DesignerManual.md`
Timestamp: 2026.02.26 18:54

### Tomo player-metadata parity via command commit path

Summary:

- Replaced Tomo guidance-state runtime memory writes with NPC-dispatched `setplayermetadata` command writes through the shared command pipeline.
- Added integration coverage proving NPC `setplayermetadata` dispatch reaches commit mutator application.
- Updated Tomo behavior tests to assert persisted metadata flow and reject NPC-local per-player guidance storage.
Why:
- NPC guidance-state mutation must not bypass shared dispatch/plan/commit architecture.
- Tomo v1 parity requires persisted player metadata as authoritative guidance-state storage.
Impact:
- Tomo guidance progression persists in player metadata keys under `tomo.*` instead of NPC runtime memory.
- NPC metadata writes now execute through command planning and mutator commit semantics.
Migration/Action:
- None.
References:
- `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`
- `bundles/bundle-rantamuta/commands/setplayermetadata.js`
- `bundles/bundle-rantamuta/tests/tomo.caretaker.script.test.js`
- `bundles/bundle-rantamuta/tests/npc.dispatch.pipeline.test.js`
Timestamp: 2026.02.23 20:59

### NPC command dispatch wiring and Tomo speech migration

Summary:

- Added NPC intent dispatch support (`text` and `structured`) that normalizes into the same parse artifact and runs through the existing Phase 1-6 command pipeline.
- Added Capture actor-kind gating via `metadata.actorKindsAllowed` with `ACTOR_KIND_FORBIDDEN` denial handling.
- Migrated Codex Tomo caretaker speech from direct `Broadcast.sayAt` to dispatcher + shared `say`.
Why:
- NPC actions needed to execute through the same transactional command architecture as player commands.
- Capture-based actor-kind policy needed to be enforced before planner execution and entity-level policy hooks.
- Tomo speech needed to stop bypassing command render/dispatch.
Impact:
- NPC scripts can dispatch command intents without introducing a second execution pipeline.
- Commands may now deny by actor kind through capture metadata policy.
- Tomo guidance lines are emitted through command render/dispatch semantics instead of direct broadcast helper calls.
Migration/Action:
- None required.
References:
- `bundles/bundle-rantamuta/lib/session/command-dispatch.js`
- `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`
- `docs/archive/implementations/npc-action-architecture-implementation-checklist.md`
Timestamp: 2026.02.23 09:36

### Semantic dispatch ordering and dedup alignment

Summary:

- Enforced `SEMANTIC_ACTOR_ALIAS_MISMATCH` in semantic rendering when both `currentActor` and `currentPlayer` are present but resolve to different identity.
- Refactored semantic dispatch to freeze and deduplicate recipient delivery across actor/target/others before any send.
- Prevented partial semantic delivery when one audience render fails; failed semantic instructions are skipped while later render instructions still run.
- Corrected `others` audience behavior so target recipients from actor-room broadcast targets are included when policy allows.
Why:
- Runtime behavior needed to align with the actor-general semantic messaging contract and deterministic recipient partition rules.
Impact:
- Semantic event delivery is now deterministic across audience partitions with one line per recipient identity.
- `others` policy output now includes eligible target recipients instead of dropping them unconditionally.
- Invalid `others` templates no longer leak actor lines before dispatch failure.
Migration/Action:
- None required.
References:
- `bundles/bundle-rantamuta/lib/session/semantic-message.js`
- `bundles/bundle-rantamuta/lib/session/render-dispatch.js`
- `bundles/bundle-rantamuta/lib/session/command-dispatch.js`
- `bundles/bundle-rantamuta/tests/command.dispatch.test.js`
- `bundles/bundle-rantamuta/tests/semantic.message.test.js`
Timestamp: 2026.02.22 18:08

### Say command with actor-general semantic selector

Summary:

- Added an in-pipeline `say <text>` command in `bundle-rantamuta` with deterministic speech normalization and structured capture veto codes (`SAY_EMPTY`, `SAY_TOO_LONG`).
- Added semantic participant selector support for `currentActor` in semantic render/dispatch so actor-authored events render correctly for both player and NPC actor contexts.
Why:
- Speech must flow through the same transactional command pipeline and Render/Dispatch contract used by other diegetic commands.
- Actor-general selector support is required so semantic events can use actor identity without coupling to player-only selector assumptions.
Impact:
- Players and NPC actors can now run `say` through command-dispatch and emit perspective-correct room speech lines (`You say, ...` / `<Name> says, ...`).
- Existing `currentPlayer` semantic selector behavior remains supported for compatibility.
Migration/Action:
- None required.
- New semantic-event content should prefer `participants.actor: { selector: 'currentActor' }`.
References:
- `bundles/bundle-rantamuta/commands/say.js`
- `bundles/bundle-rantamuta/lib/session/semantic-message.js`
- `bundles/bundle-rantamuta/lib/session/render-dispatch.js`
Timestamp: 2026.02.22 18:15

### Semantic messaging actor-general amendment

Summary:

- Amended `docs/normative/SemanticMessaging.md` to support actor-general semantic dispatch via `currentActor` with `currentPlayer` compatibility aliasing.
- Added render-context and failure-code guidance for actor alias mismatches and unresolved actor room dispatch.
Why:
- Shared semantic-event commands (including NPC-triggered speech/actions) need one canonical render/dispatch contract instead of a player-only actor selector.
Impact:
- Normative semantic-event contract now defines actor-general selector behavior and diagnostics expectations.
- Existing `currentPlayer` content remains valid as compatibility behavior.
Migration/Action:
- Prefer `participants.actor: { selector: 'currentActor' }` in new semantic-event content.
- Existing `currentPlayer` usage can remain; no immediate migration is required.
References:
- `docs/drafts/SemanticMessagingAmendment-ActorGeneral.md`
- `docs/normative/SemanticMessaging.md`
Timestamp: 2026.02.22 14:50

### NPC visibility in room look output

Summary:

- Added room-NPC visibility to room-view rendering and enabled direct `look <npc>` / `x <npc>` targeting via shared entity resolution.
Why:
- NPCs spawned in rooms were not discoverable in room output and could not be targeted by direct look, which blocked authored NPC guidance flow.
Impact:
- Players now see NPC presence lines in normal room look output.
- `look tomo` style direct look now resolves in-room NPCs when command scope includes `room.npcs`.
Migration/Action:
- None.
References:
- None.
Timestamp: 2026.02.22 12:52

### Root test discovery includes all repo test files

Summary:

- Updated root `npm test` discovery to run `**/*.test.js` across the repository.
Why:
- Tests are now convention-based (`*.test.js`) rather than path-bound to specific directories.
Impact:
- `npm test` now executes any `*.test.js` under the repository by default (excluding `node_modules`).
Migration/Action:
- New tests can be colocated or stored in `tests/`; default execution depends on filename pattern.
References:
- None.
Timestamp: 2026.02.12 16:26

### Parser v0 input integration

Summary:

- Added bundle-local lexer/parser v0 (`bundles/bundle-rantamuta/lib/parse-input.js`) and integrated it into `input-events/main.js` command handling.
Why:
- The reference bundle now needs explicit parser staging and spec-aligned parser artifacts before broader verb-family migration.
Impact:
- In-game command input now flows through parser output (`intentToken`, target spans, relation token, classification) before command lookup.
- Unknown command output remains `Unknown command.` for unsupported/malformed text in current command set.
Migration/Action:
- None.
References:
- `docs/normative/ParserPortingInstructions.md`
- `docs/normative/CommandInteractionReferenceProfile-v1.md`
Timestamp: 2026.02.12 16:11

### Scenario runner input-event mode

Summary:

- Added `--throughInput` to `util/scenario-runner.js` so command text can run through InputEvent `main` using an in-game session instead of direct `CommandManager` dispatch.
Why:
- Scenario smoke checks needed a mode that matches telnet command handling semantics (including input-event unknown-command behavior) without requiring interactive login.
Impact:
- `util/scenario-runner.js` now supports two execution models: direct command dispatch (existing default) and input-event dispatch (`--throughInput`).
- In `--throughInput` mode, direction text such as `east` follows input-event command resolution and can emit `Unknown command.` when no command alias exists.
Migration/Action:
- Use `--throughInput` in scenario checks where parity with in-game input-event command flow is required.
References:
- None.
Timestamp: 2026.02.12 15:05

### Submodule initialization in init

Summary:

- Updated `util/init-bundles.js` to initialize tracked submodules (`git submodule update --init`) before invoking `install-bundle`.
Why:
- In fresh clones without submodule recursion, tracked bundle paths exist as empty directories.
- `install-bundle` treated that state as "already installed", leaving bundles unpopulated for CI/local smoke startup.
Impact:
- `npm run init` and `npm run ci:init` now populate tracked bundle submodules deterministically in clean clones and isolated worktrees.
- `ci:local` no longer hangs at startup waiting for telnet readiness due to an uninitialized bundle path.
Migration/Action:
- Re-run `npm run ci:init` (or `npm run init`) in repositories that previously reported `Bundle already installed` but did not load bundle command/server-event content.
References:
- None.
Timestamp: 2026.02.12 14:29

### Bundle name normalization in init

Summary:

- Fixed `util/init-bundles.js` bundle-name extraction so remotes ending in `.git` resolve to the correct bundle key (`bundle-rantamuta`) when writing `ranvier.json`.
Why:
- The previous extraction regex did not match `.git` remotes and could write the full remote URL into `ranvier.json`, which prevented bundle loading in CI init flows.
Impact:
- `npm run init` and `npm run ci:init` now produce a valid `bundles` list in `ranvier.json` for both `.git` and non-`.git` remotes.
- `ci:local` smoke login no longer stalls due to missing loaded bundle server events caused by invalid bundle keys.
Migration/Action:
- Re-run `npm run ci:init` or `npm run init` if `ranvier.json` contains a full remote URL in `bundles`.
References:
- None.
Timestamp: 2026.02.12 14:08

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
