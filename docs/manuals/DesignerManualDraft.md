# Designer Manual (Inferred From Core API)

You don’t need engine access to build content. Everything you touch lives in bundles and scripts, and every module under `src/` is part of the public API surface (exported via `index.js`). The sections below describe what the engine loads, the shapes it expects, and how your scripts are invoked.

## Scope

- You author bundles, data files, and scripts.
- You call core APIs from bundle scripts via `srcPath` (explained below).
- You do not modify engine internals.

## Bundle Layout (What The Loader Scans)

- `attributes.js`
- `behaviors/area/`
- `behaviors/room/`
- `behaviors/npc/`
- `behaviors/item/`
- `channels.js`
- `commands/`
- `effects/`
- `input-events/`
- `server-events/`
- `player-events.js`
- `skills/`
- `quest-goals/`
- `quest-rewards/`
- `areas/` (data source-dependent)
- `areas/<area>/scripts/`
- `areas/<area>/scripts/items/`
- `areas/<area>/scripts/npcs/`
- `areas/<area>/scripts/rooms/`

Only bundles listed in config `bundles` are loaded.

## Module Loading Pattern (Critical)

Every script file may export either an object or a function. If you export a function, the loader calls it with `srcPath` (and for commands, also `bundlesPath`) and expects the return value to be the actual config object.

Example pattern:

```js
// commands/look.js
module.exports = (srcPath) => ({
  command: state => (args, player) => {
    const Broadcast = require(srcPath + 'Broadcast');
    Broadcast.sayAt(player, 'You look around.');
  }
});
```

## Common GameState Surface (What You Get As `state`)

- `Config`
- `Logger`
- `BundleManager`
- `EntityLoaderRegistry`
- `DataSourceRegistry`
- `AttributeFactory`
- `AreaFactory`, `RoomFactory`, `ItemFactory`, `MobFactory`
- `AreaManager`, `RoomManager`, `ItemManager`, `MobManager`
- `PlayerManager`, `AccountManager`
- `SkillManager`, `SpellManager`
- `EffectFactory`
- `QuestFactory`, `QuestGoalManager`, `QuestRewardManager`
- `ChannelManager`
- `InputEventManager`, `ServerEventManager`

These are inferred from usage in core code. The game runtime wires them up.

---

## Data Definitions

### Area Manifest

Required:

- `title`

Optional:

- `metadata` (object)
- `script` (name, without `.js`)
- `behaviors` (object of behaviorName -> config/true)

### Room Definition

Required:

- `id`
- `title`
- `description`

Optional:

- `items` (array of item ids or `{ id }`)
- `npcs` (array of npc ids or `{ id }`)
- `metadata`
- `behaviors`
- `script`
- `coordinates` (array `[x, y, z]`)
- `exits` (array of `{ direction, roomId }`)
- `doors` (object keyed by `fromRoomRef`)

Notes:

- `roomId` should be an entity reference like `areaName:roomId`.
- `coordinates` allow inferred exits to adjacent rooms.

### Item Definition

Required:

- `id`
- `name`
- `keywords` (array of strings)

Optional:

- `description`
- `roomDesc`
- `type` (`OBJECT`, `CONTAINER`, `ARMOR`, `WEAPON`, `POTION`, `RESOURCE`)
- `metadata`
- `behaviors`
- `script`
- `items` (default contents for containers)
- `maxItems`
- `closeable`, `closed`, `locked`, `lockedBy`

### NPC Definition

Required:

- `id`
- `name`
- `keywords`
- `attributes` (object; see Attributes below)

Optional:

- `description`
- `behaviors`
- `script`
- `items`
- `equipment` (slot -> item entityRef)
- `quests` (array of quest entityRefs like `area:questId`)
- `metadata`

### Quest Definition

Required:

- `id`

Recommended:

- `title`
- `description`

Optional:

- `completionMessage`
- `requires` (array of quest entityRefs)
- `level`
- `autoComplete` (boolean)
- `repeatable` (boolean)
- `goals` (array of `{ type, config }`)
- `rewards` (array of `{ type, config }`)

### Help Definition

Required:

- `body`

Optional:

- `keywords` (array)
- `command`
- `channel`
- `related` (array)

---

## Attributes

### `attributes.js` format

- Export an array of attribute definitions.
- Each entry must include `name` and `base`.
- Optional `formula` with `requires` and `fn`.
- Optional `metadata`.

Example:

```js
module.exports = [
  { name: 'health', base: 100 },
  {
    name: 'maxHealth',
    base: 100,
    formula: {
      requires: ['health'],
      fn: (attribute, character, current, health) => health
    }
  }
];
```

