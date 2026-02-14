# Verb Building Prompt

Implement a new bundle-layer verb: `<VERB_ID>`.

## Sources of truth (binding)

- `docs/normative/CommandArchitecture.md`
- `docs/normative/EntityResolution.md`

## Hard constraints

- Bundle-layer only (`bundles/bundle-rantamuta/**`)
- CommonJS style
- Do not modify engine internals (`node_modules/ranvier/**`)
- Keep changes small and reviewable
- Command lookup semantics are exact-key only (command name or explicit alias). Do not rely on prefix matching.

## Mandatory preflight (print before coding)

Print this table and fill every row with `KNOWN` or `UNKNOWN`:

| Field | Status | Value/Notes |
|---|---|---|
| verbId |  |  |
| aliases |  |  |
| supported rule keys |  |  |
| relation-bearing rules |  |  |
| acceptedRelations per relation rule |  |  |
| scopeProfile.direct |  |  |
| scopeProfile.indirect |  |  |
| nested traversal policy (if any) |  |  |
| planner failure codes |  |  |
| message mapping ownership (`metadata.errorMessages`) |  |  |
| mutation instruction types needed |  |  |
| mutator support exists for each instruction |  |  |
| expected success outcome |  |  |
| expected failure behavior |  |  |
| required tests list |  |  |

### Preflight gate

- If any required row is `UNKNOWN`, STOP and ask focused questions.
- Do not edit files until all required rows are `KNOWN`.

## STOP conditions (must halt and ask)

1. Missing/ambiguous `verbId` or aliases.
2. Missing rule keys, or zero rule keys.
3. Relation-bearing rule without explicit rule-level `acceptedRelations`.
4. Missing per-role scope policy.
5. Mutation semantics not explicit.
6. Failure codes or message-mapping ownership not explicit.
7. Unclear expected committed outcome for happy path.

## Implementation requirements

1. Command metadata must declare keyed `entityResolution.rules`.
2. Command must consume `context.entityResolution`; no ad hoc target matching inside command.
3. Command returns envelope only:
   - success: `{ ok: true, plan }`
   - failure: `{ ok: false, error: { code, details? } }`
4. Mutations occur only through mutator/commit path.
5. Resolver/capture remain read-only and side-effect free.
6. Player-facing failure text emitted by dispatch via code mapping (not resolver).

## Tests required

Add/update tests for:

- rule/form outcomes and errors
- intransitive offramp (if applicable)
- relation raw/canonical behavior (if relation-bearing)
- scope precedence and deterministic tie behavior
- ambiguity vs indistinguishable auto-pick (if applicable)
- resolver has no mutation/output side effects
- dispatch integration path for this verb (resolve -> target -> commit/render)

## Validation

Run and report:

- `cd bundles/bundle-rantamuta && npm test -- --runInBand`
- `npm test`
- `npm run ci:local` (if blocked, report exact blocker output)

## Deliverable report format

1. Files changed
2. Behavior implemented mapped to phases 0–6
3. Tests added/updated
4. Test results
5. Deferred items and reason

## Verb spec

- Verb id: `<VERB_ID>`
- Aliases: `[ ... ]`
- Supported rule keys: one or more of:
  - `intransitive`
  - `direct`
  - `indirect`
  - `directIndirect`
  - `relationOnly`
- Rule declarations must be keyed objects
- Relation-bearing rules must define rule-level `acceptedRelations`
- Scope profiles must be per role (`direct`, `indirect`) and deterministic

## Required architecture behavior

1. Receive Input: use existing parse artifact; do not add ad hoc parser logic in command.
2. Entity Resolution: rely on resolver output; do not re-resolve in command.
3. Capture: optional policy checks consume bound roles; no mutation.
4. Target: command is planner-only; return:
   - success envelope with mutation plan, or
   - failure envelope with structured error code/details
5. Bubble: optional reaction contributions, no veto.
6. Commit: mutation only through mutator.
7. Render/Dispatch: player-facing messages owned by dispatch/message mapping, not resolver.

## Command contract requirements

- Command must not mutate world state directly
- Command must not emit player output directly for resolver failures
- Use stable failure codes; map messages in command metadata (`errorMessages`)
- If new mutation behavior is needed, add/extend mutator instruction handlers atomically and safely

## Deliverables

- Command implementation file: `bundles/bundle-rantamuta/commands/<VERB_ID>.js`
- Any needed mutator updates: `lib/session/mutator.js`
- Resolver declaration usage in command metadata (`entityResolution.rules`)
- Tests:
  - rule/form matching outcomes
  - relation normalization behavior (if relation-bearing)
  - scope precedence behavior
  - ambiguity vs indistinguishable auto-pick behavior (as applicable)
  - no mutation/output side effects in resolver phase
  - command-dispatch integration for happy path + failure path

## Validation

Run and report:

- `cd bundles/bundle-rantamuta && npm test -- --runInBand`
- `npm test`
- `npm run ci:local` (if blocked by dirty-tree policy, report exact blocker)

## Output format

1. Files changed
2. Behavior implemented (mapped to phases 0–6)
3. Tests added/updated
4. Test results
5. Deferred items (if any) with reason
