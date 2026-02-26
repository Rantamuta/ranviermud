# Large-Scale Room Topology and Runtime Memory Model: Architecture Options

## Status

- Status: exploratory
- Scope: bundle-layer and runtime room lifecycle
- Binding: informational
- Audience: engine maintainers

---

## Executive summary

The current engine model is intentionally simple: areas/rooms are loaded from bundle data, hydrated into runtime objects at boot, indexed globally, and retained for process lifetime. This gives deterministic behavior and straightforward scripting semantics.

That same model becomes strained under two trajectories:

1. **Area sharding** (multiple runtime instances of a template area)
2. **Very large topologies** (100k to 1M+ rooms, authored and/or procedural)

This document lays out architectural options, including incremental and more ambitious paths. The recommendation is **not** a rewrite. It is a staged plan:

- First separate **template identity** from **runtime room instance identity**.
- Then add an explicit **room lifecycle model** (create, attach, detach, destroy).
- Then choose one of several memory models (full-resident, demand-hydrated, regional streaming, or seed-projected procedural runtime), depending on observed scale and operational risk tolerance.

---

## Current model recap (as implemented today)

At a high level in the engine:

- Bundle loading gathers area definitions and hydrates areas at startup.
- `Area.hydrate` creates rooms and registers each room in `RoomManager`.
- `RoomManager` is a global map keyed by `room.entityReference`.
- Player hydrate/load resolves saved room refs via `RoomManager.getRoom(...)`.
- Movement operates against already-instantiated room objects.
- Room references are treated as globally stable runtime identifiers.

This is excellent for modest worlds, but it bakes in assumptions that do not naturally hold for dynamic instance lifecycles or very large topologies.

---

## Problem decomposition

### A) Identity model pressure

Current identity collapses three concerns into one token:

- template identity (`area:roomId` as authored)
- runtime identity (which in-memory object)
- persistence identity (what is saved to player data)

Sharding and dynamic rooms require splitting those concerns.

### B) Residency model pressure

Current model assumes all authored rooms are always resident. At 100k-1M room scales, this drives:

- high startup cost
- larger baseline heap
- larger object graph for GC traversal
- wider blast radius for accidental O(n) scans

### C) Lifetime/ownership model pressure

Today room lifecycle is essentially boot-time creation and process-end destruction. Dynamic rooms require explicit lifecycle contracts:

- ownership of references
- detach/teardown ordering
- safety invariants (players/npcs/items/timers/listeners)

Without contracts, memory leaks and stale references become likely.

---

## Evaluation criteria

Any candidate approach should be evaluated against:

- Backward compatibility with existing bundles/scripts
- Deterministic movement semantics
- Persistence correctness (especially login/logout)
- Runtime latency (movement path p95/p99)
- Startup time and CI cost
- Memory footprint and GC behavior
- Operational complexity (debuggability, observability)
- Rollback simplicity

---

## Option 1: Full resident runtime, identity split only (lowest risk)

### Description

Keep all authored rooms hydrated and resident (current model), but introduce explicit identity separation and lifecycle scaffolding for **instances**:

- template room ref remains canonical (`area:room`)
- runtime ref becomes instance-aware when needed (`area#instance:room`)
- persistence stores canonical template identity + context metadata, not transient instance ids
- add lifecycle APIs/events for instance creation/destruction even if most rooms remain immortal

### Pros

- Lowest disruption to current architecture
- Minimal risk to command/scripting behavior
- Simplifies initial shard adoption
- Fastest to validate and roll back

### Cons

- Does not solve high baseline memory for huge authored worlds
- Startup cost remains O(total authored rooms)
- GC object-count pressure remains largely unchanged

### Best fit

- Teams prioritizing compatibility and incremental adoption
- Near-term sharding support before large topology scaling

---

## Option 2: Demand-hydrated rooms with global cache (moderate risk)

### Description

Do not hydrate all rooms at boot. Keep room definitions available, hydrate room instances on first access, and keep a cache of active/recent rooms.

