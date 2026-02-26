# Pre-Flight Mechanisms Prerequisite Checklist

## Scope

- Draft checklist for runtime/engine mechanisms that must exist before implementing specific authored content.

## P0 Blocking Foundations

- [x] [time] Add canonical `secondsToTicks(seconds)` and `ticksToSeconds(ticks)` helpers in a shared runtime utility module, sourced from one authoritative tick-rate configuration.
  - Evidence: root merge `488068b7` advanced `bundles/bundle-rantamuta` from `8b591060` to `8107413` (branch `implement-time-to-tick-conversion`), and that bundle range adds `lib/helpers/time-to-tick.js` plus `tests/time.to.tick.helper.test.js`.
- [ ] [time] Add one canonical monotonic tick accessor for gameplay timers/cooldowns so sequence logic does not use wall-clock time directly (depends on item 1).
- [ ] [test] Add deterministic test helpers that can advance ticks without wall-clock sleeps (depends on item 2).
- [ ] [sequence] Add a shared staged-sequence helper model with explicit state (`idle`, `active`, `cooldown`, `completed`), stage index, timeout tick, and cooldown tick fields (depends on items 1 and 2).
- [ ] [sequence] Add shared interruption policy evaluation for allowlisted quiet actions vs interruption actions (depends on item 4).
- [ ] [events] Add canonical semantic event category constants and naming guidance for ambient vs reactive/hostile events.
- [ ] [events] Add local semantic-event emit helpers for single-room and dual-room delivery scopes; no global broadcast path in this helper (depends on item 6).
- [ ] [state] Add compact recent-hostility recorder/query helpers with tick-window lookback semantics (depends on item 2).
- [ ] [state] Add deterministic capture points for hostile actions so lookback state updates in one place (depends on item 8).
- [ ] [gate] Add canonical commit-time presence evaluators for presence-sensitive gate inputs; disallow capture-time/render-time gate ownership (depends on item 2).

## P1 Enabling Interaction Surfaces

- [ ] [command-talk] Implement baseline `talk` command forms (`talk`, `talk to <target>`) with deterministic ambiguity prompts and failure messaging.
- [ ] [command-feed] Implement baseline `feed` command forms (`feed <target>`, `feed <item> to <target>`) with deterministic ambiguity prompts and failure messaging.
- [ ] [command-enter] Implement baseline `enter <target>` command contract for location/object entry surfaces.
- [ ] [conversation] Implement minimal conversation runtime contract (entry, menu/select loop, exit/cancel flow) and define `talk` integration boundary (depends on item 11).
- [ ] [inline-tags] Add inline conditional tag evaluation for render templates with deterministic fallback behavior on missing context.
- [ ] [inline-tags] Define canonical inline render context keys (`observer`, `actor`, `target`, optional `targetIndirect`) and missing-key diagnostics policy (depends on item 15).
- [ ] [state] Add small durable world-state service for global flags that must survive restart.
- [ ] [state] Add per-player state helper module for centralized reads/writes of progression counters/flags.

## P2 Reliability and Safety Gates

- [ ] [concurrency] Add per-target execution guard to block overlapping ritual/session success paths.
- [ ] [concurrency] Add idempotency short-circuit for already-completed global mutations so completion path does not re-run.
- [ ] [reconcile] Add player-load reconciliation hook for deferred completion/progression updates that depend on world state (depends on item 17).
- [ ] [test] Add deterministic tests for sequence stage progression, interruption reset, cooldown expiry, and timeout behavior (depends on items 3, 4, and 5).
- [ ] [test] Add tests proving semantic-event delivery is local-scope only (depends on item 7).
- [ ] [test] Add tests proving commit-time gate evaluation reflects current presence truth at commit boundary (depends on item 10).
- [ ] [test] Add race-sequencing tests for near-simultaneous attempts validating single-success behavior (depends on items 19 and 20).
- [ ] [test] Add restart-persistence tests for durable world/player critical state (depends on items 17 and 18).

## Behavior Slices

- `S1`
  - Goal: establish deterministic timing, sequence, and event foundations.
  - Items: P0 items 1-10.
  - Type: behavior
- `S2`
  - Goal: establish interaction command surfaces and minimal conversation/render prerequisites.
  - Items: P1 items 11-18.
  - Type: behavior
- `S3`
  - Goal: harden concurrency, idempotency, reconciliation, and deterministic validation coverage.
  - Items: P2 items 19-26.
  - Type: behavior
