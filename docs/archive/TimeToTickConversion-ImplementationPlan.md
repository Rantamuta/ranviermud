# Time-to-Tick Conversion Implementation Plan

## Status

- Status: archived
- Scope: `bundle-rantamuta` runtime helper + tests + doc alignment
- Type: implementation plan (no code changes in this document)

## Purpose

Add one shared helper that converts authored clock-time durations into integer game ticks using configured runtime tick frequency.

This supports quest timing intent written in seconds while keeping all gameplay timing tick-native at runtime.

## Current Runtime Sources of Truth

Global loop frequencies are configured in wrapper runtime bootstrap:

- `entityTickFrequency` (ms), default `100`
- `playerTickFrequency` (ms), default `100`

Source:

- `ranvier`:
  - `setInterval(..., Config.get('entityTickFrequency', 100))`
  - `setInterval(..., Config.get('playerTickFrequency', 100))`

Bundle code already reads runtime config through `state.Config.get(...)`.

## Goals

1. Provide deterministic conversion from authored time intent to ticks.
2. Centralize conversion logic so scripts do not duplicate arithmetic.
3. Make rounding/validation behavior explicit and test-covered.
4. Keep helper content-agnostic and reusable for multiple systems (rituals, stillness, conversation timeouts, etc.).

## Non-Goals

1. No scheduler redesign.
2. No change to core engine tick loops.
3. No wall-clock timers for gameplay behavior.
4. No migration of all existing timing callsites in this slice (follow-up task).

## Locked Decisions

1. Authored timing intent unit is **seconds** (number; integer or decimal).
2. Runtime storage/execution unit is **ticks**.
3. Default conversion cadence for world/area quest behavior is `entityTickFrequency`.
4. Conversion rounds **up** (`ceil`) to avoid firing earlier than authored intent.
5. `0` seconds converts to `0` ticks.

## API Design

New helper module (bundle layer):

- `bundles/bundle-rantamuta/lib/helpers/time-to-tick.js`

Exports:

1. `getTickFrequencyMs(state, cadence = 'entity')`
   - `cadence` allowed: `'entity' | 'player'`
   - returns positive integer milliseconds per tick
   - reads:
     - `state.Config.get('entityTickFrequency', 100)`
     - `state.Config.get('playerTickFrequency', 100)`
   - validation:
     - if missing/invalid/non-positive, fall back to default (`100`)

2. `secondsToTicks(state, seconds, cadence = 'entity')`
   - conversion:
     - `ticks = Math.ceil((seconds * 1000) / getTickFrequencyMs(...))`
   - validation:
     - finite number required
     - `seconds < 0` throws `RangeError`
     - non-number/NaN/Infinity throws `TypeError`

3. `ticksToSeconds(state, ticks, cadence = 'entity')` (diagnostic helper)
   - conversion:
     - `seconds = (ticks * getTickFrequencyMs(...)) / 1000`
   - validation:
     - finite non-negative number required

Notes:

- Keep helper pure (no mutation/output).
- Do not bind to quest-specific keys.

## Implementation Tasks

### Phase 1: Helper Module

What:

- Add `time-to-tick.js` with `getTickFrequencyMs`, `secondsToTicks`, `ticksToSeconds`.

Where:

- `bundles/bundle-rantamuta/lib/helpers/time-to-tick.js`

Why:

- Provides single authoritative conversion path for tick-native mechanics.

### Phase 2: Unit Coverage

What:

- Add focused unit tests for conversion/validation behavior.

Where:

- `bundles/bundle-rantamuta/tests/time.to.tick.helper.test.js`

Required test cases:

1. Uses default `100ms` when config keys are absent.
2. Uses configured `entityTickFrequency`.
3. Uses configured `playerTickFrequency` when cadence is `'player'`.
4. `secondsToTicks` rounds up (`ceil`) for fractional results.
5. `secondsToTicks(0)` returns `0`.
6. Invalid inputs throw (`TypeError` / `RangeError`).
7. `ticksToSeconds` returns expected decimal seconds.

### Phase 3: Initial Adoption (minimal)

What:

- Replace at least one timing constant conversion path in active Undying timing logic (or one pilot runtime path) to use the helper.

Where:

- First integration should be one low-risk site, then broader adoption can follow.
- Candidate first consumers:
  - ritual timeout conversion path
  - stillness stage delay conversion path

Why:

- Proves helper usability in real flow and prevents dead utility code.

### Phase 4: Documentation Alignment

What:

- Document the conversion policy in project docs:
  - authored timing intent in seconds,
  - runtime timing in ticks via shared helper,
  - cadence source defaults.

Where:

- `docs/lore/UndyingVillageImplementationChecklist.md` (Section 8 timing items)
- optional short addendum in `docs/manuals/DesignerManual.md` timing guidance area

Why:

- Prevents drift back to ad hoc conversion constants.

## Validation Plan

Local test commands:

1. `cd bundles/bundle-rantamuta && npm test -- --runInBand tests/time.to.tick.helper.test.js`
2. `npm test`
3. `npm run ci:local`

Behavior checks:

1. A duration authored as `120 seconds` converts to deterministic tick count based on configured cadence.
2. Changing cadence config changes derived tick counts without code edits.
3. No use of wall-clock timeout APIs for gameplay timing in converted callsites.

## Risks and Mitigations

1. Mixed cadence usage (`entity` vs `player`) causing drift.
   - Mitigation: default to `'entity'` and require explicit cadence argument for exceptions.

2. Silent bad config values.
   - Mitigation: strict validation with safe fallback default (`100ms`) and test coverage.

3. Off-by-one timing behavior.
   - Mitigation: enforce and test `ceil` policy explicitly.

## Deferred Follow-Ups

1. Add a canonical monotonic tick accessor helper for deadline comparisons (`nowTick`) used by sequence state machines.
2. Migrate all timing callsites in ritual/stillness/conversation systems to shared helper.
3. Add optional lint/check rule to flag ad hoc `* 1000 / tickFrequency` math in bundle code.

## Implementation Notes (2026-03-05)

- No behavioral deviations from this plan were required for the helper slice.
- Implemented helper API:
  - `getTickFrequencyMs(state, cadence = 'entity')`
  - `secondsToTicks(state, seconds, cadence = 'entity')`
  - `ticksToSeconds(state, ticks, cadence = 'entity')`
- Validation behavior implemented:
  - unsupported cadence throws `TypeError`,
  - non-finite/non-number inputs throw `TypeError`,
  - negative duration/tick inputs throw `RangeError`,
  - invalid/non-positive tick-frequency config values fall back to `100ms`.
- Broad consumer migration remains intentionally deferred.
