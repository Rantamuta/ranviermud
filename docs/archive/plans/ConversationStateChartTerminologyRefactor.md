# Conversation State Chart terminology refactor

## Status

- Status: archived
- Scope: terminology alignment for the conversation FSM and adjacent runtime

## Purpose

This document records the terminology test for the conversation system:

- if a term belongs to the conversation FSM surface, it must conform to
  statechart terminology
- if it does not conform, it should be renamed

This is primarily about the conversation-machine layer, not every internal
runtime implementation detail.

It exists to keep three vocabularies from collapsing into one another:

- statechart vocabulary
- authored-instruction vocabulary
- future gameplay/system effect vocabulary

## Terminology Test

Use this test for any term near the conversation runtime:

1. Is this term part of the conversation FSM surface?
2. If yes, is it a normal statechart term?
3. If not, it should be changed.

The intended statechart-facing vocabulary is:

- state
- event
- transition
- target
- guard
- entry
- exit
- action
- final

The intended authored-runtime vocabulary is:

- authored instruction

That means:

- a conversation transition may have actions
- those actions may be expressed as authored instructions

It should not mean:

- a conversation transition has effects
- or that the FSM layer and authored-instruction layer use the same word for
  different concepts

## Terminology Map

### Safe To Keep

These terms already fit the statechart test or belong clearly to another
non-conflicting layer.

- `state`
- `initial`
- `final`
- `event`
- `events.default`
- `transition`
- `target`
- `condition` only as a temporary alias while migrating toward `guard`
- `onEntry` only as a temporary alias while migrating toward `entry`
- `authored instruction`
- `authored instructions`

Notes:

- `condition` is understandable, but `guard` is the more statechart-conforming
  term
- `onEntry` is understandable, but `entry` is the more statechart-conforming
  term

### Should Rename Now

These terms fail the statechart test and create avoidable ambiguity with the
newer `authored instruction` vocabulary.

- `transitionEffects` -> `transitionActions`
- `stateEntryEffects` -> `stateEntryActions`
- `getStateEntryEffects(...)` -> `getStateEntryActions(...)`
- `selectedTransition.effects` -> `selectedTransition.actions`
- `onEntry.effects` -> `onEntry.actions`
- `effect key` -> `instruction key`
- `supported effect names` -> `supported instruction names`
- `effect-specific validation` -> `instruction-specific validation`
- `effect-specific lowering` -> `instruction-specific lowering`

Reason:

- `effect` is not the statechart term here
- `action` is the statechart-conforming term for behavior attached to
  transitions and state entry
- `instruction` is the clearer authored-runtime term for the lowered payloads

### Larger Future Sweep

These terms are not urgent blockers for the current refactor, but they likely
deserve later alignment if the project wants stricter statechart vocabulary.

- `condition` -> `guard`
- `onEntry` -> `entry`
- `onExit` -> `exit` if it is introduced later
- `to` -> `target` everywhere, if the project wants one canonical transition
  destination term

Reason:

- these are broader authoring-surface terms with more compatibility and DSL
  consequences
- they should be changed intentionally rather than casually

## Recommended Vocabulary Split

To keep the system understandable, this draft recommends the following split:

### FSM Layer

Use statechart language:

- state
- event
- transition
- target
- guard
- entry
- action

### Authored Lowering Layer

Use authored-runtime language:

- authored instruction
- instruction validation
- instruction transposition
- instruction lowering

### Future Gameplay/System Layer

Reserve `effect` for a future subsystem only if that subsystem has its own
distinct meaning and does not sit in the statechart control vocabulary.

## Practical Rule Of Thumb

When reading or writing conversation code:

- if it describes FSM structure or FSM execution, prefer statechart terms
- if it describes authored payload data that gets lowered into runtime
  operations and render instructions, use `instruction`
- avoid `effect` unless the concept is intentionally outside the conversation
  FSM vocabulary

## Immediate Renaming Targets

The highest-value near-term targets are:

- `transitionEffects`
- `stateEntryEffects`
- `onEntry.effects`
- validator and transposer wording that still says `effect key` or
  `effect-specific`

These are the places most likely to create confusion because they sit directly
between the FSM surface and the authored-instruction surface.

## Current Rename Sites

The following current non-archive files still use FSM-side `effect` terminology
that should be changed under the statechart-conformance test.

### Conversation Runtime

- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L113)
  - `transitionEffects` -> `transitionActions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L114)
  - `stateEntryEffects` -> `stateEntryActions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L132)
  - `transitionEffects` -> `transitionActions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L133)
  - `stateEntryEffects` -> `stateEntryActions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L162)
  - `cloneEffects(...)` -> `cloneActions(...)`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L225)
  - `getStateEntryEffects(...)` -> `getStateEntryActions(...)`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L227)
  - `onEntry.effects` -> `onEntry.actions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L617)
  - `transition.effects` -> `transition.actions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L638)
  - `eventDef.effects` -> `eventDef.actions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L685)
  - `defaultEvent.effects` -> `defaultEvent.actions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L695)
  - `stateEntryEffects` in return contract -> `stateEntryActions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L701)
  - local accumulator `stateEntryEffects` -> `stateEntryActions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L730)
  - `getStateEntryEffects(...)` -> `getStateEntryActions(...)`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L740)
  - returned `stateEntryEffects` -> `stateEntryActions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L757)
  - returned `stateEntryEffects` -> `stateEntryActions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L890)
  - returned `transitionEffects` -> `transitionActions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L891)
  - returned `stateEntryEffects` -> `stateEntryActions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L953)
  - returned `transitionEffects` -> `transitionActions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L954)
  - returned `stateEntryEffects` -> `stateEntryActions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L986)
  - `selectedTransition.effects` -> `selectedTransition.actions`
