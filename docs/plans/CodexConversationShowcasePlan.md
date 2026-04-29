# Codex Conversation Showcase Plan

## Status

- Status: planning
- Scope: `bundle-rantamuta` codex-area authored content and validation
- Binding: no

## Goal

Add one authored conversation to the `codex` area that demonstrates the conversation runtime features currently available through authored conversation files.

The example should be useful both as playable content and as a reference for future designers reading the codex area.

## Intent

Create an NPC conversation mini-game that shows how a conversation can remember state, react to player choices, read game state through `q`, perform authored outcomes, and fall back gracefully when the player says something the conversation does not recognize.

The conversation should feel like a cohesive mini-game in its own right. It may teach conversation mechanics, but tutorial value must not come at the expense of theme, mood, or creative coherence.

## In Scope

- Add a new codex-area conversation file under `bundles/bundle-rantamuta/areas/codex/conversations/`.
- Bind one codex NPC to that conversation through `metadata.conversation`.
- Add or place any content assets needed for the example, such as demo items, room details, or a dedicated room.
- Exercise exact event routing from directed speech.
- Exercise `events.default` fallback routing.
- Exercise `auto` routing.
- Exercise at least one `final: true` state.
- Exercise `onEntry.actions`.
- Exercise transition-local `actions`.
- Exercise conversation conditions through the shared read-only `q` facade.
- Exercise authored render instructions:
  - `broadcast`
  - `semanticEvent`
- Exercise authored mutation instructions where they can be made coherent in the codex area:
  - `transferItem`
  - `movePlayer`
  - `operateDoor`
  - `openDoor`
  - `closeAndLockDoor`
  - `setPlayerMetadata`
  - `setRoomMetadata`
  - `setAreaMetadata`
  - `setWorldMetadata`
  - `deleteRoomMetadata`
  - `deleteAreaMetadata`
  - `deleteWorldMetadata`
- Add focused validation so the example remains loadable and the important authored routes keep working.
- Update `CHANGELOG.md` for the player-visible content addition.

## Out of Scope

- Implementing `talk`.
- Implementing conversation menus or numeric selection.
- Implementing engagement records.
- Changing conversation runtime semantics.
- Changing authored-instruction vocabulary.
- Changing `q` query semantics.
- Reworking Tomo's existing scripted bell-puzzle behavior.
- Adding arbitrary JavaScript conversation hooks.
- Moving codex puzzle logic from scripts into the conversation example.

## Acceptance Criteria

1. The codex area contains a conversation file that validates through the existing conversation-definition loader.
2. One codex NPC binds to that conversation through `metadata.conversation`.
3. The conversation can be advanced through directed speech events such as `say <event> to <npc>`.
4. At least one route uses an exact event match.
5. At least one route uses `events.default` when the spoken event is not otherwise available.
6. At least one state uses `onEntry.actions`.
7. At least one transition uses transition-local `actions`.
8. At least one state uses `auto` routing.
9. At least one state is `final: true`.
10. At least one route condition uses the shared `q` condition surface.
11. The conversation demonstrates both render instruction forms: `broadcast` and `semanticEvent`.
12. The conversation demonstrates the currently supported authored mutation instruction families listed in scope, except where a specific instruction is shown to be incoherent for this content and is explicitly deferred in the checklist.
13. The authored effects are meaningful in the codex area and do not corrupt existing puzzle flow.
14. If a player says an unrecognized event to the NPC, the result is understandable and does not produce a maintainer-facing error.
15. The example remains deterministic: no route depends on wall-clock time, randomness, menu numbering, or script-only ambient state.
16. Validation evidence includes targeted tests or scenario coverage that proves the conversation loads and at least the major branches execute.
17. Repository validation follows the behavior-change requirements in `AGENTS.md`.

## Constraints

- Preserve the runtime/content boundary:
  - `bundles/bundle-rantamuta/lib/**` and `commands/**` must not learn codex-specific IDs.
  - codex content may reference codex rooms, items, NPCs, and puzzle state.
- Prefer adding a new showcase NPC over changing Tomo's existing scripted behavior.
- Let the example be as large as the creative concept requires, while keeping each state and route readable.
- Do not use area predicate keys or predicate-registry scripts for conversation conditions.
- Use only the shared query-object condition form supported by the conversation condition evaluator.
- Use canonical authored instruction names and payload fields.
- Do not add new dependencies.

