# Admin Teleport Command Implementation Checklist

## Goal

Implement an in-game `teleport` command that behaves like a system command (outside diegetic verb/command pipeline), matching these requirements:

- command keyword: `teleport`
- only admins can use it (`role >= 2`)
- non-admins should hit normal unknown-command behavior (`What?`)
- admin usage accepts a room id string like `rantamuta:start` or `codex:square`
- intentionally no existence guardrails for destination room ids
- keep implementation minimal and local (target: one behavior file for runtime logic)

## Confirmed Architecture Facts (from repo investigation)

- `inGame` input is routed through `bundles/bundle-rantamuta/input-events/main.js`.
- `quit`/`exit` are already fast-pathed in that file before command-dispatch.
- unknown command output `What?` is emitted by `bundles/bundle-rantamuta/lib/session/command-dispatch.js`.
- admin role threshold is `2` (`PlayerRoles.ADMIN`) in core (`node_modules/ranvier/src/PlayerRoles.js`).
- room lookup is `state.RoomManager.getRoom(roomRef)`.
- player movement API is `player.moveTo(nextRoom)`.

These facts justify adding `teleport` at the same `input-events/main.js` layer as `quit`/`exit`.

## Non-Negotiable Behavior Contract

- `teleport` is recognized only in `session.state === 'inGame'`.
- `teleport` intercept path runs only when `player.role >= 2`.
- for non-admin players, `teleport ...` must fall through to `handleCommand(...)` unchanged.
- if no diegetic `teleport` command exists, fallback output is `What?` from existing unknown-command logic.
- destination id is taken from the post-verb remainder of input, preserving punctuation/case as typed after trimming.
- no destination validation guardrail is added before movement attempt.
- after teleport handling path completes successfully, prompt is shown to player.
- command matching must work for both bare `teleport` and argument forms like `teleport codex:square`.

## Files To Change

- Runtime logic: `bundles/bundle-rantamuta/input-events/main.js`
- Tests: `bundles/bundle-rantamuta/tests/input.events.main.test.js`
- No other runtime files should be touched for this task.

## Step-by-Step Implementation

## 1. Preflight

- [x] Open `bundles/bundle-rantamuta/input-events/main.js`.
- [x] Open `bundles/bundle-rantamuta/tests/input.events.main.test.js`.
- [ ] Confirm baseline tests pass before edits:
- [ ] `npm test`

## 2. Add Teleport Fast-Path in `input-events/main.js`

- [x] In the `case 'inGame':` block, keep `quit`/`exit` fast-path behavior unchanged.
- [x] Immediately after `quit`/`exit` check and before `handleCommand(...)`, add `teleport` parsing logic.
- [x] Parse input into:
- [x] `commandToken` (first token, lowercase)
- [x] `commandArgsRaw` (remaining text after first token, unmodified except trim)
- [x] If using a `switch`, switch on `commandToken`, not full `input`.
- [x] Do not switch on full normalized input (`teleport codex:square` would miss `case 'teleport'`).
- [x] detect `teleport` by exact first-token match.
- [x] If first token is not `teleport`, keep existing path: `return await handleCommand(state, session, input);`.

## 3. Add Admin Gate

- [x] Extract `player` from `session.player`.
- [x] Compute admin status as numeric `role >= 2`.
- [x] For non-admin `teleport` input:
- [x] do not emit custom messages.
- [x] do not call `moveTo`.
- [x] do not return early.
- [x] fall through to existing `handleCommand(state, session, input)` path so unknown-command flow owns `What?`.

## 4. Add Teleport Execution Path (Admin Only)

- [x] Parse destination room ref from remainder of input after `teleport`.
- [x] Trim destination ref string.
- [x] Resolve destination with `state.RoomManager.getRoom(destinationRef)` if available.
- [x] Do not add existence checks/validation or custom destination error text.
- [x] Call `player.moveTo(resolvedRoom)` directly in this fast-path.
- [x] After movement call, show prompt to player and `return` so command-dispatch is not invoked.

## 5. Keep Scope Minimal

- [x] Do not add a new diegetic command file under `commands/`.
- [x] Do not modify command-dispatch unknown-command handling.
- [x] Do not modify parser/canonicalizer.
- [x] Do not touch engine/core internals.

## 6. Add/Update Unit Tests in `input.events.main.test.js`

- [x] Keep existing `quit` and `exit` tests passing.
- [x] Add test: `non-admin teleport falls through to unknown-command What?`.
- [x] Use `role: 0` or `role: 1`.
- [x] Provide `state.CommandManager` stub that resolves no commands (`get` => `null`).
- [x] Stub `Broadcast.sayAt` and `Broadcast.prompt`.
- [x] Execute `mainInputEvent.event(state)(session, 'teleport codex:square')`.
- [x] Assert output includes `What?`.
- [x] Assert no `player.moveTo` call occurred.

- [x] Add test: `admin teleport moves player to resolved room and bypasses command-dispatch`.
- [x] Use `role: 2`.
- [x] Stub `state.RoomManager.getRoom` to return a destination room object for a known ref.
- [x] Stub `player.moveTo` to capture argument.
- [x] Stub `state.CommandManager.get` to throw if invoked (proves bypass).
- [x] Execute `mainInputEvent.event(state)(session, 'teleport codex:square')`.
- [x] Assert `moveTo` called once with the destination room object.
- [x] Assert `session.processing` resets to `false`.

- [x] Add test: `admin teleport with unresolved destination still attempts moveTo without guardrails`.
- [x] Use `role: 2`.
- [x] Stub `state.RoomManager.getRoom` to return `undefined`.
- [x] Stub `player.moveTo` and capture the argument without throwing.
- [x] Execute `mainInputEvent.event(state)(session, 'teleport missing:room')`.
- [x] Assert `moveTo` called once with `undefined`.
- [x] Assert no custom fallback text was emitted by the teleport path.

## 7. Validation Commands

- [x] Run targeted test file:
- [x] `npx mocha bundles/bundle-rantamuta/tests/input.events.main.test.js`
- [x] Run full suite:
- [x] `npm test`
- [ ] Run CI parity suite:
- [ ] `npm run ci:local`

## 8. Manual Smoke Script

- [ ] Start server: `npm start`
- [ ] Log in as non-admin (`role < 2`), run `teleport codex:square`.
- [ ] Confirm output is `What?` (from unknown-command flow).
- [ ] Log in as admin (`role >= 2`), run `teleport codex:square`.
- [ ] Confirm player location changed to the destination room.
- [ ] As admin, run `teleport does:notexist`.
- [ ] Confirm no destination guardrail message is added by new code path.

## 9. Final Review Checklist

- [ ] Diff includes only the two files listed above.
- [ ] No behavior change to diegetic parser/dispatcher internals.
- [ ] Non-admin path preserves existing unknown-command mechanism.
- [ ] Admin path remains outside diegetic architecture.
- [ ] All tests and `ci:local` pass.
