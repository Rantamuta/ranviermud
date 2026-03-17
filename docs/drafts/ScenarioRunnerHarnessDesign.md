# Scenario Runner Harness Design

## Status

- Status: draft-v1
- Scope: test-only design for faster scenario-runner coverage
- Type: design note for review (not yet implemented)

## Goal

Reduce the wall-clock cost of scenario-runner tests by avoiding repeated full-engine bootstrap for every scenario assertion, while preserving confidence in command-path behavior and keeping the existing scenario-runner CLI contract intact.

## Problem Statement

The current scenario-runner test suite pays the startup cost of a fresh Node process and a fresh Ranvier bootstrap for each test case.

Today, the bulk of this cost comes from:

- Node process startup,
- config loading,
- `ranvier` bootstrap,
- bundle discovery and bundle loading,
- repeated construction of `GameState`,
- repeated scenario-runner setup that is mostly identical across tests.

The current `scenario.basic.test.js` file contains many tests that call `spawnSync(process.execPath, ['util/scenario-runner.js', ...])`, and the runner then boots the full runtime before executing one or more commands.

This is a good end-to-end shape for CLI realism, but it is an expensive default for a large number of narrow assertions such as:

- shorthand canonicalization,
- basic room look assertions,
- simple movement checks,
- inventory/take/put flows,
- JSON payload shape checks,
- seeding checks.

The result is that the suite spends most of its time paying repeated startup cost instead of running gameplay assertions.

## Desired Outcome

We want a test structure where:

- most scenario assertions run against one shared booted engine per test file,
- each individual test still gets isolated player/session state,
- tests remain deterministic,
- CLI behavior is still covered by a smaller subprocess smoke layer,
- the existing `util/scenario-runner.js` command-line interface remains stable.

## Non-Goals

- No change to the public CLI behavior of `util/scenario-runner.js`.
- No compatibility change to wrapper boot, config loading, bundle loading, or command semantics.
- No engine-internal redesign in `Rantamuta/core`.
- No speculative optimization of unrelated Mocha or `node:test` suites.
- No attempt to deep-clone or snapshot the full world graph unless simpler isolation proves insufficient.

## Constraints

- Preserve the scenario-runner CLI contract and output semantics unless explicitly approved otherwise.
- Preserve deterministic behavior for identical world state and input.
- Preserve the repository boundary between runtime code and authored content.
- Keep the harness viable as a `ranviermud`-level utility rather than hardwiring it to `bundle-rantamuta`.
- Keep the refactor small, reversible, and test-focused.
- Prefer explicit cleanup over hidden reset behavior.
- Keep CommonJS and Node 22 compatibility.

## Current State

`util/scenario-runner.js` currently owns both:

- the CLI surface and output formatting, and
- the in-process runtime/bootstrap/execution logic.

That file currently:

- parses arguments and `.scenario` files,
- loads config,
- boots Ranvier and loads bundles,
- creates a fake player and fake socket,
- seeds inventory and room items,
- routes commands through input-event `"main"`,
- captures output and optional JSON events,
- exits with CLI-appropriate status.

This makes the file useful as a real smoke-test CLI, but it also makes the existing test suite use the most expensive possible path for every scenario assertion.

The current file also contains one explicit `bundle-rantamuta` coupling:

- it imports `../bundles/bundle-rantamuta/lib/parse-input` directly for parse metadata enrichment.

That means the current scenario-runner is only partially generic. It loads bundles from config, but one part of its JSON event shape assumes a specific bundle-local parser implementation.

## Proposed Design

### Summary

Split scenario-runner into two layers:

1. A reusable in-process harness core for tests and CLI execution.
2. A thin CLI wrapper that preserves the existing `util/scenario-runner.js` behavior.
3. An optional capability layer for bundle-specific enrichments that are not required for baseline execution.

The harness core will allow test files to:

- boot the runtime once,
- create a fresh per-test player/session,
- execute a scenario run in memory,
- collect output/events,
- clean up created entities afterward.

The capability layer will allow richer integrations, such as parse-field enrichment, when a loaded bundle exposes the necessary surfaces.

### Proposed Module Boundary

Recommended shape:

- keep `util/scenario-runner.js` as the CLI entry point,
- move reusable logic into a new shared module,
- let both the CLI and tests call the same core execution API,
- keep bundle-specific enrichments behind optional adapters rather than in the core.

Candidate locations:

- `util/scenario-runner-lib.js`
- `bundles/bundle-rantamuta/tests/helpers/scenario-harness.js`

Recommendation:

Use `util/scenario-runner-lib.js`.

Reasoning:

- the current runner logic already lives under `util/`,
- the CLI should depend on the shared module directly,
- the harness is not bundle-specific in purpose even though current tests are concentrated in `bundle-rantamuta`,
- keeping it near the CLI entry point avoids duplicating runner logic between `util/` and `tests/helpers/`.

### Bundle-Agnostic Core vs Optional Capabilities

The refactor should explicitly separate what is generic from what is bundle-specific.

#### Generic core responsibilities

These belong in `ranviermud` without naming a specific bundle:

- load config from `ranvier.conf.js` or `ranvier.json`,
- boot Ranvier and load the configured bundles,
- create fake players and sessions,
- resolve rooms and seed items by entity reference,
- dispatch raw input through the runtime's registered input-event surface,
- capture output,
- report success/failure status based on observable runner behavior.

This core should only assume what the loaded runtime actually provides at boot time.

#### Optional capability responsibilities

These should be treated as additive and not required for baseline harness viability:

- parse-artifact enrichment based on a bundle-local parser,
- extra JSON telemetry fields that depend on bundle-specific command architecture,
- bundle-specific affordances for richer test reporting.

The important design rule is:

The core harness must remain usable even when no capability adapter is present.

### Capability Discovery

The harness should not hardcode `bundle-rantamuta` to decide whether scenario execution is possible.

Instead, it should boot the configured bundle set and inspect the resulting runtime to classify capabilities.

The important design rule is:

The harness must discover scenario capabilities only by inspecting the booted runtime after booting the configured bundle set.

Example capability checks:

- whether the runtime registered any `"main"` input-event listeners,
- whether a compatible parse-enrichment adapter is available,
- whether the runtime exposes enough room/entity surfaces for seeding.

This allows the harness to support several compatibility tiers instead of a single all-or-nothing bundle assumption.

### Proposed API

The exact names can change, but the design should support an API with the following roles:

#### Boot API

```js
const harness = await bootScenarioHarness({ root });
```

Responsibilities:

- load config,
- boot Ranvier,
- construct `GameState`,
- load bundles,
- cache any reusable runner-level services,
- detect available harness capabilities,
- expose disposal hooks if needed.

#### Per-Run API

```js
const result = await harness.runScenario({
  roomRef,
  commandLines,
  seedRefs,
  jsonOutput,
  includeWhitespace,
  failOnUnknown,
});
```

Responsibilities:

- create a fresh fake player and session,
- place player into the requested room,
- apply per-run seeds,
- execute commands through the same input-event path used today,
- collect textual output and structured events,
- degrade gracefully when optional bundle-specific enrichments are unavailable,
- return stable result data for assertions,
- remove or undo per-run state afterward.

#### Disposal API

```js
await harness.dispose();
```

Responsibilities:

- detach any long-lived listeners if needed,
- release long-lived test resources,
- make leaks obvious if future runner changes add global state.

The initial implementation may not require much disposal logic, but the boundary is still worth defining up front.

### Suggested Capability Shape

One reasonable shape is:

```js
{
  supportsMainInput: true,
  supportsParseEnrichment: false,
  adapterName: null,
}
```

Where:

- `supportsMainInput` means the harness can drive command input through the runtime,
- `supportsParseEnrichment` means richer parse metadata can be returned,
- `adapterName` identifies any optional adapter in use.

The exact field names can change, but the design should make capability presence explicit rather than implicit.

## CLI Preservation Plan

`util/scenario-runner.js` should remain the authoritative CLI entry point.

After refactor, it should still be responsible for:

- reading `process.argv`,
- printing help text,
- printing textual or JSON output,
- setting process exit code,
- preserving current error behavior.

It should delegate the reusable work to the shared module rather than owning the bootstrap and execution logic directly.

This preserves current user-facing behavior while allowing tests to bypass the process boundary when CLI realism is not the thing being tested.

Where the current CLI exposes bundle-specific JSON fields, the refactor should preserve current behavior when the matching adapter is available. If the adapter is unavailable, the harness should prefer explicit reduced capability over hidden assumptions.

## Bundle Compatibility Model

The harness should support multiple compatibility tiers.

### Tier 1: Baseline runnable bundle set

Characteristics:

- configured bundles boot successfully,
- at least one `"main"` input-event listener is registered,
- rooms/entities needed by a scenario can be resolved.

Expected harness behavior:

- scenario execution works,
- output capture works,
- basic status reporting works.

### Tier 2: Enriched scenario bundle set

Characteristics:

- Tier 1 support, plus
- an optional adapter can provide parse or telemetry enrichment.

Expected harness behavior:

- baseline execution works,
- richer JSON event payloads are available,
- tests may assert on parse metadata when that adapter is present.