NPCs and players should include attributes as:

- `attr: 50` or
- `attr: { base: 50, delta: 0 }`

---

## Scripts vs Behaviors

### Entity Scripts

- Attached by the `script` property on a specific area/item/npc/room.
- Located under `areas/<area>/scripts/...`.
- Listener signature: `eventName: state => function (...args) {}`
- `this` is the entity.

### Behaviors

- Defined once in `behaviors/<type>/`.
- Activated via `behaviors` on an entity definition.
- Listener signature: `eventName: state => function (config, ...args) {}`
- `this` is the entity.
- If `behaviors` entry is `true`, it becomes `{}`.

---

## Commands

### Command Module Shape

- Filename is the command name.
- `command` must be a function that accepts `state` and returns the handler.

Optional fields:

- `aliases`
- `usage`
- `type` (`CommandType`)
- `requiredRole` (`PlayerRoles`)
- `metadata`

Example:

```js
module.exports = (srcPath) => ({
  aliases: ['l'],
  usage: 'look [target]',
  command: state => (args, player, arg0) => {
    const Broadcast = require(srcPath + 'Broadcast');
    Broadcast.sayAt(player, 'You look.');
  }
});
```

---

## Skills and Spells

### Skill Module Shape

- Filename is the skill id.
- `run` must be a function that accepts `state` and returns the handler.
- `this` inside `run` is the Skill instance.

Key fields:

- `name` (display name)
- `type` (`SkillType.SKILL` or `SkillType.SPELL`)
- `flags` (use `SkillFlag.PASSIVE` for passive skills)
- `requiresTarget` (default true)
- `targetSelf`
- `initiatesCombat`
- `resource` (`{ attribute, cost }` or array)
- `cooldown` (number seconds or `{ group, length }`)
- `effect` (passive effect id)
- `configureEffect`
- `info`

---

## Effects

### Effect Module Shape

- Filename is the effect id.
- Export object with `config`, `state`, `modifiers`, `flags`, `listeners`.

`config` keys you can use:

- `name`
- `description`
- `duration` (ms)
- `type`
- `unique`
- `maxStacks`
- `refreshes`
- `autoActivate`
- `hidden`
- `persists`
- `tickInterval` (seconds)

`modifiers` supports:

- `attributes` (object of attr -> function)
- `incomingDamage`
- `outgoingDamage`

`listeners` may be an object or `state => object`.

---

## Quests

### Quest Goals

- File exports a `QuestGoal` subclass or a loader that returns one.
- Goals receive all quest events via `quest.emit(...)`.
- Implement `getProgress()` and `complete()`.

### Quest Rewards

- File exports a `QuestReward` subclass or loader returning one.
- Implement static `reward(GameState, quest, config, player)`
- Implement static `display(GameState, quest, config, player)`

---

## Channels

`channels.js` should export `Channel` instances (or an array of them). You can use:

- `WorldAudience`
- `AreaAudience`
- `RoomAudience`
- `PartyAudience`
- `PrivateAudience`
- `RoleAudience`

Each `Channel` config:

- `name`
- `audience`
- `description`
- `minRequiredRole`
- `color`
- `aliases`
- `formatter` (functions for sender/target messages)

---

## Messaging and ANSI

Use `Broadcast` for all output:

- `Broadcast.sayAt`
- `Broadcast.sayAtExcept`
- `Broadcast.sayAtFormatted`
- `Broadcast.prompt`
- `Broadcast.progress`
- `Broadcast.center`
- `Broadcast.line`

ANSI tags:

- `<red>`, `<green>`, `<bold>`, `<underline>`, `<bgred>`, `<b>`, `<u>`
- Close tags with `</red>`, etc.
- Raw codes: `<A<number>>` and `</A<number>>`

---

## Events (Common Ones You Can Listen For)

Area:

- `updateTick`
- `roomAdded`
- `roomRemoved`

Room:

- `spawn`
- `ready`
- `updateTick`
- `playerEnter`
- `playerLeave`
- `npcEnter`
- `npcLeave`

Item:

- `spawn`
- `updateTick`
- `equip`
- `unequip`

NPC:

- `spawn`
- `updateTick`
- `enterRoom`

Player:

- `enterRoom`
- `commandQueued`
- `saved`
- `updateTick`

Character (Player or NPC):

