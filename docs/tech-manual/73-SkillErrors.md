# SkillErrors.js Deep Dive (`node_modules/ranvier/src/SkillErrors.js`)

## Status
- **binding:** informational
- **audience:** engine maintainers, agents
- **scope:** src module deep dive

## Purpose
This module defines `SkillErrors` responsibilities within Ranvier core. Purpose summary below is grounded in static inspection of the module implementation and its immediate call graph.

- Primary role: provide `SkillErrors` behavior/state used by adjacent engine modules.
- Secondary role: enforce local invariants through constructor/method contracts (where implemented).

## File Location and Exports
- **File path:** `node_modules/ranvier/src/SkillErrors.js`
- **Exported symbols:** `exports.NotEnoughResourcesError`, `exports.PassiveError`, `exports.CooldownError`
- **Export style:** CommonJS (CJS)

## Internal Architecture
### Core classes/functions
- `class NotEnoughResourcesError`
- `class PassiveError`
- `class CooldownError`

### Data model
- Instance state fields observed: `effect`.

### Lifecycle
1. Module is loaded via Node.js `require` and initializes top-level constants/dependencies.
2. Callers instantiate exported classes or invoke exported functions.
3. State mutations and side effects occur through documented methods in this module.

### Control flow
- Representative execution path is Unverified beyond static load/dispatch semantics.

### Dependencies inside /src
- None in this module.

## Public Surface and Invariants
### Required call order
- Construction/configuration should occur before mutation/query calls. Specific strict ordering beyond this is Unverified unless enforced in code.

### Assumed state constraints
- Inputs are expected to match engine-defined object shapes.
- Caller-provided objects are assumed non-null unless explicitly guarded.

### Error behavior
- No direct `throw new Error(...)` statements observed; downstream dependency errors can still propagate.

### Sync vs async assumptions
- Appears synchronous at module boundary in static scan.

### Internal invariants that must not be violated
- Do not mutate internal fields/maps/collections from outside documented APIs unless code explicitly permits it.
- Preserve expected object shapes passed across module boundaries.

## Integration Points
### Which other /src modules call into this one
- `Skill.js`

### Which modules this one calls
- Unverified (no local `./` dependency calls detected beyond static imports).

### Event emissions or listeners
- No `.emit(...)` usage observed in this module.
- No `.on(...)` listener registrations observed in this module.

### Shared state, registries, or singleton usage
- Shared-state patterns are module/class-instance dependent; treat maps/caches/manager references as long-lived unless teardown is explicit.

## Performance Characteristics
- No obvious hot path was identifiable from static inspection alone; runtime profile is Unverified.
- Memory retention behavior is workload-dependent and partly Unverified without runtime profiling.

## Failure Modes
- Input shape validation is limited in this file; type/structure mismatches from upstream modules are a concrete hazard.
- Mutable shared state appears in module scope or object instances; lifecycle misuse can produce stale references.
- Error messages are not uniformly domain-specific, which can slow triage under production incidents.

## Gotchas and Footguns
- API comments and implementation may diverge over time; verify against current source before behavior changes.
- Static docs here do not replace runtime contract tests; regressions may not be obvious from type shape alone.
- Cross-module assumptions can break silently when loader/config order changes.

## Security Considerations
- No direct eval-like execution, explicit network APIs, or prototype mutation were found in this module during static inspection.

## Tests and Coverage
- No direct tests referencing this module were found in `test/` or `node_modules/ranvier/test` via name scan.

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
