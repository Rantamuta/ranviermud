# Time-to-Tick Conversion Implementation Checklist

## Scope

Implement a shared, content-agnostic helper for converting authored time intent (seconds) into runtime tick counts using configured tick frequency.
This slice intentionally does not wire every future consumer yet; it establishes the reusable helper contract first.

## Checklist

- [ ] [helper] Add `bundles/bundle-rantamuta/lib/helpers/time-to-tick.js` with `getTickFrequencyMs(state, cadence = 'entity')`.
  - Read `entityTickFrequency` and `playerTickFrequency` via `state.Config.get(...)` with runtime defaults.
- [ ] [helper] Implement `secondsToTicks(state, seconds, cadence = 'entity')` in `time-to-tick.js`.
  - Use ceil conversion and explicit input validation for non-finite/negative values.
- [ ] [helper] Implement `ticksToSeconds(state, ticks, cadence = 'entity')` in `time-to-tick.js`.
  - Keep this as a diagnostic/inverse helper with explicit input validation.
- [ ] [tests] Add focused unit coverage in `bundles/bundle-rantamuta/tests/time.to.tick.helper.test.js`.
  - Cover cadence selection, defaults, conversion rounding policy, and validation errors.
- [ ] [docs] Update `docs/active/TimeToTickConversion-ImplementationPlan.md` to record any implementation-level deviations discovered during coding.
- [ ] [defer] Leave broad consumer migration (ritual/stillness/conversation callsites) deferred to follow-up slices after helper contract is stable.
- [ ] [checklist] Mark checklist items complete as each behavior slice lands.

## Behavior Slices

- `S1`
  - Goal: add shared conversion helper API and validation behavior.
  - Items: first, second, and third checklist items.
  - Type: behavior
- `S2`
  - Goal: validate helper behavior with deterministic unit coverage.
  - Items: fourth checklist item.
  - Type: behavior
- `S3`
  - Goal: close docs/checklist bookkeeping and defer broad callsite migration.
  - Items: fifth, sixth, and seventh checklist items.
  - Type: mechanical
