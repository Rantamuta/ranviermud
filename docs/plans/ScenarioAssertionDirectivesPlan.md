# Scenario Assertion Directives Plan

## Status

- Status: planning
- Scope: `.scenario` assertion directives and JSON output events for scenario tests
- Binding: no

## Goal

Extend `.scenario` files with lightweight output assertion directives that tests can consume, while normal scenario-runner execution continues to behave like a command playback tool.

## Intent

Scenario files should be able to describe both what a player types and the visible checkpoints that matter after those commands. A maintainer reading a scenario should be able to see, near each command, the important text that is expected to appear or not appear.

The regular runner should still be useful for manual smoke runs: it should execute the commands and ignore assertion directives in plain output mode. In JSON mode, the runner should preserve those directives as ordered events. Tests can then give those events assertion meaning by comparing them to the visible output accumulated since the latest command started.

## In Scope

- Add two `.scenario` directives:
  - `matches: <text>`
  - `notMatches: <text>`
- Treat `matches:` and `notMatches:` as non-command assertion-event directives in the scenario stream.
- Keep assertion matching as substring matching for this plan.
- In plain output mode, ignore assertion directives during command execution.
- In JSON mode, emit assertion directives as JSON events in scenario-file order.
- Add test helper behavior that consumes JSON `matches` and `notMatches` events and asserts against the command-local accumulated visible output.
- Group command-local output by `run` event boundaries:
  - start a fresh visible-output buffer at each `run` event.
  - append following `output` event text to that buffer.
  - apply `matches` and `notMatches` events against the current buffer.
  - reset the buffer at the next `run` event.
- Produce test failures that identify:
  - command index.
  - command text.
  - assertion directive type.
  - expected or forbidden text.
  - command-local received output.
- Add focused scenario-runner tests for parsing, JSON event emission, and assertion-helper behavior.
- Convert at least one existing scenario test to demonstrate the new assertion-directive workflow.

## Out of Scope

- Adding regex semantics to `matches:` or `notMatches:`.
- Adding exact-output assertions.
- Adding metadata, inventory, room, door, or world-state assertions to `.scenario` files.
- Changing command execution semantics.
- Changing command parser, entity resolution, command dispatch, or conversation runtime behavior.
- Adding positional `.scenario` path support.
- Replacing all existing scenario tests.
- Making assertion directives affect plain text runner output.
- Treating `matches:` or `notMatches:` before the first `command:` as valid.

## Acceptance Criteria

1. A `.scenario` file may include `matches:` and `notMatches:` after a `command:` directive.
2. Plain output mode executes only the `command:` directives and does not print, execute, or fail on assertion directives.
3. JSON output mode emits ordered assertion events with shape equivalent to:
   - `{ "type": "matches", "text": "<text>" }`
   - `{ "type": "notMatches", "text": "<text>" }`
4. JSON output preserves scenario-file order for `run`, `output`, `matches`, and `notMatches` events.
5. `matches:` and `notMatches:` use substring matching, not regular expressions.
6. The assertion consumer joins all output events for a command before applying assertions, so assertions do not fail merely because output was split across multiple JSON `output` events.
7. A `matches:` failure reports the command index, command text, expected text, and command-local received output.
8. A `notMatches:` failure reports the command index, command text, forbidden text, and command-local received output.
9. Existing `.scenario` directives continue to work:
   - `room:`
   - `command:`
   - `seedInventory:`
   - `seedRoomItem:`
10. Unknown `.scenario` directives other than the newly approved assertion directives continue to fail clearly.
11. Existing scenario-runner CLI flags and command execution behavior remain unchanged.

## Constraints

- Preserve the runner's role as a command playback tool in normal output mode.
- Keep the assertion language intentionally small.
- Do not introduce a second scenario file format.
- Do not require exact transcripts.
- Do not add new dependencies.
- Keep scenario assertions player-visible: assertions should inspect visible output text only.
- Preserve strict handling for truly unknown scenario directives so typos do not silently pass.

## Implementation Surfaces

- `util/scenario-runner-lib.js`
  - Extend scenario directive parsing to recognize `matches` and `notMatches`.
  - Preserve assertion directives as ordered non-command entries in the parsed scenario request for JSON output.
  - Ignore assertion directives in plain output mode.
  - Emit JSON assertion events in scenario-file order.
- `util/scenario-test-harness.js`
  - Should not require structural changes unless the assertion consumer needs a shared helper surface.
- `bundles/bundle-rantamuta/tests/helpers/`
  - Expected home for a scenario assertion consumer/helper if one does not already exist.
  - The helper should read scenario JSON events and apply `matches` / `notMatches` against command-local output buffers.