- [`conversation-runtime.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-runtime.js#L987)
  - `settled.stateEntryEffects` -> `settled.stateEntryActions`

### Directed Speech Integration

- [`directed-speech.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/directed-speech.js#L232)
  - `evaluation.transitionEffects` -> `evaluation.transitionActions`
- [`directed-speech.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/directed-speech.js#L233)
  - `evaluation.stateEntryEffects` -> `evaluation.stateEntryActions`

### Conversation Definition Validation

- [`conversation-definition-validation.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-definition-validation.js#L176)
  - `onEntry.effects` -> `onEntry.actions`
- [`conversation-definition-validation.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-definition-validation.js#L177)
  - `onEntry.effects` -> `onEntry.actions`
- [`conversation-definition-validation.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-definition-validation.js#L246)
  - `eventDef.effects` -> `eventDef.actions`
- [`conversation-definition-validation.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-definition-validation.js#L247)
  - `eventDef.effects` -> `eventDef.actions`
- [`conversation-definition-validation.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-definition-validation.js#L284)
  - `eventDef.effects` -> `eventDef.actions`
- [`conversation-definition-validation.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-definition-validation.js#L285)
  - `eventDef.effects` -> `eventDef.actions`
- [`conversation-definition-validation.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-definition-validation.js#L300)
  - `transition.effects` -> `transition.actions`
- [`conversation-definition-validation.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/conversation/conversation-definition-validation.js#L301)
  - `transition.effects` -> `transition.actions`

### Authored-Instructions Validator Wording

- [`validator.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js#L637)
  - `effectNames` -> `instructionNames`
- [`validator.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js#L642)
  - `effect key` -> `instruction key`
- [`validator.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js#L648)
  - `effectName` -> `instructionName`
- [`validator.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/lib/runtime/authored-instructions/validator.js#L656)
  - diagnostic metadata key `effectName` -> `instructionName`

### Current Non-Archive Docs

- [`ConversationDSL.md`](/home/rendall/mud/ranviermud/docs/plans/ConversationDSL.md#L317)
  - `onEntry.effects` -> `onEntry.actions`
- [`ConversationDSL.md`](/home/rendall/mud/ranviermud/docs/plans/ConversationDSL.md#L784)
  - `onEntry.effects` -> `onEntry.actions`
- [`ConversationDSL.md`](/home/rendall/mud/ranviermud/docs/plans/ConversationDSL.md#L1045)
  - `onEntry.effects` -> `onEntry.actions`
- [`ConversationRuntimeReadiness.md`](/home/rendall/mud/ranviermud/docs/plans/ConversationRuntimeReadiness.md#L301)
  - `authored conditions and effects` -> `authored guards and instructions`
- [`ConversationRuntimeReadiness.md`](/home/rendall/mud/ranviermud/docs/plans/ConversationRuntimeReadiness.md#L307)
  - `onEntry.effects` -> `onEntry.actions`

### Current Non-Archive Tests

- [`conversation.runtime.test.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js#L229)
  - `transitionEffects` -> `transitionActions`
- [`conversation.runtime.test.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js#L230)
  - `stateEntryEffects` -> `stateEntryActions`
- [`conversation.runtime.test.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js#L806)
  - `result.transitionEffects` -> `result.transitionActions`
- [`conversation.runtime.test.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js#L807)
  - `result.stateEntryEffects` -> `result.stateEntryActions`
- [`conversation.runtime.test.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js#L810)
  - test name `does not execute returned onEntry effects` -> `does not execute returned entry actions`
- [`conversation.runtime.test.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js#L896)
  - `result.transitionEffects` -> `result.transitionActions`
- [`conversation.runtime.test.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js#L897)
  - `result.stateEntryEffects` -> `result.stateEntryActions`
- [`conversation.runtime.test.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js#L900)
  - test name `evaluates auto routes only after collecting onEntry effects` -> `evaluates auto routes only after collecting entry actions`
- [`conversation.runtime.test.js`](/home/rendall/mud/ranviermud/bundles/bundle-rantamuta/tests/conversation.runtime.test.js#L1240)
  - `result.stateEntryEffects` -> `result.stateEntryActions`

## Notes

- This list intentionally excludes archive-only files.
- It also excludes unrelated engine/gameplay uses of `effects`, such as
  `Character.effects`, because those are not part of the conversation FSM
  vocabulary.
