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

For rooms, the important event names are:

- `spawn`
- `playerEnter`
- `playerLeave`
- `npcEnter`
- `npcLeave`
- `updateTick`

Note:

- Event names are exact. Use `playerEnter`, not `playerEnters`.
- `allowAction` is not an event name. If needed, assign `this.allowAction = (...) => ...` inside `spawn`.
- `bubbleEvent` is not an event name. If needed, assign `this.bubbleEvent = (...) => ...` inside `spawn`.

Command-pipeline hooks you can attach in `spawn`:

- `allowAction(action, context)`:
  - Called during Capture.
  - Return allow/deny (or a deny message string) to permit or block the action.
- `bubbleEvent(action, context)`:
  - Called during Bubble after the command plan is valid.
  - Return extra render lines and/or extra operations to contribute to the final plan.

## Current Play Commands

Supported command intents in `bundle-rantamuta`:

- `look` (`l`)
- `go`
- `take` (`get`)
- `put` (`place`, `drop`)
- `inventory` (`i`)

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
2. In the entity script `spawn`, attach `allowAction` for veto logic.
3. In the same script, attach `bubbleEvent` for post-success flavor output.

You must attach the script within `spawn` in order to have access to `this`, which has access to all metadata and other properties set in the `.yml` file.

Example metadata (designer-owned keys):

```yml
metadata:
  puzzle:
    requiredItem: "myarea:ritualRelic"
    rejectMessage: "That does not belong in the bell."
    successRender: "A low hum rolls through the chamber."
```

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