Potential shape:

- template definitions loaded/indexed at boot
- `RoomProvider.resolve(templateRef, runtimeContext)` hydrates on miss
- `RoomManager` becomes a runtime-object index rather than full-world registry
- eviction policy (time-based or ref-count + TTL) for inactive rooms

### Pros

- Reduces startup time dramatically for sparse access patterns
- Baseline heap tracks active world footprint rather than total authored size
- Natural bridge to sharded/procedural lifecycles

### Cons

- Higher complexity in movement hot path (cache misses/hydration)
- Requires strict lifecycle and reference ownership discipline
- More failure modes (thrash, stampedes, stale references)
- Needs robust observability and warm-path tuning

### Best fit

- Very large worlds with localized active populations
- Environments where startup and memory are current pain points

---

## Option 3: Region/sector streaming (high payoff, higher complexity)

### Description

Partition topology into regions/sectors (authored chunking or derived indexing). Load/unload at region granularity.

Potential shape:

- region descriptors map room refs -> region id
- activity-based pinning (players/NPCs/timers pin region)
- unload only when region refcount reaches zero and cooldown expires
- intra-region links always hot; cross-region links may trigger async prefetch

### Pros

- Better control over churn than per-room eviction
- Can preserve locality and reduce thrashing
- More predictable operational profile than pure LRU room cache

### Cons

- Requires new authoring/indexing expectations
- Cross-region boundary management complexity
- Needs stronger tooling (region diagnostics, preload hints)

### Best fit

- Large but geographically coherent worlds
- Teams willing to invest in topology partitioning

---

## Option 4: Template + overlay state (for shards and mutable worlds)

### Description

Keep immutable template room definitions separate from mutable runtime overlay data.

- Template graph holds static geometry/text/exits/door definitions
- Overlay holds mutable state (door lock state, spawned entities, puzzle flags)
- Runtime view is template + overlay composition

### Pros

- Memory efficient when mutations are sparse
- Clean conceptual model for “many instances of same template”
- Strong foundation for deterministic rehydration

### Cons

- Composition logic can leak into many callsites if not carefully centralized
- Debugging can become harder (effective state is derived)
- Must avoid partial migration where some systems mutate template objects directly

### Best fit

- Heavy shard usage with mostly-static base templates
- Future narrative rehydration workflows

---

## Option 5: Copy-on-write object graph (advanced)

### Description

Share base runtime graph across instances until mutation, then fork affected nodes.

### Pros

- Potentially excellent memory efficiency
- Preserves object-like runtime semantics in read-mostly paths

### Cons

- Highest complexity for identity, ownership, and correctness
- Difficult teardown semantics
- Debugging and tooling burden is substantial

### Best fit

- Only after strong lifecycle and observability foundations
- Not recommended as first large-scale step in current engine

---

## Option 6: Procedural projection model (seed + coordinate, bounded residency)

### Description

Treat many rooms as generated projections rather than stored authored objects.

- deterministic generation from seed + coordinates + rules
- room instances materialize on access
- mutable state externalized (overlay/progression store)
- residency bounded by active frontier and cache policy

### Pros

- Supports effectively unbounded theoretical worlds
- Avoids pre-authoring and pre-hydrating massive topologies
- Strongly aligned with lazy residency

### Cons

- Major content/tooling shift for designers
- Determinism and persistence contracts become critical
- Harder parity with existing authored bundle assumptions

### Best fit

- New procedural zones or expansions, not immediate replacement for all authored content

---

## Cross-cutting design decisions (required regardless of option)

## 1) Identity contract

Define three explicit ids:

- `templateRoomRef`: stable authored id (`area:room`)
- `runtimeRoomRef`: runtime object id (`area#instance:room` or equivalent)
- `persistedLocationRef`: canonical saved location (typically template ref + context)

This prevents stale runtime refs from leaking into persistence.

## 2) Lifecycle state machine

Adopt explicit lifecycle states for runtime room instances:

- `created`
- `active`
- `quiescing`
- `destroyed`

