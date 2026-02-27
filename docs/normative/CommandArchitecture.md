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

Messaging contract boundary:

- This command contract applies to diegetic command execution inside this phase pipeline.
- System commands/lifecycle output paths are outside this command messaging contract.

## Phase Model

Execution phases are:

0. Receive Input
1. Entity Resolution
2. Capture
3. Plan
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
    - `x <thing>` -> `look <thing>`
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
- If denied, command terminates with failure envelope and does not enter Plan.
- Capture runs in two steps:
  - actor-kind gate from command metadata (`metadata.actorKindsAllowed`)
  - command-level `captureChecks` functions (if declared)
  - shared policy evaluation on ordered capture subjects
- `metadata.actorKindsAllowed` contract:
  - optional string array, default `['player', 'npc']`
  - evaluated before command-level capture checks and entity-level policy hooks
  - if actor kind is disallowed, capture returns deny code `ACTOR_KIND_FORBIDDEN` and Plan is not executed
- Runtime policy hooks are role-routed:
  - direct role: `canDirect(actor, verbId, context)`
  - indirect role: `canIndirect(actor, verbId, relationTokenCanonical, context)`
- `canDirect`/`canIndirect` are synchronous.
- `canDirect`/`canIndirect` are evaluated only on bound direct/indirect entities.
- Item/room/area/player/world YAML definitions remain data-only; they do not embed executable hook functions.
- Declarative policy fallback may be supplied through metadata (for example `metadata.permissions`), evaluated by shared capture helpers.
- Special-case runtime policy logic may be implemented in code behaviors/scripts that attach `canDirect` / `canIndirect`.

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

1. runtime `canDirect(...)` / `canIndirect(...)` explicit decision when applicable
2. `metadata.permissions.verbs[verbId]` role+relation match (`direct`/`indirect` + canonical relation)
3. `metadata.permissions.verbs[verbId]` role default / verb default
4. `metadata.permissions.default`
5. implicit allow (no objection)

Examples:

- Runtime hook wins:
  - `canIndirect(...)` returns `"The ward rejects your touch."` and metadata says `allow` -> result is deny with that runtime message.
- Role+relation match:
  - `metadata.permissions.verbs.put.indirect.relations.in = "That container rejects items."` and input is `put apple into chest` -> resolver canonicalizes `into` to `in`, policy denies with that message.
- Role default then verb default:
  - `verbs.put.indirect = { relations: { on: false }, default: "You cannot put things there." }` and relation is `in` -> role default applies.
  - If role default is absent and `verbs.put.default = "Putting is disabled here."`, verb default applies.
- Metadata default:
  - No `verbs.put` entry, but `metadata.permissions.default = "Nothing may be moved here."` -> deny with that message.
- Implicit allow:
  - No `canDirect`/`canIndirect` hook and no `metadata.permissions` entry -> action proceeds.

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

### 3) Plan (verb phase)

Implementation note:

- Runtime function/variable names still include legacy `target*` identifiers.
- Behavior contract is Plan-phase semantics; identifier renames are deferred.

This is the command script (example: `put.js`).

Rules:

- Receives resolved parse/context.
- Performs deterministic command-level validation.
- Returns either:
  - failure envelope, or
  - base mutation plan.
- Render payload shape is `render.messages`.
- Must not mutate world state directly.

Optional entity plan-contribution surface:

After a successful command result envelope, runtime optionally consults bound
entities for Plan-phase contributions:

- direct target hook: `planDirect(actor, verbId, context)`
- indirect target hook: `planIndirect(actor, verbId, relationTokenCanonical, context)`

Evaluation order is fixed:

1. direct contribution
2. indirect contribution

Contribution return handling:

- `null`/`undefined` => no contribution
- failure envelope (`{ ok:false, error }`) => fail command before Commit
- success envelope (`{ ok:true, plan?, render? }`) => merge accepted fields
- plain contribution object (`{ plan?, render? }`) => merge accepted fields

Accepted merge fields:

- `plan.operations` (array) => appended to the commit plan
- `render.messages` (array) => appended to the render message queue
- `renderPolicy.replaceSuccess === true` => requests suppression of base command success `render.messages` during Render/Dispatch, subject to Render/Dispatch safety fallback rules

Invalid contribution shapes are logged and ignored (best-effort), except
explicit contribution failures (`ok:false`) which terminate command success.

Plan contribution hooks are data-only:

- must not veto Capture decisions (veto ownership remains Capture)
- must not mutate world state directly
- must not emit audience output directly

Layering rule:

- Runtime infrastructure (`lib/**`, `commands/**`) must not hardcode
  area/item/room IDs for plan contributions.
- Content-specific contribution behavior belongs in `areas/**` scripts/metadata.

### 4) Bubble (reaction phase)

Bubble is command-scoped reaction contribution.

Rules:

- No veto in bubble.
- Bubble functions are provided through command metadata `reactions`:
  - array of functions, or
  - factory function `(context) => function[]`
- Each reaction function is synchronous and receives phase `context`.
- Bubble contributions are data-only and may include `render.messages`.
- Bubble contributions must not include mutation operations.
- Bubble contributions must not include render-assembly policy keys (for example `renderPolicy.replaceSuccess`).
- If forbidden bubble keys are returned (for example `operations`), dispatcher logs a contract error, ignores forbidden content, and continues.
- Hooks must not directly mutate world state or emit output.
- Bubble contributions may be evaluated repeatedly without changing world state.
- Bubble hooks cannot deny an action that has already passed Capture/Plan.
- Hooks must be deterministic for identical input/state.

