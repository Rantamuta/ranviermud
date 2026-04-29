# Conversation Authoring Manual

This document explains how to author NPC conversations in Rantamuta. It is written primarily for designers.

## Directed Speech: `say <event> to <npc>`

Directed speech means speaking to a particular NPC, not just saying something aloud to the room. For example, `say hello to tomo` aims the speech at one listener. This is how the player progresses a conversation with an NPC.

When a player types `say <event> to <npc>`, the spoken text is treated as a conversation event. The game checks that NPC's current conversation state and asks, in effect, "Is this something the player can say right now?"

If the answer is yes, the conversation moves forward. The NPC might answer, hand over an item, change what he is willing to discuss, and immediately continue into the next beat of the exchange. The game then remembers that new point in the conversation for that player and NPC.

If the exact event is not available, the conversation may still use authored `events.default` as a fallback. If no conversation route matches at all, the command simply behaves like ordinary addressed speech: `You say "hello" to Tomo`.

In practice, players will not generally type `say <event> to <npc>`. Usually, they will type `talk to <npc>` and be presented with a menu which allows them to select directed speech commands from a numbered list. For instance, Tomo might offer:

```text
1. Hello.
2. Where is the Old Mine?
3. Are you Tomo?
4. Screw you!
```

Choosing one of those options sends the corresponding conversation event to Tomo, as though the player had directed that speech to the NPC themselves. Under the hood, a player types a number, e.g. `4`, and the command dispatcher hears `say insult to tomo`. Then the conversation engine proceeds from there. But if the player somehow knew that `insult` was the right keyword at that state, they could very well just type `say insult to tomo`. But with the menu rendering, that's not necessary.

As an author, the important idea is:

- the player says an event
- the current state decides whether that event is valid
- the conversation then performs the authored consequences of that choice

## Conceptualizing a conversation

A conversation in _Rantamuta_ is what's known as a Finite State Machine, which here can be understood as a sequence of changes in an NPC's state of mind.

The player says something to the NPC. The NPC responds. That response may change the NPC's attitude, what the NPC is willing to say next, and which conversational options remain available.

For example, an NPC might begin in an _idle_ or _neutral_ state. From there, the player might say:

- "Hello."
- "Where is the Old Mine?"
- "Are you Tomo?"
- "Screw you!"

Each of these choices may move the conversation in a different direction. If the player politely asks about the Old Mine, the NPC might become _helpful_ or _informative_ or _grumpy_ (because the player just blurted a question without saying hello first). If the player insults the NPC, the NPC might become _offended_ or _hostile_. Once that happens, asking "Where is the Old Mine?" may no longer produce the same polite answer. The NPC remembers the current shape of the conversation.

One useful way to imagine this is to think of each conversational state as a room, and each possible player response as an exit from that room.

The conversation might begin in the _idle_ room. If the player chooses the "Screw you!" exit, the conversation moves to the _offended_ room. When the conversation enters the _offended_ room, the NPC might say "How dare you!" From the _offended_ room, there may still be a "Hello" exit, but it does not have to lead where the original "Hello" exit would have led. It might lead to a _baffled_ state, a _coldly polite_ state, or a _hostile_ state.

In this way, a conversation moves through a series of states by way of player choices.

This structure, where the conversation is made of defined states and transitions between those states, is called a **Finite State Machine**. Conversations in _Rantamuta_ are written using this model.

So, overall, a conversation is a map where the rooms are _states_ and the exits are _actions_. This metaphor breaks down a bit, because the exits are _one way_. Let's drop this metaphor of a map and just go ahead and call this structure a _directed graph_.

### Conversation as a Finite State Machine (FSM)

#### States and Actions

#### States

##### State Events

##### `default` And `auto`

#### Actions

## Programming a conversation

### Where Conversation Authors Work

### Conversation Authoring Workflow

### Binding A Conversation To An NPC

### Conversation File Layout

## Conditions Via `q`

Conversation conditions use the shared read-only `q` query surface.

Use `q` when a conversation route should depend on game state, such as whether the player has completed a quest or is carrying an item. A condition should only ask a question; it should not perform an action.

Conversation conditions do not use area predicate keys or predicate-registry scripts. They use only the shared read-only `q` query surface.

Example:

```yaml
condition:
  actorQuestActive: "myarea:bellTrial"
```

This means, in plain language, "only allow this route if the player's `bellTrial` quest is active."

For the full `q` reference, see [`q` Query Methods (Designer Reference)](./DesignerManual.md#q-query-methods-designer-reference) in the Designer Manual.

## `onEntry.actions`

## Transition Actions

## Authored Actions And Runtime Mutations

## Conversation State And Persistence

## Current Scope And Non-Goals

## Worked Example

## Authoring Checklist

## Troubleshooting

## Cross-References
