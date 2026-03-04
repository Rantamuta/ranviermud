# Core Script Ergonomics Investigation: First-Class Root Exports

Status: `draft-v1`  
Audience: Maintainers of `Rantamuta/core` and `ranviermud` integration  
Scope: Feasibility and rollout options for allowing item/room/npc/area scripts to declare handlers at module root instead of requiring `listeners` + `spawn`-time wiring

## 1) Why this investigation exists

Designers are currently expected to attach many script behaviors through listener maps and/or `spawn`-time assignments. In practice, this creates a readability burden and can obscure where behavior is actually defined.

The requested ergonomic direction is:

- allow direct root exports like `spawn`, `playerEnter`, and eventually command hooks,
- have core normalize and attach those handlers automatically,
- preserve existing script compatibility.

## 2) Current engine behavior (what core does today)

From the currently pinned `ranvier` dependency, script loading is based on `listeners` objects and event manager registration:

- `loadEntityScript(...)` requires script exports to have `.listeners`, then registers each event listener via `factory.addScriptListener(...)`.
- `loadBehaviors(...)`, `loadPlayerEvents(...)`, and `loadServerEvents(...)` also read `.listeners` maps.
- Listener attachment eventually flows through `EventManager.attach(...)`, which binds each listener to emitter events.

Implication: root function exports are **not** currently auto-normalized into listeners in the active runtime contract.

## 3) Notable existing signal in core

The dependency already contains a proposal document `docs/proposals/FIRST_CLASS_SCRIPT_EXPORTS.md` that aligns closely with the desired direction:

- additive root exports support,
- backward compatibility with `listeners`,
- deterministic precedence for mixed-mode scripts,
- provisional command-hook handling.

This is strong evidence the idea is architecturally plausible and already contemplated by core maintainers.

## 4) Can this be done? Short answer

**Yes, it is feasible**, but it should be shipped as an additive contract in `Rantamuta/core`, then consumed by `ranviermud` via dependency update.

Given this repository pins `ranvier` to a specific Git SHA, behavior changes in core do not take effect here until we update the dependency reference and validate.

## 5) Main blockers (and why there are several)

### Blocker A: Active loader contract is listeners-only

Core loader paths currently assume `.listeners` is the canonical script surface. Introducing root exports requires a normalization step before current registration code runs.

### Blocker B: Event-name and shape validation contract is not codified in runtime

If we permit root exports, we must define:

- recognized event keys,
- accepted value shapes (`function` vs `(state) => fn` factories),
- strict-mode behavior for malformed reserved keys,
- behavior for unknown helper exports.

Without this, authors get inconsistent and hard-to-debug behavior.

### Blocker C: Command-hook semantics are architecture-coupled

Hooks like `canDirect/planDirect/reactDirect` imply command-phase invocation semantics. If we expose these names without a stable dispatcher contract, we risk accidental compatibility guarantees.

### Blocker D: Compatibility and migration safety

The existing ecosystem expects `listeners`. Any ergonomic layer must not break legacy scripts or alter event ordering unintentionally.

### Blocker E: This repo cannot solve it alone

`ranviermud` is wrapper/integration; core behavior lives in dependency `Rantamuta/core`. Therefore implementation requires cross-repo coordination:

1. core change,
2. release/tag or pinned SHA update,
3. integration validation in this repo.

## 6) Candidate implementation options

## Option 1 (recommended): Additive script normalizer in core

### What changes

Implement a shared normalizer in `Rantamuta/core` (example: `src/ScriptExportNormalizer.js`) used by:

- entity script loader,
- behaviors loader,
- player events loader,
- server events loader.

Normalizer output shape:

```js
{
  listeners: { [eventName]: listenerFactoryOrFn },
  hooks: { [hookName]: fn },
}
```

Then existing attach paths consume normalized `listeners` unchanged.

### Why this is best

- smallest blast radius (reuses existing event attach system),
- fully backward compatible,
- easy to roll back,
- supports incremental adoption by designers.

### Risks

