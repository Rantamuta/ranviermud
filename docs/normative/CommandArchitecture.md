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
- Canonicalize shorthand input using deterministic ordered rewrite rules before parse/token binding.
  - Rule order is authoritative (first-match wins).
  - Canonicalization is pure string-to-string transform with no side effects.
  - Current canonical shorthand examples:
    - `n` -> `go north`
    - `east` -> `go east`
    - `l` -> `look`
    - `x <thing>` -> `look at <thing>`
- Normalize and parse canonical input into command artifact/context.
- Parse artifact must preserve both:
  - `actorInput` (raw user text, unexpanded)
  - `canonicalInput` (post-canonicalization text)
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
- Hooks must not append mutation instructions, render events, or bubble contributions.
- First deny wins.
- If denied, command terminates with failure envelope and does not enter Target.
- Policy hook contract is `allowAction(action, context)`.
- `allowAction(action, context)` is synchronous.
- If `allowAction` is not implemented on an entity, that entity is treated as "no objection" (allow).
- Item/room/area/player/world YAML definitions remain data-only; they do not embed executable hook functions.
- Declarative policy fallback may be supplied through metadata (for example `metadata.permissions`), evaluated by shared capture helpers.
- Special-case runtime policy logic may be implemented in code behaviors/scripts that attach `allowAction`.

Determinism constraints for capture hooks:

- For identical input and identical world state, capture outcomes must be identical.
- Capture hooks may read only:
  - hook arguments (`action`, `context`)
  - entity/world state reachable from `context` at evaluation time
- Capture hooks must not read external nondeterministic sources (time, random, network, filesystem, process-global mutable state).
- Any randomness required in future must be supplied through deterministic context input (for example seeded source), not read ad hoc inside hooks.

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
- Exit entries may also include metadata policy for movement verbs:
  - `exits[].metadata.permissions.verbs.go: <policy>`
  - Example:
    - `direction: east`, `roomId: test:gate`, `metadata.permissions.verbs.go: "The portcullis is down."`

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

Policy return contract:

- Explicit allow values:
  - `true`
  - `'allow'`
  - `{ ok: true }`
  - `{ allow: true }`
- Explicit deny values:
  - `false`
  - `'deny'`
  - deny message string
  - `{ ok: false, ... }`
  - `{ allow: false, ... }`
- Any non-explicit/unknown value is treated as no decision (`no objection`) and evaluation continues by precedence.
- Promise/thenable returns are not supported and are treated as invalid/non-explicit values.

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
- Reaction hook contract is `bubbleEvent(action, context)`.
- `bubbleEvent(action, context)` is synchronous.
- If `bubbleEvent` is not implemented on an entity, that entity contributes nothing.
- Hooks may append reaction instructions/events.
- Hooks must not directly mutate world state or emit output.
- Bubble contributions are data-only and may be evaluated repeatedly without changing world state.
- Bubble hooks cannot deny an action that has already passed Capture/Target.
- Hooks must be deterministic for identical input/state.

Determinism constraints for bubble hooks:

- For identical input and identical world state, bubble outputs must be identical.
- Bubble hooks may read only provided context and current entity/world state.
- Bubble hooks must not read external nondeterministic sources (time, random, network, filesystem, process-global mutable state).
- Any randomness required in future must be supplied through deterministic context input (for example seeded source), not read ad hoc inside hooks.

### 5) Commit (transaction phase)

Rules:

- Merge base plan + bubble contributions into one plan.
- Merge semantics:
  - operation order is deterministic and append-only
  - base plan operations run first, then bubble operations in bubble phase order
  - no dedupe
  - no conflict resolution layer beyond operation order
  - validation/failure is handled by mutator apply
- Apply with compensating rollback:
  - mutator applies operations in order
  - if one operation fails, mutator runs recorded undo handlers in reverse order
  - if rollback itself fails, rollback error is logged as a system error with operation context
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
- Reaction hook (bubble): `bubbleEvent(action, context)` appends instructions/events only.

This split prevents veto/mutation ambiguity and keeps behavior predictable.

## Immediate Application To `put`

- `put.js` lives in Target.
- Span-to-entity binding happens in Entity Resolution before Capture.
- Container/object/player/room/quest/world policy checks run in Capture.
- Post-plan narrative and quest/world effects accumulate in Bubble.
- Mutator executes one merged plan in Commit.

## Immediate Application To `go`

- `go.js` lives in Target and declares direct-only form with direct scope `room.exits`.
- Direction text is resolved to a concrete exit entity in Entity Resolution.
- Exit/world policy checks run in Capture and can veto via metadata or runtime hooks.
- Target validates destination and door state, then returns a `movePlayer` plan.
- Mutator commits movement atomically in Commit.
- Destination room view renders in Render/Dispatch only after commit.
