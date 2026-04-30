# Scenario Assertion Directives Checklist

## Status

- Status: planning
- Scope: implement `.scenario` `matches` / `notMatches` assertion directives and JSON assertion events
- Source plan: `docs/plans/ScenarioAssertionDirectivesPlan.md`

## Locked Scope

### In Scope

- Add `.scenario` directives `matches: <text>` and `notMatches: <text>`.
- Treat assertion directives as ordered non-command entries in the scenario stream.
- Keep V1 assertion matching to substring matching.
- Ignore assertion directives during plain output command playback.
- Emit assertion directives as JSON events in scenario-file order.
- Add helper behavior that consumes JSON assertion events against command-local accumulated visible output.
- Convert one existing scenario, likely `door-lock.scenario`, to demonstrate assertion directives.
- Update runner documentation and changelog coverage for the approved tooling behavior.

### Out of Scope

- Regex semantics for `matches:` or `notMatches:`.
- Exact-output assertions.
- Metadata, inventory, room, door, or world-state assertions in `.scenario` files.
- Command execution, parser, entity resolution, command dispatch, or conversation runtime behavior changes.
- Positional `.scenario` path support.
- Wholesale replacement of existing scenario tests.
- Assertion directives affecting plain text runner output.
- Accepting assertion directives before the first `command:`.

### Acceptance Criteria

- `.scenario` files may include `matches:` and `notMatches:` after `command:`.
- Plain output mode executes only commands and does not print, execute, or fail on assertion directives.
- JSON output mode emits ordered `{ "type": "matches", "text": "<text>" }` and `{ "type": "notMatches", "text": "<text>" }` events.
- JSON output preserves scenario-file order for `run`, `output`, `matches`, and `notMatches` events.
- Matching uses substring semantics.
- The assertion consumer joins all command output events before applying assertions.
- Assertion failures identify command index, command text, assertion type, expected/forbidden text, and command-local received output.
- Existing scenario directives and CLI flags remain compatible.
- Unknown directives other than `matches` and `notMatches` continue to fail clearly.

## Checklist

- [ ] `C01` [parser] Extend scenario directive parsing in `util/scenario-runner-lib.js` to recognize `matches` and `notMatches` as non-command assertion-event directives, preserving their text and order for JSON output while excluding them from command execution.
  - Trace:
    - "Add two `.scenario` directives: `matches: <text>`; `notMatches: <text>`." (`In Scope`)
    - "Treat `matches:` and `notMatches:` as non-command assertion-event directives in the scenario stream." (`In Scope`)
  - Validation handoff: `S1`, `unit`

- [ ] `C02` [parser] Preserve strict scenario directive validation in `util/scenario-runner-lib.js` by rejecting `matches` / `notMatches` before any `command:` and continuing to reject unknown directives.
  - Trace:
    - "Treating `matches:` or `notMatches:` before the first `command:` as valid." (`Out of Scope`)
    - "Unknown `.scenario` directives other than the newly approved assertion directives continue to fail clearly." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `contract/parity`

- [ ] `C03` [request] Extend the parsed scenario request shape in `util/scenario-runner-lib.js` so ordered command entries and ordered `matches` / `notMatches` assertion-event entries can coexist without changing command execution order.
  - Trace:
    - "Preserve assertion directives as ordered non-command entries in the parsed scenario request for JSON output." (`Implementation Surfaces`)
    - "Changing command execution semantics." (`Out of Scope`)
  - Validation handoff: `S2`, `integration/smoke`

- [ ] `C04` [runner] Keep plain output mode in `executeScenarioRequest` executing only commands, with assertion directives ignored and omitted from player-visible stdout/stderr.
  - Trace:
    - "In plain output mode, ignore assertion directives during command execution." (`In Scope`)
    - "Making assertion directives affect plain text runner output." (`Out of Scope`)
  - Validation handoff: `S2`, `integration/smoke`

- [ ] `C05` [json] Emit JSON `matches` and `notMatches` events from `executeScenarioRequest` in scenario-file order.
  - Trace:
    - "In JSON mode, emit assertion directives as JSON events in scenario-file order." (`In Scope`)
    - "JSON output preserves scenario-file order for `run`, `output`, `matches`, and `notMatches` events." (`Acceptance Criteria`)
  - Validation handoff: `S3`, `contract/parity`

