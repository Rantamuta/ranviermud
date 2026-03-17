# `sayTo` Command Proposal (Draft)

## Status

- Status: archived
- Scope: targeted/private speech command surface, renderer contract, and Tomo integration
- Binding: no
- Related:
  - `docs/normative/CommandArchitecture.md`
  - `docs/normative/SemanticMessaging.md`
  - `docs/normative/NpcActionArchitecture.md`

## Purpose

Define a concrete, low-risk way to support actor-to-target private speech in the command pipeline so NPC guidance can remain private while room bystanders still receive a diegetic summary.

## Problem Statement

Current `say` is room-wide speech (`audiencePolicy: self_and_others`). When Tomo guidance is emitted via `say`, every bystander receives the full hint text.

Observed failure mode:

- Player A triggers a hint condition.
- Tomo says full hint content publicly.
- Player B hears the same full hint and receives progression leakage.

This conflicts with per-player guidance and puzzle privacy.

## Design Requirements

1. Preserve pipeline invariants
- No direct `Broadcast.*` from scripts.
- No mutation outside Commit.
- Render/Dispatch remains single output authority.

2. Preserve designer intent
- Keep normal `say` public.
- Add a private/targeted speech mode.

3. Keep ambiguity low for v1
- Do not overload existing unquoted `say ... to ...` interpretation.

4. Keep actor-general behavior
- Must work for both players and NPCs (`currentActor`).

## Proposed Product Behavior

### Public Speech (unchanged)

- Input: `say foo bar baz`
- Output: `Codex says, "foo bar baz".`
- Audience: room-wide (`self_and_others`)

### Targeted Private Speech (new)

- Input: `sayto Tomo "foo bar baz"`
- Actor sees: `You say quietly to Tomo, "foo bar baz".`
- Target sees: `Codex says quietly to you, "foo bar baz".`
- Others see: `Codex says something quietly to Tomo.`

### Explicit Non-Goal in v1

- `say "foo bar baz" to Tomo` is deferred for v2 parser work.
- `say foo bar baz to Tomo` stays plain public speech text.

## Why `sayto` Instead of Extending `say` in v1

- Existing `say` currently sanitizes raw args directly and does not parse quoted target relations.
- Adding `say ... to ...` now introduces ambiguity around the token `to`.
- A dedicated verb keeps behavior deterministic and avoids parser expansion in this phase.

## Command Contract (Detailed)

### Command ID

- `sayto`

### Suggested Aliases (optional)

- `whisper`
- `tell`

### Args Contract

- Required: target token + text payload.
- Recommended v1 shape: `sayto <target> "<text>"`
- Accept unquoted fallback: `sayto <target> <text...>` for builder ergonomics.

### Capture Error Codes

- `SAYTO_EMPTY`: no text after sanitization
- `SAYTO_TOO_LONG`: text over configured max (reuse `say` max 256 unless explicitly changed)
- `SAYTO_TARGET_REQUIRED`: missing target token
- `SAYTO_TARGET_NOT_FOUND`: unresolved target in actor room
- `SAYTO_TARGET_SELF` (policy optional): self-target denied if disallowed

### Error Messages (player-facing)

- `SAYTO_EMPTY`: `Say what?`
- `SAYTO_TOO_LONG`: `That is too much to say at once.`
- `SAYTO_TARGET_REQUIRED`: `Say to whom?`
- `SAYTO_TARGET_NOT_FOUND`: `They are not here.`
- `SAYTO_TARGET_SELF`: `Talking quietly to yourself changes nothing.` (if enabled)

### Planner Output

No authoritative world mutation required.

```js
{
  ok: true,
  plan: { operations: [{ type: 'noop' }] },
  render: { messages: [ /* semanticEvent instruction */ ] }
}
```

## Semantic Event Contract (Detailed)

Use one semantic instruction with actor + target participants and audience policy that includes all three partitions.

Recommended payload:

```js
{
  type: 'semanticEvent',
  template: '{actor.you} {verb:say} quietly to {target.you}, "{object.direct}"',
  audiencePolicy: 'self_target_and_others',
  participants: {
    actor: { selector: 'currentActor' },
    target: { selector: 'entityByContextRole', role: 'directTarget' }
  },
  objectText: {
    direct: text
  },
  templates: {
    actor: '{actor.you} {verb:say} quietly to {target.you}, "{object.direct}"',
    target: '{actor.you} {verb:say} quietly to {target.you}, "{object.direct}"',
    others: '{actor.name} {verb:say} something quietly to {target.name}.'
  }
}
```

