# Conversation Authored Loading And Binding Plan (Phase 2)

## Status

- Status: planning
- Scope: formal plan for authored conversation loading, validation, and NPC binding

## Goal

Establish one deterministic runtime contract for loading bundle-local authored conversation files and binding them to NPCs through explicit metadata, without introducing command-surface behavior or FSM execution in the same slice.

## Intent

This work is about making authored conversation files into real runtime assets.

An NPC should either:

- have an explicit authored conversation path in `metadata.conversation` that resolves to a supported `.conversation.yml` file inside that NPC's own area directory, or
- have no conversation at all

If the path is missing, the NPC is simply non-conversable.

If the path is present but broken, the runtime should log a clear maintainer-facing error while player-facing conversation surfaces use only a generic no-response line such as `"<npc> has nothing to say."`

This plan describes the work directly in terms of authored loading and explicit binding rather than using phase shorthand.

## In Scope

- Define the authoritative NPC binding contract as `metadata.conversation`.
- Define `metadata.conversation` as an area-local relative file path to a `.conversation.yml` file.
- Resolve the authored path only within the NPC's own area directory.
- Reject absolute paths, `..` traversal, and any out-of-area resolution.
- Load supported authored conversation files from within `bundles/bundle-rantamuta/areas/**` only.
- Validate and cache authored conversations eagerly during bundle or area load when practical, while preserving safe deterministic failure handling if an interaction-time lookup still encounters a broken binding.
- Introduce a runtime loader surface that returns deterministic outcomes for:
  - valid authored conversation loaded
  - NPC has no authored conversation path
  - NPC declares a broken or unsupported authored conversation path
- Validate the minimal authored subset needed for runtime loading and binding:
  - top-level `id`
  - top-level `initial`
  - top-level `states`
  - `initial` must reference an existing state
  - any referenced target state must exist
  - obvious forbidden structural combinations already called out in the draft DSL, such as:
    - `final: true` with `events`
    - `final: true` with `events.default`
    - `auto` with `events`
    - `auto` with `events.default`
    - `auto` with `final: true`
- Define the broken-binding failure contract:
  - explicit maintainer-facing log entry
  - no engagement creation
  - no conversation progress mutation
  - generic actor-visible no-response line only
- Add tests that prove loader behavior, path-resolution behavior, binding behavior, and minimal validation behavior deterministically.
- Keep runtime validation aligned with the existing Mermaid/tooling expectations for the supported minimal subset, ideally through shared validation logic or parity tests.

## Out of Scope

- `talk`, `talk to <npc>`, directed `say <event> to <npc>`, or any other new or changed player-facing conversation command surface.
- FSM execution such as current-state resolution, visible-event computation, transition selection, `onEntry`, `auto`, `default`, or `final` runtime behavior.
- Numeric menu generation, selector mapping, stale-menu handling, or numeric input interception.
- Condition lowering to the query facade.
- Effect lowering to mutation or render primitives.
- Multiplayer transcript visibility behavior.
- Lifecycle invalidation behavior such as disconnect, room change, despawn, or menu replacement cleanup.
- Any fallback binding based on `npcId`.
- Any separate conversation-id namespace distinct from the authored path in `metadata.conversation`.
- Loading authored runtime content from `docs/lore`, root-level docs, or any location outside `bundles/bundle-rantamuta`.

## Acceptance Criteria

- NPCs are treated as conversable only when `metadata.conversation` is present.
- `metadata.conversation` is interpreted only as an area-local relative file path, not as a conversation id and not as a filename searched through fallback rules.
- Path resolution never escapes the NPC's own area directory.
- A valid minimal authored conversation file loads into one deterministic runtime definition shape.
- An absent `metadata.conversation` path yields a deterministic non-conversable outcome and does not log a loader error.
- A broken, missing, unsupported, or invalid referenced conversation file yields a deterministic broken-binding outcome that:
  - logs an explicit maintainer-facing error
  - does not create engagement
  - does not mutate persisted conversation progress
  - is intended to surface to players only as the generic no-response line
- Runtime loading does not depend on `docs/lore`, `docs/plans`, or any non-bundle content source.
- The minimal supported runtime validation subset is explicit, testable, and rejects malformed authored files before partial runtime behavior occurs.
- Runtime loading and existing Mermaid/tooling support do not silently disagree on the supported minimal authored shape.

## Constraints

- Preserve the repository's runtime/content boundary from [AGENTS.md](/mnt/c/workspace/mud/ranviermud/AGENTS.md): runtime infrastructure remains content-agnostic and authored conversation files remain bundle content.
- Keep the work inside `bundle-rantamuta`; do not change engine internals.
- Treat bundle-local area content as the only runtime source of authored conversations for this work.
- Preserve deterministic behavior: identical authored content, runtime state, and binding input must produce identical load outcomes.
- Do not introduce hidden search paths, bundle-global lookup magic, or `npcId` fallback conventions.
- Do not expose loader diagnostics, validation internals, or filesystem details to players.
- Keep this work focused on documentable, reversible loading and binding behavior rather than growing it into conversation execution.

## Implementation Surfaces

