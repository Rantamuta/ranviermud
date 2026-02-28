# The Undying Village — Codebase-Grounded Implementation Plan (No Implementation)

## 1. Overview

This document translates the supplied **“The Undying Village”** design/spec into a concrete implementation plan against the current `ranviermud` + `bundle-rantamuta` codebase, without implementing behavior.

Important source-of-truth note: the requested `/mnt/data/*.md` normative files were not present in this environment; this plan is grounded in the repository equivalents under `docs/normative/` and `docs/manuals/`.

Scope posture follows repository constraints:

- command flow must stay phase-based and deterministic,
- render predicates remain read-only,
- semantic messaging uses `semanticEvent`,
- bundle/content layering stays strict (`lib/**` and `commands/**` content-agnostic; area-specific state/content in `areas/**`).

## 2. Architectural Mapping (spec → command/phase ownership)

### 2.1 Authoritative runtime flow (from normative docs)

Execution shape to preserve:

1. **Receive Input** (canonicalize + parse; no mutation)
2. **Entity Resolution** (bind targets; no mutation)
3. **Capture** (veto only; no mutation)
4. **Plan** (emit intent/operations; no direct mutation)
5. **Bubble** (post-plan reactions)
6. **Commit** (mutator applies operations transactionally)
7. **Render/Dispatch** (`semanticEvent`/broadcast output)

### 2.2 Ownership mapping by Undying Village mechanic

- **Language unlocks (Korppikieli, Käärmekieli, Karhukieli)**
  - Input/Resolution: bind `look`, `talk`, `feed`, stillness-eligible actions, and dialogue targets.
  - Capture: enforce stillness disallowed actions for snake sequence.
  - Plan: compute grants and sequence transitions.
  - Commit: set durable player metadata flags/counters.
  - Render/Dispatch: first-moment comprehension messages and observer-dependent `semanticEvent` variants.

- **Bear permission / relocation gating**
  - Capture: cave unbinding interaction denied unless `bear_permission_granted == true`.
  - Plan: apology + alternate den conversation outcomes.
  - Commit: set `bear_permission_granted`, `bear_relocated`.
  - Render: local semantic responses only.

- **Unbinding + restoration**
  - Capture/Plan: validate unbinding action prerequisites (including Snake/Bear conditions from spec).
  - Commit: set `village_restored = true` durably (single authoritative write path).
  - Render: local cave and underworld-gate reactions; no global broadcast.

- **Sickness/healed representation**
  - Render only: room/detail/NPC descriptive variants through predicates (`is_breathing_stone_bound`, `is_village_restored`, etc.).
  - No state writes in predicate runtime.

- **Death/debt authority and leave-permission logic**
  - Death event handling + realm transfer orchestration at session/lifecycle/death subsystem boundary.
  - Commit: increment/store `death_count`, `total_paid_to_king` when applicable.
  - Query/plan: derive `total_outstanding_debt = sum_{i=1..death_count} (2^(i-1)) - total_paid_to_king` at King permission checks.
  - Render: diegetic feedback; no mutation in messaging.

### 2.3 Render-time prohibitions (explicit)

Must not happen in render-time:

- no hidden mutation via predicate evaluators,
- no progression gates implemented only by changing descriptions,
- no “description implies access” shortcuts; gating must live in capture/plan/commit state checks.

## 3. Codebase Capability Inventory (EXISTS / EXISTS-WITH-ADAPTATION / MISSING)

## 3.1 Runtime and architecture surfaces

1. **Phase-based command pipeline with capture/plan/bubble/commit/render** — **EXISTS**
   - Reuse as primary integration path.
2. **Entity-resolution rules + deterministic target binding** — **EXISTS**
   - Reuse for talk/feed/unbind/apology target routing.
3. **Transactional mutator with rollback discipline** — **EXISTS-WITH-ADAPTATION**
   - Needs small operation-surface expansion for village/quest/death mutations not covered by current instruction set.
4. **`semanticEvent` render path and audience policy handling** — **EXISTS**
   - Reuse for raven-speaker split rendering and underworld local reaction events.
5. **Predicate runtime + area-local predicate registries** — **EXISTS**
   - Reuse for sickness/healed state and language-conditioned rendering.

## 3.2 Content-layer examples and reusable patterns

1. **Area script pattern for stateful gating** (Codex scripts with `canDirect` / `planDirect`) — **EXISTS**
   - Use as template for cave gate, ritual checks, and NPC interaction gates.
