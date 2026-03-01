# Designer Manual

## Status

- Status: draft-v1
- Scope: bundle-level content authoring for `bundle-rantamuta`
- Binding: no (guidance document)

## Purpose

This manual explains how to build playable content in this repository using the current command pipeline and area data patterns.

It focuses on practical authoring:

- rooms, items, exits
- player-facing permission messages
- room scripts for custom policy
- scripted interaction gating patterns

## Where Designers Work

Primary content files:

- `bundles/bundle-rantamuta/areas/<area>/rooms.yml`
- `bundles/bundle-rantamuta/areas/<area>/items.yml`
- `bundles/bundle-rantamuta/areas/<area>/npcs.yml`
- `bundles/bundle-rantamuta/areas/<area>/scripts/<areaScript>.js`
- `bundles/bundle-rantamuta/areas/<area>/scripts/rooms/*.js`
- `bundles/bundle-rantamuta/areas/<area>/scripts/items/*.js`
- `bundles/bundle-rantamuta/areas/<area>/scripts/npcs/*.js`
- `bundles/bundle-rantamuta/player-events.js` (optional, bundle-level)

## NPCs (Not Player Characters)

NPCs are the people and creatures in your world that players can meet, react to, fight, follow, avoid, trade with, or learn from.

If rooms are your stage, NPCs are your actors.

### What NPCs are for

NPCs let you make the world feel alive instead of static.

Use NPCs when you want:

- conversation and personality
- guidance ("go here next" without hard UI prompts)
- friction (guards, rival explorers, suspicious witnesses)
- atmosphere (chants, routines, workers, wandering animals)
- gameplay hooks (shops, quest handoffs, puzzle clues, threats)

### Creative examples designers can use

- A nervous archivist who only shares the real clue after the player proves they visited two different rooms.
- A bell-keeper who changes dialogue by time of day and weather, making repeat visits feel fresh.
- A scavenger who buys odd items, but only while standing in a specific market room.
- A ghost child who appears only after a quest flag is set, then points players toward hidden content.
- A patrol guard who walks a route and makes some paths feel safe at times and risky at others.

### How NPCs work in this engine (designer view)

At a practical level, NPC content is authored in `npcs.yml` and optionally extended with scripts/behaviors.

Core flow:

1. Define the NPC in `areas/<area>/npcs.yml`.
2. Place that NPC in a room's default spawn list in `rooms.yml`.
3. Optionally attach:
   - `script: <name>` for one-off NPC logic in `scripts/npcs/<name>.js`
   - `behaviors:` for reusable logic shared across many NPCs
4. Optionally connect quests by listing quest refs in the NPC's `quests:` field.

Useful NPC features you can author:

- `keywords` for targeting by player commands
- `description` and metadata for narrative flavor and state checks
- `items` / `equipment` defaults for loadout
- `attributes` (through normal character attribute setup)
- `script` and `behaviors` for reactive logic

Useful NPC events for authored script logic:

- `spawn`: NPC has been created in the room
- `enterRoom`: NPC finished moving to a room
- `updateTick`: periodic update for routines and timed behavior

Design tip:

- Use `spawn` to initialize local state and attach helper functions.
- Use `enterRoom` for arrival narration or room-specific reactions.
- Use `updateTick` sparingly for patrols, idling chatter, or timed checks.

### Minimal authoring pattern

`npcs.yml`:

```yml
- id: bell_keeper
  name: "Bell Keeper Toma"
  keywords: ["keeper", "toma", "bell"]
  description: "A broad-shouldered keeper with rope-burned hands and watchful eyes."
  script: bellKeeper
  behaviors:
    weather-aware-routine: true
  quests:
    - "rantamuta:restoreBell"
```

`rooms.yml` (spawn in a room):

```yml
- id: bell_tower
  title: "Bell Tower"
  npcs:
    - "rantamuta:bell_keeper"
```

`scripts/npcs/bellKeeper.js`:

```js
module.exports = {
  listeners: {
    enterRoom: state => function (nextRoom, previousRoom) {
      // Keep this focused on flavor and local NPC behavior.
      // For shared logic across many NPCs, prefer behaviors.
    },
  },
};
```

### Quick content checklist

- Does this NPC have a clear job in the story or gameplay loop?
- Will players understand why this NPC exists after one encounter?
- Is the NPC placed in the right room(s) for discovery and pacing?
- Are quest links, scripts, and behaviors intentional and minimal?
- If the NPC updates every tick, is the logic lightweight and bounded?

## Area Manifest (`manifest.yml`)

Each area folder must include:

- `bundles/bundle-rantamuta/areas/<area>/manifest.yml`

The area loader discovers areas by scanning for that file. If an area folder has no `manifest.yml`, it is skipped.

### What to put in `manifest.yml`

Supported manifest fields:

- `title` (recommended and treated as required for normal content)
- `metadata` (optional object for area-level custom data)
- `script` (optional area script name, no `.js`)
- `behaviors` (optional area behavior map)

Minimal example:

```yml
title: "Rantamuta"
```

With optional fields:

```yml
title: "Rantamuta"
script: "rantamutaArea"
metadata:
  theme: "ruins"
behaviors:
  example-behavior: true
```

If `script` is set, the loader will look for:

- `bundles/bundle-rantamuta/areas/<area>/scripts/<script>.js`

## Scripts

You can attach scripts directly in YAML with `script: <name>` (no `.js` extension).

Examples:

- room script: `rooms.yml` entry with `script: lockedDoorGate`
- item script: `items.yml` entry with `script: someItemScript`

Script files live under:

- `bundles/bundle-rantamuta/areas/<area>/scripts/<areaScript>.js`
- `bundles/bundle-rantamuta/areas/<area>/scripts/rooms/<name>.js`
- `bundles/bundle-rantamuta/areas/<area>/scripts/items/<name>.js`
- `bundles/bundle-rantamuta/areas/<area>/scripts/npcs/<name>.js`

Script module shape:

```js
module.exports = {
  listeners: {
    spawn: state => function () {
      // `this` is the area/room/item/npc entity
    },
  },
};
```

Listeners are event handlers. The key in `listeners` must exactly match an event name emitted by the engine.
There is no `on` prefix.

- Use `playerEnter`, not `onPlayerEnter`.
- Use `npcLeave`, not `onNpcLeave`.

Entity `script:` listeners are attached without behavior-config binding, so handlers receive event args only.
If you need `(config, ...eventArgs)`, use a bundle `behaviors/` module instead.

If YAML sets `script: <name>`, the corresponding file must exist at the expected path. Missing script references can fail bundle boot.

Any emitted event can be listened to, but these are the most useful ones for area content:

Area listeners:

- `roomAdded`: fires when a room is added to the area.
- `roomRemoved`: fires when a room is removed from the area.
- `updateTick`: fires on area update ticks.

Room listeners:

- `spawn`: room object is created; runs before default room items/NPCs are hydrated.
- `ready`: room finished hydrating and has default contents.
- `playerEnter`: a player enters the room.
- `playerLeave`: a player leaves the room.
- `npcEnter`: an NPC enters the room.
- `npcLeave`: an NPC leaves the room.
- `updateTick`: room update tick.

Item listeners:

- `spawn`: item instance is spawned into a room and hydrated as part of room/default-content spawn flow.
- `updateTick`: item update tick.
- `equip`: item was equipped by a character.
- `unequip`: item was unequipped by a character.
- `playerEnter` / `playerLeave` / `npcEnter` / `npcLeave`: proxied from the room while the item is in that room.

NPC listeners:

- `spawn`: NPC is spawned into a room and hydrated as part of room/default-content spawn flow.
- `enterRoom`: NPC completed a room move.
- `updateTick`: NPC update tick.

Player events (separate from area/entity `script:` files):

- Loaded from `bundles/<bundle>/player-events.js`.
- Attached through `PlayerManager.events`, not via area/entity `script:` declarations.
- `enterRoom`: player completed a room move.
- `commandQueued`: command was queued.
- `saved`: player was saved.
- `updateTick`: player update tick.

How to use these in practice:

1. `spawn`: initialize script-owned helpers on `this` using YAML metadata.
2. `playerEnter`: trigger ambient narrative when someone arrives.
3. `ready`: perform setup that depends on default room contents being present.
4. `updateTick`: drive periodic behavior (sparingly).

Examples:

```js
module.exports = {
  listeners: {
    spawn: state => function onSpawn() {
      // attach command-phase policy hooks used by bundle command dispatch
      this.canDirect = (actor, verbId, context) => {
        if (verbId === 'take') return 'The reliquary is set into the stonework.';
        return null;
      };
    },
    playerEnter: state => function onPlayerEnter(player, prevRoom) {
      // ambient room reaction
      // (use your bundle's normal output utilities/broadcast path)
    },
  },
};
```

Command-phase hooks are not listeners; attach them in `spawn`:

- `canDirect(actor, verbId, context)`: direct-target capture veto/allow.
- `canIndirect(actor, verbId, relationTokenCanonical, context)`: indirect-target capture veto/allow.
- `planDirect(actor, verbId, context)`: direct-target planning/render contribution.
- `planIndirect(actor, verbId, relationTokenCanonical, context)`: indirect-target planning/render contribution.