Define legal transitions and teardown invariants (no players, no pinned timers, entities detached, listeners removed).

## 3) Reference ownership rules

For each subsystem (players, NPCs, items, timers, events, scripts), define:

- who may hold strong references to rooms
- when references must be released
- what cleanup hooks are mandatory

## 4) Movement-path latency budget

Set SLO-style targets for movement path and enforce with instrumentation:

- cache hit path
- cache miss/hydrate path
- cross-instance routing path

## 5) Observability baseline

Introduce metrics/logging before large changes:

- active room count by type (shared/sharded/procedural)
- hydrate/destruct counts and latency
- eviction counts/reasons
- GC pause metrics and heap usage snapshots
- top O(n) admin/engine calls by wall time

---

## Compatibility implications by subsystem

### Movement and routing

- Must remain deterministic from player perspective
- If async hydration is introduced, route must preserve ordering and avoid visible jitter

### Persistence/login

- Saved location format must not depend on transient runtime instance ids
- Login in sharded/procedural contexts requires deterministic re-resolution policy

### Scripting/events

- Existing scripts may assume room immortality and global presence
- New lifecycle hooks should be additive and deterministic

### Admin tooling

- Commands that enumerate "all rooms" may need bounded/filtered semantics
- Need diagnostics for runtime vs template entities

---

## Phased investigation and delivery plan

### Phase 0: Instrumentation and baselining

- Add metrics around room counts, hydrate cost, and movement latency
- Add microbench/diagnostic scripts for synthetic large maps
- Identify current O(n) hotspots

### Phase 1: Identity/lifecycle contracts without changing residency

- Introduce explicit identity split in docs/types/APIs
- Introduce lifecycle events and teardown contracts
- Keep current full-resident model for safety

### Phase 2: Shard runtime enablement

- Add instance-aware routing and deterministic shard lifecycle
- Validate persistence/login semantics with canonical refs
- Keep scope isolated from global lazy-loading

### Phase 3: Residency strategy trial (Option 2 or 3)

- Prototype on limited areas/regions
- Benchmark memory/startup/movement impact
- Decide go/no-go based on measured regressions

### Phase 4: Procedural extension (optional)

- Add seed-projected zones behind explicit feature flags
- Keep authored world path unchanged for backward compatibility

---

## Risks and mitigation themes

1. **Silent behavior drift**
   - Mitigation: capture current behavior with tests before changing lifecycle/residency.

2. **Reference leaks during teardown**
   - Mitigation: enforce teardown checklists and post-destroy assertions.

3. **Movement latency spikes from cache misses**
   - Mitigation: preload hints, neighbor prefetch, bounded sync work.

4. **Persistence corruption from runtime ids**
   - Mitigation: canonical persisted refs and migration guards.

5. **Operational opacity**
   - Mitigation: metrics first, then feature rollout.

---

## Recommended path for this codebase

Given current architecture and compatibility constraints, the most pragmatic path is:

1. **Option 1 first** (identity split + lifecycle contracts, keep full residency),
2. then **targeted Option 2/3 trial** where scale pressure is proven,
3. and reserve Option 4/6 patterns for shard-heavy/procedural zones.

This sequence minimizes risk, keeps changes reviewable, and avoids committing to a high-complexity memory model before baseline instrumentation confirms necessity.

---

## Suggested investigation checklist (maintainer response)

- Map exact room instantiation points and indices.
- Catalog all places storing strong room references.
- Measure startup and heap profile at progressively larger synthetic room counts.
- Identify all engine/admin/script paths doing global room scans.
- Define canonical persistence format for sharded/procedural-safe location storage.
- Draft room lifecycle teardown invariants and ownership contracts.
- Propose one incremental rollout plan with rollback checkpoints.

---

## Non-goals for this exploratory stage

- No immediate refactor or feature merge
- No automatic eviction policy yet
- No procedural runtime rollout yet
- No player-visible behavior changes yet

This is an architectural analysis document intended to guide a measured implementation plan.