Important:

- `others` template must not include `{object.direct}`.
- This guarantees bystander redaction while preserving awareness.

## Entity Resolution Strategy

### v1 Recommendation

Resolve `sayto` target through existing direct target resolution rules:

- `room.players`
- `room.npcs`

No pre-bound entities, no script-side manual participant injection.

Suggested metadata:

```js
metadata: {
  entityResolution: {
    rules: {
      direct: {
        scopeProfile: { direct: ['room.players', 'room.npcs'] }
      }
    }
  }
}
```

Then parse text payload from raw args in command logic. This keeps target binding in standard resolution while avoiding parser redesign.

## Implementation Plan (File-Level)

### 1. New command file

- Add `bundles/bundle-rantamuta/commands/sayto.js`
- Reuse `sanitizeSpeech` conventions from `commands/say.js`.
- Add `captureChecks` + `errorMessages`.
- Emit semantic event payload with target + redacted others template.

### 2. Command registration

- Ensure bundle command loading sees `sayto` (same path conventions as other commands).

### 3. Tests for command contract

- Add `bundles/bundle-rantamuta/tests/sayto.command.test.js`
- Cover:
  - empty text
  - too long
  - missing target
  - unresolved target
  - valid success envelope with semantic payload
  - others template excludes direct object content

### 4. Pipeline integration tests

- Extend `bundles/bundle-rantamuta/tests/command.dispatch.test.js` with:
  - player says to NPC -> actor + target full content, others redacted
  - NPC says to player -> same policy in actor-general context
  - commit-before-render invariant preserved

### 5. Semantic message assertions

- Add focused tests in `bundles/bundle-rantamuta/tests/semantic.message.test.js`:
  - actor template chosen for actor POV
  - target template chosen for target POV
  - others template chosen for third-party POV
  - no `{object.direct}` leakage in others POV

### 6. Tomo migration

- Update `bundles/bundle-rantamuta/areas/codex/scripts/npcs/tomoCaretaker.js`
- Replace guidance `say` intents with `sayto` intents targeting the entering player.
- Keep patrol flavor speech (if any) on public `say`.

### 7. Changelog + docs

- Update `CHANGELOG.md`.
- Add a short usage note to `docs/manuals/DesignerManual.md` once behavior stabilizes.

## Detailed Parsing Recommendation

For v1, keep parser changes out of scope. In `sayto` command:

1. Read raw `args`.
2. Extract first token as target token.
3. Remaining text is speech payload.
4. Strip matching surrounding quotes if present.
5. Sanitize whitespace/newlines exactly as `say` does.

This is intentionally conservative and reversible.

## Abuse / Safety Constraints

- Keep max speech length cap (same as `say` unless policy changes).
- Normalize CR/LF and collapse whitespace.
- Do not allow target outside room scope.
- Do not bypass command pipeline for NPC use.

## Determinism Constraints

For identical state + identical command input:

- same target binding result,
- same capture result,
- same render payloads.

No nondeterministic reads in capture/planner.

## Test Matrix (Expanded)

1. Actor/target/others partition correctness.
2. Bystander redaction correctness.
3. Self-target policy behavior (allow vs deny).
4. Missing target + missing text failure behavior.
5. Ambiguous target handling via existing resolution semantics.
6. NPC actor parity (same output policy with `currentActor`).
7. Tomo guidance privacy regression test:
- nearby bystander does not receive full hint text.

## Risks

1. Command proliferation (`say`, `sayto`, maybe later `whisper`)
2. Slightly higher authoring complexity
3. Potential mismatch between parser-era `say ... to ...` expectations and v1 `sayto`

## Mitigations

- Clear docs: public speech uses `say`, private guidance uses `sayto`.
- Keep `say ... to ...` as explicit deferred work.
- Add hard regression tests around leakage.

## Open Questions

1. Should `sayto` always emit an `others` line, or allow optional silent mode?
2. Should self-target be valid for RP, or denied for clarity?
3. Should `sayto` permit cross-room targets in future (likely no for v1)?
4. Should v2 fold `sayto` into `say "<text>" to <target>` after parser upgrade?

## Recommendation

Proceed with `sayto` as the v1 targeted speech mechanism. It is the smallest change that fixes Tomo privacy leakage while preserving existing command and semantic architecture.
