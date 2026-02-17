# quest-goals

## 1. Title
- **Topic:** quest-goals
- **Ranvier package identity:** `node_modules/ranvier/package.json` identifies this package as `rantamuta-core@1.0.0` with CommonJS `main: "index.js"` and Node engine `>= 22`.
- **Primary entry files for this topic:**
  - `node_modules/ranvier/src/BundleManager.js` (`loadBundle`, `loadQuestGoals`)
  - `node_modules/ranvier/src/QuestGoal.js`
  - `node_modules/ranvier/src/QuestGoalManager.js`
  - `node_modules/ranvier/src/QuestFactory.js`
  - `node_modules/ranvier/src/Quest.js`
  - `node_modules/ranvier/src/QuestTracker.js`
  - `node_modules/ranvier/src/Player.js`

## 2. Status
- **binding:** informational
- **audience:** engine maintainers, agents
- **scope:** ranvier internal deep dive

## 3. What it is
`quest-goals` is the quest objective plug-in surface loaded from bundle files (`quest-goals/`) into `QuestGoalManager`, then instantiated by `QuestFactory` when creating active quest instances. Each goal is an `EventEmitter` that tracks internal state, reports progress, receives proxied player/game events through the quest/player chain, and participates in quest completion lifecycle.

## 4. Where it lives in ranvier
- Bundle loading registration order is defined in `BundleManager.loadBundle`, where `quest-goals/` is loaded before quests and areas (`features` list puts it first among bundle features).
- Goal implementation base class: `src/QuestGoal.js`.
- Goal registry: `src/QuestGoalManager.js` (extends `Map`).
- Goal instantiation path: `src/QuestFactory.js#create`.
- Goal progress aggregation/completion routing: `src/Quest.js`.
- Event proxy into active quests: `src/Player.js#emit` -> `src/QuestTracker.js#emit`.

**Export surface**
- Package exports all `src/*` via `index.js` using `require-dir('./src/')` (CommonJS object export).
- No topic-specific barrel file; consumers resolve modules through the top-level exported object keys.

## 5. How it works
- **Architecture / lifecycle**
  1. `BundleManager.loadBundle` checks for `quest-goals/` and calls `loadQuestGoals`.
  2. `loadQuestGoals` requires each `*.js` file and stores class constructors into `state.QuestGoalManager` keyed by filename stem.
  3. Later, `QuestFactory.create` builds `Quest`, then iterates `quest.config.goals`; each goal entry resolves type from `GameState.QuestGoalManager` and constructs `new goalType(instance, goal.config, player)`.
  4. `Quest.addGoal` subscribes to goal `progress` events; progress updates trigger `Quest.onProgressUpdated`.
  5. Quest progress and completion are emitted to player-level events and persisted by `QuestFactory` listeners.

- **Core abstractions / data model**
  - `QuestGoal` has `{ config, quest, state, player }` and methods `getProgress`, `complete`, `serialize`, `hydrate`.
  - Goal `state` is arbitrary object managed by goal implementations.
  - Quest holds `goals[]` and computes overall progress by averaging each goal `percent`.

- **Initialization/configuration**
  - Goal type key comes from bundle filename (`goalName`).
  - Goal constructor gets per-goal `goal.config` from quest definition.
  - No schema validation for goal config in core.

- **Important defaults/implicit behaviors**
  - Base `QuestGoal.getProgress()` defaults to `percent: 0` and warning display text.
  - `Quest.getProgress()` divides by `this.goals.length`; if no goals exist this yields `NaN` (implicit behavior, not guarded).
  - `Quest.emit()` proxies all events to goals except `'progress'` to avoid recursive progress fanout.

## 6. Public surface and invariants
- **APIs**
  - `BundleManager.loadQuestGoals(bundle, goalsDir)` registers goal classes.
  - `QuestGoal` API for goal implementers:
    - `constructor(quest, config, player)`
    - `getProgress()`
    - `complete()`
    - `serialize()` / `hydrate(state)`
  - `QuestFactory.create(GameState, qid, player, state=[])` requires goal types present in `QuestGoalManager`.

- **Call order constraints**
  - Goal classes must be loaded before quests depending on them; enforced by feature order in `loadBundle`.
  - Hydration order matters: `Player.hydrate` hydrates `questTracker` before other hydration to avoid emitting into unhydrated quests.

- **Shape constraints**
  - Quest config goals entries must include `type` matching registry keys.
  - Goal classes must be constructible with `(quest, config, player)` and expose `getProgress`.

- **Error behavior**
  - Invalid quest id in `QuestFactory.create` throws.
  - Missing/invalid quest id in `QuestFactory.canStart` throws.
  - Missing goal class leads to runtime constructor error when `new goalType(...)` executes (not explicitly handled).