## Implementation Surfaces

- `bundles/bundle-rantamuta/areas/codex/conversations/<new>.conversation.yml`
  - New authored conversation definition.
- `bundles/bundle-rantamuta/areas/codex/npcs.yml`
  - New or updated NPC with `metadata.conversation`.
- `bundles/bundle-rantamuta/areas/codex/rooms.yml`
  - NPC placement, room metadata, and any dedicated room needed by the example.
- `bundles/bundle-rantamuta/areas/codex/items.yml`
  - Optional demo item used by `transferItem`.
- `bundles/bundle-rantamuta/tests/**`
  - Focused coverage for conversation loading and selected directed-speech routes.
- `CHANGELOG.md`
  - Player-visible content record for the new showcase.

## Validation Strategy

This plan changes player-visible authored content, so behavior-changing validation applies.

Required evidence:

- Unit or fixture validation:
  - Pass if the new conversation definition loads and validates through the existing conversation-definition service.
  - Fail if the conversation binding is broken, the YAML shape is invalid, or authored actions fail validation.
- Integration or scenario coverage:
  - Pass if directed speech can advance at least one exact-event route, one default route, one conditioned route, and one auto-routed state.
  - Fail if a route logs maintainer-facing conversation errors or falls through when the authored route should match.
- Regression coverage:
  - Pass if existing codex puzzle behavior remains available and the new conversation does not move or mutate existing puzzle-critical objects unexpectedly.
  - Fail if the example prevents normal codex navigation or breaks existing command tests.
- Repository validation:
  - Run `npm test` in the affected bundle context.
  - Run wrapper-level `npm test`.
  - Run `npm run ci:local` from the wrapper repo when the submodule commit is fetchable.

## Risks and Mitigations

- Risk: the showcase becomes too mechanical because it tries to demonstrate every authored instruction.
  - Mitigation: treat the conversation as a creative codex mini-game first; exclude any authored instruction that cannot be made coherent inside the example.
- Risk: the example changes existing codex puzzle progression.
  - Mitigation: prefer new demo state and new in-theme content over reusing bell-puzzle-critical objects.
- Risk: movement or door operations strand players.
  - Mitigation: use known reversible codex routes and doors, or keep movement to nearby public rooms.
- Risk: world or area metadata writes pollute later play.
  - Mitigation: use clearly namespaced demo keys and include delete routes that clean them up.
- Risk: the conversation becomes a substitute for future menu work.
  - Mitigation: keep this plan scoped to authored conversation content and directed speech behavior.

## Open Questions / Assumptions

- Decision: use a new NPC rather than Tomo, so existing bell-puzzle script behavior remains stable.
- Decision: add demo items or other content as needed, and make them creative and in-theme with the NPC rather than generic test props.
- Decision: prioritize cohesion and creativity over tutorial completeness. The conversation may teach by example, but it should first feel like authored codex content.
- Decision: exclude any authored instruction that is incoherent for the example, and record the exclusion explicitly during checklist/implementation work.
- Decision: anchor the showcase from an existing codex room and add a dedicated room cluster for the conversation mini-game.
- Decision: use Codex Square as the public approach and add a dedicated conversation space reached from there, so the feature feels discoverable without crowding existing puzzle rooms.
- Decision: treat the NPC as both an archivist and an errata clerk: a custodian of unfinished, misfiled, and regretted speech.
- Decision: give the NPC a dramatic role beyond tutorial guide. They should judge how the player handles incomplete speech and let the conversation become a trial of attention, humility, and restraint.
- Assumption: the dedicated room cluster may contain supporting spaces such as an entry nook, an index door, and a memory alcove if implementation needs movement and door operations to feel natural.

## Compatibility and Records

This is player-visible authored content, not a runtime compatibility change.

- No normative contract update is expected unless implementation discovers that the authored conversation behavior differs from existing normative docs.
- `CHANGELOG.md` should be updated because the example is player-visible bundle content.
- Existing public runtime surfaces, CLI behavior, boot behavior, and command syntax must remain unchanged.

## Conformance QC

### Intent clarity issues

- None known. The plan states that the goal is a playable/reference conversation mini-game, not runtime expansion.