- `bundles/bundle-rantamuta/tests/scenarios/scenario.basic.test.js`
  - Expected focused coverage for parser behavior, JSON assertion-event order, plain-output ignore behavior, and helper failure messages.
- `bundles/bundle-rantamuta/tests/scenarios/*.scenario`
  - Convert one existing scenario, likely `door-lock.scenario`, to demonstrate assertion directives after implementation.
- `docs/manuals/BundleValidationUserManual.md` or `docs/manuals/DesignerManual.md`
  - Update scenario-runner documentation if assertion directives become an approved scenario-file feature.

## Validation Strategy

This plan changes a test/tooling behavior surface and extends the `.scenario` file contract, so behavior-changing validation applies.

Required evidence:

- Parser and contract coverage:
  - Pass if `matches:` and `notMatches:` parse only after a preceding `command:`.
  - Pass if unknown directives still fail.
  - Fail if assertion directives before any command are silently accepted.
- Plain-output runner coverage:
  - Pass if a scenario containing assertion directives executes normally and does not print assertion directive lines.
  - Fail if plain output mode treats assertion directives as commands or emits them as player-visible output.
- JSON output coverage:
  - Pass if JSON output preserves scenario-file order for `run`, `output`, `matches`, and `notMatches` events.
  - Fail if assertion events are emitted as commands, omitted from JSON output, or reordered away from their scenario-file position.
- Assertion helper coverage:
  - Pass if helper tests prove substring `matches` success/failure and substring `notMatches` success/failure against joined command-local output.
  - Fail if a multi-line command response causes a valid assertion to fail only because output arrived as separate JSON events.
- Regression coverage:
  - Pass if existing scenario-runner tests continue to pass.
  - Fail if existing command playback, seeding, JSON parse diagnostics, or `--scenario` behavior regresses.
- Repository validation:
  - Run the affected scenario-runner tests.
  - Run `npm test`.
  - Run `npm run ci:local` before final completion when the worktree is suitable for local CI.

## Compatibility and Records

This plan changes the `.scenario` file contract and JSON scenario-runner event stream by adding recognized assertion directives and assertion event types.

- Compatibility boundary: scenario-runner `.scenario` directive parsing and `--json` output event shape.
- Existing directives and CLI flags must remain compatible.
- Unknown directives must remain errors except for the newly approved `matches` and `notMatches` directives.
- No normative document update is expected unless implementation discovers an existing normative scenario-runner contract.
- Update `CHANGELOG.md` because this is a tooling behavior change visible to maintainers and bundle authors.
- Update user-facing runner documentation so authors know assertions are ignored during normal playback and consumed by tests through JSON output.

## Risks and Mitigations

- Risk: `matches` sounds like regex matching even though this plan starts with substrings.
  - Mitigation: document that V1 `matches:` means substring match; regex can be added later only with an explicit follow-up design.
- Risk: assertion directives make scenario files too test-specific for manual use.
  - Mitigation: plain output mode ignores assertions, keeping scenario files runnable by humans.
- Risk: assertion events appear in a confusing position in the JSON stream.
  - Mitigation: preserve scenario-file order so assertion events appear exactly where authors placed them relative to commands.
- Risk: tests become brittle if they assert literary prose too tightly.
  - Mitigation: use stable fragments, not whole transcripts.
- Risk: unknown directive strictness is weakened too much.
  - Mitigation: recognize only `matches` and `notMatches`; all other unknown directives continue to fail.

## Open Questions / Assumptions

- Decision: use directive names `matches:` and `notMatches:`.
- Decision: V1 matching is substring matching, not regex.
- Decision: the normal runner ignores assertion directives in plain output mode.
- Decision: JSON output emits assertion directives as standalone events rather than nesting them inside `run`.
- Decision: tests consume assertion events by accumulating output from the latest `run` and applying each assertion event to that current buffer as it appears.
- Assumption: assertion directives should be allowed only after a `command:` directive.
- Assumption: the first demonstration conversion should be small and obvious, such as `door-lock.scenario`.

## Conformance QC

### Intent clarity issues

- None known. The plan describes a small assertion extension to `.scenario` files and JSON test consumption.

### Missing required sections

- None. `Goal`, `Intent`, `In Scope`, `Out of Scope`, and `Acceptance Criteria` are present.

### Ambiguities/assumptions to resolve

- None known. The major design choices from discussion are recorded as decisions.

### Validation strategy gaps

- None known. The validation strategy covers parser behavior, plain output, JSON event order, helper assertions, regression coverage, and repository validation.

### Traceability readiness

- Ready for checklist authoring after collaborator review. The plan connects the plain-language goal to concrete runner, helper, scenario, test, and documentation surfaces without requiring conversation-runtime work.

### Pass/Fail: ready for checklist authoring

- Pass.
