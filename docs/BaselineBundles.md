# Baseline Bundles

This document describes the baseline bundle set installed by `npm run init`
and the expected on-disk layout used by the wrapper and engine loaders.

## Default bundle set

- bundle-rantamuta
- bundle-example-channels
- bundle-example-classes
- bundle-example-combat
- bundle-example-commands
- bundle-example-debug
- bundle-example-effects
- bundle-example-input-events
- bundle-example-lib
- bundle-example-npc-behaviors
- bundle-example-player-events
- bundle-example-quests
- simple-crafting
- vendor-npcs
- player-groups
- progressive-respawn
- telnet-networking
- websocket-networking

## Expected bundle layout

- bundles/<bundle>/
- bundles/<bundle>/areas/<area>/manifest.yml
- bundles/<bundle>/areas/<area>/items.yml
- bundles/<bundle>/areas/<area>/npcs.yml
- bundles/<bundle>/areas/<area>/rooms.yml
- bundles/<bundle>/areas/<area>/quests.yml
- bundles/<bundle>/help/*.yml

Notes:

- `quests.yml` may be an empty list (`[]`) but must exist for area loading.
- `npm run bundles:init` installs the baseline bundles and updates `ranvier.json`.
