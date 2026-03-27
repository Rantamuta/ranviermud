# Conversation Directed Speech Design

Status: draft

## Purpose

This document records the current design decisions for directed conversation speech.

It is written in plain language on purpose.
It is meant to make the intended shape clear before implementation.

This document does not authorize implementation by itself.

## Scope

This design is only about one narrow slice:

- a player can use `say <event> to <npc>`
- the runtime may treat that as a conversation event
- if it is not a conversation event, ordinary `say` behavior continues

This design is not about:

- `talk`
- menu rendering
- numeric menu selection
- broad conversation lifecycle work
- broad command refactors across the bundle

## Core Goal

Directed speech should hook into the addressed NPC's conversation in the smallest possible way.

The `say` command should stay simple.
It should not absorb conversation runtime details.
It should only decide whether to delegate to conversation handling or continue with ordinary speech.

## Main Behavior

When a player uses:

```text
say foo to bar
```

the runtime should:

1. resolve `bar` normally through the existing `say` command syntax
2. treat `foo` as the possible conversation event id
3. pass the player state, spoken text, and addressed NPC into conversation handling
4. if conversation handling returns a conversation result, use it
5. if conversation handling returns no intercept, fall through to ordinary addressed speech
6. if conversation handling returns failure, log an error and fall through to ordinary addressed speech

In plain terms:

- matching conversation route: intercept
- no conversation route: ordinary `say`
- conversation runtime failure: log it, then ordinary `say`
- broken conversation binding: explicit failure

## Ownership Model

Conversation ownership is split in two places:

- the conversation definition is attached to the addressed NPC
- the player's progress through that conversation is attached to the player

This means directed speech does not ask "does the player have a conversation?"

It asks:

- does the addressed NPC have a bound conversation definition?
- what is this player's current state inside that NPC's conversation?

## Hook Point

The conversation hook belongs inside the `say` command.

It should not live in:

- `input-events/main.js`
- the global command dispatcher
- capture hooks

The reason is simple:

- input parsing and entity resolution already happen before `say` runs
- `say` already receives the matched syntax, the spoken text, and the resolved addressed NPC
- `say` can return either a normal speech result or a conversation result without changing the shared dispatcher

This keeps the change narrow and reversible.

## Shape Inside `say`

Inside `say`, branching should be based on the matched authored syntax rule text.

The intended shape is:

```js
switch (matchedRuleText) {
  case 'TEXT to LIVING':
    // try directed conversation first
    // if no intercept, ordinary addressed speech
    break;

  case 'TEXT':
    // ordinary speech
    break;

  case '(empty)':
    // empty-input handling
    break;

  default:
    // maintainer/runtime invariant failure
}
```

The important point is not the exact formatting.
The important point is that `say` branches on authored syntax identity, not on legacy derived rule names.

## No Legacy Rule Branching In `say`

For this slice, `say` must not use legacy `ruleKey` branching such as:

- `direct`
- `indirect`
- `directIndirect`
- `intransitive`

If `say` is invoked without a valid `matchedRuleText`, that should be treated as a maintainer/runtime error.

It should not silently fall back to legacy rule handling.

The goal is to stop new `say` work from reinforcing the old branch model.

## Minimal Helper Surface

The `say` command should not contain conversation runtime plumbing.

It should make one small helper call and then decide between:

- intercepted conversation result
- no intercept, so ordinary `say`
- explicit failure

The intended shape is roughly:

```js
const conversationResult = tryDirectedConversation(state, player, text, npc);
return conversationResult ?? ordinaryAddressedSay(text, npc);
```

The exact variable names are not important.
The small surface area is important.

The helper should own the internal work:

- resolve the NPC conversation binding
- load the definition
- evaluate the current player/NPC conversation state using the spoken text as the event id
- build a command-style success result if interception succeeds
- return no-intercept if there is no usable route
- return failure if the NPC conversation binding is broken

## Fall-Through Rule

If the addressed NPC has no conversation, or if the current state has no matching route for the spoken event, directed speech should fall through to ordinary addressed speech.

That means:

```text
say foo to bar
```

should still produce ordinary speech output when there is no conversation interception.

The ordinary addressed speech render should make it clear that the player said something to the target, in a form similar to:

```text
{actor} says, "foo" to Bar.
```

The exact final render wording may differ, but the fallback behavior must remain ordinary speech, not failure.

## Broken Binding Rule

Broken conversation bindings and other conversation runtime failures should be logged for maintainers and then fall through to ordinary speech.

The player should still see ordinary addressed speech behavior.

This keeps runtime/content mismatches visible in logs without exposing them directly to the player during directed speech.

## Command Phase Fit

This design keeps the existing command phases intact.

The flow remains:

1. receive input
2. parse and resolve entities
3. run capture checks
4. let `say` decide whether to return:
   - ordinary speech result, or
   - conversation interception result
5. commit returned mutations
6. render returned messages

No special conversation branch is needed in the shared dispatcher for this slice.

## Governance Direction

This slice should establish a clear direction for new code:

- new or modified `say` logic should branch on matched authored syntax
- new work in this area should not introduce fresh dependence on legacy `ruleKey` command branching

If the project wants this rule to become fully binding across command code, that should be captured later in normative documentation.

## Summary

The design decisions for this slice are:

- hook directed conversation interception inside `say`
- keep the shared dispatcher unchanged
- branch inside `say` on `matchedRuleText`
- do not use legacy `ruleKey` branching in `say`
- keep the conversation helper surface very small
- intercept only when the addressed NPC has a usable conversation route
- fall through to ordinary addressed speech when no route exists
- log conversation failures and fall through to ordinary addressed speech
