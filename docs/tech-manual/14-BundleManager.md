# BundleManager.js Deep Dive (`node_modules/ranvier/src/BundleManager.js`)

## Status
- **binding:** informational
- **audience:** engine maintainers, agents
- **scope:** src module deep dive

## Purpose
This module defines `BundleManager` responsibilities within Ranvier core. Purpose summary below is grounded in static inspection of the module implementation and its immediate call graph.

- Primary role: provide `BundleManager` behavior/state used by adjacent engine modules.
- Secondary role: enforce local invariants through constructor/method contracts (where implemented).

## File Location and Exports
- **File path:** `node_modules/ranvier/src/BundleManager.js`
- **Exported symbols:** `BundleManager`
- **Export style:** CommonJS (CJS)

## Internal Architecture
### Core classes/functions
- `class BundleManager`
- Notable methods:
  - `for(...)`
  - `if(...)`
  - `for(...)`
  - `for(...)`
  - `loadQuestGoals(...)`
  - `for(...)`
  - `loadQuestRewards(...)`
  - `for(...)`
  - `loadAttributes(...)`
  - `for(...)`
  - `if(...)`
  - `if(...)`

### Data model
- Instance state fields observed: `areas`, `bundlesPath`, `loaderRegistry`, `state`.

### Lifecycle
1. Module is loaded via Node.js `require` and initializes top-level constants/dependencies.
2. Callers instantiate exported classes or invoke exported functions.
3. State mutations and side effects occur through documented methods in this module.

### Control flow
- Representative execution path: caller invokes `for(...)` (or constructor), internal logic validates/derives state, then delegates to imported collaborators as needed.

### Dependencies inside /src
- `loader` from `require(goalPath)`
- `loader` from `require(rewardPath)`
- `attributes` from `require(attributesFile)`
- `loader` from `require(eventsFile)`
- `loader` from `require(scriptPath)`
- `loader` from `require(commandPath)`
- `loader` from `require(channelsFile)`
- `loader` from `require(eventPath)`
- `loader` from `require(behaviorPath)`
- `loader` from `require(effectPath)`
- `loader` from `require(skillPath)`
- `loader` from `require(eventsPath)`

## Public Surface and Invariants
### Required call order
- Construction/configuration should occur before mutation/query calls. Specific strict ordering beyond this is Unverified unless enforced in code.

### Assumed state constraints
- Inputs are expected to match engine-defined object shapes.
- Caller-provided objects are assumed non-null unless explicitly guarded.

### Error behavior
- Throws `Error` in explicit guard paths (examples): `'Invalid bundle path'`; `'Attribute validation failed during bundle loading', { cause: err }`; ``Error hydrating area [${areaRef}] during bundle loading`, { cause: err }`; ``Error loading quests [${bundle}:${areaName}]`, { cause: err }`; ``Bundle ${bundle} has an invalid input event '${eventName}'. ` +
          `Expected a function, got: ${eventType}``.

### Sync vs async assumptions
- Contains async flows; callers should `await` and handle rejections.

### Internal invariants that must not be violated
- Do not mutate internal fields/maps/collections from outside documented APIs unless code explicitly permits it.
- Preserve expected object shapes passed across module boundaries.

## Integration Points
### Which other /src modules call into this one
- Unverified in static scan (no direct constructor/require match found).

### Which modules this one calls
- Unverified (no local `./` dependency calls detected beyond static imports).

### Event emissions or listeners
- No `.emit(...)` usage observed in this module.
- No `.on(...)` listener registrations observed in this module.

### Shared state, registries, or singleton usage
- Shared-state patterns are module/class-instance dependent; treat maps/caches/manager references as long-lived unless teardown is explicit.

## Performance Characteristics
- Contains iterative control flow; complexity depends on collection sizes in callers.
- Memory retention behavior is workload-dependent and partly Unverified without runtime profiling.

## Failure Modes
- Module throws explicit `Error` conditions; callers must handle failures to avoid hard crashes.
- Async control flow exists; missed `await`/rejection handling can cause latent runtime faults.
- Input shape validation is limited in this file; type/structure mismatches from upstream modules are a concrete hazard.
- Mutable shared state appears in module scope or object instances; lifecycle misuse can produce stale references.
- Error messages are not uniformly domain-specific, which can slow triage under production incidents.

## Gotchas and Footguns
- API comments and implementation may diverge over time; verify against current source before behavior changes.
- Static docs here do not replace runtime contract tests; regressions may not be obvious from type shape alone.
- Cross-module assumptions can break silently when loader/config order changes.

## Security Considerations
- Filesystem access exists in this module.

## Tests and Coverage
- node_modules/ranvier/test/unit/BundleManagerWarnings.js:8:const BundleManager = require('../../src/BundleManager');
- node_modules/ranvier/test/unit/BundleManagerWarnings.js:37:describe('BundleManager warnings', () => {
- node_modules/ranvier/test/unit/BundleManagerWarnings.js:49:    const manager = new BundleManager(tempDir, state);
- node_modules/ranvier/test/unit/BundleManagerWarnings.js:73:    const manager = new BundleManager(tempDir, state);
- node_modules/ranvier/test/unit/BundleManagerWarnings.js:104:    const manager = new BundleManager(tempDir, state);
- node_modules/ranvier/test/unit/BundleManagerWarnings.js:124:    const manager = new BundleManager(tempDir, state);
- node_modules/ranvier/test/unit/BundleManagerInputEvents.js:8:const BundleManager = require('../../src/BundleManager');
- node_modules/ranvier/test/unit/BundleManagerInputEvents.js:21:describe('BundleManager input events', () => {
- node_modules/ranvier/test/unit/BundleManagerInputEvents.js:36:      const manager = new BundleManager(tempDir, state);
- node_modules/ranvier/test/unit/BundleManager.js:6:const BundleManager = require('../../src/BundleManager');

### Suggested tests to validate this module in isolation
- Constructor/export smoke test confirms module loads and exported surface type is stable.
- Happy-path behavior test for one representative public method/function.
- Invalid input shape test to confirm defensive behavior or explicit error.
- Lifecycle/order test for expected initialization-before-use constraints.
- State mutation test ensuring internal collections/flags update as intended.
- Error propagation test with mocked failing dependency (I/O, loader, registry, etc.).

## Debugging Guidance
- Instrument entrypoints/method boundaries and dependency calls in this module.
- Inspect constructor state (`this.*` fields) and map/cache sizes before and after operations.
- Capture thrown error messages plus caller context to isolate integration faults quickly.
- If async paths exist, log Promise rejection sites and unresolved await boundaries.

## Maintainer TODOs
1. Add or expand focused unit tests for this module’s public surface and invariants.
2. Tighten input/state validation at module boundaries where assumptions are implicit.
3. Document or codify teardown/eviction behavior for any long-lived caches/managers.
4. Reconcile comment vs implementation drift and remove ambiguous API contracts.
5. Add targeted debug logging hooks around known failure hot spots.
