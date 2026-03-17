# Draft: Runtime World CRUD + Procedural Generation Design for ranviermud

## Status
- **Draft only** (no runtime behavior changes in this document).
- Intended for maintainer review before implementation.

---

## 1) Problem Statement

You want to enable:

1. Runtime creation and editing of **areas**, **rooms**, and **items**.
2. A command surface suitable for builders/admins:
   - `create area`, `edit area`
   - `create room`, `edit room`
   - `create item`, `edit item`
3. Reuse of the same CRUD infrastructure for:
   - procedural dungeon generation,
   - map/file imports from alternative formats,
   - future sharding/multi-instance world topologies.

The current core and wrapper are startup-oriented and do not provide a first-class, transactional runtime world-edit API out-of-the-box. This draft proposes a safe integration strategy in `bundle-rantamuta` that works with current engine realities.

---

## 2) Current Engine Reality (What We Must Design Around)

### 2.1 Boot and loading model
- Bundles are loaded at boot, definitions are registered into factories, then hydrated into live runtime objects.
- This is fundamentally startup-oriented and not command-driven runtime CRUD.

### 2.2 Available primitives
- In-memory definition registration exists in entity factories.
- Runtime managers support add/remove patterns for active entities.
- Rooms can spawn items/NPCs at runtime.
- Persistence loaders support `fetch`, `fetchAll`, `update`, `replace`.

### 2.3 Important constraints
- No built-in full transaction manager for area edits in current stable flow.
- No dedicated delete method in generic entity loader API (delete must be implemented via fetch+replace patterns).
- Script hot-reload behavior needs explicit control if scripts are mutated at runtime.

**Design implication:** We should build a **bundle-level orchestration service** that composes these primitives safely and conservatively.

---

## 3) Architectural Proposal

Introduce a content-agnostic runtime layer in `bundles/bundle-rantamuta/lib`:

## `WorldEditService`

Responsibilities:
1. Validate requested mutation.
2. Apply mutation to **persistent definition state** (YAML via entity loaders).
3. Apply mutation to **runtime state** (factories/managers/live instances).
4. Record change metadata and support rollback on failure.
5. Emit structured audit events.

Supporting modules (recommended):
- `WorldEditValidation` – schema/rule validation.
- `WorldEditPersistence` – all entity loader I/O + write strategy.
- `WorldEditRuntimeApply` – in-memory/runtime apply path.
- `WorldEditTransaction` – best-effort transaction wrapper and compensation logic.
- `WorldEditAudit` – append-only changelog of edits.
- `WorldEditLocks` – lock scopes (`area`, `room`, `world`) to avoid conflicting edits.

### Why this separation?
- Maintains strict bundle layering: runtime helpers in `lib/**`, authored content in `areas/**`.
- Keeps command handlers thin and deterministic.
- Makes procedural generation/import/sharding call the same APIs.

---

## 4) CRUD Scope and Command Surface

## 4.1 Command families
Use explicit action-first commands for clarity and permission checks.

- `world:create area <areaName> [--bundle <bundle>] [--title "..."]`
- `world:edit area <areaName> <field> <value>`
- `world:create room <areaName> <roomId> [options...]`
- `world:edit room <areaName> <roomId> <field> <value>`
- `world:create item <areaName> <itemId> [options...]`
- `world:edit item <areaName> <itemId> <field> <value>`

Optional aliases for builder UX:
- `aedit create|set ...`
- `redit create|set ...`
- `iedit create|set ...`

Recommendation: keep canonical internal commands under one namespace (`world:*`), add aliases later.

## 4.2 Minimum operation set per entity

### Area
- **Create**: manifest scaffold + registration + optional first room.
- **Edit**: title, metadata, script reference, behavior entries.

### Room
- **Create**: title/description/exits/coordinates defaults.
- **Edit**: textual fields, exits, doors, coordinates, metadata, script/behaviors.

### Item
- **Create**: base item definition (`id`, `name`, `type`, flags, metadata).
- **Edit**: display/name/description/type attributes/behaviors/script reference.

No hard delete in phase 1 command UX unless safe deletion checks + confirmations are implemented.

---

## 5) Data Model & Validation Rules

## 5.1 Cross-entity invariants
Before commit, validate:
1. Unique IDs within scope:
   - area names globally unique,
   - room/item IDs unique within area.