### Missing required sections

- None. `Goal`, `Intent`, `In Scope`, `Out of Scope`, and `Acceptance Criteria` are present.

### Ambiguities/assumptions to resolve

- None known. The room placement and NPC creative direction have been selected.

### Validation strategy gaps

- Exact test files and scenario commands are deferred to checklist authoring.
- Validation depends on submodule publication before wrapper `ci:local` can fully reproduce the bundle state.

### Traceability readiness

- Ready for checklist authoring. The plan maps the desired behavior to concrete codex content files, conversation definition files, and validation surfaces without requiring runtime design invention.

### Pass/Fail: ready for checklist authoring

- Pass.

## Creative Outline

Working title: **The Archivist of Unsaid Things**

The new NPC is **Senn, the Errata Clerk**, an archivist who keeps a catalog of conversations that never happened: apologies swallowed too late, insults regretted immediately, questions no one dared ask, promises made only in the mind. They are not hostile, but they are exacting. They believe speech has weight, and they invite the player to help sort a broken exchange back into its proper order.

The mini-game is a conversation about conversation. Senn presents the player with a series of physical language-objects. Each object represents one phase of the broken exchange, and each phase can be handled well, poorly, or somewhere in between. The player must choose how to speak around each object. Each spoken event changes Senn's judgment of the player and the state of the exchange.

The showcase should live both in the existing codex and in a new dedicated space. Codex Square becomes the public approach. From there, a passage leads into **The Marginalia Nook**, and the Nook may open further into a memory alcove or index room if movement and door operations need room to breathe. This gives the conversation its own stage while keeping it discoverable from established content.

Suggested dramatic shape:

1. The archivist asks the player to reconstruct a lost exchange.
2. Senn introduces one language-object at a time.
3. The player can choose honest, evasive, cruel, curious, or careful responses for each object.
4. Each response moves that phase toward success, partial success, or failure.
5. Some mistakes can be repaired by choosing better words later.
6. Some mistakes become graceful failures: Senn records the damage, teaches a lesson, and moves on.
7. At the end, the accumulated pattern of choices determines the final judgment.

Success should not mean "picked the obviously nice answer every time." A more interesting success path would require the player to notice what the archivist is really testing: not politeness, but attention. The right path might involve asking a question before offering comfort, admitting uncertainty instead of claiming knowledge, or refusing to say a beautiful line that would be false.

Possible success path:

- `listen`: the player lets the archivist read the damaged phrase.
- `ask`: the player asks whose words were lost instead of guessing.
- `admit`: the player admits they do not know how to repair another person's silence.
- `return`: the player gives the phrase back without trying to own it.
- The archivist marks the player as someone who can be trusted with unfinished stories.

Required phase objects:

- **unfinished phrase**: the opening object. It tests whether the player listens before acting.
- **folded silver tongue**: the speech object. It tests whether the player can speak truth without performance.
- **paper moth of unsaid words**: the fragile object. It tests whether the player can be gentle with something that may flee or tear.
- **glass comma**: the pause object. It tests whether the player understands interruption, restraint, and timing.
- **errata slip**: the correction object. It tests whether the player can amend harm without pretending the original harm vanished.

Each phase should have at least:

- one clear success route
- one clear failure route
- one partial or recoverable route where that fits the fiction
- a state or metadata mark that records the phase result

Final judgment:

The whole conversation should end by reading the accumulated state of the phases. The ending should represent degree, not just a binary win/loss.

Possible endings:

- **Restored**: most or all phases succeeded. Senn restores the exchange and records the player as trusted with unfinished stories.
- **Annotated**: the player made mistakes but handled correction well. The exchange remains flawed, but legible; Senn records the player as careful enough to continue learning.
- **Misfiled**: the player relied on performance, certainty, or noise. The exchange is filed away unresolved.
- **Sealed**: the player chose cruelty or greed in a way that cannot be repaired in this run. Senn closes the record.

The final representation can be a player metadata value, a room or area memory, a world demonstration key, a retained or transformed item, an opened passage, or some combination of those. Prefer a layered ending: the player should feel the result in text, state, and space.

Possible failure paths:

- **Flattery failure**: the player says what sounds kind but avoids the truth. The archivist accepts the words, files them under "ornamental lies," and ends the exchange politely.
- **Certainty failure**: the player claims to understand too quickly. The archivist closes the ledger and says, "Then there is nothing here for you to learn."
- **Cruelty failure**: the player insults the archivist or the lost speaker. The room remembers the cruelty briefly, perhaps through room or area metadata, and the exchange ends coldly.
- **Greed failure**: the player tries to take or keep the phrase before understanding it. The archivist removes the token and records the player as "premature."
- **Noise failure**: the player says an unrecognized event. The conversation's `events.default` catches this and treats it as static in the archive rather than a runtime error.

Feature ideas that fit the fiction:

- `broadcast`: the archivist speaks directly in plain text for simple beats.
- `semanticEvent`: successful or failed speech can be rendered with richer perspective-aware phrasing, such as the archivist setting a phrase between the player and the room.
- `transferItem`: the archivist can hand the player the unsaid phrase, or take it back on success/failure.
- `setPlayerMetadata`: remember whether this player succeeded, failed through cruelty, or proved attentive.
- `setRoomMetadata`: make the room briefly reflect the current conversational mood, such as `archive.lastTone`.
- `setAreaMetadata`: mark the codex area as having heard one repaired phrase.
- `setWorldMetadata`: mark a harmless global demonstration key, such as `conversationShowcase.lastRestoredPhrase`, if this can be made non-invasive.
- Delete metadata ops: use a cleanup route or success route to remove temporary demo keys so the example demonstrates cleanup without leaving noisy state behind.
- Door operations and movement: if a side room or room cluster is added, the archivist can open an "index door" only after the player succeeds, or move the player into and out of a memory alcove. If that feels forced, these instructions should be excluded rather than weakening the fiction.
- `auto`: after a decisive response, the conversation can immediately settle into a success or failure state and run the state-entry result.
- `final: true`: success and hard failures should become terminal endings for this playthrough unless a later reset mechanic is explicitly authored.

Tone:

- Strange, precise, a little mournful.
- The archivist is not a quizmaster. They are a custodian of consequences.
- The best responses should feel emotionally intelligent, not merely correct.
- Failures should be interesting and authored, not punitive dead ends.

Candidate names:

- Aster Vale, Keeper of Unsaid Things
- The Marginal Archivist
- Ilyr of the Missing Line
- Senn, Cataloguer of Regrets
- The Errata Clerk

Required item names:

- unfinished phrase
- folded silver tongue
- paper moth of unsaid words
- glass comma
- errata slip

Current creative recommendation:

Use **Senn, the Errata Clerk** as the NPC, approached from Codex Square and placed in a dedicated room cluster centered on **The Marginalia Nook**. The five required items are not decoration; they are the phases of the conversation. The success path is not "be nice"; it is "listen, ask, admit, return," expressed differently across the unfinished phrase, folded silver tongue, paper moth of unsaid words, glass comma, and errata slip. The final ending should measure how well the player handled the whole broken exchange, then represent that degree through authored text, remembered state, and some physical or spatial consequence.

## Mechanical Outline

This section turns the creative outline into implementation-shape decisions. It is still a plan, not a checklist and not implementation.

### 1. Room Cluster Layout

Problem:

The showcase needs enough physical space for movement, door operations, and mood changes without crowding the existing codex puzzle rooms.

Solution:

Add a dedicated room cluster reached from `codex:square`:

- `codex:marginalia_nook`: the main conversation room where Senn stands.
- `codex:memory_alcove`: the inner room used for the restored, annotated, misfiled, or sealed ending.
- `codex:indexDoor`: a virtual or ordinary door facade between the nook and the deeper memory space, represented through room door data plus a facade item if useful.

Critique:

This risks becoming too much room work for a conversation showcase. It also risks overfitting the example around door and movement instructions instead of conversation quality.

Recorded shape:

Use Codex Square as the approach, The Marginalia Nook as the primary conversation stage, and Memory Alcove as the ending space. The door between them exists because the fiction wants a threshold: the player is not allowed into the memory of the exchange until Senn judges how they handled the phrase. Door and movement instructions should serve that threshold. If the door mechanics become brittle during implementation, simplify the door but keep the two-space dramatic structure.

### 2. Phase Objects And Item Placement

Problem:

