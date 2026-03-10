# Draft: Designer-Writable Persistence Options (Beyond Player Saves)

## Status
- Draft for design review.
- No runtime behavior changed by this document.

---

## 1) Executive Summary

Today, persistence is strongest for **players/accounts** and **authored world content loaded from YAML**.
Designers do not yet have a first-class, safe API for writing durable world edits at runtime (outside player save paths).

Good news: the current stack already has reusable primitives:

- Configurable `DataSourceRegistry` and `EntityLoaderRegistry`.
- Entity loaders with `fetch`, `fetchAll`, `update`, `replace`.
- File-backed data sources for JSON/YAML and directories.

This enables several viable designs for designer-writable persistence, from low-risk append-only journals to full live world CRUD.

---

## 2) What Exists Right Now (Deep Dive)

## 2.1 Player persistence path is explicit
- `ranvier` wires entity loaders from config and assigns `players` loader to `PlayerManager`.
- `PlayerManager.save` persists serialized player data through `loader.update(...)`.

Implication: runtime persistence is already loader-driven for players; we can mirror that pattern for designer data.

## 2.2 Content (areas/rooms/items) is loaded through loaders too
- `ranvier.json` defines loaders for `areas`, `rooms`, `items`, `npcs`, `quests` using YAML data sources.
- `BundleManager` loads definitions from those loaders at boot.

Implication: authored world data is file-backed and loader-addressable, but runtime mutation orchestration is not yet first-class.

## 2.3 Datasource capability details
- `EntityLoader` supports `fetchAll`, `fetch`, `replace`, `update`.
- YAML and JSON directory data sources support `update` by writing files.
- Single-file YAML datasource `update` is effectively upsert by key.

Implication: Create/Update are easy. Delete needs explicit policy (e.g., fetch + remove key + replace whole document).

## 2.4 Legacy file helpers exist but are narrow
- `Data` class has generic parse/save helpers but strongly typed path logic mainly for player/account file paths.

Implication: for new designer persistence, prefer loader/datasource path over extending legacy `Data` for world editing.

---

## 3) Core Requirement Clarification

The question “How can a designer write persistent data to server files?” splits into 3 distinct needs:

1. **Configuration-like persistence**
   - durable structured data (templates, import mappings, generation presets).
2. **Live world definition persistence**
   - permanent edits to area/room/item definitions.
3. **Runtime state persistence**
   - world mutations not represented as base definitions (e.g., generated shard instances, event outcomes).

A strong design usually uses more than one store type.

---

## 4) Option A — Loader-Native World Definition CRUD (Recommended Baseline)

## Idea
Use the existing entity loader model to persist area/room/item edits directly to world definition files (`manifest.yml`, `rooms.yml`, `items.yml`), with a bundle-level orchestration service to apply runtime changes safely.

## How it works
1. Command/service validates mutation.
2. Use existing loaders (`areas`, `rooms`, `items`) to write durable definition updates.
3. Apply corresponding runtime mutation (live patch or controlled reload/swap).
4. Audit and rollback on failure.

## Pros
- Uses current architecture naturally.
- No new external dependencies.
- Keeps file format compatible with existing content workflow.
- Easy for git-based review if data files are versioned.

## Cons / Risks
- Runtime + file writes can diverge without transactional orchestration.
- Deletes/renames can break references (exits/quests/scripts).
- Concurrent builder edits need locking/merge strategy.

## Best fit
- You want permanent world edits and procedural output as first-class authored content.

## Minimum safeguards
- area-scoped lock,
- dry-run diff preview,
- validation of references,
- append-only audit log,
- explicit rollback plan.

---

## 5) Option B — Append-Only Mutation Journal + Replay (Event-Sourced Overlay)

## Idea
Instead of rewriting canonical area files immediately, write designer actions as immutable events to `data/world-journal/*.jsonl` (or daily files), then replay events to materialize world state (at boot or on-demand compaction).

## How it works
1. `world:edit` writes an event record (actor, timestamp, command, payload, schema version).
2. Runtime applies event immediately.
3. On boot/rebuild, replay baseline content + events.
4. Periodically compact events into canonical snapshots.

## Pros
- Strong auditability and reversibility.
- Natural conflict diagnostics and history.
- Works very well for procedural generation reproducibility.

## Cons / Risks
- Higher implementation complexity.
- Replay performance and compaction tooling required.
- Needs strong schema/version migration discipline.

## Best fit
- You expect frequent live edits, procedural systems, and “time-travel” debugging.

## Operational implications
- Need replay determinism guarantees.
- Need compaction command and corruption handling policy.

---

## 6) Option C — Shadow Worldstate Store (Separate from Authored YAML)

## Idea
Keep authored content immutable-ish; write designer/runtime world changes into a separate persistent namespace, e.g. `data/worldstate/{areas,rooms,items}/...` and overlay at runtime.

## How it works
1. Load base content from bundle YAML.
2. Load shadow overrides from `worldstate` loaders.
3. Merge with deterministic precedence rules.
4. Designer edits write to shadow store only.

## Pros
- Preserves clean authored bundle files.
- Easier to reset or switch environments (discard shadow store).
- Better for shard-specific variants.

## Cons / Risks
- Merge rules can become complex and surprising.
- Tooling must show “effective” value and origin (base vs override).
- More moving pieces than direct edit.

## Best fit
- You want clear separation between authored content and runtime/operator customizations.

---

## 7) Option D — Domain-Specific Persistent KV/Document Store for Designers

## Idea
Expose a safe “designer data” persistence API (namespaced key/document store) for non-entity data such as generation templates, import mappings, and puzzle state presets; optionally combine with A/B/C for entity edits.