Planned reaction hooks (architecture direction; not implemented in the current `bundle-rantamuta` runtime):

- `reactDirect(actor, verbId, context)`
- `reactIndirect(actor, verbId, relationTokenCanonical, context)`

Current runtime: use command-level `metadata.reactions` handlers in command modules for Bubble-phase render contributions.
Treat `reactDirect`/`reactIndirect` as planning targets, not active runtime hooks, until the dispatcher is updated.

What these are for:

- Add flavor or audience output instructions after Target has succeeded.
- Return data only. The dispatcher owns delivery.

What they must not do:

- Do not call `Broadcast.*` directly.
- Do not mutate room/item/player state.
- Do not veto actions (veto belongs in `canDirect` / `canIndirect`).

How they are planned to be used:

1. The hook checks context and decides whether it wants to contribute anything.
2. It returns a contribution payload (or `null`).
3. A future command pipeline revision will merge that contribution and dispatch it in order.

Example (instruction contribution only):

```js
this.reactDirect = (actor, verbId, context) => {
  if (verbId !== 'pull') return null;

  return {
    render: {
      messages: [
        {
          type: 'semanticEvent',
          template: '{actor.You} {verb:pull} down on {object.direct}.',
          audiencePolicy: 'self_and_others',
          participants: {
            actor: { selector: 'currentPlayer' },
          },
          objectText: {
            direct: 'the bell rope',
          },
        },
      ],
    },
  };
};
```

If you need area/room/player messaging now, return Bubble render contributions from command metadata reactions and let the dispatcher deliver them. Do not emit output directly from policy/planning hooks.

## Behaviors

Behaviors are reusable “event listeners” you can attach to areas, rooms, items, or NPCs to make content react to what happens in the game.

Think of them as: “when this thing experiences event X, do Y.”

You use behaviors when plain YAML data is not enough and you need custom rules or dynamic reactions.

What behaviors are for:

- custom interaction rules (allow/deny with authored messages)
- puzzle logic that depends on current world state
- reactive world flavor (arrival text, environmental responses)
- periodic logic (`updateTick`) for living-feeling spaces or NPC routines

Possible game examples:

- An area-level weather system that tracks season and weather over time, then sends weather text only to rooms marked as outdoors.
- A room-level weather reaction that listens for weather events and updates room/item state (for example, rain making items wet, snow adding frost/snow cover).
- A room that changes description fragments based on current weather state (clear, raining, snowing) without changing command code.
- An NPC routine that reacts to weather context (for example, moving indoors during storms, returning outdoors when weather clears).

Where behavior files live:

- `bundles/<bundle>/behaviors/area/<name>.js`
- `bundles/<bundle>/behaviors/room/<name>.js`
- `bundles/<bundle>/behaviors/item/<name>.js`
- `bundles/<bundle>/behaviors/npc/<name>.js`

How you attach them in content:

- Add them under `behaviors:` in your YAML (manifest/room/item/npc definition), for example:
  - `behaviors:`
  - `weather-system: true`

Very light example:

```js
module.exports = {
  listeners: {
    spawn: state => function (config) {
      // this = the area/room/item/npc that owns the behavior
      // config = your YAML behavior config object
    },
  },
};
```

If you want copy-ready templates with recommended event signatures, use:

- [Appendix: Behavior Templates](#behavior-templates)

## Attributes

Attributes are the game’s core stats/resources for characters.

Think of them as:

- "How much health do you have right now?"
- "How much mana/favor/energy can this class spend?"
- "What permanent baseline stats does this character have?"

If Effects are temporary conditions ("burning", "blessed"), Attributes are the long-lived values those conditions interact with.

### What attributes are useful for

- health-like resources (`health`, `mana`, `energy`, `favor`)
- combat stats (`armor`, `critical`, etc.)
- progression stats (`strength`, `agility`, `intellect`, `stamina`)
- any custom numeric system your game needs (for example: `corruption`, `focus`, `heat`)

### Where they are defined

Bundle-level attribute definitions live in:

- `bundles/<bundle>/attributes.js`

Engine contract:

- file must export an array
- each entry must have:
  - `name`
  - `base`
- optional:
  - `metadata`
  - `formula: { requires: [...], fn: function (...) { ... } }`

Example:

```js
// bundles/bundle-rantamuta/attributes.js
'use strict';

module.exports = [
  { name: 'health', base: 100 },
  { name: 'stamina', base: 20 },
  { name: 'mana', base: 60 },
  { name: 'armor', base: 0 },
  {
    name: 'maxHealth',
    base: 100,
    formula: {
      requires: ['stamina'],
      fn: function (character, current, stamina) {
        // current starts from base (+ any effect modifiers on this attr)
        return current + (stamina * 5);
      },
    },
  },
];
```

### How to use attributes in content

1. Define your attribute list first.
2. Make sure players/NPCs actually have those attributes.
3. Reference attributes in effects/skills/prompts/scripts.

Player/NPC data shape (both are valid):

- `health: 100`
- `health: { base: 100, delta: 0 }`

Simple practical examples:

- A priest class uses `favor` instead of `mana`.
- A berserker skill spends `rage` by lowering that attribute.
- A cursed room applies an effect that lowers `health` every tick.
- Equipment aura effect temporarily adds `armor` and `critical`.

### Reading and changing attributes in scripts

Common runtime API on `Character`:

- `hasAttribute('health')`
- `getAttribute('health')` (current value)
- `getMaxAttribute('health')` (current max, after effects/formulas)
- `getBaseAttribute('health')` (base)
- `raiseAttribute('health', amount)` (healing/recovery)
- `lowerAttribute('health', amount)` (damage/cost)
- `setAttributeBase('health', newBase)` (permanent baseline change)

Use cases:

- `lowerAttribute` for damage and costs.
- `raiseAttribute` for healing/regeneration.
- `setAttributeBase` only for permanent progression (level-up, permanent reward), not temporary buffs.

### Prompt usage (player-facing UI)

Prompt tokens can expose attribute values:

- `%health.current%`
- `%health.max%`
- `%health.base%`

Example prompt:

```text
[ %health.current%/%health.max% hp %mana.current%/%mana.max% mana ]
```

### Gotchas (important)

1. Attribute names are compatibility-sensitive.
   Renaming/removing a key can break loading of existing saved players that still have the old key.

2. Missing definitions are hard failures.
   If a player/NPC has an attribute that is not in `attributes.js`, hydration can fail at boot/load.

3. Formulas only validate circular references at boot.
   A formula can reference a missing attribute and still pass initial validation, then fail later at runtime when read.

4. Temporary bonuses should be Effects, not base edits.
   If you use `setAttributeBase` for a temporary buff, you risk permanent stat drift.

5. Current value is not "base".
   Current is effectively max plus delta. This matters when testing heal/damage behavior.

6. Don’t assume attributes exist on new players automatically.
   In this repo, new players are often created with `attributes: {}` first and then hydrated/populated through your runtime setup.

7. Keep names simple and lower-case.
   Prompt token parsing is strict; consistent lower-case keys avoid token surprises.

### Designer workflow recommendation

When introducing or changing attributes:

1. Add/update `attributes.js`.
2. Update any content that references those names (effects, prompts, scripts, skills).
3. Verify existing saved player data still matches.
4. Run smoke/scenario checks for:
   - login/hydration
   - prompt rendering
   - effects that modify those stats
   - resource-spending actions

## Quests

Quests are how you turn world actions into longer-form player goals.

A quest usually answers:

- what the player needs to do
- how the game tracks progress
- what the player gets when it is done

For designers, the third part is often the emotional payoff. That is where quest rewards come in.

### Quest Rewards

Quest rewards are the outcomes granted after a quest completes.

You define them in quest data as:

- `rewards:`
- each reward entry has:
  - `type` (which reward to run)
  - `config` (its settings)

Example quest snippet:

```yml
- id: bellTrial
  title: "Trial of the Bell"
  description: "Carry the consecrated token to the crypt altar."
  goals:
    - type: fetch
      config:
        item: rantamuta:bellToken
        count: 1
  rewards:
    - type: experience
      config:
        amount: 250
    - type: unlockFlag
      config:
        key: cryptAccess
        value: true
```

#### Why designers should care about rewards

Rewards are not only "numbers."

They are your pacing and story tools:

- Progression reward: XP, currency, training resources.
- Access reward: unlock a door route, ritual state, or quest chain.
- Identity reward: title tags, faction standing, reputation markers.
- Utility reward: a key item, recipe item, or consumable starter pack.
- World-state reward: set a flag that changes room text or NPC reactions.

Good reward design supports motivation:

- Short quest: immediate tangible value.
- Mid quest: progression plus utility.
- Arc quest: permanent unlock plus visible world response.

#### How quest rewards are connected

There are two places to author:

1. Quest data (`areas/<area>/quests.yml`) chooses reward `type` + `config`.
2. Reward implementation (`quest-rewards/<type>.js`) defines what that type does.

Important naming rule:

- reward `type` must match the reward file name.
- `quest-rewards/experience.js` => `type: experience`

#### Friendly implementation pattern

Reward files live in:

- `bundles/<bundle>/quest-rewards/<type>.js`

Minimal reward template:

```js
'use strict';

module.exports = (srcPath) => {
  const QuestReward = require(srcPath + 'QuestReward');

  return class ExperienceReward extends QuestReward {
    static reward(GameState, quest, config, player) {
      const amount = Number(config.amount || 0);
      player.experience += amount;
    }

    static display(GameState, quest, config, player) {
      return `${Number(config.amount || 0)} XP`;
    }
  };
};
```

Notes:

- `reward(...)` is the important one for gameplay.
- `display(...)` is optional text formatting for UI layers that choose to call it.

#### Example reward ideas (designer-focused)

Example 1: Classic XP reward

```js
// quest-rewards/experience.js
'use strict';

module.exports = (srcPath) => {
  const QuestReward = require(srcPath + 'QuestReward');

  return class ExperienceReward extends QuestReward {
    static reward(GameState, quest, config, player) {
      player.experience += Number(config.amount || 0);
    }

    static display(GameState, quest, config, player) {
      return `${Number(config.amount || 0)} XP`;
    }
  };
};
```

Example 2: Story unlock flag reward

```js
// quest-rewards/unlockFlag.js
'use strict';

module.exports = (srcPath) => {
  const QuestReward = require(srcPath + 'QuestReward');

  return class UnlockFlagReward extends QuestReward {
    static reward(GameState, quest, config, player) {
      player.metadata.unlocks = player.metadata.unlocks || {};
      player.metadata.unlocks[String(config.key || 'unknown')] = config.value !== false;
    }

    static display(GameState, quest, config, player) {
      return `Unlocked: ${String(config.key || 'unknown')}`;
    }
  };
};
```

What this is useful for:

- gate a later room script check
- branch dialogue in NPC scripts
- alter room description fragments for that player path

Example 3: Grant a specific item once

```js
// quest-rewards/grantItem.js
'use strict';

module.exports = (srcPath) => {
  const QuestReward = require(srcPath + 'QuestReward');

  return class GrantItemReward extends QuestReward {
    static reward(GameState, quest, config, player) {
      const itemRef = String(config.item || '');
      if (!itemRef) return;
      if (player.hasItem(itemRef)) return;

      const area = GameState.AreaManager.getAreaByReference(itemRef);
      const item = GameState.ItemFactory.create(area, itemRef);
      item.hydrate(GameState);
      GameState.ItemManager.add(item);
      player.addItem(item);
    }

    static display(GameState, quest, config, player) {
      return `Item: ${String(config.item || 'unknown')}`;
    }
  };
};
```

What this is useful for:

- key relics
- recipe starters
- "proof" items for follow-up quests

#### Step-by-step: add a new reward end-to-end

1. Choose the player outcome.
2. Create `quest-rewards/<type>.js`.
3. Implement `reward(...)` with that outcome.
4. Add `display(...)` text if you want UI-friendly labels.
5. Reference it from your quest in `areas/<area>/quests.yml` under `rewards`.
6. Make sure an NPC points to that quest via `quests: [ "area:questId" ]` in `npcs.yml`.
7. Run a short scenario test and verify the outcome appears in player state.

#### Gotchas (important, save time here)

1. File name must match reward type exactly.
2. Reward entries run in list order; if you care about sequencing, order them deliberately.
3. Quest completion is still recorded even if one reward errors.
4. Reward errors are logged and the engine attempts the next reward.
5. `display(...)` is not automatically shown by core; it is for UI/command layers that explicitly use it.
6. If you make quests repeatable, protect one-time rewards (item grants, permanent unlocks) against duplicates.
7. If reward code touches inventory, full inventory can block item grants; plan fallback behavior.

## Effects

Effects are reusable status mechanics you can apply to players or NPCs.

Think of them as: "this character is under condition X, so stats or behavior change until it ends."

Use effects when you want temporary or persistent gameplay state without hardcoding one-off logic into commands.

What effects are useful for:

- buffs and debuffs (`+armor`, reduced damage, damage vulnerability)
- over-time mechanics (burning, poison, regeneration)
- equipment-driven bonuses (while worn/wielded)
- cooldown and gating state ("cannot use this again yet")
- soft control states (stunned/silenced flags checked by command or skill logic)

Common design examples:

- Pulling a cursed lever applies a short `burn` effect that damages health over time.
- Drinking a tonic applies a `regen` effect for 30 seconds.
- Equipping a shield applies a hidden persistent effect that adds armor.
- A battle shout applies a short party buff that increases critical chance.

Where effect files live:

- `bundles/bundle-rantamuta/effects/<effectId>.js`

How effects are used in play:

1. Define an effect module in `effects/`.
2. Apply it from a command, skill, item script, or room script by creating the effect and adding it to the target.
3. Let the engine handle duration, stacking, refresh, and tick delivery based on your config.
4. Tune the numbers and text through repeated scenario tests.

Practical authoring model:

- `config`: designer-facing rules (duration, stacking, uniqueness, visibility)
- `state`: per-instance values (magnitude, remaining shield, stacks metadata)
- `modifiers`: direct math changes (attributes, incoming/outgoing damage)
- `listeners`: event reactions (`updateTick`, `effectRefreshed`, etc.)

Minimal apply pattern:

```js
const effect = state.EffectFactory.create('burn');
effect.config.duration = 6000;
effect.state.amountPerTick = 10;
target.addEffect(effect);
```

Copy-ready templates are in the appendix:

- [Appendix: Effect Templates](#effect-templates)
- [Template: DoT (Burn)](#1-dot-burn)
- [Template: HoT (Regeneration)](#2-hot-regeneration)
- [Template: Shield (Damage Pool)](#3-shield-damage-pool)
- [Template: Equipment Aura (Persistent Stat Bonus)](#4-equipment-aura-persistent-stat-bonus)
- [Template: Stacking Poison](#5-stacking-poison)
- [Template: Refreshing Buff](#6-refreshing-buff-with-real-refresh)
- [Template: Soft Crowd Control Flag](#7-soft-crowd-control-flag-command-checked)
- [Template: Cooldown Groups](#8-cooldown-groups-skill-level-pattern)

## Current Play Commands

Supported command intents in `bundle-rantamuta`:

- `look` (`l`)
- `go`
- `take` (`get`)
- `put` (`place`, `drop`)
- `inventory` (`i`)

## Semantic Message Templates

Semantic message templates let one event render differently for actor, target, and bystanders.

Example idea:

- actor sees: `You take the seal.`
- others see: `Renttu takes the seal.`

Useful placeholders:

- `{actor.you}` / `{target.you}`
- `{actor.name}` / `{target.name}`
- `{actor.poss}` / `{target.poss}`
- `{actor.name_poss}` / `{target.name_poss}`
- `{actor.refl}` / `{target.refl}`
- `{verb:take}` (recipient-aware verb inflection)
- `{object.direct}` / `{object.indirect}`

Practical naming behavior in v1:

- `actor` names are treated as proper names (capitalized).
- `target` names are kind-sensitive:
  - player/NPC targets are capitalized (`Bar`).
  - non-character/object targets keep authored casing (`rusty sword` stays lowercase if authored lowercase).

Pronouns in v1:

- supported values: `he`, `she`, `it`
- without a pronoun:
  - character-like targets fall back to name possessive (`Bar's`)
  - non-character targets fall back to `its` / `itself`

Token-local capitalization:

- You can force capitalization on actor/target tokens by using a title-cased token segment.
- examples: `{actor.You}`, `{target.Poss}`, `{target.Name_poss}`
- this applies to actor/target tokens only (not verbs or object slots).

### Template Harness CLI

Use `util/message.js` to test templates quickly without running the game loop:

```bash
node util/message "{actor.you} {verb:stab} {target.you} in {target.poss} neck!" \
  --actor '{"name":"foo","pronoun":"he","isNpc":false}' \
  --target '{"name":"bar","pronoun":"she","isNpc":true}' \
  --pov self \
  --audience self_target_and_others
```

Expected output:

```text
You stab Bar in her neck!
```

Notes:

- JSON input is recommended for clarity.
- Relaxed input (`{name:bar,isNpc:true}`) is also supported and now parses boolean fields (`true` / `false`).

## Authoring Rooms

Minimal room shape:

```yml
- id: square
  title: "Rantamuta Square"
  description: "A wind-worn square of cracked stone."
```

Room with exits and seeded items:

```yml
- id: lab
  title: "Test Lab"
  description: "A practice room."
  exits:
    - roomId: test:labNorth
      direction: north
    - roomId: test:labWest
      direction: west
  items:
    - id: test:labApple
```

Current room rendering convention (`look`, arrival render):

1. room title
2. room description
3. room item lines (`roomDesc` if present, else fallback)
4. exits line (`Exits: north, west`) when exits exist

## Authoring Virtual Doors

When two rooms satisfy virtual-door eligibility, the runtime treats that edge as one shared logical door (a virtual door).

Why use this:

- both sides stay in sync for open/closed/locked state
- key requirements stay consistent
- predicates can ask for one effective door state

Minimal paired setup:

```yml
# rooms.yml
- id: gallery_south
  title: "South Gallery"
  exits:
    - direction: north
      roomId: myarea:gallery_north
      virtualDoor: myarea:southDoorFacade   # optional facade item binding on this side
  doors:
    myarea:gallery_north:
      closed: true
      locked: true
      lockedBy: myarea:bronzeDoorKey

- id: gallery_north
  title: "North Gallery"
  exits:
    - direction: south
      roomId: myarea:gallery_south
  doors:
    myarea:gallery_south:
      closed: false      # mismatches reconcile to one effective state at load
      locked: false
      lockedBy: myarea:bronzeDoorKey
```

Authoring notes:

- `virtualDoor` is set on an exit side.
- allowed values:
  - omitted: still eligible for virtual pairing
  - `false`: opt out entirely for that exit pair (no virtual door is bound on either side)
  - `<itemRef>`: bind that side to a facade item for naming/presentation
- `lockedBy` is set in door records and should match on both sides when present.

A pair is virtualized only if all of these are true:

1. Room A has an exit to Room B.
2. Room B has an exit to Room A.
3. Room B has a door record keyed by Room A.
4. Room A has a door record keyed by Room B.
5. Room A has exactly one exit to Room B.
6. Room B has exactly one exit to Room A.
7. Neither side sets `virtualDoor: false`.
8. `lockedBy` values are not conflicting (both match, or only one side defines it).

Validation/warning cases to avoid:

- missing reciprocal exit or reciprocal door record: pair is not virtualized
- multiple exits from one room to the same counterpart room: pair is not virtualized
- conflicting `lockedBy` values across sides: virtualization is disabled for that pair and warns
- one side sets `virtualDoor: false`: pair is treated as non-virtual

Friendly recommendation:

- use one key ref on both sides (`lockedBy: myarea:bronzeDoorKey`) unless you intentionally want non-virtual directional behavior.

### If the two sides disagree at startup

When a virtual door pair loads, the game resolves both sides into one shared starting state, then writes that same result back to both sides.

How it decides:

- if either side starts locked, the shared door starts locked
- if either side starts closed (or locked), the shared door starts closed
- the shared door starts open only when both sides were open and unlocked

Quick examples:

- one side says open and the other says closed -> it starts closed
- one side says locked and the other says unlocked -> it starts locked and closed

### Facade Items (Designer View)

Facade items let each side of the same virtual door feel like its own object.
Players still interact with one shared door state, but each side can present different names, descriptions, and flavor.

What a facade item is:

- a side-local item you bind with `virtualDoor: <itemRef>` on an exit
- the thing players "see" and target from that side
- presentation and interaction flavor, not a separate door state

Why designers use facade items:

- to give each side its own tone (grand entrance outside, rusty hatch inside)
- to make parser targeting feel natural from each room
- to hide or reveal story context depending on viewpoint
- to support puzzle flavor without splitting one logical doorway into two behaviors

How they work in practice:

1. Bind a facade item on one or both sides of a virtual-eligible room pair.
2. You can bind different facade items on each side.
3. Open/close/lock/unlock from either side still changes one shared door.
4. If no facade display name is available, players still get a fallback like `north door`.
5. A facade binding must point to a real item id; invalid item refs fail bundle validation.
6. `virtualDoor: false` is not a facade choice; it disables virtual pairing for that pair.

Creative design examples:

- Cathedral and crypt:
  - Upstairs players see a "sunburst bronze gate."
  - Below, players see a "bone lattice hatch."
  - Same lock, different mood.
- Theater secret route:
  - Audience side calls it a "velvet curtain wall."
  - Backstage calls it a "painted service panel."
  - Opening either one exposes the same passage.
- Living tree interior:
  - Forest side presents "a bark seam covered in moss."
  - Heartwood chamber side presents "a pulsing amber membrane."
  - One doorway, two very different worldviews.
- Embassy and prison:
  - Diplomatic hall names it "the delegation door."
  - Holding corridor names it "the reinforced transfer gate."
  - Shared mechanics, politically charged framing.
- Clockwork observatory:
  - Library side sees "a brass iris doorway."
  - Dome side sees "a star-chart shutter."
  - Great for "same mechanism, different metaphor" storytelling.

Default reusable facade pattern (recommended):

1. Keep one reusable item script for facade behavior (for example `scripts/items/facadeDoor.js`).
2. Attach that script to many facade items through `script: ...` in `items.yml`.
3. Put per-door text and policy in metadata (`denied`, `flavor`, `remote`, key requirements).
4. In `spawn`, set `this.roomId` and `this.direction` from metadata so base door commands can target the real exit.
5. Use `canDirect` for veto/denial text and `planDirect` for success flavor; let base door commands keep state authority.

Full featured default-pattern example:

```yml
# rooms.yml
- id: observatory_foyer
  title: "Observatory Foyer"
  description: "A circular foyer wrapped in old brass mechanisms."
  exits:
    - direction: north
      roomId: myarea:observatory_inner
      virtualDoor: myarea:brassIrisFacade
  doors:
    myarea:observatory_inner:
      closed: true
      locked: true
      lockedBy: myarea:astralSignet
  items:
    - id: myarea:brassIrisFacade

- id: observatory_inner
  title: "Inner Observatory"
  description: "A dark chamber beneath the star dome."
  exits:
    - direction: south
      roomId: myarea:observatory_foyer
  doors:
    myarea:observatory_foyer:
      closed: false
      locked: false
      lockedBy: myarea:astralSignet

# items.yml
- id: brassIrisFacade
  name: "brass iris gate"
  roomDesc: "A brass iris gate is set into the north arch."
  description: "Nested brass petals overlap like an eyelid over the passage."
  keywords: [ "brass", "iris", "gate", "door" ]
  type: "OBJECT"
  script: facadeDoor
  metadata:
    permissions:
      verbs:
        take: "The gate is bolted into the stone ring."
    facadeDoor:
      roomId: myarea:observatory_inner
      direction: north
      requiredKeyRef: myarea:astralSignet
      denied:
        open: "The iris does not respond. A star-signet is required."
        lock: "You cannot find the sigil notch to set the lock."
        unlock: "The lock refuses your hand without a star-signet."
      remote:
        open: "From the far side, the south iris petals glide open."
        close: "From the far side, the south iris petals seal shut."
        lock: "From the far side, tiny lock pins click into place."
        unlock: "From the far side, the lock pins withdraw with a soft tick."
      flavor:
        open: "{actor.You} {verb:guide} the brass iris open with a silver hum."
        close: "{actor.You} {verb:draw} the brass petals shut until they interlock."
        lock: "{actor.You} {verb:set} the star lock; the gate answers with a sharp click."
        unlock: "{actor.You} {verb:ease} the lock free; the brass petals loosen."
```

Script location for that `script: facadeDoor` entry:

- `bundles/bundle-rantamuta/areas/<area>/scripts/items/facadeDoor.js`
- reference implementation: `bundles/bundle-rantamuta/areas/rantamuta/scripts/items/facadeDoor.js`

This example overrides what it can from content:

- denial text via `metadata.permissions` and `canDirect`
- all-audience success flavor via one semantic template per verb (`open`, `close`, `lock`, `unlock`)
- opposite-room flavor via `broadcast` in `planDirect`
- automatic suppression of generic door success lines in the reusable `facadeDoor` script

The base door command still controls actual door state changes; your facade script layers story tone on top.

## Room Details (Scenery You Can Look At)

Sometimes you want players to inspect room nouns without creating full items.
Use `metadata.details` for that (under `metadata`, not top-level room fields).

Example:

```yml
- id: bell_courtyard
  title: "Bell Courtyard"
  description: "Broken flagstones ring a weathered bell-shrine."
  metadata:
    details:
      - name: "bell-shrine"
        keywords: [ "bell-shrine", "shrine", "bell", "flagstones" ]
        description: "The weathered shrine is veined with old cracks."
        verbs:
          take: "The shrine is part of the courtyard stone."
```

What this gives you:

- `look bell-shrine` resolves and shows the detail description.
- Non-`look` commands against a detail are denied.
- If `verbs.<verbId>` exists on that detail, that text is used for the denial.

Current bundle behavior:

- `look` direct scope order is `room.items`, then `room.details`, then `player.inventory`.
- `take/get` scope order includes `room.details` so detail-specific denial text can be shown.

## Authoring Items

Minimal item shape:

```yml
- id: labApple
  name: "practice apple"
  keywords: [ "practice", "apple" ]
  roomDesc: "A practice apple rests here."
  description: "A plain apple used for testing."
  type: "OBJECT"
```

Container example:

```yml
- id: labChest
  name: "practice chest"
  keywords: [ "practice", "chest" ]
  type: "CONTAINER"
  maxItems: 4
```

## permissions

`metadata.permissions` is how you tell the game "this interaction is blocked here."

For designers, this is mainly about feel:

- block an interaction that should not be possible
- return flavor text that explains why

Example messages:

- "You cannot go that way. The portcullis is closed."
- "You try to take the book, but it is chained to the podium."

You can put `metadata.permissions` on:

- items
- rooms
- exits (`rooms.yml` -> `exits[].metadata.permissions`)

If you return `false`/`deny`, the action is blocked and the player gets the default denial text.  
If you return a string, the action is blocked and that string is shown to the player.

Simple block with custom message:

```yml
metadata:
  permissions:
    verbs:
      take: "You try to take the book, but it is chained to the podium."
```

Simple block with default denial text:

```yml
metadata:
  permissions:
    verbs:
      take: false
```

Default rule for everything on this object/room:

```yml
metadata:
  permissions:
    default: "You cannot do that here."
```

Specific relation example (`put ... in ...` allowed, `put ... on ...` blocked):

```yml
metadata:
  permissions:
    verbs:
      put:
        indirect:
          relations:
            in: true
            on: "That surface cannot hold anything."
```

Exit-specific movement block:

```yml
exits:
  - direction: east
    roomId: test:gate
    metadata:
      permissions:
        verbs:
          go: "You cannot go that way. The portcullis is closed."
```

Hide an exit from the room-view `Exits:` line (without disabling movement):

```yml
exits:
  - direction: south
    roomId: forest:lakeShore
    metadata:
      showInExits: false
      permissions:
        verbs:
          go: "You need a boat to go onto the lake."
```

`showInExits: false` only affects room-view exit listing.
It does not affect `go` target resolution or permission checks.

## Area-Specific Verb Behavior

Keep command files generic.  
If an area needs special behavior ("this altar only accepts one relic"), implement that in room/item scripts, not in `commands/*.js`.

Useful pattern:

1. Store your content data in YAML metadata on the entity.
2. In the entity script `spawn`, attach `canDirect` / `canIndirect` for veto logic.
3. In the same script, attach `planDirect` / `planIndirect` for context-sensitive result planning.
4. Planned: attach `reactDirect` / `reactIndirect` for post-success flavor output once runtime support lands.
5. Today: use command-level `metadata.reactions` for Bubble-phase flavor output.

You must attach the script within `spawn` in order to have access to `this`, which has access to all metadata and other properties set in the `.yml` file.

Example metadata (designer-owned keys):

```yml
metadata:
  puzzle:
    requiredItem: "myarea:ritualRelic"
    rejectMessage: "That does not belong in the bell."
    successRender: "A low hum rolls through the chamber."
```

## Stateful Room Descriptions

You can vary room text based on current world state without putting branching logic in command files.

Use these metadata fields on the room:

- `metadata.descriptionVariants`: optional full-description replacements (first matching variant wins).
- `metadata.descriptionFragments`: optional extra lines appended after the chosen description (all matching fragments are appended in order).
- Each entry can use:
  - `when: <predicateName>` to show text when predicate is true.
  - `whenNot: <predicateName>` to show text when that predicate is not true.

## Describing Things Inline

Sometimes you do not want to replace a whole room, item or PC description. You only want to swap a few words inside one sentence.

Inline tags are for that. Think of them as tiny "if/else" switches inside text:

> "The old reading room smells of wax and dust, and the carved runes on the desk glow [is_lantern_lit:bright|dark] beneath your hands."

- `[is_lantern_lit:bright]`
- `[is_lantern_lit:bright|dark]`

How to read those:

- First form: show `bright` only when the predicate is true.
- Second form: show `bright` when true, otherwise show `dark`.

Use inline tags when the sentence stays mostly the same and only one phrase changes.  
Use `descriptionVariants` / `descriptionFragments` when whole lines or sections should appear/disappear.

### Examples

- `The brazier burns [is_brazier_lit:hot and gold|cold and black].`
  - When `is_brazier_lit` is true, this reads: _"The brazier burns hot and gold."_
  - When `is_brazier_lit` is _false_, this reads: _"The brazier burns cold and black."_
- `A mural shows a [is_mural_restored:whole sun|broken circle].`
  - When `is_mural_restored` is true, this reads: _"A mural shows a whole sun."_
  - When `is_mural_restored` is _false_, this reads: _"A mural shows a broken circle."_
- `The gate stands [is_gate_open:open|sealed shut].`
  - When `is_gate_open` is true, this reads: _"The gate stands open."_
  - When `is_gate_open` is _false_, this reads: _"The gate stands sealed shut."_
- `The bell gives [is_bell_harmonic:a clear, singing note|a dull, cracked thud].`
  - When `is_bell_harmonic` is true, this reads: _"The bell gives a clear, singing note."_
  - When `is_bell_harmonic` is _false_, this reads: _"The bell gives a dull, cracked thud."_
- `The reliquary is [is_reliquary_sealed:sealed with red wax|hanging open].`
  - When `is_reliquary_sealed` is true, this reads: _"The reliquary is sealed with red wax."_
  - When `is_reliquary_sealed` is _false_, this reads: _"The reliquary is hanging open."_

You can also stack small cues in one line:

- `The chamber feels [is_storm_over_region:charged|still], and the mirror looks [is_observatory_moonlit:awake|dormant].`
  - When both predicates are true, this reads: _"The chamber feels charged, and the mirror looks awake."_
  - When `is_storm_over_region` is true and `is_observatory_moonlit` is false, this reads: _"The chamber feels charged, and the mirror looks dormant."_
  - When `is_storm_over_region` is false and `is_observatory_moonlit` is true, this reads: _"The chamber feels still, and the mirror looks awake."_
  - When both predicates are false, this reads: _"The chamber feels still, and the mirror looks dormant."_

And you can use a true-only tag for optional flavor:

- "Dust drifts in the light. [does_player_have_lantern:Your lantern catches silver writing along the wall.]"
  - When `does_player_have_lantern` is true, this reads: _"Dust drifts in the light. Your lantern catches silver writing along the wall."_
  - When `does_player_have_lantern` is _false_, this reads: _"Dust drifts in the light."_

Practical writing tip:

- Keep inline tags short and local.
- If one sentence starts needing many tags, it might be clearer to move that logic into `descriptionVariants` or `descriptionFragments`.

Good rule of thumb:

- Inline tags = word/phrase-level variation.
- Variants/fragments = line/paragraph-level variation.

## Predicates

Predicates are the "if checks" behind `when:` lines.

Current scope note:

- In v1, predicates are used for room-view descriptive state (`descriptionVariants` / `descriptionFragments`).
- Direct `look <item>` output still comes from that target's own `description` text.

Easy definition:

- A predicate is just a statement that is either true or false.

Examples in plain language:

- "Is the ritual complete?"
- "Is the slab still blocking the stairs?"
- "Is the player carrying the lantern?"
- "Is the reliquary currently holding the wax seal?"

If a predicate is true, the matching text is shown.  
If it is false, that text is skipped.

Why this is useful for designers:

- You can write richer world descriptions without touching command code.
- You can show progression in the environment itself.
- You can make rooms feel reactive to player actions.
- You can keep puzzle feedback clear and diegetic ("the world tells you what changed").

Creative examples you can build:

- A chapel where descriptive tone changes from fearful to peaceful as offerings are placed.
- A forest room that adds fog lines only when a weather flag is active.
- A study where shelves read "picked clean" only after the player has taken key books.
- A vault door room that shows subtle clue text once the player has learned a secret.

Where predicates live:

- `bundles/bundle-rantamuta/areas/<area>/predicates.js`

Naming convention for predicate keys:

- Use snake_case.
- Name predicates as yes/no questions.
- `is_`, `can_`, and `does_` are all good prefixes.
- Examples: `is_altar_completed`, `can_descend_stairs`, `does_reliquary_contain_seal`.

Small predicate example:

```js
// bundles/bundle-rantamuta/areas/myarea/predicates.js
'use strict';

module.exports = {
  is_altar_completed: ({ q }) =>
    q.roomContainerHasItem('myarea:shrine', 'myarea:altarBowl', 'myarea:moonCoin'),

  does_player_have_lantern: ({ q }) =>
    q.actorHasItem('myarea:lantern'),

  is_reliquary_sealed: ({ q }) =>
    q.roomContainerHasItem('myarea:nave', 'myarea:reliquary', 'myarea:waxSeal'),
};
```

### `q` Query Methods (Designer Reference)

Inside a predicate, `q` is your read-only "question toolbox."  
Each method asks one specific true/false question.

1. `q.roomFlag(roomRef, key)`
   Example idea: "Is the observatory marked as moonlit?"
   Example: `q.roomFlag('myarea:observatory', 'moonlit')`

2. `q.areaFlag(areaRef, key)`
   Example idea: "Is the whole region currently in storm mode?"
   Example: `q.areaFlag('myarea', 'stormActive')`

3. `q.getRoomMetadata(roomRef, key)`
   Example idea: "What is the current room metadata value for a puzzle key?"
   Example: `q.getRoomMetadata('myarea:observatory', 'puzzleState.phase')`

4. `q.getAreaMetadata(areaRef, key)`
   Example idea: "What is the current area metadata value for arc progression?"
   Example: `q.getAreaMetadata('myarea', 'storyArc.chapter')`

5. `q.roomHasItem(roomRef, itemRef)`
   Example idea: "Does the altar room still contain the ceremonial dagger?"
   Example: `q.roomHasItem('myarea:altar_room', 'myarea:ceremonialDagger')`

6. `q.currentContainerHasItem(itemRef)`
   Example idea: "Does the container this description belongs to currently hold a black pearl?"
   Example: `q.currentContainerHasItem('myarea:blackPearl')`

7. `q.roomContainerHasItem(roomRef, containerRef, itemRef)`
   Example idea: "Is the wax seal placed in the reliquary in the nave?"
   Example: `q.roomContainerHasItem('myarea:nave', 'myarea:reliquary', 'myarea:waxSeal')`

8. `q.actorHasItem(itemRef)`
   Example idea: "Is the player carrying a lantern, so they notice faint wall writing?"
   Example: `q.actorHasItem('myarea:lantern')`

9. `q.actorHasEffect(effectId)`
   Example idea: "Is the player under a blessing effect, so the shrine feels warmer?"
   Example: `q.actorHasEffect('blessed')`

10. `q.actorQuestActive(questRef)`
   Example idea: "Is the bell trial currently in progress?"
   Example: `q.actorQuestActive('myarea:bellTrial')`

11. `q.actorQuestCompleted(questRef)`
   Example idea: "Has the player already completed the crypt rite?"
   Example: `q.actorQuestCompleted('myarea:cryptRite')`

12. `q.isDoorClosed(direction)`
   Example idea: "Is the north door currently closed from this room?"
   Example: `q.isDoorClosed('north')`

13. `q.isDoorLocked(direction)`
   Example idea: "Is the north door currently locked from this room?"
   Example: `q.isDoorLocked('north')`

14. `q.isDoorClosedBetween(roomARef, roomBRef)`
   Example idea: "Is the archive passage closed even if the viewer is elsewhere?"
   Example: `q.isDoorClosedBetween('myarea:archive_south', 'myarea:archive_north')`

15. `q.isDoorLockedBetween(roomARef, roomBRef)`
   Example idea: "Is the vault passage still locked regardless of viewer room?"
   Example: `q.isDoorLockedBetween('myarea:vault_foyer', 'myarea:vault_inner')`

Metadata query notes:

- Metadata query keys use dot-separated camelCase segments (for example `storyArc.chapterOne`).
- `q.getRoomMetadata(...)` / `q.getAreaMetadata(...)` return `undefined` when a path is missing.
- Stored metadata values `null`, `false`, and `0` are returned as-is and are not treated as missing.

One combined example:

```js
module.exports = {
  is_observatory_moonlit: ({ q }) =>
    q.roomFlag('myarea:observatory', 'moonlit'),

  is_storm_over_region: ({ q }) =>
    q.areaFlag('myarea', 'stormActive'),

  is_dagger_still_on_altar: ({ q }) =>
    q.roomHasItem('myarea:altar_room', 'myarea:ceremonialDagger'),

  is_black_pearl_in_chest: ({ q }) =>
    q.currentContainerHasItem('myarea:blackPearl'),

  is_wax_seal_in_reliquary: ({ q }) =>
    q.roomContainerHasItem('myarea:nave', 'myarea:reliquary', 'myarea:waxSeal'),

  does_player_have_lantern: ({ q }) =>
    q.actorHasItem('myarea:lantern'),

  is_viewer_blessed: ({ q }) =>
    q.actorHasEffect('blessed'),

  is_bell_trial_active: ({ q }) =>
    q.actorQuestActive('myarea:bellTrial'),

  is_crypt_rite_complete: ({ q }) =>
    q.actorQuestCompleted('myarea:cryptRite'),

  is_north_passage_closed: ({ q }) =>
    q.isDoorClosed('north'),

  is_archive_passage_locked: ({ q }) =>
    q.isDoorLockedBetween('myarea:archive_south', 'myarea:archive_north'),
};
```

Room description usage in YAML (`when:`):

```yml
- id: shrine
  title: "Moon Shrine"
  description: "A silent shrine waits in pale stone."
  metadata:
    descriptionVariants:
      - when: is_altar_completed
        text: "The shrine hums softly, as if the stone itself is singing."
    descriptionFragments:
      - when: does_player_have_lantern
        text: "Your lantern light reveals silver etchings along the floor."
```

Using `whenNot` for explicit fallback text:

```yml
metadata:
  descriptionFragments:
    - when: is_slab_open
      text: "A heavy slab has been forced aside, revealing stone stairs descending into darkness."
    - whenNot: is_slab_open
      text: "A dull stone slab blocks the descent."
```

Object-focused description example:

Use predicates to change how an object is described in the room text:

```yml
- id: nave
  title: "Bell Nave"
  description: "Broken pews line a long hall."
  metadata:
    descriptionFragments:
      - when: is_reliquary_sealed
        text: "The reliquary now holds a red wax seal, pressed into its recess."
      - when: is_altar_completed
        text: "The bronze bell above seems less cracked than before."
```

In this pattern, the object state is real, and room prose reflects it.

Important rule: predicates must never change the world.

- Predicates are read-only checks.
- They should only answer true/false.
- They should never add/remove items, set flags, move players, or open/close paths.

Why this rule matters:

- It keeps game logic predictable.
- It keeps command behavior and mutation in command phases where it belongs.
- It prevents hard-to-debug "description code changed gameplay" bugs.

Practical tip:

- Think of predicates as a camera lens, not a hand.
- The lens decides what the player sees.
- The hand (commands + mutation logic) is what changes the world.

## Mutations

Mutations do not refer to weird body parts or super-powers. They refer to changes made to "game state". Everything that can be changed in the game is part of its state. If a character flips a switch in a room and the light goes on, that is a change in the common game state. Consider how that might work: the character types "flip switch" and a flag is set in the room "isSwitch: on". The change of that flag from "off" to "on" is a _mutation._  Mutations are a bit dangerous. Even careful, thoughful code can be made unstable by unexpected mutations from other careful, thoughtful code.

- Mutations change shared state that many systems read, not just the command that triggered it.
- A small flag write can affect later descriptions, predicates, and command results in places that are not obvious.
- If two features touch the same state, behavior can become order-dependent ("it works only if you did X first").
- Partial or hidden writes make bugs hard to reproduce and harder to debug.
- If a mutation needs two operations and only one is performed accidentally, something could be deleted, or doubled, or just fail.

To prevent this as much as possible, we give you specific "mutation operations" (or "mutator ops") and we take care of the details, to make sure the state changes happen as safely as possible.

Mutation instruction list (current):

1. `setRoomFlag`
2. `setAreaMetadata`
3. `noop`
4. `transferItem`
5. `movePlayer`
6. `changeDoor`

Designer-facing scripted mutation:

### `setRoomFlag`

```js
{
  type: 'setRoomFlag',
  roomRef: 'myarea:observatory',
  key: 'buttonPushed',
  value: true
}
```

What this does:

- Writes to `room.metadata.flags.buttonPushed`.
- Lets predicates read that state using `q.roomFlag('myarea:observatory', 'buttonPushed')`.
- Keeps state mutation in command/mutator flow and keeps predicates side-effect free.

### `setAreaMetadata`

```js
{
  type: 'setAreaMetadata',
  actor: player,
  key: 'storyArc.chapterOne',
  value: 2
}
```

What this does:

- Writes to `area.metadata.values` using a dot-separated key path.
- Uses current-area-only targeting from actor context (`actor.room.area`).
- Does not accept authored `areaRef` targeting in this operation.
- Rejects subtree-conflict writes (for example existing `storyArc.chapterOne` object and attempted set of `storyArc`).

Caution:

- `setAreaMetadata` resolves area at commit-time from actor context.
- Operation order matters. If one operation moves the actor and a later operation sets area metadata, the write applies to the actor's area at that point in commit order.

Runtime mutator instructions (command/movement systems):

### `noop`

```js
{ type: 'noop' }
```

What this does:

- Applies no world-state changes.
- Keeps a successful plan shape when a command should succeed without mutation.

### `transferItem`

```js
{
  type: 'transferItem',
  item: someItem,
  from: sourceEntity,
  to: destinationEntity
}
```

What this does:

- Moves an item between supported containers/entities.
- Uses mutator safety checks to prevent invalid or cyclic containment operations.

### `movePlayer`

```js
{
  type: 'movePlayer',
  actor: player,
  toRoomRef: 'myarea:targetRoom'
}
```

What this does:

- Moves a player actor between rooms through the command/mutator commit flow.
- Commonly used by directional movement commands after gate checks pass.

### `changeDoor`

```js
{
  type: 'changeDoor',
  mutation: 'open',
  direction: 'north'
}
```

Supported `mutation` values:

- `open`
- `close`
- `unlock`
- `unlockAndOpen`
- `closeAndLock`

What this does:

- Applies canonical door state changes through the Virtual Door mutation service.
- Keeps paired directional state synchronized through one logical mutator operation.

## Scenario Runner

The scenario-runner is a script you can use from the command line to run through a sequence of commands in your MUD. Even better, you can run it during automated testing and find out if some recent change broke something else.

### Run from the command line

Basic usage:

```bash
node util/scenario-runner.js --room test:lab --command "look"
```

Expected runner output:

```text
> look
<bold>Test Lab</bold>
...
```

What this means:

- `> look`: scenario-runner echoes command input like a user prompt.
- following lines are server output as captured.
- use exit code (and `--failOnUnknown`) to determine pass/fail in scripts.

Run multiple commands in order:

```bash
node util/scenario-runner.js \
  --room test:lab \
  --command "look" \
  --command "get apple" \
  --command "put apple in chest"
```

Useful flags:

- `--room <area:roomId>`: start in a specific room.
- `--seedInventory <area:itemId>`: seed item(s) into player inventory before commands.
- `--seedRoomItem <area:itemId>`: seed item(s) into the current room before commands.
- `--failOnUnknown`: exit non-zero if any unknown command appears.
- `--json`: emit machine-readable output (useful for tooling).
- `--whitespace`: with `--json`, keep blank/ANSI-only output lines instead of filtering them.

Scenario-runner command execution always goes through normal input handling (`InputEvent "main"`), so it follows the same parser/canonicalization/dispatch path as live player input.

### Run from the testing framework

Scenario-runner is already exercised by automated tests in:

- `bundles/bundle-rantamuta/tests/scenarios/scenario.basic.test.js`

To run those tests:

```bash
cd bundles/bundle-rantamuta && npm test -- --runInBand
```

When adding new content, add a scenario test that runs a realistic command sequence and asserts expected output.  
This catches regressions in parsing, resolution, policy hooks, and rendering.

### Use `.scenario` files

You can move long test flows into a `.scenario` file:

```text
# comments and blank lines are ignored
room: test:lab
seedRoomItem: test:labApple
command: look
command: get apple
command: put apple in chest
```

Run it:

```bash
node util/scenario-runner.js --scenario path/to/my.scenario
```

Supported directives:

- `room: <area:roomId>`
- `seedInventory: <area:itemId>`
- `seedRoomItem: <area:itemId>`
- `command: <input text>`

## Appendix

### Behavior Templates

Use these when you want reusable behavior modules under a bundle-level behavior path:

- `bundles/<bundle>/behaviors/area/<name>.js`
- `bundles/<bundle>/behaviors/room/<name>.js`
- `bundles/<bundle>/behaviors/item/<name>.js`
- `bundles/<bundle>/behaviors/npc/<name>.js`

Behavior module contract:

- Export shape is `module.exports = { listeners: { ... } }`.
- Listener factory signature is `(state) => handlerFn`.
- At runtime `this` inside `handlerFn` is the target entity instance.
- Recommended stable handler signature is `function (config, ...eventArgs)` where `config` comes from the entity's `behaviors.<name>` map entry.
- If you are using area/entity `script:` files instead of `behaviors/`, handlers are attached without behavior-config binding; in those scripts, use signatures without `config`.

Minimal skeleton:

```js
'use strict';

module.exports = {
  listeners: {
    spawn: state => function onSpawn(config) {
      // Annotation:
      // - state: global GameState from loader
      // - config: behavior config object (or {} if behavior: true)
      // - this: entity instance (area/room/item/npc)
      void state;
      void config;
    },
  },
};
```

Area behavior template:

```js
'use strict';

module.exports = {
  listeners: {
    updateTick: state => function onUpdateTick(config, gameState) {
      // Annotation:
      // - Event payload for area updateTick includes gameState
      // - this is Area
      void state;
      void config;
      void gameState;
    },

    roomAdded: state => function onRoomAdded(config, room) {
      // Annotation: fires when area.addRoom(room) emits roomAdded
      void state;
      void config;
      void room;
    },

    roomRemoved: state => function onRoomRemoved(config, room) {
      void state;
      void config;
      void room;
    },

    metadataUpdated: state => function onMetadataUpdated(config, key, newValue, oldValue) {
      void state;
      void config;
      void key;
      void newValue;
      void oldValue;
    },

    channelReceive: state => function onChannelReceive(config, channel, sender, rawMessage) {
      // Annotation: emitted when area is a channel broadcast target
      void state;
      void config;
      void channel;
      void sender;
      void rawMessage;
    },
  },
};
```

Room behavior template:

```js
'use strict';

module.exports = {
  listeners: {
    spawn: state => function onSpawn(config) {
      // Annotation:
      // - Room spawn happens before default room items/npcs are hydrated
      // - Good place to attach room policy helpers on `this`
      void state;
      this.myBehavior = { enabled: true, config };
    },

    ready: state => function onReady(config) {
      // Annotation:
      // - Room ready happens after default room contents are loaded
      // - Use when setup requires spawned defaults to exist
      void state;
      void config;
    },

    updateTick: state => function onUpdateTick(config) {
      void state;
      void config;
    },

    playerEnter: state => function onPlayerEnter(config, player, prevRoom) {
      void state;
      void config;
      void player;
      void prevRoom;
    },

    playerLeave: state => function onPlayerLeave(config, player, nextRoom) {
      void state;
      void config;
      void player;
      void nextRoom;
    },

    npcEnter: state => function onNpcEnter(config, npc, prevRoom) {
      void state;
      void config;
      void npc;
      void prevRoom;
    },

    npcLeave: state => function onNpcLeave(config, npc, nextRoom) {
      void state;
      void config;
      void npc;
      void nextRoom;
    },

    metadataUpdated: state => function onMetadataUpdated(config, key, newValue, oldValue) {
      void state;
      void config;
      void key;
      void newValue;
      void oldValue;
    },
  },
};
```

Item behavior template:

```js
'use strict';

module.exports = {
  listeners: {
    spawn: state => function onSpawn(config) {
      // Annotation:
      // - Good place to attach command-phase hooks:
      //   canDirect, canIndirect, planDirect, planIndirect
      void state;
      void config;
    },

    updateTick: state => function onUpdateTick(config) {
      void state;
      void config;
    },

    equip: state => function onEquip(config, equipper) {
      void state;
      void config;
      void equipper;
    },

    unequip: state => function onUnequip(config, equipper) {
      void state;
      void config;
      void equipper;
    },

    // Annotation:
    // - These movement events are proxied from Room.emit while item is in room
    playerEnter: state => function onPlayerEnter(config, player, prevRoom) {
      void state;
      void config;
      void player;
      void prevRoom;
    },

    playerLeave: state => function onPlayerLeave(config, player, nextRoom) {
      void state;
      void config;
      void player;
      void nextRoom;
    },

    npcEnter: state => function onNpcEnter(config, npc, prevRoom) {
      void state;
      void config;
      void npc;
      void prevRoom;
    },

    npcLeave: state => function onNpcLeave(config, npc, nextRoom) {
      void state;
      void config;
      void npc;
      void nextRoom;
    },

    metadataUpdated: state => function onMetadataUpdated(config, key, newValue, oldValue) {
      void state;
      void config;
      void key;
      void newValue;
      void oldValue;
    },
  },
};
```

NPC behavior template:

```js
'use strict';

module.exports = {
  listeners: {
    spawn: state => function onSpawn(config) {
      // Annotation:
      // - Initialize npc-local behavior state here
      void state;
      this.aiState = { startedAt: Date.now(), config };
    },

    updateTick: state => function onUpdateTick(config) {
      // Annotation: periodic AI pulse
      void state;
      void config;
    },

    enterRoom: state => function onEnterRoom(config, room) {
      void state;
      void config;
      void room;
    },

    attributeUpdate: state => function onAttributeUpdate(config, attrName, value) {
      void state;
      void config;
      void attrName;
      void value;
    },

    combatStart: state => function onCombatStart(config) {
      void state;
      void config;
    },

    combatantAdded: state => function onCombatantAdded(config, target) {
      void state;
      void config;
      void target;
    },

    combatantRemoved: state => function onCombatantRemoved(config, target) {
      void state;
      void config;
      void target;
    },

    combatEnd: state => function onCombatEnd(config) {
      void state;
      void config;
    },

    hit: state => function onHit(config, damage, target, finalAmount) {
      void state;
      void config;
      void damage;
      void target;
      void finalAmount;
    },

    damaged: state => function onDamaged(config, damage, finalAmount) {
      void state;
      void config;
      void damage;
      void finalAmount;
    },

    heal: state => function onHeal(config, heal, target, finalAmount) {
      void state;
      void config;
      void heal;
      void target;
      void finalAmount;
    },

    healed: state => function onHealed(config, heal, finalAmount) {
      void state;
      void config;
      void heal;
      void finalAmount;
    },

    equip: state => function onEquip(config, slot, item) {
      void state;
      void config;
      void slot;
      void item;
    },

    unequip: state => function onUnequip(config, slot, item) {
      void state;
      void config;
      void slot;
      void item;
    },

    followed: state => function onFollowed(config, target) {
      void state;
      void config;
      void target;
    },

    unfollowed: state => function onUnfollowed(config, priorTarget) {
      void state;
      void config;
      void priorTarget;
    },

    gainedFollower: state => function onGainedFollower(config, follower) {
      void state;
      void config;
      void follower;
    },

    lostFollower: state => function onLostFollower(config, follower) {
      void state;
      void config;
      void follower;
    },

    effectAdded: state => function onEffectAdded(config, effect) {
      void state;
      void config;
      void effect;
    },

    effectRemoved: state => function onEffectRemoved(config) {
      void state;
      void config;
    },

    playerEnter: state => function onPlayerEnter(config, player, prevRoom) {
      void state;
      void config;
      void player;
      void prevRoom;
    },

    playerLeave: state => function onPlayerLeave(config, player, nextRoom) {
      void state;
      void config;
      void player;
      void nextRoom;
    },

    npcEnter: state => function onNpcEnter(config, npc, prevRoom) {
      void state;
      void config;
      void npc;
      void prevRoom;
    },

    npcLeave: state => function onNpcLeave(config, npc, nextRoom) {
      void state;
      void config;
      void npc;
      void nextRoom;
    },

    metadataUpdated: state => function onMetadataUpdated(config, key, newValue, oldValue) {
      void state;
      void config;
      void key;
      void newValue;
      void oldValue;
    },

    channelReceive: state => function onChannelReceive(config, channel, sender, rawMessage) {
      void state;
      void config;
      void channel;
      void sender;
      void rawMessage;
    },
  },
};
```

Authoring rules of thumb:

- Keep behavior handlers deterministic and narrow in scope.
- Prefer attaching command-phase policy and plan hooks during `spawn`.
- Use `ready` for room logic that depends on default room items/npcs.
- Do not call `EventManager.detach` on shared emitters unless you intentionally want to remove all listeners for that event name.

### Effect Templates

**Effect Cookbook (for this Ranvier build)**  
Use these in `bundles/bundle-rantamuta/effects/*.js` (filename = effect id).

#### **Before You Start (important for this engine version)**

- Create with `state.EffectFactory.create(id)` and then mutate instance fields.
- Do not pass per-instance overrides into `create(id, config, state)` in this build; they leak into future instances.
- If you rely on pause/deactivate semantics for damage modifiers, guard manually with `if (this.paused || !this.active) return current;`.

```js
// Safe helper you can reuse in commands/skills/items
function applyEffect(state, target, effectId, opts = {}) {
  const effect = state.EffectFactory.create(effectId); // no overrides here
  Object.assign(effect.config, opts.config || {});
  Object.assign(effect.state, opts.state || {});
  return target.addEffect(effect);
}
```

## 1. DoT (Burn)

```js
// bundles/bundle-rantamuta/effects/burn.js
'use strict';

module.exports = {
  config: {
    name: 'Burning',
    description: 'Taking fire damage over time.',
    type: 'dot.burn',
    duration: 10000,
    tickInterval: 1,
    unique: true,
    refreshes: true,
  },
  state: {
    amountPerTick: 8,
    attribute: 'health',
  },
  listeners: {
    effectRefreshed: function (newEffect) {
      this.startedAt = Date.now(); // true refresh
      if (newEffect && newEffect.state && Number.isFinite(newEffect.state.amountPerTick)) {
        this.state.amountPerTick = newEffect.state.amountPerTick;
      }
    },
    updateTick: function () {
      if (!this.target) return;
      this.target.lowerAttribute(this.state.attribute, this.state.amountPerTick);
    },
  },
};
```

## 2. HoT (Regeneration)

```js
// bundles/bundle-rantamuta/effects/regen.js
'use strict';

module.exports = {
  config: {
    name: 'Regenerate',
    description: 'Recovering over time.',
    type: 'regen',
    duration: 'inf', // set to Infinity at runtime if you set from code
    tickInterval: 3,
    unique: true,
    hidden: true,
  },
  state: {
    amountPerTick: 15,
    attribute: 'health',
  },
  listeners: {
    updateTick: function () {
      if (!this.target) return;
      this.target.raiseAttribute(this.state.attribute, this.state.amountPerTick);
    },
  },
};
```

## 3. Shield (Damage Pool)

```js
// bundles/bundle-rantamuta/effects/shield.js
'use strict';

module.exports = {
  config: {
    name: 'Magic Shield',
    description: 'Absorbs incoming damage.',
    type: 'shield',
    duration: 15000,
    unique: true,
  },
  state: {
    remaining: 120,
  },
  modifiers: {
    incomingDamage: function (_damage, current) {
      if (this.paused || !this.active) return current;
      const blocked = Math.min(current, Math.max(0, this.state.remaining));
      this.state.remaining -= blocked;
      if (this.state.remaining <= 0) {
        this.remove();
      }
      return current - blocked;
    },
  },
};
```

## 4. Equipment Aura (Persistent Stat Bonus)

```js
// bundles/bundle-rantamuta/effects/equip.js
'use strict';

module.exports = {
  config: {
    name: 'Equip Bonus',
    type: 'equip.generic',
    duration: Infinity,
    hidden: true,
    persists: true,
    unique: true,
  },
  state: {
    slot: 'wield',
    stats: { critical: 1, armor: 0 },
  },
  modifiers: {
    attributes: function (attrName, current) {
      if (this.paused || !this.active) return current;
      const bonus = Number(this.state.stats && this.state.stats[attrName]) || 0;
      return current + bonus;
    },
  },
};
```

Apply it with slot-specific type so each slot can coexist:

```js
const effect = state.EffectFactory.create('equip');
effect.config.type = `equip.${slot}`;
effect.config.name = `Equip: ${slot}`;
effect.state.slot = slot;
effect.state.stats = { armor: 20 };
target.addEffect(effect);
```

## 5. Stacking Poison

```js
// bundles/bundle-rantamuta/effects/poison.js
'use strict';

module.exports = {
  config: {
    name: 'Poisoned',
    type: 'dot.poison',
    duration: 12000,
    tickInterval: 2,
    unique: true,
    maxStacks: 5,
    refreshes: true, // refresh once max stacks reached
  },
  state: {
    basePerStack: 3,
  },
  listeners: {
    effectStackAdded: function () {
      this.startedAt = Date.now();
    },
    effectRefreshed: function () {
      this.startedAt = Date.now();
    },
    updateTick: function () {
      if (!this.target) return;
      const stacks = Number(this.state.stacks) || 1;
      this.target.lowerAttribute('health', stacks * this.state.basePerStack);
    },
  },
};
```

## 6. Refreshing Buff (with real refresh)

```js
// bundles/bundle-rantamuta/effects/battleFocus.js
'use strict';

module.exports = {
  config: {
    name: 'Battle Focus',
    type: 'buff.focus',
    duration: 15000,
    unique: true,
    refreshes: true,
  },
  state: {
    critBonus: 5,
  },
  modifiers: {
    attributes: {
      critical: function (current) {
        if (this.paused || !this.active) return current;
        return current + this.state.critBonus;
      },
    },
  },
  listeners: {
    effectRefreshed: function (newEffect) {
      this.startedAt = Date.now();
      if (newEffect && newEffect.state && Number.isFinite(newEffect.state.critBonus)) {
        this.state.critBonus = newEffect.state.critBonus;
      }
    },
  },
};
```

## 7. Soft Crowd Control Flag (command-checked)

```js
// bundles/bundle-rantamuta/effects/stunned.js
'use strict';

module.exports = {
  config: {
    name: 'Stunned',
    description: 'Cannot act.',
    type: 'cc.stun',
    duration: 3000,
    unique: true,
  },
};
```

In command/skill execution gate:

```js
if (player.hasEffectType('cc.stun')) {
  Broadcast.sayAt(player, 'You are stunned and cannot act.');
  return;
}
```

## 8. Cooldown Groups (skill-level pattern)

Use built-in cooldown effect behavior by skill config:

```js
// bundles/bundle-rantamuta/skills/slash.js
cooldown: { group: 'martial', length: 8 }
```

```js
// bundles/bundle-rantamuta/skills/cleave.js
cooldown: { group: 'martial', length: 8 }
```

Both share one cooldown group (`skillgroup:martial`) through `Skill.getCooldownId()`.

## 9. Applying Effects from Commands/Items/Skills

```js
const effect = state.EffectFactory.create('burn');
effect.config.duration = 6000;
effect.state.amountPerTick = 12;
target.addEffect(effect);
```

## 10. Recommended Defaults

- Use explicit `config.type` taxonomy like `dot.burn`, `buff.haste`, `equip.wield`.
- For finite buffs/debuffs, set `unique: true` and choose one of:
  - `refreshes: true` + `effectRefreshed` handler.
  - `maxStacks > 0` + stack handlers.
- For hidden bookkeeping effects (`equip`, internal flags), set `hidden: true`.
- For load-safe effects on players, keep `persists: true` only when necessary.
