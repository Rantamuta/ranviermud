# Codex Conversation Showcase Checklist

## Status

- Status: planning
- Scope: implement the codex-area Senn conversation showcase content from the approved plan
- Source plan: `docs/plans/CodexConversationShowcasePlan.md`

## Locked Scope

### In Scope

- Add a new codex-area conversation file under `bundles/bundle-rantamuta/areas/codex/conversations/`.
- Bind one codex NPC to that conversation through `metadata.conversation`.
- Add or place content assets needed for the example, including rooms, items, and room details.
- Exercise exact directed-speech event routing, `events.default`, `auto`, `final`, `onEntry.actions`, transition-local `actions`, and `q` conditions.
- Exercise authored render instructions and coherent authored mutation instructions.
- Keep the example deterministic and content-owned.
- Update player-visible records for the showcase content.

### Out of Scope

- Implementing `talk`, conversation menus, numeric selection, or engagement records.
- Changing conversation runtime semantics, authored-instruction vocabulary, or `q` query semantics.
- Reworking Tomo's scripted bell-puzzle behavior.
- Adding arbitrary JavaScript conversation hooks.
- Moving codex puzzle logic from scripts into the conversation example.

### Acceptance Criteria

- The codex area contains a loadable conversation file bound to one codex NPC.
- The conversation advances through directed speech and includes exact, default, conditioned, auto, and final routes.
- The conversation uses `onEntry.actions`, transition-local `actions`, `broadcast`, `semanticEvent`, and coherent mutation instructions.
- The conversation remains deterministic and does not corrupt existing codex puzzle flow.
- Unrecognized speech is handled understandably without maintainer-facing errors.
- Validation evidence is supplied during implementation through the behavior slices below.

## Checklist

- [ ] `C01` [rooms] Add the Senn conversation room cluster to `bundles/bundle-rantamuta/areas/codex/rooms.yml`.
  - Trace:
    - "Add a dedicated room cluster reached from `codex:square`" (`Mechanical Outline` / `Room Cluster Layout`)
    - "Public approach: existing `codex:square`" (`Implementation Notes / Naming Decisions`)
  - Validation handoff: `S1`, `integration/smoke`

- [ ] `C02` [items] Add `indexDoor` as the threshold facade item in `bundles/bundle-rantamuta/areas/codex/items.yml`.
  - Trace:
    - "`codex:indexDoor`: a virtual or ordinary door facade between the nook and the deeper memory space" (`Mechanical Outline` / `Room Cluster Layout`)
    - "Door facade item id: `indexDoor`" (`Implementation Notes / Naming Decisions`)
  - Validation handoff: `S1`, `integration/smoke`

- [ ] `C03` [items] Add the five required language-object items to `bundles/bundle-rantamuta/areas/codex/items.yml` using the approved ids and display names.
  - Trace:
    - "Keep all five as real authored items" (`Mechanical Outline` / `Phase Objects And Item Placement`)
    - "Required phase objects" (`Creative Outline`)
    - "Phase Item IDs" (`Implementation Notes / Naming Decisions`)
  - Validation handoff: `S2`, `unit/fixture`

- [ ] `C04` [npc] Add `sennErrataClerk` to `bundles/bundle-rantamuta/areas/codex/npcs.yml` with keywords, description, and `metadata.conversation` pointing to the approved conversation file.
  - Trace:
    - "Bind one codex NPC to that conversation through `metadata.conversation`." (`In Scope`)
    - "NPC id: `sennErrataClerk`" (`Implementation Notes / Naming Decisions`)
  - Validation handoff: `S3`, `unit/fixture`

- [ ] `C05` [rooms] Place `codex:sennErrataClerk` in `codex:marginalia_nook` and keep Tomo's existing placement and script behavior unchanged.
  - Trace:
    - "Prefer adding a new showcase NPC over changing Tomo's existing scripted behavior." (`Constraints`)
    - "Reworking Tomo's existing scripted bell-puzzle behavior." (`Out of Scope`)
  - Validation handoff: `S3`, `regression`