2. **Durable player metadata reads/writes** (`getPlayerMetadata`, `setPlayerMetadata`) — **EXISTS**
   - Reuse for language acquisition progress and debt counters.
3. **Room flag mutator support** (`setRoomFlag`) — **EXISTS-WITH-ADAPTATION**
   - Likely insufficient alone for area/world durable flags; may require area/global flag mutation helper.
4. **Quest scaffolding in YAML (`quests.yml`)** — **EXISTS-WITH-ADAPTATION**
   - Needs concrete quest-state transitions for multi-source quest discovery + global completion on `village_restored`.

## 3.3 Feature coverage relative to Undying Village

1. **Production Sick Village content (Korvenpää, cave, marsh, underworld, named NPC/animals)** — **MISSING**
2. **Skill system for passive language acquisition conditions** — **MISSING** (current README marks skills as not implemented)
3. **Stillness-sequence controller with interruption/cooldown semantics** — **MISSING**
4. **Bear permission/relocation durable state model** — **MISSING**
5. **Local death exemption by area + restoration phase** — **MISSING**
6. **Debt model fields (`death_count`, `total_paid_to_king`) + derived debt formula checks** — **MISSING**
7. **Realm-of-dead leave authority flow via King and ambassador payment path** — **MISSING**
8. **Corpse re-entry vs ambassador atomic resurrection branch** — **MISSING**
9. **Underworld local semantic reaction on restoration** — **MISSING**

## 4. Implementation Plan (phased task list)

## Phase 0 — Clarification + contract alignment (must complete before build)

### Task 0.1 — Confirm normative source set and pathing
- **What:** Resolve missing `/mnt/data/*` doc paths and confirm repository-document substitutions as authoritative for this implementation cycle.
- **Why:** Prevent implementation against the wrong contract baseline.
- **Where:** `docs/normative/*`, `docs/manuals/*`, task record/PR description.
- **State:** none.
- **Validation:** explicit maintainer confirmation captured before code changes.

### Task 0.2 — Decide durability scope for world flags
- **What:** Define authoritative storage location for `village_restored`, `bear_permission_granted`, `bear_relocated` (area/world/player quest state).
- **Why:** Spec requires persistence across resets and global effects; current bundle patterns are mostly player metadata + room flags.
- **Where:** likely `areas/<new_area>/scripts/helpers/*` + potential bundle runtime helper under `lib/helpers/*`.
- **State:** durability contract for listed flags.
- **Validation:** restart/reload scenario proving persistence semantics.

## Phase 1 — Foundation runtime surfaces (minimal new primitives)

### Task 1.1 — Add minimal durable state helper for area/world flags
- **What:** Add smallest helper and mutator instruction(s) needed to set/read durable non-player flags for `village_restored` and related world-state predicates.
- **Why:** Required for permanent world mutation and non-render gating.
- **Where:** `bundles/bundle-rantamuta/lib/session/mutator.js`, `bundles/bundle-rantamuta/lib/helpers/*` (new helper), tests under `bundles/bundle-rantamuta/tests/*`.
- **State:** read/write `village_restored`, `bear_permission_granted`, `bear_relocated`.
- **Validation:** unit tests for atomic set + rollback behavior; save/reload durability test.

### Task 1.2 — Add query helpers for debt derivation and exemption checks
- **What:** Implement pure helper functions for:
  - `total_outstanding_debt = sum_{i=1..death_count} (2^(i-1)) - total_paid_to_king`
  - counted/exempt death determination based on area + newbie + `village_restored`.
- **Why:** Keep formula exact and centralized; avoid drift across King/Unto/death handlers.
- **Where:** new helper module in `bundles/bundle-rantamuta/lib/helpers/*`, tests.
- **State:** reads `death_count`, `total_paid_to_king`, `village_restored`, newbie status.
- **Validation:** deterministic table-driven tests across edge cases (including negative outstanding credit).

## Phase 2 — Content wiring (new area and entities)

### Task 2.1 — Author Undying Village area skeleton
- **What:** Create area files for Korvenpää, cave/lovi site, marsh, underworld gate location, and required NPC/animal/item records.
- **Why:** Core scenario is content-driven; layering keeps content in `areas/**`.
- **Where:** `bundles/bundle-rantamuta/areas/<undying>/manifest.yml`, `rooms.yml`, `npcs.yml`, `items.yml`, `quests.yml`, `predicates.js`, scripts subtree.
- **State:** references flags and predicates without mutating in render.
- **Validation:** area loads cleanly; reference integrity checks pass.