- `attributeUpdate`
- `combatStart`
- `combatantAdded`
- `combatantRemoved`
- `combatEnd`
- `equip`
- `unequip`
- `followed`
- `unfollowed`
- `gainedFollower`
- `lostFollower`
- `hit`
- `damaged`
- `heal`
- `healed`
- `effectAdded`
- `effectRemoved`

Quest:

- `start`
- `progress`
- `turn-in-ready`
- `complete`

Channel:

- `channelReceive`

---

## Metadata Helpers

All scriptable entities support:

- `setMeta(key, value)`
- `getMeta(key)`

Use dot notation for nested keys. `setMeta` does not create missing parents.

---

## Errors You May Need To Handle

Inventory:

- `InventoryFullError` from adding items.

Equip:

- `EquipSlotTakenError`
- `EquipAlreadyEquippedError`

Skills:

- `NotEnoughResourcesError`
- `PassiveError`
- `CooldownError`

---

## Gotchas

- Attributes must be defined in `attributes.js` before any NPC or player uses them.
- NPC `quests` should use full quest entity refs like `area:questId`.
- Room exits are only resolved by `roomId` in core.
- Behaviors receive their config object as the first argument.
- Command and skill `command`/`run` must be factories that take `state` and return the actual handler.
- Missing scripts only log warnings, so watch logs.

---

# Designer Manual (Inferred From /bundles)

## Scope

This is a content‑authoring guide for designers. It focuses on the bundle content layer (areas, rooms, items, NPCs, quests, shops, crafting, help text, and lightweight scripts). It does not cover engine internals.

---

## Content Layout

- Bundles are listed in `ranvier.json` and are loaded in that order. If you add a new bundle, it must be listed there.
- Area content lives under `bundles/<bundle>/areas/<area>/`.
- Per‑area YAML files are loaded from those folders via `ranvier.json` `entityLoaders`.

---

## Entity References

- Use `area:id` (e.g., `rantamuta:start`, `rantamuta:rustysword`).
- Cross‑area references are valid (e.g., `craft:greenplant` in a Limbo room).

---

## Areas

- Each area has a `manifest.yml`, plus `rooms.yml`, `items.yml`, `npcs.yml`, `quests.yml`, and optionally `loot-pools.yml`.
- Example area: `bundles/bundle-rantamuta/areas/rantamuta/manifest.yml`.
- Area behaviors can be attached via `behaviors:` in `manifest.yml` (e.g., `progressive-respawn`).

---

## Rooms

Example: `bundles/bundle-rantamuta/areas/rantamuta/rooms.yml`

Common fields:

- `id`: Room id (used in `area:id`).
- `title`, `description`.
- `coordinates: [x, y, z]`: For mapped areas. Example in `bundles/bundle-rantamuta/areas/mapped/rooms.yml`.
- `items`: List of item entries.
- `npcs`: List of NPC entries.
- `exits`: Explicit exits, `direction` + `roomId`.
- `doors`: Door state keyed by room reference.
- `metadata`: Arbitrary metadata; `commands` is used for room‑context commands.
- `script`: Script name in `areas/<area>/scripts/rooms/<script>.js`.

Room‑spawn entries can be strings or objects. Example object (from Limbo):

```yaml
npcs:
  - id: "rantamuta:trainingdummy"
    respawnChance: 25
    maxLoad: 3
items:
  - id: "rantamuta:woodenchest"
    respawnChance: 20
    replaceOnRespawn: true
```

Door example:

```yaml
doors:
  "rantamuta:context":
    lockedBy: "rantamuta:test_key"
    locked: true
    closed: true
```

---

## Items

Example: `bundles/bundle-rantamuta/areas/rantamuta/items.yml`

Common fields:

- `id`, `name`, `roomDesc`, `keywords`, `description`.
- `type`: `WEAPON`, `ARMOR`, `CONTAINER`, `POTION`, `RESOURCE`, etc.
- `metadata`: Stats, equipment slot, usability, sellability, etc.
- `items`: For containers, list of item references to pre‑fill.
- `closed`, `locked`, `lockedBy`, `maxItems`: For containers.
- `behaviors`: Item behaviors like `decay`.
- `script`: Item script in `areas/<area>/scripts/items/<script>.js`.

Examples:

- Equipable item uses `metadata.slot`, `metadata.level`, `metadata.stats`.
- Usable item uses `metadata.usable` with either `spell` or `effect`.
- Resource nodes use `type: RESOURCE`, `metadata.noPickup: true`, `metadata.resource` (see crafting below).

---

## NPCs

Example: `bundles/bundle-rantamuta/areas/rantamuta/npcs.yml`

Common fields:

- `id`, `name`, `keywords`, `level`, `description`.
- `attributes`: `health`, `strength`, etc.
- `items`: Starting items or loot carried.
- `quests`: List of quest references this NPC can offer.
- `behaviors`: Behavior configuration (e.g., `combat`, `ranvier-wander`, `ranvier-aggro`, `lootable`).
- `metadata.vendor`: Shop configuration.
- `script`: NPC script in `areas/<area>/scripts/npcs/<script>.js`.

---

## Loot & Respawn

Area behavior `progressive-respawn` (from `bundles/progressive-respawn/behaviors/area/progressive-respawn.js`) drives room respawns:

- Each respawn tick resets doors to their default state.
- Respawn checks use `respawnChance`, `maxLoad`, and optional `replaceOnRespawn`.

NPC loot config example (from Limbo):

```yaml
behaviors:
  lootable:
    currencies:
      gold:
        min: 10
        max: 20
    pools:
      - "rantamuta:junk"
      - "rantamuta:potions"
      - "rantamuta:sliceofcheese": 25
```

Loot pools live in `loot-pools.yml`:

```yaml
potions:
  - "rantamuta:potionhealth1": 10
  - "rantamuta:potionstrength1": 5
```

---

## Quests

Example: `bundles/bundle-rantamuta/areas/rantamuta/quests.yml`

Quest structure:

- `id`, `title`, `level`, `description`, `completionMessage`
- `autoComplete`, `repeatable`, `requires`
- `goals`: List of goal types and configs
- `rewards`: List of reward types and configs

Goal types implemented in `bundles/bundle-example-quests/quest-goals/`:

- `FetchGoal`: `item`, `count`, `removeItem`, `title`
- `KillGoal`: `npc`, `count`, `title`
- `EquipGoal`: `slot`, `title`
- `BountyGoal`: `npc`, `home`, `title`

Reward types implemented in `bundles/bundle-example-quests/quest-rewards/`:

- `ExperienceReward`: `amount`, `leveledTo` (`PLAYER` or `QUEST`)
- `CurrencyReward`: `currency`, `amount`

To surface quests in game, add quest refs to NPCs via `quests: [ "area:questId" ]`.

---

## Shops

Shop command and vendor config are in `bundles/vendor-npcs/commands/shop.js` and NPC metadata.

Vendor config example:

```yaml
metadata:
  vendor:
    items:
      "rantamuta:trainingsword":
        cost: 30
        currency: gold
    enterMessage: "Step right up!"
    leaveMessage: "Come back soon!"
```

Items become buyable, and `metadata.sellable` on items enables selling.

---

## Crafting & Resources

Resource nodes are items (see `bundles/simple-crafting/areas/craft/items.yml`) with:

- `type: RESOURCE`
- `metadata.resource.materials` with min/max yields
- `metadata.noPickup: true`

Crafting resources and recipes live in JSON:

- `bundles/simple-crafting/data/resources.json`
- `bundles/simple-crafting/data/recipes.json`

Recipe example:

```json
{
  "item": "rantamuta:potionhealth1",
  "recipe": { "plant_material": 3, "rose_petal": 1 }
}
```

---

## Behaviors

NPC behaviors shipped in `bundles/bundle-example-npc-behaviors/`:

- `ranvier-aggro`: Aggressive behavior with configurable delay and targets.
- `ranvier-wander`: Random wandering with optional restrictions.

See `bundles/bundle-example-npc-behaviors/README.md` for configs.

---

## Scripts (Rooms, NPCs, Items)

Scripts live under `areas/<area>/scripts/rooms|npcs|items/` and are referenced by `script: "<name>"`.

Examples show these event listeners:

- Room: `channelReceive`, `command` (see `bundles/bundle-rantamuta/areas/rantamuta/scripts/rooms/ancientwayshrine.js`).
- NPC: `spawn`, `updateTick`, `deathblow`, `playerEnter`, `playerLeave`.
- Item: `hit` (weapon scripts).

If you add scripts, keep them minimal and content‑focused.

---

## Help Files

Help content is YAML under `bundles/*/help/*.yml`. Example: `bundles/bundle-example-commands/help/get.yml`.

Format:

- `command` or `channel`
- `body`
- optional `related` and `keywords`

---

## Gotchas

- Changing ids breaks references (`rooms`, `items`, `npcs`, `quests`, loot pools, vendors).
- `metadata.noPickup` prevents `get`.
- `metadata.slot` is required for `wear`.
- `metadata.level` gates equipping.
- Doors reset to their default locked/closed state on respawn ticks.