### Tier 3: Non-conforming or non-playable bundle set

Characteristics:

- bundles boot, but no playable `"main"` input-event surface exists,
- or required scenario surfaces are absent.

Expected harness behavior:

- the harness should fail clearly and early for scenario execution,
- the failure should describe the missing capability,
- the harness should not pretend that scenario execution is supported.

This makes the utility honest for both conforming and non-conforming bundle sets.

## Implication for `bundle-rantamuta`

`bundle-rantamuta` should be treated as one adapter target, not as the definition of the harness core.

That means:

- the harness core should not import `bundle-rantamuta` parser code directly,
- any current `bundle-rantamuta` parse enrichment should move behind an adapter boundary,
- scenario execution should continue to work for other bundle sets that expose a compatible playable surface,
- reduced metadata is acceptable when a bundle set does not expose the same parser affordances.

## Isolation Model

Isolation is the highest-risk part of this design. The performance win only matters if tests remain deterministic and easy to trust.

### Per-Test Isolation We Want

Each scenario test should receive:

- a fresh fake player,
- a fresh fake session,
- fresh output buffers,
- fresh event buffers,
- fresh seeded items,
- no dependency on another test's player position or inventory.

### Cleanup Strategy

Prefer explicit cleanup of things created during a run.

Track and clean up:

- created player objects,
- created seeded item objects,
- room placement for the player,
- inventory placement for seeded items,
- event/output buffers.

### Shared-State Risk Categories

Not all scenario tests have the same isolation risk.

#### Low-risk cases

These are good candidates for in-process shared-boot execution:

- unknown command handling,
- input canonicalization assertions,
- room look assertions,
- simple movement between existing rooms,
- inventory listing,
- simple take/put flows with seeded items,
- JSON event shape validation,
- seed event validation.

These cases mostly depend on ephemeral player state and short-lived seeded items.

#### Medium-risk cases

These are likely still viable in-process, but may require explicit reset work:

- tests that open/close/unlock doors,
- tests that mutate room-local metadata,
- tests that move authored NPCs indirectly,
- tests that rely on room state changing during command flow.

These are still local enough that targeted cleanup may be practical.

#### High-risk cases

These should initially remain subprocess tests unless we prove cleanup is simple and robust:

- tests that depend on hidden bundle-global singleton state,
- tests that mutate broader world metadata,
- tests that rely on process-level CLI semantics rather than runner semantics,
- tests where authored scripts retain runtime state in hard-to-reset places,
- any scenario whose cleanup path is less obvious than its setup path.

### Explicit Non-Strategy

The first implementation should not attempt:

- full deep cloning of `GameState`,
- snapshotting the whole world object graph,
- clever hidden reset of arbitrary bundle state.

Those strategies are harder to validate and more likely to create silent flakiness than a conservative hybrid approach.

## Test Suite Shape After Refactor

### Recommended Split

Split current scenario-runner coverage into two layers.

#### 1. Fast harness-backed scenario tests

These will import the shared harness directly and reuse one booted runtime per file.

Target assertions:

- look/canonicalization cases,
- simple movement,
- inventory/take/put,
- JSON event shape assertions,
- seeding assertions,
- selected authored scenarios with straightforward cleanup.

#### 2. Thin CLI smoke tests

These will continue to spawn `node util/scenario-runner.js`.

Target assertions:

- `--help`,
- missing-value error paths,
- unsupported legacy flag behavior,
- one or two end-to-end `.scenario` and `--json` smoke checks,
- any scenario intentionally validating process-boundary CLI behavior.

This keeps the CLI honest without forcing every gameplay assertion through a separate process.

Where CLI JSON assertions depend on parse enrichment, those tests should either:

- remain in the adapter-aware test bucket, or
- assert only the baseline fields guaranteed by the core harness contract.

## Migration Strategy

### Phase 1: Extract Shared Logic

Refactor `util/scenario-runner.js` into:

- shared reusable execution logic,
- thin CLI wrapper with no intended behavior change.

Validation target:

- existing subprocess-based scenario tests still pass.

This phase is mostly structural and should not change the test shape yet.

### Phase 2: Add Harness-Backed Tests

Introduce a test helper that boots the harness once for the file and exposes `runScenario(...)` to tests.

Validation target:

- one or two low-risk tests migrated first,
- confirm cleanup model works,
- measure runtime improvement.

### Phase 3: Migrate Low-Risk Majority

Move the obvious low-risk scenario assertions to the shared harness path.

Validation target:

- suite remains deterministic,
- no new ordering sensitivity,
- noticeable wall-clock reduction.

### Phase 4: Review Medium-Risk Scenarios