2. Exit targets resolve to existing rooms (or explicitly pending with unresolved marker policy).
3. Door references only point to legal exits.
4. Starting room safety: cannot invalidate configured starting room without explicit override.
5. Script references exist if script validation mode is strict.

## 5.2 Coordinate policy
- If coordinates are used, prevent collisions (`x,y,z` uniqueness in an area).
- Allow coordinate-less rooms for explicit-exit-only topologies.

## 5.3 Metadata policy
- All custom procedural/import/shard markers should go under namespaced metadata keys, e.g.:
  - `metadata.worldgen.*`
  - `metadata.import.*`
  - `metadata.shard.*`

This prevents format drift in core fields.

---

## 6) Transaction and Rollback Strategy

Because runtime and persisted state both change, use a two-phase best-effort transaction.

## 6.1 Phase model
1. **Plan**: read current definitions + compute patch + validation.
2. **Persist stage**: write updated definition documents.
3. **Runtime apply stage**: apply in-memory/factory/runtime mutations.
4. **Commit audit**: record success entry.

On failure:
- attempt compensating writes to restore prior persisted documents,
- attempt runtime rebind/restore for affected area/room entities,
- emit failure audit with partial-apply details.

## 6.2 Locking
Lock scopes to prevent races:
- area create/edit: lock `world` + target area name.
- room/item edits: lock target area.

For future clustered/sharded operation, abstract lock backend (in-memory now, distributed later).

---

## 7) Runtime Apply Algorithms (Entity-by-Entity)

## 7.1 Create area
1. Validate `areaName` not already loaded or persisted.
2. Persist `areas/<areaName>/manifest.yml`.
3. Persist initial `rooms.yml`/`items.yml` (empty or seeded).
4. Register definitions in factories.
5. Create area instance and hydrate.
6. Add area to `AreaManager`.

Optional seed modes:
- `--seed empty`
- `--seed single-room`
- `--seed template:<name>`

## 7.2 Edit area
- Update manifest in persistence.
- Update in-memory area definition.
- For fields requiring live instance replacement (e.g., behaviors/scripts), choose one:
  1. staged area reload (preferred when available), or
  2. deferred apply (announce takes effect on reload), or
  3. targeted live patch (only for fields proven safe, e.g., title/metadata).

## 7.3 Create room
1. Validate area exists.
2. Persist room definition in area `rooms.yml`.
3. Register room definition in `RoomFactory`.
4. Create room instance and add to area + `RoomManager`.
5. Hydrate room (default items/NPCs as configured).

## 7.4 Edit room
- Update persisted room definition.
- Live patch safe fields immediately (title/description/metadata/exits where legal).
- For high-risk field changes (coordinates with map conflicts, script swap), use controlled room replacement path.

## 7.5 Create item
1. Persist item definition in `items.yml`.
2. Register in `ItemFactory`.
3. Optionally spawn immediately into target room/inventory (`--spawn room:<ref>`).

## 7.6 Edit item
Two layers:
1. **Definition edit** (future spawns).
2. **Instance edit** (already spawned objects).

Support explicit mode:
- `--apply definition`
- `--apply instances`
- `--apply both`

Default recommended: definition only (less risky).

---

## 8) Procedural Generation via CRUD

Procedural generation should call the same `WorldEditService` APIs, not bypass them.

## 8.1 Generator contract
A generator returns a deterministic plan object:

```json
{
  "area": { "name": "dungeon_123", "manifest": { "title": "..." } },
  "rooms": [ ... ],
  "items": [ ... ],
  "links": [ ... ],
  "metadata": { "worldgen": { "seed": 123, "version": "v1" } }
}
```

## 8.2 Determinism
- Require explicit seed.
- Record seed + generator version + params in metadata/audit.
- Provide dry-run output before apply.

## 8.3 Generation modes
- **Ephemeral**: runtime-only (not persisted) for experiments/events.
- **Persistent**: writes YAML + runtime apply.
- **Hybrid**: persist plan, instantiate on-demand.

Recommendation: start with persistent mode for operational clarity.

---

## 9) Alternative Format Import (Map Upload / External Design Tools)