- New runtime loader and binding surface, likely under `bundles/bundle-rantamuta/lib/session/`
  - likely responsibilities:
    - resolve NPC area context and area-root path
    - resolve and normalize `metadata.conversation`
    - load `.conversation.yml`
    - validate the supported minimal authored shape
    - cache successful results and broken-binding diagnostics where appropriate
- NPC authored metadata in `bundles/bundle-rantamuta/areas/*/npcs.yml`
  - authoritative source of `metadata.conversation`
- Authored conversation files under area-local content paths such as `bundles/bundle-rantamuta/areas/<area>/conversations/*.conversation.yml`
- Existing tooling surface in [generate-conversation-mermaid.js](/mnt/c/workspace/mud/ranviermud/scripts/generate-conversation-mermaid.js)
  - candidate source for shared validation helpers or parity expectations
- Likely test surfaces:
  - new runtime loader tests under `bundles/bundle-rantamuta/tests/`
  - area data-wiring tests for explicit `metadata.conversation` bindings
  - targeted bundle-load or startup-adjacent tests only if needed to prove eager validation/cache behavior safely

## Risks and Mitigations

- Risk: runtime validation drifts from the Mermaid generator and authors get conflicting answers from tooling versus runtime.
  - Mitigation: share validation helpers where practical, or add parity tests that pin the supported minimal subset.
- Risk: path handling accidentally permits traversal or out-of-area loading.
  - Mitigation: treat `metadata.conversation` as an area-local relative path only and reject absolute or escaping paths explicitly.
- Risk: bundle runtime silently depends on `docs/lore` or other non-bundle content during bring-up.
  - Mitigation: make bundle-local loading an explicit acceptance criterion and cover it with contract tests.
- Risk: broken binding handling leaks internal diagnostics to players.
  - Mitigation: separate maintainer-facing logging from actor-visible output and lock the player-facing contract to the generic no-response line only.
- Risk: authored loading grows into command behavior or FSM execution.
  - Mitigation: keep command surfaces and execution semantics explicitly out of scope in this plan.

## Open Questions / Assumptions

- Assumption: there is a practical bundle or area load seam where eager validation/cache can occur without changing the repository's boot compatibility contract.
- Assumption: authored conversation files will live in area-local content directories and will be committed with the bundle, not sourced from local-only docs clones.
- Assumption: the runtime can identify an NPC's area directory deterministically from existing authored or runtime area context.
- Open question: whether the runtime loader cache should be owned per bundle load, per process, or by a narrower session/runtime service.
  - This plan does not need to settle final cache ownership naming as long as the load outcome remains deterministic and testable.

## Validation Strategy

This plan changes executable runtime behavior and bundle content loading, so the implementation must satisfy the repository behavior-change validation requirements.

### Unit

Required evidence:

- tests proving `metadata.conversation` path resolution is relative to the NPC's own area directory
- tests proving absolute paths and `..` traversal are rejected explicitly
- tests proving absent `metadata.conversation` produces a deterministic non-conversable result
- tests proving a valid minimal `.conversation.yml` file loads into the expected runtime definition shape
- tests proving missing `id`, missing `initial`, missing `states`, missing target states, and forbidden structural combinations fail with explicit diagnostics
- tests proving broken configured paths produce the deterministic broken-binding outcome

Pass/fail:

- Pass if binding and load resolution are deterministic, safe, and limited to the supported minimal authored subset.
- Fail if path resolution escapes the area directory, invalid files partially load, or absent bindings are treated as broken bindings.

### Integration / Smoke

Required evidence:

- tests proving bundle-local authored conversation files can be bound from NPC metadata without introducing runtime dependence on `docs/lore` or other non-bundle sources
- tests proving eager validation/cache behavior, when present, does not alter boot semantics unexpectedly and still leaves broken bindings recoverable through the generic no-response contract
- tests proving the broken-binding contract creates no engagement and does not mutate persisted conversation progress

Pass/fail:

- Pass if bundle-local authored conversations become discoverable runtime assets without changing unrelated boot behavior and without mutating player state on load failure.
- Fail if authored loading depends on out-of-bundle content, if eager validation destabilizes boot behavior, or if broken bindings create runtime conversation state.

### Contract / Parity

Required evidence:

- tests proving there is no `npcId` fallback and no separate conversation-id layer
- tests proving the supported minimal runtime validation subset stays aligned with the Mermaid/tooling expectations, either through shared helper coverage or parity tests
- tests proving the player-facing broken-binding contract is limited to the generic no-response line while diagnostics remain maintainer-facing only

Pass/fail:

- Pass if the binding contract stays explicit, deterministic, and aligned across runtime and tooling.
- Fail if runtime and tooling disagree silently, if fallback lookup behavior is introduced, or if player-facing output leaks internal error details.

### Required Repository Validation

For executable implementation of this plan:

- `npm test`
- `npm run ci:local`

## Compatibility and Records

- No `CHANGELOG.md` entry is expected for this plan-authoring step.
- For implementation, no normative doc update is expected unless the work changes a binding executable behavior contract outside this authored loading and binding scope.
- If implementation changes startup semantics, bundle-load behavior, or another compatibility contract named in `AGENTS.md`, pause and update the relevant normative or changelog records before proceeding.