- [ ] `C06` [helper] Add a scenario assertion consumer helper under `bundles/bundle-rantamuta/tests/helpers/` that accumulates `output` event text from the latest `run` event and applies each substring `matches` / `notMatches` assertion event against the current joined command-local output buffer as the event appears.
  - Trace:
    - "Add test helper behavior that consumes JSON `matches` and `notMatches` events and asserts against the command-local accumulated visible output." (`In Scope`)
    - "The assertion consumer joins all output events for a command before applying assertions" (`Acceptance Criteria`)
  - Validation handoff: `S4`, `unit`

- [ ] `C07` [helper] Make the scenario assertion consumer helper report failures with command index, command text, assertion directive type, expected or forbidden text, and command-local received output.
  - Trace:
    - "Produce test failures that identify: command index; command text; assertion directive type; expected or forbidden text; command-local received output." (`In Scope`)
    - "A `matches:` failure reports the command index, command text, expected text, and command-local received output." (`Acceptance Criteria`)
    - "A `notMatches:` failure reports the command index, command text, forbidden text, and command-local received output." (`Acceptance Criteria`)
  - Validation handoff: `S4`, `unit`

- [ ] `C08` [scenario] Convert `bundles/bundle-rantamuta/tests/scenarios/door-lock.scenario` to include representative `matches` and `notMatches` directives without changing its command sequence or setup directives.
  - Trace:
    - "Convert at least one existing scenario test to demonstrate the new assertion-directive workflow." (`In Scope`)
    - "Assumption: the first demonstration conversion should be small and obvious, such as `door-lock.scenario`." (`Open Questions / Assumptions`)
  - Validation handoff: `S5`, `integration/smoke`

- [ ] `C09` [docs] Update the scenario-runner documentation in `docs/manuals/BundleValidationUserManual.md` or `docs/manuals/DesignerManual.md` to explain `matches` / `notMatches`, substring semantics, JSON assertion events, and plain-output ignore behavior.
  - Trace:
    - "Update user-facing runner documentation so authors know assertions are ignored during normal playback and consumed by tests through JSON output." (`Compatibility and Records`)
    - "Mitigation: document that V1 `matches:` means substring match" (`Risks and Mitigations`)
  - Validation handoff: `S6`, `contract/parity`

- [ ] `C10` [records] Add a `CHANGELOG.md` entry for the scenario assertion directive tooling change.
  - Trace:
    - "Update `CHANGELOG.md` because this is a tooling behavior change visible to maintainers and bundle authors." (`Compatibility and Records`)
  - Validation handoff: `S6`, `contract/parity`

## Conformance QC

### Missing from plan

- None.

### Extra beyond plan

- None. Required proof work is represented only as validation handoffs, because checklist authoring must not include test items or test commands.

### Atomicity fixes needed

- None known. Parser recognition, request shape, plain-output behavior, JSON event emission, helper consumption, fixture conversion, docs, and records are separated.

### Validation handoff gaps

- None known. Each item names a behavior slice and evidence type without adding test steps.

### Pass/Fail: checklist achieves plan goals

- Pass.

## Behavior Slices

- `S1`
  - Goal: extend `.scenario` directive parsing while preserving strict validation.
  - Items: `C01`, `C02`.
  - Type: behavior

- `S2`
  - Goal: carry ordered assertion-event directives through parsed scenario requests without affecting command playback.
  - Items: `C03`, `C04`.
  - Type: behavior

- `S3`
  - Goal: expose assertion directives as ordered JSON events.
  - Items: `C05`.
  - Type: behavior

- `S4`
  - Goal: consume JSON assertion events against command-local visible output with useful failure messages.
  - Items: `C06`, `C07`.
  - Type: behavior

- `S5`
  - Goal: demonstrate assertion directives in an existing scenario fixture.
  - Items: `C08`.
  - Type: behavior

- `S6`
  - Goal: record and document the scenario assertion directive contract.
  - Items: `C09`, `C10`.
  - Type: mechanical