For each remaining subprocess scenario:

- decide whether it can be cleaned up explicitly,
- migrate it if cleanup is simple and trustworthy,
- otherwise leave it as subprocess coverage.

This keeps scope controlled and avoids forcing all scenarios into one model.

## Suggested Result Contract for Harness Runs

To keep tests easy to read, the per-run result should be stable and simple.

Suggested shape:

```js
{
  status: 0,
  stdout: '...',
  stderr: '',
  events: [...],
}
```

Notes:

- `status` should mirror current scenario-runner success/failure semantics.
- `stdout` should preserve the current textual output shape used by assertions.
- `stderr` may remain empty for most in-process runs, but keeping the field makes migration easier.
- `events` should be present for JSON-style assertions.

The goal is to let migrated tests keep roughly the same assertion style they use today.

For enriched runs, additional fields may be present. For baseline runs, tests should not assume adapter-specific fields exist unless the test explicitly targets that adapter.

## Why This Design Over Alternatives

### Option A: Keep current subprocess-per-test model

Pros:

- highest CLI realism,
- easiest isolation story.

Cons:

- worst performance,
- repeated bootstrap dominates wall-clock time,
- expensive default for narrow gameplay assertions.

### Option B: Shared in-process harness plus thin CLI smoke layer

Pros:

- largest likely performance win,
- preserves most behavioral coverage,
- keeps CLI coverage where it matters,
- keeps the harness viable as a repo-level utility instead of a `bundle-rantamuta` helper,
- incremental migration is possible.

Cons:

- requires explicit cleanup discipline,
- introduces a new helper boundary,
- some scenarios will still need subprocess coverage.

### Option C: Batch-mode subprocess runner

This would keep the process boundary but execute multiple cases in one child process.

Pros:

- preserves more CLI realism than direct harness usage,
- avoids some repeated process startup.

Cons:

- more awkward test authoring,
- more awkward failure reporting,
- cleanup and test isolation become a custom protocol problem,
- less natural fit for the current test structure than direct harness reuse.

Recommendation:

Choose Option B first.

It is the best balance of speed, readability, and controlled risk.

## Validation Plan

Because this is a behavior-adjacent test refactor, validation should prove both correctness and performance benefit.

Expected validation commands for implementation work:

- `npm test`
- `npm run ci:local`

Additional focused checks that are likely useful during development:

- targeted execution of scenario-runner tests before and after migration,
- direct timing of representative scenario runs,
- reruns to look for order-dependent flakiness.

The implementation summary should include:

- before/after wall-clock observations,
- which scenarios remained subprocess-based and why,
- any cleanup assumptions introduced by the harness.

## Risks

- Hidden shared state in bundle scripts may leak between harness-backed tests.
- A cleanup path may appear to work while silently missing one mutated field.
- Tests may become order-sensitive if migration is too aggressive too early.
- The shared module boundary could drift into becoming a second, test-only runtime if not kept narrow.
- A supposedly generic harness could accidentally reintroduce `bundle-rantamuta` assumptions through convenience imports or JSON field contracts.

## Open Questions

1. Should the shared reusable module live under `util/` or under `tests/helpers/`?

Current recommendation: `util/`, because the CLI should depend on the same core logic.

2. How should optional parse-enrichment adapters be discovered?

Likely options:

- explicit registration by the CLI or tests,
- runtime feature detection,
- config-based opt-in.

Current recommendation: prefer runtime detection plus explicit adapter selection only when needed for targeted tests.

3. Should authored multi-step scenarios with door-state mutation migrate in the first pass or remain subprocess-based initially?

Current recommendation: keep them subprocess-based until low-risk migration proves the cleanup model.

4. Should the harness return current CLI-shaped text only, or a more structured result object?

Current recommendation: return a structured result object that still includes `stdout` and `stderr` for easy test migration.

5. Which JSON fields belong to the generic core contract versus the optional adapter contract?

Current recommendation: keep the core contract small and stable, and treat parse-artifact fields as adapter-owned unless they can be derived generically from runtime surfaces.

6. Should `node:test` scenario files continue to coexist under the broad Mocha glob, or should test-runner separation be handled independently?

This is related but not required for the harness refactor itself. It should be treated as a separate follow-up decision.

## Recommended First Implementation Slice

The safest first slice is:

1. extract shared scenario-runner logic into a reusable module,
2. keep `util/scenario-runner.js` behavior unchanged,
3. add a harness-backed test helper,
4. migrate only low-risk scenario tests,
5. leave CLI parsing/help/error-path tests and higher-risk scenarios as subprocess tests.

This gives us measurable speedup without betting the whole suite on a broad isolation mechanism on day one.