- [ ] `C06` [conversation] Create `bundles/bundle-rantamuta/areas/codex/conversations/sennErrataClerk.conversation.yml` with id `senn_errata_clerk`, an initial state, and phase-grouped state ids following the approved naming convention.
  - Trace:
    - "Conversation file: `bundles/bundle-rantamuta/areas/codex/conversations/sennErrataClerk.conversation.yml`" (`Implementation Notes / Naming Decisions`)
    - "Use snake_case state ids grouped by phase." (`Implementation Notes / Naming Decisions`)
  - Validation handoff: `S4`, `unit/fixture`

- [ ] `C07` [conversation] Implement the intro and unfinished-phrase phase with exact event routes for `listen`, `guess`, and `force`, including success, partial/recoverable, and failure outcomes plus a recorded phase result.
  - Trace:
    - "`unfinished_phrase`: tests listening before acting." (`Mechanical Outline` / `Phase Flow And Event Sketch`)
    - "Each phase should have at least one exact event route" (`Mechanical Outline` / `Phase Flow And Event Sketch`)
    - "Each phase should have at least: one clear success route; one clear failure route; one partial or recoverable route where that fits the fiction; a state or metadata mark that records the phase result" (`Creative Outline`)
  - Validation handoff: `S4`, `integration/smoke`

- [ ] `C08` [conversation] Implement the folded-silver-tongue phase with exact event routes for `plain`, `comfort`, and `flatter`, including success, partial/recoverable, and failure outcomes plus a recorded phase result.
  - Trace:
    - "`folded_silver_tongue`: tests truthful speech without performance." (`Mechanical Outline` / `Phase Flow And Event Sketch`)
    - "Each phase should have at least: one clear success route; one clear failure route; one partial or recoverable route where that fits the fiction; a state or metadata mark that records the phase result" (`Creative Outline`)
  - Validation handoff: `S4`, `integration/smoke`

- [ ] `C09` [conversation] Implement the paper-moth phase with exact event routes for `open`, `follow`, and `grab`, including success, partial/recoverable, and failure outcomes plus a recorded phase result.
  - Trace:
    - "`paper_moth`: tests gentleness with fragile speech." (`Mechanical Outline` / `Phase Flow And Event Sketch`)
    - "Each phase should have at least: one clear success route; one clear failure route; one partial or recoverable route where that fits the fiction; a state or metadata mark that records the phase result" (`Creative Outline`)
  - Validation handoff: `S4`, `integration/smoke`

- [ ] `C10` [conversation] Implement the glass-comma phase with exact event routes for `pause`, `wait`, and `interrupt`, including success, partial/recoverable, and failure outcomes plus a recorded phase result.
  - Trace:
    - "`glass_comma`: tests pause, timing, and restraint." (`Mechanical Outline` / `Phase Flow And Event Sketch`)
    - "Each phase should have at least: one clear success route; one clear failure route; one partial or recoverable route where that fits the fiction; a state or metadata mark that records the phase result" (`Creative Outline`)
  - Validation handoff: `S4`, `integration/smoke`

- [ ] `C11` [conversation] Implement the errata-slip phase with exact event routes for `amend`, `explain`, and `erase`, including success, partial/recoverable, and failure outcomes plus a recorded phase result.
  - Trace:
    - "`errata_slip`: tests correction without erasure." (`Mechanical Outline` / `Phase Flow And Event Sketch`)
    - "Each phase should have at least: one clear success route; one clear failure route; one partial or recoverable route where that fits the fiction; a state or metadata mark that records the phase result" (`Creative Outline`)
  - Validation handoff: `S4`, `integration/smoke`

- [ ] `C12` [conversation] Add `events.default` fallback handling for off-path speech in the Senn conversation.
  - Trace:
    - "Exercise `events.default` fallback routing." (`In Scope`)
    - "`events.default` should catch nonsense or off-path speech as \"noise in the archive.\"" (`Mechanical Outline` / `Phase Flow And Event Sketch`)
  - Validation handoff: `S4`, `integration/smoke`