## How it works
- Add new datasource/loader pair for `designer-data`:
  - `fetch(namespace, key)`
  - `put(namespace, key, value)`
  - `list(namespace)`
- Persist to JSON files under `data/designer/` (initially).

## Pros
- Very simple mental model.
- Useful immediately for procedural pipelines and import tooling.
- Low risk to core world definitions.

## Cons / Risks
- Not sufficient alone for permanent room/item/area structural edits.
- Needs quota/size/validation guardrails.

## Best fit
- You need rapid value for metadata and tools before full world CRUD lands.

---

## 8) Option E — Direct Scripted File Writes (Not Recommended as Primary Path)

## Idea
Allow builder commands/scripts to call `fs.writeFile` directly.

## Pros
- Fastest to prototype.

## Cons / Risks
- No schema validation by default.
- High risk of malformed files and partial writes.
- No centralized audit/locking/permissions.
- Hard to maintain compatibility and determinism.

## Recommendation
- Avoid as a general solution.
- If ever used, isolate behind a persistence service with strict policy checks.

---

## 9) Recommended Composite Strategy

For ranviermud’s goals, a phased composite is most practical:

1. **Now:** Option A + Option D
   - A for area/room/item persistence,
   - D for generation/import/shard metadata.
2. **Next:** add Option C semantics for shard overlays where needed.
3. **Later (if complexity warrants):** evolve toward Option B journaling for stronger history/replay.

This keeps initial scope reversible while leaving a path to robust procedural + shard operations.

---

## 10) Concrete Design for “Designer Writes to File”

## 10.1 Service API sketch

```js
// bundle-rantamuta/lib/world-persistence/DesignerPersistenceService.js

await persistence.putEntityDefinition({
  type: 'room',
  bundle: 'bundle-rantamuta',
  area: 'dungeon_01',
  id: '1001',
  value: roomDef,
  actor: player.name,
  reason: 'world:edit room',
});

await persistence.putDesignerDoc({
  namespace: 'worldgen.presets',
  key: 'catacombs.v1',
  value: preset,
  actor: player.name,
});
```

## 10.2 On-disk layout suggestion

- Canonical entity defs (existing):
  - `bundles/<bundle>/areas/<area>/manifest.yml`
  - `bundles/<bundle>/areas/<area>/rooms.yml`
  - `bundles/<bundle>/areas/<area>/items.yml`

- New designer docs:
  - `data/designer/<namespace>/<key>.json`

- Optional audit stream:
  - `data/world-audit/YYYY-MM-DD.jsonl`

## 10.3 Write strategy
- Prefer atomic write pattern:
  1. write temp file,
  2. fsync,
  3. rename.
- Use per-area lock for entity defs.
- Use per-namespace lock for designer docs.

## 10.4 Required metadata per write
- actor
- timestamp
- command name
- target path/entity
- correlation id
- optional rollback payload reference

---

## 11) Compatibility and Safety Implications

## 11.1 Compatibility
- Editing world definitions at runtime is compatibility-impacting behavior; must be explicitly approved and documented before implementation rollout.

## 11.2 Security
- Restrict write commands to trusted roles.
- Sanitize namespace/key/path inputs to prevent path traversal.
- Enforce max payload size and schema.

## 11.3 Durability
- Track write failures and partial-apply conditions.
- Provide `world:persist:check` diagnostics command to validate file integrity and unresolved refs.

## 11.4 Observability
- Emit structured events for persistence begin/success/fail.
- Maintain admin-visible audit query command.

---

## 12) Procedural Generation, Imports, and Shards Through This Lens

## Procedural generation
- Store generator presets and seeds in designer-doc store (Option D).
- Persist generated entity definitions with Option A.
- Mark generated entities with metadata:
  - `metadata.worldgen.seed`
  - `metadata.worldgen.generator`
  - `metadata.worldgen.version`

## Import pipelines (maps/files)
- Store import mapping schemas in designer-doc store.
- Import writes validated entity definitions through Option A.
- Audit each import batch with correlation id.

## Sharding
- Keep shard config and placement docs in designer-doc store.
- Use shadow overlays (Option C) where shard-specific overrides are required.

---

## 13) Suggested Rollout Plan

1. Add `DesignerPersistenceService` with no command exposure; unit-test only.
2. Add read-only diagnostics command (`world:persist:inspect`).
3. Enable `create/edit item` persistence path.
4. Enable `create/edit room` persistence path.
5. Enable `create/edit area` persistence path.
6. Add procedural/import adapters.
7. Add optional shadow overlay for shard-specific variants.

Each step should be independently reversible.

---

## 14) Decision Matrix (Quick Compare)

| Option | Complexity | Auditability | Runtime Safety | Best For |
|---|---:|---:|---:|---|
| A: Loader-native CRUD | Medium | Medium | Medium (needs locks) | Permanent world edits |
| B: Journal + replay | High | Very High | High (with tooling) | Heavy live-edit + history |
| C: Shadow worldstate | Medium-High | High | High (if merge clear) | Overrides, shard variants |
| D: Designer KV/docs | Low-Medium | High | High | Presets/import configs |
| E: Direct fs writes | Low | Low | Low | Prototypes only |

---

## 15) Recommendation

- **Primary recommendation:** implement **Option A + D** first.
- Add **Option C** when shard-specific divergence becomes real.
- Consider **Option B** only after operational pain demonstrates need.
- Avoid broad direct `fs` write access from commands.

This provides designer-controlled persistent writes quickly while preserving determinism, auditability, and rollback posture.