The five named items need to be concrete enough for `transferItem` and description work, but they also represent phases of one broken exchange rather than ordinary loot.

Solution:

Define all five items in `items.yml`:

- `unfinishedPhrase`
- `foldedSilverTongue`
- `paperMothOfUnsaidWords`
- `glassComma`
- `errataSlip`

Place them in the room cluster as authored objects. The current phase object can be transferred to the player, returned to the room, or taken back by Senn as the conversation progresses.

Critique:

Making every phase object a normal item could invite players to treat the mini-game as a scavenger puzzle. That may distract from the conversational choices. Conversely, making them purely abstract would fail to exercise item transfer and weaken the physicality of the concept.

Recorded shape:

Keep all five as real authored items, but make their descriptions clear that they are language-objects under Senn's care. They should not be ordinary puzzle loot. Each phase may bring one item forward, hand it to the player, and reclaim or transform its meaning through conversation. The conversation may use item transfer for one or more representative phases, but it does not need to physically move every item if doing so makes play clumsy.

### 3. Phase Flow And Event Sketch

Problem:

Each item needs a playable phase with success, failure, and partial or recoverable outcomes. The event names must be usable as directed speech events and later menu choices.

Solution:

Use one major state group per object:

- `unfinished_phrase`: tests listening before acting.
  - success event: `listen`
  - partial event: `guess`
  - failure event: `force`
- `folded_silver_tongue`: tests truthful speech without performance.
  - success event: `plain`
  - partial event: `comfort`
  - failure event: `flatter`
- `paper_moth`: tests gentleness with fragile speech.
  - success event: `open`
  - partial event: `follow`
  - failure event: `grab`
- `glass_comma`: tests pause, timing, and restraint.
  - success event: `pause`
  - partial event: `wait`
  - failure event: `interrupt`
- `errata_slip`: tests correction without erasure.
  - success event: `amend`
  - partial event: `explain`
  - failure event: `erase`

Critique:

These events are clean, but some are a little abstract. If they stay as raw `say <event> to senn` keywords, they could feel like a code exercise. The eventual menu text should carry the emotional content, while the event ids remain stable internal triggers.

Recorded shape:

Use short lowercase event ids for stability, but author human-facing labels and messages around them. Each phase should have at least one exact event route, and `events.default` should catch nonsense or off-path speech as "noise in the archive." Some phase failures can be final, but most should be recorded and then auto-route into the next object so the ending can reflect degree rather than immediate binary failure.

### 4. State And Score Representation

Problem:

The final ending needs to represent accumulated success and failure, but the current condition surface is intentionally simple and does not provide arbitrary arithmetic or player-metadata comparison.

Solution:

Track the accumulated degree primarily in conversation state names, and record phase outcomes in metadata for visibility and later inspection.

Example state strategy:

- `phrase_clean`, `phrase_bruised`, `phrase_torn`
- `tongue_clean`, `tongue_bruised`, `tongue_torn`
- continue with state names that carry the current grade band forward
- final routes settle into `restored`, `annotated`, `misfiled`, or `sealed`

Metadata strategy:

- `setPlayerMetadata` records each phase result, such as `conversationShowcase.phases.glassComma: success`.
- `setRoomMetadata` records temporary mood, such as `conversationShowcase.currentTone: restrained`.
- `setAreaMetadata` records that the codex has heard or repaired a phrase.
- `setWorldMetadata` records a harmless demonstration key only at the end.

Critique:

Encoding score in state names can become verbose. Metadata would be more flexible, but conversation conditions cannot currently perform rich per-player metadata scoring. State-name scoring is explicit, deterministic, and compatible with the current runtime.

Recorded shape:

Use state names as the authoritative branching mechanism and metadata as the authored record. The conversation graph may be larger than a minimal demo, and that is acceptable here. Keep the state names readable and grouped by phase so future maintainers can follow the path.

### 5. Final Judgment And Ending Representation

Problem:

The ending should show degree of success through text, remembered state, and physical or spatial consequence.

Solution:

Implement four final endings:

- `restored`: strong success. Senn restores the exchange, opens the index door, moves the player into the Memory Alcove, and records the player as trusted.
- `annotated`: mixed success. Senn preserves the flawed exchange with visible notes, opens the alcove without full restoration, and records the player as careful but unfinished.
- `misfiled`: soft failure. Senn files the exchange away unresolved, maybe leaves the player in the nook, and records the result as misfiled.
- `sealed`: hard failure. Senn closes and locks the threshold, records the sealed result, and ends the conversation coldly.