- [ ] `C13` [conversation] Add `auto` routing where phase or ending states should settle immediately after a decisive response.
  - Trace:
    - "Exercise `auto` routing." (`In Scope`)
    - "`auto`: after a decisive response, the conversation can immediately settle into a success or failure state" (`Creative Outline`)
  - Validation handoff: `S4`, `integration/smoke`

- [ ] `C14` [conversation] Add final ending states for `ending_restored`, `ending_annotated`, `ending_misfiled`, and `ending_sealed`, marking terminal endings as `final: true`.
  - Trace:
    - "Implement four final endings" (`Mechanical Outline` / `Final Judgment And Ending Representation`)
    - "At least one state is `final: true`." (`Acceptance Criteria`)
  - Validation handoff: `S5`, `integration/smoke`

- [ ] `C15` [conversation] Use state names as the authoritative grade-band branching mechanism and write phase/final outcome metadata under the approved `conversationShowcase` keys.
  - Trace:
    - "Use state names as the authoritative branching mechanism and metadata as the authored record." (`Mechanical Outline` / `State And Score Representation`)
    - "Use the `conversationShowcase` namespace" (`Implementation Notes / Naming Decisions`)
  - Validation handoff: `S5`, `contract/parity`

- [ ] `C16` [conversation] Add `q` query-object conditions only at meaningful gates, without using area predicate keys or predicate-registry scripts.
  - Trace:
    - "Use only the shared query-object condition form supported by the conversation condition evaluator." (`Constraints`)
    - "Use `q` sparingly and visibly." (`Mechanical Outline` / `Conditions Through q`)
  - Validation handoff: `S6`, `integration/smoke`

- [ ] `C17` [conversation] Add authored `broadcast` and `semanticEvent` render instructions in coherent Senn conversation beats.
  - Trace:
    - "Exercise authored render instructions: `broadcast`, `semanticEvent`." (`In Scope`)
    - "`semanticEvent`: object handling and threshold moments where perspective matters." (`Mechanical Outline` / `Authored Instruction Coverage`)
  - Validation handoff: `S7`, `integration/smoke`

- [ ] `C18` [conversation] Add coherent `transferItem` authored instructions for presenting, retrieving, or otherwise handling phase objects.
  - Trace:
    - "`transferItem`: Senn presents or retrieves one or more phase objects." (`Mechanical Outline` / `Authored Instruction Coverage`)
  - Validation handoff: `S7`, `integration/smoke`

- [ ] `C19` [conversation] Add coherent movement and threshold-door authored instructions for the Memory Alcove endings.
  - Trace:
    - "`movePlayer`: move the player into the Memory Alcove on applicable endings." (`Mechanical Outline` / `Authored Instruction Coverage`)
    - "`operateDoor`: open or change the index threshold during the restored path." (`Mechanical Outline` / `Authored Instruction Coverage`)
    - "`openDoor`: open the threshold for restored or annotated access." (`Mechanical Outline` / `Authored Instruction Coverage`)
    - "`closeAndLockDoor`: seal the threshold on the sealed ending." (`Mechanical Outline` / `Authored Instruction Coverage`)
  - Validation handoff: `S7`, `integration/smoke`

- [ ] `C20` [conversation] Add coherent authored metadata write instructions for phase results, final judgment, room mood, area memory, and world demonstration state.
  - Trace:
    - "`setPlayerMetadata`: record phase results and final judgment." (`Mechanical Outline` / `Authored Instruction Coverage`)
    - "`setRoomMetadata`: record temporary room mood and current object focus." (`Mechanical Outline` / `Authored Instruction Coverage`)
    - "`setAreaMetadata`: record that the codex area contains a repaired or unresolved phrase." (`Mechanical Outline` / `Authored Instruction Coverage`)
    - "`setWorldMetadata`: record a harmless global demonstration result at final judgment." (`Mechanical Outline` / `Authored Instruction Coverage`)
  - Validation handoff: `S7`, `integration/smoke`

