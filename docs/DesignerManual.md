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
3. exits line (`Exits: north, west`) when exits exist
4. room item lines (`roomDesc` if present, else fallback)

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

Variant example (first match wins):

```yml
metadata:
  descriptionVariants:
    - when: ritual_complete
      text: "The chamber rings with warm harmonic light."
    - when: ritual_started
      text: "A faint tremor rolls through the chamber."
```

Example:

```yml
- id: bell_crypt
  title: "Bell Crypt"
  description: "A low crypt of damp stone holds offerings and a basin etched with old runes."
  script: bellCryptGate
  metadata:
    descriptionFragments:
      - when: slab_blocking
        text: "A dull stone slab blocks the descent."
      - when: slab_open
        text: "A heavy slab has been forced aside, revealing stone stairs descending into darkness."
```

Then define the predicate keys in the room script (`scripts/rooms/bellCryptGate.js`) by attaching `renderPredicates` during `spawn`:

```js
module.exports = {
  listeners: {
    spawn: state => function onSpawn() {
      this.renderPredicates = {
        ...(this.renderPredicates || {}),
        slab_open: () => {
          // return true when puzzle state says descent is open
          return true;
        },
        slab_blocking: () => {
          // return true while descent is still blocked
          return false;
        },
      };
    },
  },
};
```

Tips:

- Keep render predicates read-only; they should compute from state and return booleans.
- Avoid side effects inside predicates.
- Arrival render and intransitive `look` both use the same room-view builder, so this text stays consistent.

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
      // - Good place to attach policy/predicate helpers on `this`
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
