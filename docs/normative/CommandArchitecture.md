# Command Architecture

This document defines the end-to-end command data flow for the bundle-layer runtime, from player input intake through validation, planning, mutation commit, and final output delivery.

It presents a phase-based architecture centered on deterministic command planning and transactional execution. The model allows multiple game entities to participate in command handling in a controlled way: specific entities can veto actions during policy evaluation, and then contribute post-validation reactions once an action is valid, without bypassing atomic commit guarantees.

## Status

- Status: normative-v1
- Scope: Bundle-layer command execution flow
- Binding: yes
- Related:
  - [EntityResolution.md](EntityResolution.md)

## Purpose

Define a single execution shape for diegetic commands that is deterministic, testable, and compatible with planner-style verbs.

Core principle:

- Verbs plan.
- Mutator executes.
- Hooks govern policy and reactions around the verb plan.

## Phase Model

Execution phases are:

0. Receive Input
1. Entity Resolution
2. Capture
3. Target
4. Bubble
5. Commit
6. Render/Dispatch

### 0) Receive Input (intake phase)

Rules:

- Accept one actor-issued input payload for the active session.
- Normalize and parse into command artifact/context.
- Resolve intent to a command by exact command/alias key match.
- Prefix matching for command lookup is not allowed.
- If no command matches, render unknown-intent feedback and stop before Entity Resolution.
- No world mutation.
- No audience output.
- Produces the parse/rule context consumed by Entity Resolution.

### 1) Entity Resolution (binding phase)

Execute Entity Resolution as specified in [EntityResolution.md](EntityResolution.md).

Rules:

- Resolve parse spans to concrete world entities before policy hooks.
- Produce bound entities for direct and indirect roles, plus any contextual entities.
- Remain deterministic for identical input and state.
- No world mutation.
- No audience output.

Capture must consume these concrete bindings; it must not re-run entity resolution logic.

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
- Policy hook contract is `allowAction(action, context)`.
- If `allowAction` is not implemented on an entity, that entity is treated as "no objection" (allow).
- Item/room/area/player/world YAML definitions remain data-only; they do not embed executable hook functions.
- Declarative policy fallback may be supplied through metadata (for example `metadata.permissions`), evaluated by shared capture helpers.
- Special-case runtime policy logic may be implemented in code behaviors/scripts that attach `allowAction`.

`metadata.permissions` contract:

- Root:
  - `metadata.permissions.default` (optional): `allow` | `deny` | `true` | `false` | `string` | policy object
  - `metadata.permissions.verbs` (optional): map keyed by canonical verb id (for example `take`, `put`)
- Verb entry value may be:
  - `true` / `allow`: allow
  - `false` / `deny`: deny using default code
  - `string`: deny and use this player-facing veto message
  - policy object: `{ allow: boolean, code?: string, message?: string, details?: object }`
  - role map object: `{ direct?: <policy>, indirect?: <policy>, default?: <policy> }`
- Role policy may include relation map:
  - `{ relations: { in: <policy>, on: <policy> }, default?: <policy> }`
  - relation keys are canonical relation tokens

Policy precedence:

1. runtime `allowAction(action, context)` result when method exists and returns explicit allow/deny
2. `metadata.permissions.verbs[verbId]` role+relation match (`direct`/`indirect` + canonical relation)
3. `metadata.permissions.verbs[verbId]` role default / verb default
4. `metadata.permissions.default`
5. implicit allow (no objection)

Examples:

- Runtime hook wins:
  - `allowAction(...)` returns `"The ward rejects your touch."` and metadata says `allow` -> result is deny with that runtime message.
- Role+relation match:
  - `metadata.permissions.verbs.put.indirect.relations.in = "That container rejects items."` and input is `put apple into chest` -> resolver canonicalizes `into` to `in`, policy denies with that message.
- Role default then verb default:
  - `verbs.put.indirect = { relations: { on: false }, default: "You cannot put things there." }` and relation is `in` -> role default applies.
  - If role default is absent and `verbs.put.default = "Putting is disabled here."`, verb default applies.
- Metadata default:
  - No `verbs.put` entry, but `metadata.permissions.default = "Nothing may be moved here."` -> deny with that message.
- Implicit allow:
  - No `allowAction` method and no `metadata.permissions` entry -> action proceeds.

Policy return normalization:

- `true`/`allow` => allow
- `false`/`deny` => deny with default code (`FORBIDDEN_BLOCKED`)
- `string` => deny with default code and that message
- object with `allow:false` (or `ok:false`) => deny with object-provided `code/message/details`

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

Non-command render path:

- Session/room lifecycle transitions (for example login arrival after room bind) may render room view output without entering the command pipeline.
- Lifecycle render must not synthesize implicit player commands.
- Lifecycle render should reuse the same room-view builder used by intransitive `look`.

## Hook Kinds

Two hook kinds are used across phases:

- Policy hook (capture): allow/deny only.
- Reaction hook (bubble): append instructions/events only.

This split prevents veto/mutation ambiguity and keeps behavior predictable.

## Immediate Application To `put`

- `put.js` lives in Target.
- Span-to-entity binding happens in Entity Resolution before Capture.
- Container/object/player/room/quest/world policy checks run in Capture.
- Post-plan narrative and quest/world effects accumulate in Bubble.
- Mutator executes one merged plan in Commit.
