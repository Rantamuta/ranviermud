# Command Architecture

This document defines the end-to-end command data flow for the bundle-layer runtime, from player input intake through validation, planning, mutation commit, and final output delivery.

It presents a phase-based architecture centered on deterministic command planning and transactional execution. The model allows multiple game entities to participate in command handling in a controlled way: specific entities can veto actions during policy evaluation, and then contribute post-validation reactions once an action is valid, without bypassing atomic commit guarantees.

## Status

- Status: `draft`
- Scope: Bundle-layer command execution flow
- Binding: No (design draft)

## Purpose

Define a single execution shape for diegetic commands that is deterministic, testable, and compatible with planner-style verbs.

Core principle:

- Verbs plan.
- Mutator executes.
- Hooks govern policy and reactions around the verb plan.

## Phase Model

Execution phases are:

0. Receive Input
1. Target Resolution
2. Capture
3. Target
4. Bubble
5. Commit
6. Render/Dispatch

### 0) Receive Input (intake phase)

Rules:

- Accept one actor-issued input payload for the active session.
- Normalize and parse into command artifact/context.
- Select verb family/rule variant from parsed form.
- No world mutation.
- No audience output.
- Produces the parse/rule context consumed by Target Resolution.

### 1) Target Resolution (binding phase)

Rules:

- Resolve parse spans to concrete world entities before policy hooks.
- Produce bound entities for direct and indirect roles, plus any contextual targets.
- Remain deterministic for identical input and state.
- No world mutation.
- No audience output.

Capture must consume these concrete bindings; it must not re-run target resolution logic.

### 2) Capture (veto phase)

Order:

1. world
2. questSystem
3. area
4. room
5. player
6. indirect object
7. direct object

Rules:

- Hooks may allow or deny.
- Hooks must not mutate world state.
- First deny wins.
- If denied, command terminates with failure envelope and does not enter Target.

### 3) Target (verb phase)

This is the command script (example: `put.js`).

Rules:

- Receives resolved parse/context.
- Performs deterministic command-level validation.
- Returns either:
  - failure envelope, or
  - base mutation plan.
- Must not mutate world state directly.

### 4) Bubble (reaction phase)

Order (reverse specificity):

1. direct object
2. indirect object
3. player
4. room
5. area
6. questSystem
7. world

Rules:

- No veto in bubble.
- Hooks may append reaction instructions/events.
- Hooks must be deterministic for identical input/state.

### 5) Commit (transaction phase)

Rules:

- Merge base plan + bubble contributions into one plan.
- Apply atomically (all-or-rollback).
- Rollback failures are system errors and must be logged with context.

### 6) Render/Dispatch (output phase)

Rules:

- Output derives from committed semantic events.
- Delivery order is deterministic.
- No success narration before successful commit.

## Hook Kinds

Two hook kinds are used across phases:

- Policy hook (capture): allow/deny only.
- Reaction hook (bubble): append instructions/events only.

This split prevents veto/mutation ambiguity and keeps behavior predictable.

## Immediate Application To `put`

- `put.js` lives in Target.
- Span-to-entity binding happens in Target Resolution before Capture.
- Container/object/player/room/quest/world policy checks run in Capture.
- Post-plan narrative and quest/world effects accumulate in Bubble.
- Mutator executes one merged plan in Commit.