### Task 2.2 — Predicate registry for sickness/restoration/language surfaces
- **What:** Add predicates including required names from spec (`is_breathing_stone_bound`, `is_village_restored`) and additional exact-name flags required by authored text.
- **Why:** Spec requires rendering through predicates only.
- **Where:** `bundles/bundle-rantamuta/areas/<undying>/predicates.js`, room/NPC descriptions in YAML.
- **State:** read-only queries against durable state and actor metadata.
- **Validation:** predicate runtime tests + room-view snapshots before/after restoration.

## Phase 3 — Mechanics implementation

### Task 3.1 — Raven language acquisition tracker
- **What:** Implement configurable condition tracker for Raven Language:
  - looked-at-raven,
  - presence duration,
  - raven-related semanticEvent count,
  - fed raven,
  - used talk to raven,
  grant when all enabled conditions satisfied, with no separate UI notification.
- **Why:** Matches exact acquisition spec and first visible predicate/semantic surface.
- **Where:** area scripts/helpers under `areas/<undying>/scripts/helpers/*`; minimal command/script hooks on look/talk/feed surfaces.
- **State:** per-player progression flags/counters; Raven skill acquired flag.
- **Validation:** scenario script proving grant only when enabled conditions are all satisfied.

### Task 3.2 — Snake stillness sequence
- **What:** Implement deterministic stillness-sequence controller in Snake domain with preconditions, allowed/disallowed actions, interrupt withdrawal, and cooldown.
- **Why:** Spec defines non-casual deterministic acquisition path.
- **Where:** area room/NPC scripts + helper state machine under `areas/<undying>/scripts/helpers/*`; capture hooks for disallowed actions.
- **State:** per-player sequence state, cooldown timestamps, Snake skill acquired flag.
- **Validation:** integration scenario for uninterrupted success and interrupted reset paths.

### Task 3.3 — Bear language prerequisites and unlock
- **What:** Gate Bear Language on prior Raven + Snake language acquisition; emit first-moment message exactly when acquired.
- **Why:** Required prerequisite chain.
- **Where:** Bear NPC script/helper in `areas/<undying>/scripts/npcs/*`.
- **State:** reads Raven/Snake flags; writes Bear skill flag.
- **Validation:** tests that proximity alone cannot unlock; requires both prerequisite skills.

### Task 3.4 — Bear apology/permission/relocation logic
- **What:** Implement checks and writes for:
  - `bear_permission_granted == true` only when criteria met,
  - apology requirement conditional on prior bear kill,
  - `bear_relocated = true` when alternate den found + communicated.
- **Why:** Mechanical gate for unbinding and persistent cooperation state.
- **Where:** Bear NPC script, cave interaction script, helper module.
- **State:** read/write `bear_permission_granted`, `bear_relocated`, per-player “killed bear previously” evidence.
- **Validation:** branch tests for never-killed vs previously-killed apology requirement; reset persistence test.

### Task 3.5 — Unbinding action + restoration commit
- **What:** Implement cave unbinding interaction that sets `village_restored = true` when performed under correct conditions.
- **Why:** true-resolution world mutation.
- **Where:** cave room/item script; possible command-level script hook.
- **State:** read `bear_permission_granted` (+ Snake presence per spec text), write `village_restored` durably.
- **Validation:** scenario: false sword-path victory does not set restored; understanding path does.

### Task 3.6 — Underworld local reaction event
- **What:** Emit local semantic event at underworld gate when restoration occurs; include Queen local reaction if present.
- **Why:** Required local-only feedback and cross-realm coherence.
- **Where:** restoration commit path + underworld room script.
- **State:** reads transition to `village_restored = true`.
- **Validation:** recipient-audience assertions confirming no global broadcast.

### Task 3.7 — Death/debt/leave-permission mechanics
- **What:** Add death handling path updates:
  - local exemption scope check,
  - counted death increment of `death_count`,
  - derived debt behavior via exact formula,
  - King permission checks (including promise-to-pay constraint),
  - third-party payment effects on `total_paid_to_king`.
- **Why:** central gameplay invariant for realm escape.
- **Where:** session/death lifecycle integration points, King/Unto interaction scripts, helper module.
- **State:** `death_count`, `total_paid_to_king`, derived outstanding debt.
- **Validation:** table scenarios for exempt/counting/newbie/overpaid/blocked leave cases.