Critique:

Moving the player only on some endings could be confusing if the player expects a consistent end screen. But spatial difference is a strong way to make degree matter. The text should make the consequence clear.

Recorded shape:

Use both text and space. Restored and Annotated should move or invite the player into the Memory Alcove. Misfiled can leave the player in the Nook with a closed record. Sealed should close and lock the threshold as a meaningful hard failure. Each ending should set a clear player metadata judgment.

### 6. Authored Instruction Coverage

Problem:

The example should stretch the authored instruction surface, but forcing every instruction into the same beat could make the mini-game artificial.

Solution:

Map instruction families to natural beats:

- `broadcast`: Senn's simple spoken lines.
- `semanticEvent`: object handling and threshold moments where perspective matters.
- `transferItem`: Senn presents or retrieves one or more phase objects.
- `movePlayer`: move the player into the Memory Alcove on applicable endings.
- `operateDoor`: open or change the index threshold during the restored path.
- `openDoor`: open the threshold for restored or annotated access.
- `closeAndLockDoor`: seal the threshold on the sealed ending.
- `setPlayerMetadata`: record phase results and final judgment.
- `setRoomMetadata`: record temporary room mood and current object focus.
- `setAreaMetadata`: record that the codex area contains a repaired or unresolved phrase.
- `setWorldMetadata`: record a harmless global demonstration result at final judgment.
- `deleteRoomMetadata`: clean temporary room mood at the end.
- `deleteAreaMetadata`: clean temporary area phase markers if implementation uses them.
- `deleteWorldMetadata`: clean temporary global demo keys before setting final global result.

Critique:

This is ambitious. The danger is that implementation may contort the conversation to satisfy the list. The plan already allows exclusions when an instruction is incoherent, and that escape hatch should remain real.

Recorded shape:

Aim to use all listed instruction families, but do not sacrifice coherence. If an instruction is excluded, the checklist or implementation notes must name the instruction and explain why it was incoherent for this content. The preferred outcome is broad coverage through meaningful moments, not maximal coverage at any cost.

### 7. Conditions Through `q`

Problem:

The conversation needs at least one condition through `q`, but conversation conditions must not become predicate-registry usage or arbitrary expression scripting.

Solution:

Use simple boolean query-object conditions at meaningful gates:

- `actorHasItem`: check whether the player is holding the current phase object before accepting a `return` or `amend` route.
- `roomHasItem`: check whether a language-object is present in the Nook before Senn introduces it.
- `isDoorLockedBetween` or `isDoorClosedBetween`: check the index threshold before opening or sealing an ending route.
- `getRoomMetadata` or `getAreaMetadata`: only when the expected value is `true`, since the condition evaluator passes only strict `true`.

Critique:

Using `q` too heavily could turn the conversation into a hidden state puzzle. Conditions should support authored routes, not replace the statechart. Also, per-player scoring should not rely on `q` reads that the current condition surface does not support.

Recorded shape:

Use `q` sparingly and visibly. Prefer one or two strong condition examples over peppering every route with guards. Do not use predicate keys or predicate-registry scripts. Do not depend on arbitrary value comparison in conditions.

### 8. Validation And Test Proof Points

Problem:

The plan needs enough validation shape for checklist authoring, especially because this is player-visible content and a reference example.

Solution:

Require focused proof points:

- The codex conversation file loads through the conversation-definition service.
- Senn's NPC definition binds to the conversation file.
- A directed exact event advances the conversation.
- An unrecognized event uses `events.default`.
- A conditioned route succeeds when its `q` condition is true.
- A conditioned route does not select when its `q` condition is false.
- An `auto` state settles into the expected next state.
- At least one transition action and one `onEntry.actions` block lower successfully.
- Representative authored mutations and render messages lower and execute through directed speech.
- Final endings record distinct outcomes.
- Existing codex puzzle smoke behavior still passes.

Critique:

Testing every branch of an expansive conversation could become heavy and brittle. The tests should prove the runtime/content contract and representative branches, not rehearse every line of writing.

Recorded shape:

Use a targeted suite or scenario coverage that proves structure, binding, representative branch execution, and final outcome differentiation. Avoid exhaustive transcript testing unless a line is behaviorally important.

### 9. Records And Release Notes

Problem:

This is content, but it is player-visible content and should not vanish into an unrecorded fixture change.

Solution:

Add a `CHANGELOG.md` entry when implementation lands, describing the new Codex conversation showcase and noting that it exercises directed speech conversation content.

Critique:

A changelog entry can oversell future conversation UI if it mentions menus or `talk`. It should describe the authored content and the available conversation behavior without implying runtime surfaces beyond the branch's intended delivery posture.

Recorded shape:

Record the addition as player-visible codex content and reference conversation showcase behavior. Do not describe it as a runtime architecture change unless implementation actually changes runtime code.

## Implementation Notes / Naming Decisions

These names are intended to make checklist authoring concrete. They may still be refined during checklist review, but implementation should not invent unrelated names without updating the plan or checklist.

### Area Content IDs

- NPC id: `sennErrataClerk`
- NPC ref: `codex:sennErrataClerk`
- Conversation id: `senn_errata_clerk`
- Conversation file: `bundles/bundle-rantamuta/areas/codex/conversations/sennErrataClerk.conversation.yml`

### Room IDs

- Public approach: existing `codex:square`
- Main conversation room id: `marginalia_nook`
- Main conversation room ref: `codex:marginalia_nook`
- Ending room id: `memory_alcove`
- Ending room ref: `codex:memory_alcove`

### Door / Threshold IDs

- Door facade item id: `indexDoor`
- Door facade item ref: `codex:indexDoor`
- Threshold direction from `codex:marginalia_nook`: `in`
- Return direction from `codex:memory_alcove`: `out`

The direction names are intentionally non-cardinal because the threshold is conceptual rather than geographic. If implementation discovers that command ergonomics or existing door helpers strongly prefer cardinal directions, use `east` from the nook and `west` from the alcove instead, and record the reason in the checklist.

### Phase Item IDs

- `unfinishedPhrase`
- `foldedSilverTongue`
- `paperMothOfUnsaidWords`
- `glassComma`
- `errataSlip`

The display names should remain the plain-language forms from the creative outline:

- unfinished phrase
- folded silver tongue
- paper moth of unsaid words
- glass comma
- errata slip

### Conversation State Naming

Use snake_case state ids grouped by phase.

Suggested prefixes:

- `intro_*`
- `phrase_*`
- `tongue_*`
- `moth_*`
- `comma_*`
- `errata_*`
- `ending_*`

Use grade words consistently:

- `clean` for success
- `bruised` for partial or recoverable outcomes
- `torn` for failure outcomes

Example state ids:

- `intro_start`
- `phrase_clean`
- `phrase_bruised`
- `phrase_torn`
- `tongue_clean`
- `ending_restored`
- `ending_annotated`
- `ending_misfiled`
- `ending_sealed`

### Metadata Keys

Use the `conversationShowcase` namespace for all temporary and final metadata written by this example.

Suggested player metadata:

- `conversationShowcase.phase.unfinishedPhrase`
- `conversationShowcase.phase.foldedSilverTongue`
- `conversationShowcase.phase.paperMothOfUnsaidWords`
- `conversationShowcase.phase.glassComma`
- `conversationShowcase.phase.errataSlip`
- `conversationShowcase.finalJudgment`

Suggested room metadata:

- `conversationShowcase.currentTone`
- `conversationShowcase.currentObject`

Suggested area metadata:

- `conversationShowcase.repairedPhrase`
- `conversationShowcase.unresolvedPhrase`

Suggested world metadata:

- `conversationShowcase.lastJudgment`

Temporary room, area, or world metadata should be deleted by an appropriate cleanup or final route when that cleanup is coherent.

### Event IDs

Keep event ids lowercase, short, and stable.

Initial event set:

- `begin`
- `listen`
- `guess`
- `force`
- `plain`
- `comfort`
- `flatter`
- `open`
- `follow`
- `grab`
- `pause`
- `wait`
- `interrupt`
- `amend`
- `explain`
- `erase`
- `return`

Menu text may be richer and more emotional than these ids. The ids are the machine-facing event names; the labels are the player-facing prose.
