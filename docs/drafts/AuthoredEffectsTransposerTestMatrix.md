# Authored Effects Transposer Test Matrix

Status: draft

## Purpose

This document is an informal testing guide for the authored-effects transposer.

It is not a formal implementation checklist.
It is a plain-language map of the transposer behaviors we want explicit test coverage for.

The intent is to make sure we test the whole supported instruction vocabulary and the meaningful variations in each instruction's fields.

## Test Shape

The main transposer tests should be table-driven.

Each test case should define:

- a short case name
- authored `effects`
- runtime `scope`
- either:
  - the exact expected `operations` and `renderMessages`, or
  - the exact expected structured failure code

Success cases should assert exact lowered output.
Failure cases should assert explicit structured failure, not degraded success.
In this document, `[x]` means a test exists for that case. It does not by itself mean the current implementation passes that test.

## Separate Test Layers

Keep these as separate suites:

- validator tests
- transposer tests

Validator tests should focus on authored shape and allowed fields.
Transposer tests should focus on resolution and exact lowered runtime output.

## Coverage Areas

### transferItem

Test:

- [x] happy path: resolves `item`, `from`, and `to`
- [x] current-area-relative item ref resolves within `from`
- [x] fully qualified item ref resolves within `from`
- [x] first matching item is selected from `from`
- [x] unresolved `item`
- [x] unresolved `from`
- [x] unresolved `to`

### movePlayer

Test:

- [x] implicit current player
- [x] explicit player, if the DSL allows it
- [x] current-area-relative `toRoom`, such as `toRoom: start`
- [x] fully qualified `toRoom`, such as `toRoom: "codex:start"`
- [x] unresolved `toRoom`
- [x] preserves optional `direction`
- [x] preserves optional `suppressRoomBroadcast`

### Door Ops

Test:

- [x] `operateDoor` targeted by `direction`
- [x] `operateDoor` targeted by `roomRef`
- [x] `operateDoor` preserves `fromRoomRef`
- [x] `openDoor` targeted by `direction`
- [x] `openDoor` targeted by `roomRef`
- [x] `openDoor` preserves `fromRoomRef`
- [x] `closeAndLockDoor` targeted by `direction`
- [x] `closeAndLockDoor` targeted by `roomRef`
- [x] `closeAndLockDoor` preserves `fromRoomRef`
- [x] unresolved `roomRef`
- [x] unresolved `fromRoomRef`, if supported by the contract

### Metadata Ops

Test:

- [x] `setPlayerMetadata` with implicit current player
- [x] `setRoomMetadata` with implicit current room
- [x] `setRoomMetadata` with explicit `roomRef`
- [x] `setAreaMetadata` with implicit current area
- [x] `setWorldMetadata`
- [x] delete ops preserve `force`
- [x] unresolved explicit room target fails

### broadcast

Test:

- [x] plain room broadcast
- [x] each supported `audience`
- [x] preserves optional targeting fields
- [x] preserves optional exclusion fields
- [x] unresolved `targetRoomRef`
- [x] unresolved `exceptRoomRef`

### semanticEvent

Test:

- [x] minimal valid payload lowers unchanged
- [x] payload with `participants`
- [x] payload with `objectText`
- [x] payload with alternate audience policy

Malformed `semanticEvent` payloads belong in validator tests rather than transposer tests.

### Mixed Ordering

Test:

- [x] mutation plus render effects preserve authored order within their output buckets
- [x] no surprising reordering when several effects are lowered together

### Failure Behavior

Test:

- [x] first bad effect returns structured failure
- [x] no partial lowering after failure
- [x] no "successful" result with omitted required fields

## Validator Coverage

Validator coverage should explicitly prove:

- [x] each effect entry must be a single-key object
- [x] each effect name must be known
- [x] required fields are enforced per effect
- [x] field types are enforced per effect
- [x] implicit fields are only allowed where the contract says they are allowed
- [x] malformed refs are rejected structurally where possible

## Test Helpers

Use compact helpers so test cases read like contract examples instead of setup code.

Useful helpers include:

- `makeScope(...)`
- `runCase(...)`

The helper layer should keep setup small and explicit.

## Immediate Priority

The next red tests should focus on supported fields that may currently be dropped during lowering.

Start with:

- `movePlayer` preserves `direction`
- `movePlayer` preserves `suppressRoomBroadcast`
- `operateDoor` preserves `fromRoomRef`
- `openDoor` preserves `fromRoomRef`
- `closeAndLockDoor` preserves `fromRoomRef`

These tests directly probe whether the transposer is silently losing supported instruction fields.