### Task 3.8 — Corpse return vs ambassador resurrection atomic branch
- **What:** Implement two return paths after permission to leave:
  - corpse re-entry with failure if corpse missing,
  - ambassador resurrection atomic mutation: resurrect at ambassador, destroy original corpse, drop contents at corpse location, no duplication.
- **Why:** explicit model and atomicity requirement in spec.
- **Where:** death/respawn lifecycle module + ambassador script.
- **State:** corpse entity lifecycle, player alive/dead state, inventory placement.
- **Validation:** transactional tests asserting all-or-none effects for ambassador path.

## Phase 4 — Quest and narrative progression wiring

### Task 4.1 — Multi-source quest discovery and completion fan-out
- **What:** Wire quest acquisition from Queen, Unto, Raven/animals; ensure completion for all PCs with quest when `village_restored = true`.
- **Why:** quest-source flexibility and no failure state contract.
- **Where:** `areas/<undying>/quests.yml`, NPC scripts.
- **State:** actor quest active/completed + global `village_restored`.
- **Validation:** multiple-PC scenario with staggered quest acceptance + shared completion trigger.

### Task 4.2 — Sword path false-victory rendering
- **What:** Provide village gratitude and reaction rendering after Bear kill while ensuring no healed-state mutation.
- **Why:** preserve false-victory branch without blocking true path.
- **Where:** Bear death reaction scripts + predicate-driven descriptive text.
- **State:** may read bear death outcome; must not set `village_restored`.
- **Validation:** scenario proving reset cycle reintroduces Bear and unrest while true restoration remains unset.

## Phase 5 — Validation and CI parity

### Task 5.1 — Unit and integration tests (bundle)
- **What:** Add focused tests for each new helper/state machine/mutator instruction.
- **Why:** deterministic regressions and formula integrity.
- **Where:** `bundles/bundle-rantamuta/tests/*.test.js`.
- **State:** all new flags and counters.
- **Validation:** `npm test`.

### Task 5.2 — Scenario-runner narrative validation
- **What:** Add scenario scripts for:
  - Raven acquisition,
  - Snake stillness sequence,
  - Bear permission + relocation,
  - restoration and underworld reaction,
  - death/debt/leave/resurrection branches.
- **Why:** prove end-to-end behavior with command pipeline boundaries.
- **Where:** `bundles/bundle-rantamuta/tests/scenarios/*` and/or `util/scenario-runner.js` inputs.
- **State:** persistent states across save/restart checkpoints.
- **Validation:** `npm run ci:local` (includes mirrored CI steps per repo policy).

## 5. Pre-Implementation Questions and Conflicts

1. **Missing required doc paths**
   - **Spec excerpt:** “Normative docs you MUST use … `/mnt/data/...`”.
   - **Issue:** `/mnt/data` was unavailable; only repository docs exist.
   - **Clarification needed:** confirm repo paths as authoritative substitutes for this task.

2. **Restoration precondition wording conflict**
   - **Spec excerpt A:** “There are no additional mechanical preconditions for restoration beyond performing the unbinding action under the correct conditions (Bear relinquished claim and Snake present).”
   - **Spec excerpt B:** Bear section defines unbinding check as only `bear_permission_granted == true`.
   - **Issue:** unclear whether runtime must also require real-time Snake presence at ritual time.
   - **Clarification needed:** authoritative precondition set for unbinding success.

3. **Undefined state location/scope for durable flags**
   - **Spec excerpt:** durable `bear_permission_granted`, `bear_relocated`, `village_restored` persist across resets.
   - **Issue:** not specified whether state is global-world, area-local, per-player, or mixed.
   - **Clarification needed:** canonical storage scope for each flag.

4. **Sick Village area boundary is undefined**
   - **Spec excerpt:** exemption applies only “within the Sick Village area”.
   - **Issue:** no explicit room/area refs defining inclusion boundary.
   - **Clarification needed:** exact area id / room set for exemption checks.

5. **Newbie/low-level threshold undefined**
   - **Spec excerpt:** deaths exempt if “PC is low-level/newbie”.
   - **Issue:** no numeric rule or existing attribute threshold defined.
   - **Clarification needed:** exact newbie predicate.

6. **Promise-to-pay gate timing ambiguity**
   - **Spec excerpt:** promise allowed only when `total_outstanding_debt == 0` before current death counted.
   - **Issue:** leave permission is requested after death/transport; implementation needs explicit evaluation timeline snapshot.
   - **Clarification needed:** when exactly baseline debt is sampled for promise eligibility.