## 9.1 Import pipeline
1. Parse external format into intermediate canonical model.
2. Validate canonical model with same validators as manual CRUD.
3. Produce `WorldEditPlan` (same structure as procedural generation).
4. Apply via `WorldEditService` transaction.

## 9.2 Candidate source formats
- Tiled JSON,
- Graph JSON,
- CSV room tables,
- image-based map with legend (requires extra translation logic).

## 9.3 Safety requirements
- `--dry-run` required by default for import.
- conflict strategy required:
  - `fail`, `rename`, or `overwrite`.
- generate import report with unresolved references.

---

## 10) Sharding Readiness Considerations

Sharding can reuse the same CRUD concepts if identity and ownership are explicit.

## 10.1 IDs and ownership
- Add metadata ownership markers:
  - `metadata.shard.owner`
  - `metadata.shard.policy` (`static`, `replicated`, `ephemeral`)

## 10.2 Split control plane vs data plane
- `WorldEditService` acts as control plane (authoritative mutations).
- Runtime shard workers consume approved mutation plans/events.

## 10.3 Conflict model
- Single-writer per area recommended.
- If multi-writer, use version checks (optimistic concurrency).

---

## 11) Security, Permissions, and Operational Guardrails

## 11.1 Permissions
- Restrict commands to privileged roles (builder/admin).
- Optional area-level ACL:
  - who can edit which area namespace.

## 11.2 Guardrails
- destructive/structural changes require confirmation token.
- rate-limit bulk generation/import commands.
- cap max rooms/items per single transaction.

## 11.3 Audit
Log:
- actor,
- command payload,
- diff summary,
- seed/import source info,
- success/failure and rollback outcome.

---

## 12) Suggested Implementation Phases

## Phase 0: RFC + Decision Notes
- Capture decision boundaries and invariants.
- Define what is live-patched vs reload-required.

## Phase 1: Service skeleton + validation + dry-run
- Create `WorldEditService` + validators.
- Implement no-op dry-run planning for area/room/item create/edit.

## Phase 2: Persistent definition CRUD
- Implement loader-based write path for manifests/rooms/items.
- Implement robust fetch+replace delete helpers internally (even if command delete deferred).

## Phase 3: Runtime apply for low-risk fields
- area create, room create, item create/spawn.
- room/item text metadata edits live.

## Phase 4: Advanced apply
- controlled replacements for higher-risk room/area edits.
- optional area reload integration when stable.

## Phase 5: Procedural + import adapters
- add generator plugin interface.
- add map import pipeline with canonical model transform.

## Phase 6: Shard-aware extension
- lock backend abstraction.
- mutation event feed for shard consumers.

---

## 13) Testing Strategy (When Implementing)

For behavior-changing implementation PRs, include:

1. Unit tests for validation and plan building.
2. Integration tests for:
   - create area/room/item success,
   - edit room/item definition + runtime,
   - rollback on mid-apply failure,
   - deterministic generator with seed.
3. Smoke flow:
   - boot,
   - create area,
   - teleport/move to generated room,
   - spawn and inspect generated item.

---

## 14) Open Decisions Requiring Maintainer Direction

1. **Delete support in command UX now or later?**
   - Safer to defer until replacement and reference-cleanup flow is fully tested.
2. **Live script swap policy**
   - immediate hot swap vs reload-required vs restart-required.
3. **Ephemeral generation policy**
   - allow runtime-only worlds or require persistence for auditability.
4. **Default command naming**
   - `world:*` canonical vs legacy builder aliases first.
5. **Scope of first release**
   - minimal practical set likely: create/edit area-room-item + procedural generation from JSON plan.

---

## 15) Recommendation Summary

1. Build one cohesive, content-agnostic `WorldEditService` in bundle runtime `lib/**`.
2. Treat manual CRUD, procedural generation, and imports as different producers of the same validated mutation plan.
3. Start with create/edit and defer delete UI until safety rails are complete.
4. Make determinism and audit first-class (seed/version/diff logging).
5. Keep sharding support as metadata + lock abstraction now, distributed mechanics later.

This path is incremental, reversible, and aligned with the current engine’s primitive-based runtime model.


## Addendum: persistence deep dive
- See `drafts/designer-persistence-options.md` for a focused analysis of designer-writable persistence options, tradeoffs, and recommended rollout.