- [ ] `C21` [conversation] Add coherent authored metadata cleanup delete instructions for temporary room, area, or world showcase state.
  - Trace:
    - "`deleteRoomMetadata`: clean temporary room mood at the end." (`Mechanical Outline` / `Authored Instruction Coverage`)
    - "`deleteAreaMetadata`: clean temporary area phase markers if implementation uses them." (`Mechanical Outline` / `Authored Instruction Coverage`)
    - "`deleteWorldMetadata`: clean temporary global demo keys before setting final global result." (`Mechanical Outline` / `Authored Instruction Coverage`)
  - Validation handoff: `S7`, `integration/smoke`

- [ ] `C22` [conversation] Record any authored instruction family excluded from the showcase because it proves incoherent for the content.
  - Trace:
    - "Aim to use all listed instruction families, but do not sacrifice coherence." (`Mechanical Outline` / `Authored Instruction Coverage`)
    - "If an instruction is excluded, the checklist or implementation notes must name the instruction and explain why it was incoherent for this content." (`Mechanical Outline` / `Authored Instruction Coverage`)
  - Validation handoff: `S7`, `contract/parity`

- [ ] `C23` [content] Ensure the authored effects are meaningful in the codex area and do not move, mutate, or consume existing bell-puzzle-critical objects.
  - Trace:
    - "The authored effects are meaningful in the codex area and do not corrupt existing puzzle flow." (`Acceptance Criteria`)
    - "prefer new demo state and new in-theme content over reusing bell-puzzle-critical objects." (`Risks and Mitigations`)
  - Validation handoff: `S8`, `regression`

- [ ] `C24` [records] Add a `CHANGELOG.md` entry for the player-visible Codex conversation showcase.
  - Trace:
    - "Update `CHANGELOG.md` for the player-visible content addition." (`In Scope`)
    - "Record the addition as player-visible codex content and reference conversation showcase behavior." (`Mechanical Outline` / `Records And Release Notes`)
  - Validation handoff: `S9`, `contract/parity`

## Conformance QC

### Missing from plan

- None.

### Extra beyond plan

- None. Validation work is represented only as handoffs, because checklist authoring must not include test items or commands.

### Atomicity fixes needed

- None known. The checklist separates content placement, authored state phases, instruction coverage, guard behavior, puzzle-safety, and records work.

### Validation handoff gaps

- None known. Each item names a behavior slice and evidence type without adding test steps.

### Pass/Fail: checklist achieves plan goals

- Pass.

## Behavior Slices

- `S1`
  - Goal: add the physical room and threshold structure for the conversation mini-game.
  - Items: `C01`, `C02`.
  - Type: behavior

- `S2`
  - Goal: add the five language-object phase items.
  - Items: `C03`.
  - Type: behavior

- `S3`
  - Goal: add and place Senn without disturbing existing codex NPC behavior.
  - Items: `C04`, `C05`.
  - Type: behavior

- `S4`
  - Goal: author the main conversation graph, including phase routes, default fallback, and auto settling.
  - Items: `C06`, `C07`, `C08`, `C09`, `C10`, `C11`, `C12`, `C13`.
  - Type: behavior

- `S5`
  - Goal: implement final judgments and persistent outcome recording.
  - Items: `C14`, `C15`.
  - Type: behavior

- `S6`
  - Goal: add guarded conversation routes through the shared `q` condition surface.
  - Items: `C16`.
  - Type: behavior

- `S7`
  - Goal: wire coherent authored render and mutation instruction coverage into the conversation.
  - Items: `C17`, `C18`, `C19`, `C20`, `C21`, `C22`.
  - Type: behavior

- `S8`
  - Goal: preserve existing codex puzzle flow while adding the showcase content.
  - Items: `C23`.
  - Type: behavior

- `S9`
  - Goal: record the player-visible content addition.
  - Items: `C24`.
  - Type: mechanical