Determinism constraints for bubble hooks:

- For identical input and identical world state, bubble outputs must be identical.
- Bubble hooks may read only provided context and current entity/world state.
- Bubble hooks must not read external nondeterministic sources (time, random, network, filesystem, process-global mutable state).
- Any randomness required in future must be supplied through deterministic context input (for example seeded source), not read ad hoc inside hooks.

### 5) Commit (transaction phase)

Rules:

- Commit applies merged operations from:
  - command base plan (`result.plan.operations`)
  - plan contribution operations (`planDirect` / `planIndirect`)
- Bubble does not contribute mutation operations (attempts are ignored).
- Apply with compensating rollback:
  - mutator applies operations in order
  - if one operation fails, mutator runs recorded undo handlers in reverse order
  - if rollback itself fails, rollback error is logged as a system error with operation context
- Rollback failures are system errors and must be logged with context.

### 6) Render/Dispatch (output phase)

Rules:

- Output derives from committed render messages and render instructions.
- Delivery order is deterministic.
- No success narration before successful commit.
- Render/Dispatch executes only after successful commit.
- Render assembly is deterministic and evaluated in two steps:
  1. Determine base success inclusion:
     - If any Plan contribution declares `renderPolicy.replaceSuccess === true` and Plan contributions produce one or more valid `render.messages`, command success `render.messages` must be suppressed.
     - If replacement is requested but Plan contributions produce no valid `render.messages`, runtime must log warning code `RENDER_POLICY_REPLACE_EMPTY` and must fall back to including command success `render.messages`.
  2. Merge render queues in fixed order:
     - command success `render.messages` (only when not suppressed by step 1)
     - Plan contribution `render.messages`
     - Bubble contribution `render.messages`
- `render.messages` supports:
  - line strings (sent to actor)
  - `{ type: 'line', text|message }`
  - instruction objects
- Delivery instruction types in runtime v1:
  - `semanticEvent`
  - `broadcast`
- Render dispatch failures are best-effort:
  - instruction failure is logged and counted
  - remaining instructions continue
  - command outcome remains success when commit already succeeded
- Base-success suppression authority is Plan-only (`planDirect` / `planIndirect`); Bubble cannot suppress command success render.

Non-command render path:

- Session/room lifecycle transitions (for example login arrival after room bind) may render room view output without entering the command pipeline.
- Lifecycle render must not synthesize implicit player commands.
- Lifecycle render should reuse the same room-view builder used by intransitive `look`.

## Hook Kinds

Three hook kinds are used across phases:

- Policy hook (capture): allow/deny only.
- Plan contribution hook (Plan): data-only contribution, no veto, no direct mutation/output (`planDirect`, `planIndirect`); may contribute render-assembly policy (`renderPolicy.replaceSuccess`).
- Reaction hook (bubble): data-only render contribution, no veto, no direct mutation/output (command metadata `reactions` functions).

Accepted-next naming (not wired in current runtime):

- `reactDirect(actor, verbId, context)`
- `reactIndirect(actor, verbId, relationTokenCanonical, context)`

This split prevents veto/mutation ambiguity and keeps behavior predictable.

## Immediate Application To `put`

- `put.js` lives in Plan.
- Span-to-entity binding happens in Entity Resolution before Capture.
- Container/object/player/room/quest/world policy checks run in Capture.
- Post-plan narrative and quest/world effects accumulate in Bubble.
- Mutator executes one merged plan in Commit.

## Immediate Application To `go`

- `go.js` lives in Plan and declares direct-only form with direct scope `room.exits`.
- Direction text is resolved to a concrete exit entity in Entity Resolution.
- `go.js` performs command-level validation and destination binding, then returns an empty base success envelope (`plan.operations: []`, `render.messages: []`).
- Exit/world policy checks run in Capture and can veto via metadata or runtime hooks.
- Exit candidate hook composition owns go-door ergonomics:
  - fallback `canDirect` denies locked movement with `GO_EXIT_LOCKED` when no matching key is carried
  - fallback `planDirect` contributes movement/door plan operations:
    - no door or already-open door: enqueue `movePlayer`
    - closed+unlocked door: enqueue `changeDoor/open` then `movePlayer`
    - locked+matching key: enqueue `changeDoor/unlockAndOpen` then `movePlayer`
  - when fallback composes door+movement success flavor, movement uses `suppressRoomBroadcast` to prevent duplicate generic leave/arrive lines
- Authored exit hooks may extend or replace fallback render behavior through normal Plan contribution merge, including `renderPolicy.replaceSuccess` semantics defined above.
- Mutator commits merged door/movement operations atomically in Commit with rollback support.
- Destination room view renders in Render/Dispatch only after commit.

## Immediate Application To Door Commands

- `open`, `close`, `lock`, and `unlock` live in Plan and resolve direct door targets before mutation.
- Command-to-mutation mapping is:
  - `open` -> `changeDoor/open`
  - `close` -> `changeDoor/close`
  - `lock` -> `changeDoor/closeAndLock`
  - `unlock` -> `changeDoor/unlock`
- Key validation remains Plan/Capture ownership; mutator owns only state transition.
- Opposite-room door lines are emitted via explicit render instructions, not implicit actor-room `others` semantics.
