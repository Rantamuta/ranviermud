# Actor Command Architecture Implementation Checklist

## Status

- Status: `draft`
- Scope: add additive actor-side Capture and Plan hooks to the bundle-layer command pipeline
- Source plan: `docs/plans/actorCommandArchitecturePlan.md`
- In Scope:
  - define `canActor` and `planActor` in the normative command architecture
  - add runtime support in `bundles/bundle-rantamuta/lib/session/command-dispatch.js`
  - preserve `metadata.actorKindsAllowed` as canonical existing Capture behavior
  - add focused dispatcher coverage plus authored coverage in `areas/test` and `areas/codex`
- Out of Scope:
  - removing or deprecating `metadata.actorKindsAllowed`
  - replacing or redesigning `setplayermetadata`
  - wiring `reactActor`, `reactDirect`, or `reactIndirect`
  - parser, engine-core, scheduler, queueing, or broad NPC-action redesign
- Acceptance Criteria:
  - `CommandArchitecture.md` defines additive `canActor` and `planActor` hook surfaces
  - `canActor` deny results normalize to `ACTOR_KIND_FORBIDDEN`
  - runtime dispatch supports both hooks symmetrically with current direct/indirect hook patterns
  - existing `metadata.actorKindsAllowed` behavior continues to work unchanged
  - deterministic harness coverage exists in `areas/test`
  - a Codex-authored creative illustration exists in `areas/codex`

## Checklist

- [x] `C01` [docs] Update `docs/normative/CommandArchitecture.md` Capture section to define additive `canActor(actor, verbId, context)` hook placement, object-attached discovery on the actor, precedence before `metadata.actorKindsAllowed`, normalization rules, `ACTOR_KIND_FORBIDDEN` deny envelope, deterministic constraints, and the family-consistent redundant actor argument note.
  - Trace:
    - "`docs/normative/CommandArchitecture.md` normatively defines `canActor` as an additive Capture hook alongside `metadata.actorKindsAllowed`." (`Acceptance Criteria`)
    - "Use the proposal's Capture ordering: 1. `canActor(actor, verbId, context)` explicit decision 2. command metadata gate `metadata.actorKindsAllowed` 3. command-level `captureChecks` 4. existing ordered entity policy checks." (`Proposed Behavior`)
    - "`canActor` keeps the same argument shape as the other entity hook surfaces for hook-family consistency, even though the actor is also the receiver and is therefore passed redundantly." (`Proposed Behavior`)
  - Validation handoff: `S1`, `contract/parity`

- [x] `C02` [docs] Update `docs/normative/CommandArchitecture.md` Plan section to define additive `planActor(actor, verbId, context)` hook placement, object-attached discovery on the actor, contribution contract, merge order before `planDirect` and `planIndirect`, downstream Commit/Render participation, invalid-shape symmetry with target Plan hooks, and the family-consistent redundant actor argument note.
  - Trace:
    - "`docs/normative/CommandArchitecture.md` normatively defines `planActor` as an additive Plan contribution hook alongside `planDirect` and `planIndirect`." (`Acceptance Criteria`)
    - "Planned merge order: 1. base command result 2. `planActor` 3. `planDirect` 4. `planIndirect`." (`Proposed Behavior`)
    - "`planActor` should be symmetrical and unsurprising with respect to `planDirect` and `planIndirect`." (`Proposed Behavior`)
  - Validation handoff: `S1`, `contract/parity`

- [x] `C03` [docs] Align `docs/normative/NpcActionArchitecture.md` anywhere actor-hook or actor-eligibility cross-references would otherwise drift from the updated command architecture, without changing the current `metadata.actorKindsAllowed` compatibility stance.
  - Trace:
    - "align `docs/normative/NpcActionArchitecture.md` where cross-references or actor-hook expectations need to match" (`Compatibility and Records`)
    - "Keep `metadata.actorKindsAllowed` in place as an existing canonical Capture mechanism." (`In Scope`)
  - Validation handoff: `S1`, `contract/parity`