- subtle ordering changes for mixed scripts if precedence is undefined.

### Mitigation

Codify precedence (for example: legacy `listeners[event]` first, then root `event`) and test it.

## Option 2: Transform scripts at bundle/content layer only

### What changes

Preprocess authored scripts in bundle tooling and emit legacy `listeners` format.

### Pros

- no engine change required.

### Cons

- introduces non-obvious build magic,
- splits authoring contract from runtime contract,
- harder debugging and portability.

### Recommendation

Do not prefer this unless core changes are temporarily blocked.

## Option 3: Replace listener system with direct hook binding

### What changes

Rework attach/runtime internals to bypass `listeners` maps.

### Pros

- can produce a cleaner end-state.

### Cons

- high risk and broad architectural drift,
- larger compatibility surface and regression potential,
- contradicts “small reversible changes” posture.

### Recommendation

Not recommended for initial rollout.

## 7) Suggested compatibility contract for root exports

For first release, keep scope intentionally narrow:

1. Support root **event handlers** only (stable):
   - `spawn`, `ready`, `updateTick`, `playerEnter`, `playerLeave`, `npcEnter`, `npcLeave`, `enterRoom`, `save`, `saved`.
2. Keep command hooks recognized as **reserved/provisional** metadata unless command architecture explicitly adopts invocation semantics.
3. Unknown function-valued root keys are treated as helper exports and ignored by listener registration.
4. Malformed reserved keys:
   - strict mode: throw,
   - non-strict mode: warn and ignore.
5. Mixed-mode precedence deterministic and documented.

## 8) Migration strategy for designers

### Authoring before

```js
module.exports = {
  listeners: {
    spawn: state => function () {
      this.planDirect = ...;
    },
  },
};
```

### Authoring after (target)

```js
module.exports = {
  spawn() {
    // true spawn behavior only
  },

  // future/stable depending on architecture readiness
  planDirect(actor, verb, context) {
    ...
  },
};
```

### Rollout style

- no forced migration,
- permit legacy + root mixed scripts,
- document examples and anti-patterns,
- update designer docs only after core support lands.

## 9) Validation plan across repositories

## Core (`Rantamuta/core`)

- unit tests for normalizer behavior,
- loader tests for entity/player/behavior/server event paths,
- mixed-mode precedence tests,
- strict vs non-strict malformed reserved key handling,
- regression test proving legacy scripts still work unchanged.

## Wrapper (`ranviermud`)

- update `ranvier` dependency SHA only after core tests pass,
- run `npm test` and `npm run ci:local`,
- run a minimal gameplay smoke test that exercises at least one root-export script and one legacy script side-by-side.

## 10) Rollback plan

If regressions appear after dependency bump:

1. revert `ranvier` dependency SHA in `package.json` and lockfile,
2. keep designer-facing docs conservative (legacy remains canonical until stabilization),
3. isolate failing script patterns and add characterization tests in core before retry.

## 11) Recommendation

Proceed with **Option 1 (additive normalizer in core)** in two phases:

- **Phase A (safe):** stable root event exports + full backward compatibility.
- **Phase B (separate decision):** command hook activation only after explicit command-architecture contract and tests.

This gives immediate ergonomics relief while maintaining deterministic behavior and compatibility boundaries.

## 12) Concrete next steps (proposed task breakdown)

1. In `Rantamuta/core`, implement script export normalizer and integrate into all `.listeners` loader entry points.
2. Add targeted unit tests for compatibility, precedence, and strict-mode validation.
3. Draft/update core contract documentation for script exports.
4. Bump `ranvier` dependency SHA in `ranviermud`.
5. Validate with local CI parity + smoke coverage and publish migration guidance in designer docs.

---

## Appendix: constraints that shape this recommendation

- `ranviermud` currently depends on `ranvier` via GitHub SHA pin (`github:Rantamuta/core#...`), so core changes require dependency update to be consumed.
- The existing core proposal on first-class script exports indicates prior alignment and can be used as design baseline.
