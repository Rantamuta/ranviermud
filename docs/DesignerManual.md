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
- `bundles/bundle-rantamuta/areas/<area>/scripts/rooms/*.js`
- `bundles/bundle-rantamuta/areas/<area>/scripts/items/*.js`

## Scripts and Events

You can attach scripts directly in YAML with `script: <name>` (no `.js` extension).

Examples:

- room script: `rooms.yml` entry with `script: lockedDoorGate`
- item script: `items.yml` entry with `script: someItemScript`

Script files live under:

- `bundles/bundle-rantamuta/areas/<area>/scripts/rooms/<name>.js`
- `bundles/bundle-rantamuta/areas/<area>/scripts/items/<name>.js`

Script module shape:

```js
module.exports = {
  listeners: {
    spawn: state => function () {
      // `this` is the room/item entity
    },
  },
};
```

Listeners are event handlers. The key in `listeners` must exactly match an event name emitted by the engine.
There is no `on` prefix.

- Use `playerEnter`, not `onPlayerEnter`.
- Use `npcLeave`, not `onNpcLeave`.

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

- `spawn`: item instance is spawned/hydrated.
- `updateTick`: item update tick.
- `equip`: item was equipped by a character.
- `unequip`: item was unequipped by a character.
- `playerEnter` / `playerLeave` / `npcEnter` / `npcLeave`: proxied from the room while the item is in that room.

NPC listeners:

- `spawn`: NPC is spawned/hydrated.
- `enterRoom`: NPC completed a room move.
- `updateTick`: NPC update tick.

Player listeners:

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

Reaction hooks (role-routed Bubble contract in the architecture docs):

- `reactDirect(actor, verbId, context)`
- `reactIndirect(actor, verbId, relationTokenCanonical, context)`

Note: this is the architecture-facing contract. If your local runtime build is still on legacy/replacement hook names, keep the same behavior rules below (data-only contribution, no direct output, no mutation).

What these are for:

- Add flavor or audience output instructions after Target has succeeded.
- Return data only. The dispatcher owns delivery.

What they must not do:

- Do not call `Broadcast.*` directly.
- Do not mutate room/item/player state.
- Do not veto actions (veto belongs in `canDirect` / `canIndirect`).

How they are used:

1. The hook checks context and decides whether it wants to contribute anything.
2. It returns a contribution payload (or `null`).
3. The command pipeline merges that contribution and dispatches it in order.

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

If you need area/room/player messaging, still return it as instructions and let the dispatcher deliver it. Do not emit output directly from the hook.

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
4. Attach `reactDirect` / `reactIndirect` when you need post-success flavor output via dispatcher-owned instructions.

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