- **Sync vs async**
  - Goal loading and creation paths are synchronous.
  - Quest event-driven updates are synchronous `EventEmitter` dispatch.

- **Invariants**
  - `Quest.goals` entries are expected to emit `'progress'` when internal state changes.
  - `Quest.serialize().state` and `Quest.hydrate()` assume positional alignment between serialized goal list and instantiated goal order.

## 7. Internal integration contract
- **Expects from other modules**
  - `BundleManager` expects script files in `quest-goals/` exporting either a class inheriting `QuestGoal` or legacy loader function returning one.
  - `QuestFactory` expects `GameState.QuestGoalManager`, `GameState.QuestRewardManager`, and `player.questTracker`.
  - `Player.emit` must route events to `questTracker` for goal event handling.

- **Provides back to ranvier**
  - Goal classes registered in `QuestGoalManager`.
  - Quest lifecycle side effects: emits `questStart`, `questProgress`, `questTurnInReady`, `questComplete`, `questReward`; persists player via `player.save()`.

- **Coupling points**
  - Manager singletons on shared state object (`QuestGoalManager`, `QuestFactory`).
  - EventEmitter chaining (`Player` -> `QuestTracker` -> `Quest` -> `QuestGoal`).

## 8. Performance characteristics
- Loading goals is O(number of files in `quest-goals/`).
- On each player event, `QuestTracker.emit` iterates all active quests; each `Quest.emit` iterates all its goals. Effective event fanout is O(activeQuests * goalsPerQuest).
- Progress recomputation loops all goals each time `progress` fires.
- Memory growth risk is proportional to active quest count and event listeners (`goal.on('progress', ...)` per goal).

## 9. Common failure modes
1. Missing quest goal type in `QuestGoalManager` causes constructor/type errors during `QuestFactory.create`.
2. Quest with empty goals array yields invalid percent (`Math.round(overall / 0)` => `NaN`).
3. Non-repeatable quest restart blocked by `QuestFactory.canStart` if present in completed map.
4. Calling `QuestTracker.complete` for non-active quest throws `'Quest not started'`.
5. Misordered hydration would break event emission into unhydrated quest instances (explicit comment in `Player.hydrate`).

## 10. Gotchas and footguns
- `QuestGoalManager` is just `Map`: no duplicate key detection, no type guards.
- `Quest.serialize()` stores `config.desc` but quest default key is `description`; serialized config can omit expected text.
- `QuestFactory.loadQuestGoals` uses `QuestGoal.isPrototypeOf(loader)` check; non-class exports rely on legacy loader function behavior.
- Goal state hydration is positional, not keyed; changing goal order in quest definitions can mismatch saved state.

## 11. Security considerations
- Dynamic `require` of bundle `quest-goals/*.js` executes arbitrary bundle code.
- No sandboxing/validation around goal `config` or runtime emitted events.
- No obvious use of `eval`/Function constructors in this topic path.

## 12. Tests and reproduction
- **Tests in ranvier:** no direct unit tests for `QuestGoal`, `QuestFactory`, or `QuestTracker` were found under `node_modules/ranvier/test/unit`.

### Suggested tests
1. `loadQuestGoals` registers both class export and loader-function export forms.
2. `QuestFactory.create` throws clear error when goal type is missing.
3. `Quest.getProgress` behavior with zero goals (define desired behavior and lock it).
4. Goal `progress` event triggers `player.emit('questProgress')` and `player.save()`.
5. `QuestTracker.hydrate` recreates active quests with preserved `started` timestamp.

### Minimal reproduction (pseudocode)
```js
const goalType = state.QuestGoalManager.get('kill-npc');
const quest = state.QuestFactory.create(state, 'area:1', player);
quest.addGoal(new goalType(quest, { npc: 'rat', count: 3 }, player));
player.emit('npcKilled', npc);
// goal listener updates internal state + emits 'progress'
```

## 13. Operational guidance
- Add logs at:
  - `BundleManager.loadQuestGoals` for registration visibility.
  - `QuestFactory.create` before `new goalType(...)` for missing/invalid goal types.
  - `Quest.onProgressUpdated` to trace completion thresholds.
- Inspect at runtime:
  - `state.QuestGoalManager.keys()` for loaded goal names.
  - `player.questTracker.activeQuests` and each `quest.goals[i].state`.
- Typical stack indicators:
  - `Trying to create invalid quest id` => definition missing in `QuestFactory.quests`.
  - `Quest not started` => completion called on inactive quest.

## 14. Maintainer TODOs
1. Add explicit validation/error for missing goal class in `QuestFactory.create`.
2. Guard `Quest.getProgress()` against zero-goal division.
3. Add unit tests covering goal hydration/order sensitivity.
4. Normalize `description` vs `desc` serialization key mismatch in `Quest.serialize` (compatibility-reviewed).