- [x] `C04` [dispatch] Add actor-side Capture evaluation in `bundles/bundle-rantamuta/lib/session/command-dispatch.js`, reusing the current policy normalization path so `actor.canActor(actor, verbId, context)` is discovered on the actor object and handled symmetrically with direct/indirect Capture hooks.
  - Trace:
    - "`canActor` should be symmetrical and unsurprising with respect to `canDirect` and `canIndirect`: discovery, invocation, normalization, and failure handling should follow the same runtime patterns already used for direct and indirect Capture hooks." (`Proposed Behavior`)
    - "likely helper seams include actor-side counterparts to the current capture-policy and target-plan contribution flow" (`Implementation Surfaces`)
  - Validation handoff: `S2`, `unit`

- [x] `C05` [dispatch] Integrate the new actor-side Capture evaluation into `runCaptureChecks` in `bundles/bundle-rantamuta/lib/session/command-dispatch.js` so `canActor` runs before `metadata.actorKindsAllowed`, command `captureChecks`, and ordered entity policy checks, while preserving the current metadata-gate behavior unchanged.
  - Trace:
    - "Use the proposal's Capture ordering: 1. `canActor(actor, verbId, context)` explicit decision 2. command metadata gate `metadata.actorKindsAllowed` 3. command-level `captureChecks` 4. existing ordered entity policy checks." (`Proposed Behavior`)
    - "Existing `metadata.actorKindsAllowed` behavior remains intact." (`Acceptance Criteria`)
  - Validation handoff: `S2`, `unit`

- [x] `C06` [dispatch] Add actor-side Plan contribution collection in `bundles/bundle-rantamuta/lib/session/command-dispatch.js` so `actor.planActor(actor, verbId, context)` is discovered on the actor object and fed through the same contribution-consumption path used by target Plan hooks, including the maintainer comment about the intentionally redundant actor argument.
  - Trace:
    - "`planActor` should be symmetrical and unsurprising with respect to `planDirect` and `planIndirect`: discovery, invocation, contribution merge behavior, and invalid-shape handling should follow the same runtime patterns already used for direct and indirect Plan hooks." (`Proposed Behavior`)
    - "the runtime implementation should include a short maintainer comment explaining that implementations may ignore the first argument and use `this` if preferred" (`Proposed Behavior`)
  - Validation handoff: `S3`, `unit`

- [x] `C07` [dispatch] Update `collectTargetPlanContributions` in `bundles/bundle-rantamuta/lib/session/command-dispatch.js` or the extracted equivalent helper so actor contributions merge in the approved order before direct and indirect target contributions and participate in the same Commit/Render flow.
  - Trace:
    - "Planned merge order: 1. base command result 2. `planActor` 3. `planDirect` 4. `planIndirect`." (`Proposed Behavior`)
    - "`planActor.plan.operations` are appended into the same merged Commit plan used by `planDirect` and `planIndirect`" (`Proposed Behavior`)
    - "`planActor.render.messages` participate in the same deterministic Render/Dispatch assembly used for other Plan contributions" (`Proposed Behavior`)
  - Validation handoff: `S3`, `unit`

- [x] `C08` [tests] Extend dispatcher-level tests in `bundles/bundle-rantamuta/tests/command.dispatch.test.js` and any narrower focused suites needed to cover `canActor` discovery, normalization, precedence, deterministic behavior, and compatibility with existing `metadata.actorKindsAllowed` behavior.
  - Trace:
    - "Dispatcher contract tests for `canActor`: allow / deny / no-decision normalization, precedence against `metadata.actorKindsAllowed`, deterministic behavior." (`Tests`)
    - "Existing commands that rely on `metadata.actorKindsAllowed` continue to work unchanged." (`Acceptance Criteria`)
  - Validation handoff: `S4`, `unit`

