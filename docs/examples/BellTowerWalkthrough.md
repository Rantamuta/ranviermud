# Bell Tower Walkthrough

## Purpose

This walkthrough shows one complete, concrete example of area-specific scripting while keeping core commands generic.

Use this as a reference implementation for:

- indirect-target `put` veto/allow behavior via item script
- room exit gating for `go` via room script
- puzzle-state flavor output via `bubbleEvent`

## Area Entry

The Bell Tower area is attached to `rantamuta:square` and includes a small puzzle loop.

## Puzzle Pattern Used

Three fixed world targets accept specific offerings:

- `rantamuta:crackedBell` accepts `rantamuta:bronzeClapper`
- `rantamuta:reliquary` accepts `rantamuta:waxSeal`
- `rantamuta:stoneBasin` accepts `rantamuta:prayerStone`

Wrong offerings are denied with a custom message during Capture.
Correct offerings can add flavor render lines during Bubble.

## Item Metadata Pattern

The Bell Tower items use puzzle metadata like:

```yml
metadata:
  puzzle:
    putPolicy:
      acceptedItemRef: "rantamuta:bronzeClapper"
      rejectMessage: "That does not belong in the bell."
      successRender: "The cracked bell hums with a low resonance."
```

## Item Script Hooking

Items attach a script:

```yml
script: ritualPutTarget
```

That script sets:

- `allowAction(action, context)` to veto wrong `put` offerings
- `bubbleEvent(action, context)` to add success flavor lines on correct `put`

Implementation:

- `bundles/bundle-rantamuta/areas/codex/scripts/items/ritualPutTarget.js`
- `bundles/bundle-rantamuta/areas/codex/scripts/helpers/putPolicy.js`

## Crypt Exit Gate Pattern

The Bell Crypt blocks `go down` until all required placements are present.

Room YAML uses exit gate metadata:

```yml
- id: bell_crypt
  title: "Bell Crypt"
  description: "A low crypt of damp stone."
  script: bellCryptGate
  exits:
    - roomId: rantamuta:resonance_chamber
      direction: down
      metadata:
        gate:
          denyMessage: "A dull stone slab blocks the descent."
          requiredPlacements:
            - containerRef: rantamuta:crackedBell
              itemRef: rantamuta:bronzeClapper
            - containerRef: rantamuta:reliquary
              itemRef: rantamuta:waxSeal
            - containerRef: rantamuta:stoneBasin
              itemRef: rantamuta:prayerStone
```

Room script/helper:

- `bundles/bundle-rantamuta/areas/codex/scripts/rooms/bellCryptGate.js`
- `bundles/bundle-rantamuta/areas/codex/scripts/helpers/exitGate.js`

## Why This Is Architecturally Clean

- `commands/put.js` and `commands/go.js` remain generic.
- Area-specific policy lives with area content (YAML + scripts).
- Veto logic is Capture-time (`allowAction`).
- Flavor contributions are Bubble-time (`bubbleEvent`).
