# Conversation Authoring Manual

## Status

- Status: draft-v0
- Scope: designer-facing conversation authoring for `bundle-rantamuta`
- Binding: no (guidance document)

## Purpose

This document will explain how to author NPC conversations for the current Rantamuta conversation runtime.

It is intended to become the designer-facing companion to the deeper planning and architecture documents under `docs/plans/Conversation*.md`.

## Audience

## Conceptualizing a conversation

A conversation in _Rantamuta_ can be understood as a sequence of changes in an NPC's state of mind.

The player says something to the NPC. The NPC responds. That response may change the NPC's attitude, what the NPC is willing to say next, and which conversational options remain available.

For example, an NPC might begin in an _idle_ or _neutral_ state. From there, the player might say:

- "Hello."
- "Where is the Old Mine?"
- "Are you Tomo?"
- "Screw you!"

Each of these choices may move the conversation in a different direction. If the player politely asks about the Old Mine, the NPC might become _helpful_ or _informative_. If the player insults the NPC, the NPC might become _offended_ or _hostile_. Once that happens, asking "Where is the Old Mine?" may no longer produce the same polite answer. The NPC remembers the current shape of the conversation.

One useful way to imagine this is to think of each conversational state as a room, and each possible player response as an exit from that room.

The conversation might begin in the _idle_ room. If the player chooses the "Screw you!" exit, the conversation moves to the _offended_ room. From the _offended_ room, there may still be a "Hello" exit, but it does not have to lead where the original "Hello" exit would have led. It might lead to a _baffled_ state, a _coldly polite_ state, or a _hostile_ state.

In this way, a conversation moves through a series of states by way of player choices.

This structure, where the conversation is made of defined states and transitions between those states, is called a **Finite State Machine**. Conversations in _Rantamuta_ are written using this model.

### States

### State Events

## Programming a conversation

## Where Conversation Authors Work

## Conversation Authoring Workflow

## Binding A Conversation To An NPC

## Conversation File Layout


## `default` And `auto`

## Conditions Via `q`

## `onEntry.actions`

## Transition Actions

## Authored Actions And Runtime Mutations

## Directed Speech: `say <event> to <npc>`

## Conversation State And Persistence

## Current Scope And Non-Goals

## Worked Example

## Authoring Checklist

## Troubleshooting

## Cross-References