- [x] `C09` [tests] Extend dispatcher-level tests in `bundles/bundle-rantamuta/tests/command.dispatch.test.js` and any narrower focused suites needed to cover `planActor` discovery, merge ordering, failure behavior, render replacement behavior, and symmetry with `planDirect` / `planIndirect`, including invalid-shape handling.
  - Trace:
    - "Dispatcher contract tests for `planActor`: merge ordering, failure behavior, render replacement behavior, interaction with `planDirect` / `planIndirect`." (`Tests`)
    - "`canActor` and `planActor` are implemented symmetrically with the current `canDirect` / `canIndirect` and `planDirect` / `planIndirect` patterns" (`Acceptance Criteria`)
  - Validation handoff: `S4`, `unit`

- [ ] `C10` [content] Add a deterministic authored harness in `bundles/bundle-rantamuta/areas/test` and the corresponding coverage that exercises `canActor` and `planActor` through normal bundle loading and dispatch with predictable outcomes suitable for integration evidence.
  - Trace:
    - "`areas/test` should get a deterministic authored harness that demonstrates `canActor` and `planActor` through loaded content with predictable outcomes suitable for integration coverage." (`Tests`)
    - "`bundles/bundle-rantamuta/areas/test` provides deterministic authored harness coverage for the new actor hooks." (`Acceptance Criteria`)
  - Locked context:
    - prefer two NPC fixtures sharing one harness script so each behavior stays obvious and deterministic
    - one NPC should exercise an allowed command path with `planActor` contributions
    - one NPC should exercise a command path that would normally succeed but is denied by `canActor`
  - Validation handoff: `S5`, `integration/smoke`

- [ ] `C11` [records] Update `CHANGELOG.md` for the new bundle-layer command hook surfaces and record the ADR decision as “not required” unless implementation reveals broader architecture/policy drift.
  - Trace:
    - "`CHANGELOG.md` should be updated because this adds new bundle-layer command hook surfaces and runtime behavior" (`Compatibility and Records`)
    - "ADR requirement: not required by default, unless implementation reveals a broader long-term architecture or policy change beyond extending the current hook model" (`Compatibility and Records`)
  - Validation handoff: `S6`, `contract/parity`

- [ ] `C12` [content] Add a Codex-authored creative illustration in `bundles/bundle-rantamuta/areas/codex` and the corresponding coverage that uses the new actor hook surfaces in a way that is interesting, valid within the command architecture, and not hardcoded into runtime.
  - Trace:
    - "`areas/codex` should get a Codex-authored creative illustration of the new actor hook surfaces." (`Tests`)
    - "the expectation is to use the new surfaces in a way that is interesting, valid within the command architecture, and not hardcoded into runtime" (`Tests`)
    - "`bundles/bundle-rantamuta/areas/codex` provides a Codex-authored creative illustration of the new actor hooks that remains within command-architecture constraints." (`Acceptance Criteria`)
  - Locked context:
    - place this slice after the documentation, dispatcher, deterministic harness, and project-record work so implementation can use the remaining time for creative exploration without destabilizing the core contract
  - Validation handoff: `S7`, `integration/smoke`

## Behavior Slices

- `S1`
  - Goal: define the normative command-architecture contract for additive actor Capture and Plan hooks and align adjacent normative references.
  - Items: `C01`, `C02`, `C03`.
  - Type: `behavior`

- `S2`
  - Goal: add actor-side Capture hook evaluation to the dispatcher while preserving existing metadata-gate compatibility.
  - Items: `C04`, `C05`.
  - Type: `behavior`

- `S3`
  - Goal: add actor-side Plan contribution collection and merge it into the existing Commit/Render flow.
  - Items: `C06`, `C07`.
  - Type: `behavior`

- `S4`
  - Goal: lock dispatcher-level symmetry, precedence, normalization, and contribution behavior for the new actor hooks.
  - Items: `C08`, `C09`.
  - Type: `behavior`

- `S5`
  - Goal: prove the new actor hook surfaces through deterministic test content.
  - Items: `C10`.
  - Type: `behavior`

- `S6`
  - Goal: record the user-visible/runtime-surface change in project records.
  - Items: `C11`.
  - Type: `mechanical`

- `S7`
  - Goal: use the new actor hook surfaces in a Codex-authored creative illustration after the core contract and deterministic coverage are complete.
  - Items: `C12`.
  - Type: `behavior`