7. **Contradictory parenthetical in 6.9.1**
   - **Spec excerpt:** “If `total_outstanding_debt > 0` (derived; may be negative if the PC has overpaid...) then promise-to-pay is disallowed.”
   - **Issue:** `> 0` cannot simultaneously be negative.
   - **Clarification needed:** intended condition text (likely typo).

8. **Unto role ambiguity (greeter + ambassador vs realm restrictions)**
   - **Spec excerpt:** Unto is in square (lost) and also ambassador for resurrection/payment.
   - **Issue:** unclear whether one entity serves both responsibilities in living world and where resurrection occurs spatially.
   - **Clarification needed:** exact actor/location contract for ambassador resurrection path.

9. **Allowed/disallowed action set for Snake stillness vs command surface**
   - **Spec excerpt:** allows `look/inventory/score`; disallows movement, attack, weapon-drawing, feeding, loud speech, skill use.
   - **Issue:** not all listed verbs may currently exist; “loud speech” definition unspecified.
   - **Clarification needed:** exact command ids to classify as disallowed in this build.

10. **Quest-source optionality vs completion eligibility**
   - **Spec excerpt:** Queen not required to discover quest; all PCs who received quest succeed when restored.
   - **Issue:** unclear whether players who never explicitly accepted any source should auto-complete or remain unaffected.
   - **Clarification needed:** completion population definition.

11. **Raven naming visibility trigger granularity**
   - **Spec excerpt:** names appear only after self-introduction.
   - **Issue:** unclear whether introduction is per-player memory or globally revealed identity.
   - **Clarification needed:** per-player vs global reveal behavior.

12. **Bear kill memory source of truth**
   - **Spec excerpt:** apology required if “the player ever killed the bear”.
   - **Issue:** no existing kill-history contract identified for NPC-specific durable memory.
   - **Clarification needed:** required persistence scope and event source for “ever killed”.

## 6. Verification Matrix (requirements → validation)

| Requirement / Invariant | Implementation Location (Layer/Module) | State Involved | Validation |
|---|---|---|---|
| Deterministic command flow with phase separation | `lib/session/command-dispatch.js`, command modules, area scripts | N/A | integration tests asserting capture-before-plan and no direct mutation in command handlers |
| Predicate-only sickness/healed rendering | `areas/<undying>/predicates.js`, room/NPC descriptions | `is_breathing_stone_bound`, `is_village_restored` inputs | room-view tests before/after restoration; predicate-failure behavior tests |
| Raven skill grants only after enabled conditions | `areas/<undying>/scripts/helpers/ravenLanguage.js` (new) | per-player raven condition counters/flags | scenario with incremental conditions and no early unlock |
| Snake skill via uninterrupted stillness sequence | `areas/<undying>/scripts/helpers/snakeStillness.js` (new) | stillness state, cooldown, snake skill flag | interruption and success path scenarios |
| Bear language depends on Raven + Snake | Bear NPC script/helper | raven/snake/bear flags | unit tests for prerequisite gating |
| Unbinding gated by bear permission (and clarified Snake condition) | cave room/item script + capture checks | `bear_permission_granted`, possibly Snake presence | scenario asserting denial/allow matrix |
| True restoration sets durable world mutation | mutator/helper + cave unbinding script | `village_restored = true` | restart persistence test |
| Sword path false victory never restores village | Bear death scripts + predicates | bear-death history vs `village_restored` | scenario ensures `village_restored` remains false |
| Underworld reaction is local semantic event only | restoration hook + underworld room script | transition to restored | recipient-audience tests (no global broadcast) |
| Local death exemption in Sick Village pre-restoration | death/debt helper + death flow hooks | area boundary + `village_restored` | deaths in/out of area produce expected counted/exempt outcomes |
| Debt model formula exactness | debt helper module | `death_count`, `total_paid_to_king` | table tests for 1,3,7... progression and overpayment credit |
| Leave permission authority is King-only | King interaction script + flow checks | derived outstanding debt, promise eligibility | permission request scenarios for allow/deny branches |
| Third-party payment affects leave checks but does not auto-leave | King/Unto payment handlers | `total_paid_to_king` | scenario: payment then explicit leave request required |
| Corpse re-entry + ambassador resurrection atomicity | death lifecycle + ambassador script | corpse entity, inventory, alive/dead state | transactional integration test with failure injection + no duplication assertions |
| Quest completion fan-out on `village_restored` | quests + NPC scripts | active quest set + `village_restored` | multi-PC quest scenario |

