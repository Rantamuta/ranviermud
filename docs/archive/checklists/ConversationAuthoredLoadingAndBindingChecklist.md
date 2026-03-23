# Conversation Authored Loading And Binding Checklist

## Status

- Status: active
- Scope: checklist for authored conversation loading, validation, and NPC binding
- Source plan: `docs/plans/ConversationAuthoredLoadingAndBindingPlan.md`
- In Scope:
  - define `metadata.conversation` as the authoritative area-local relative path binding for bundle-local `.conversation.yml` files
  - add runtime loader, validator, cache, and startup priming surfaces for the supported minimal authored subset
  - define the broken-binding contract with maintainer-facing logging and generic player-facing no-response behavior
  - keep runtime and Mermaid/tooling validation aligned for the supported minimal subset
- Out of Scope:
  - `talk`, directed `say <event> to <npc>`, menu handling, numeric interception, and FSM execution behavior
  - query lowering, effect lowering, lifecycle invalidation, and multiplayer visibility behavior
  - any `npcId` fallback, separate conversation-id layer, or out-of-bundle authored source
- Acceptance Criteria:
  - only NPCs with `metadata.conversation` are conversable, and the value is treated only as an area-local relative path
  - valid authored files load deterministically; absent bindings are non-conversable without loader errors
  - broken bindings log explicit maintainer-facing errors, create no engagement or progress mutation, and surface only the generic no-response behavior to players
  - runtime loading stays bundle-local and does not silently drift from the supported minimal Mermaid/tooling shape

## Checklist

- [x] `C01` [validation] Add module [conversation-definition-validation.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-definition-validation.js) that exports `validateConversationDefinition(doc, sourceLabel)` and returns deterministic diagnostics for the supported minimal authored subset: top-level `id`, `initial`, `states`, existing `initial`, existing target states, and the forbidden `final`/`events` and `auto` exclusivity combinations named in the plan.
  - Trace:
    - "Validate the minimal authored subset needed for runtime loading and binding" (`In Scope`)
    - "The minimal supported runtime validation subset is explicit, testable, and rejects malformed authored files before partial runtime behavior occurs." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `unit`

- [x] `C02` [service] Add module [conversation-definition-service.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-definition-service.js) with lifecycle accessors `ensureConversationDefinitionService(state)`, `getConversationDefinitionService(state)`, and `disposeConversationDefinitionService(state)` that own cache storage for loaded definitions and broken-binding diagnostics.
  - Trace:
    - "Introduce a runtime loader surface" (`In Scope`)
    - "Validate and cache authored conversations eagerly during bundle or area load when practical" (`In Scope`)
    - "Open question: whether the runtime loader cache should be owned per bundle load, per process, or by a narrower session/runtime service." (`Open Questions / Assumptions`)
  - Validation handoff: `S1`, `unit`

- [x] `C03` [binding] Implement `resolveConversationBinding(npc, area)` in [conversation-definition-service.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-definition-service.js) so it reads `npc.metadata.conversation`, resolves it only as an area-local relative path under that NPC's own area directory, rejects absolute paths and `..` traversal, and distinguishes "no conversation" from "broken binding" outcomes (depends on `C02`).
  - Trace:
    - "Define the authoritative NPC binding contract as `metadata.conversation`." (`In Scope`)
    - "Resolve the authored path only within the NPC's own area directory." (`In Scope`)
    - "Reject absolute paths, `..` traversal, and any out-of-area resolution." (`In Scope`)
    - "`metadata.conversation` is interpreted only as an area-local relative file path, not as a conversation id and not as a filename searched through fallback rules." (`Acceptance Criteria`)
  - Validation handoff: `S1`, `unit`

- [x] `C04` [loader] Implement `loadConversationDefinition(binding)` and `getConversationDefinitionForNpc(npc, area)` in [conversation-definition-service.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-definition-service.js) so supported `.conversation.yml` files are parsed with `Data.parseFile`, validated through `validateConversationDefinition(...)`, cached by resolved path, and returned in one deterministic runtime definition shape (depends on `C01`, `C02`, `C03`).
  - Trace:
    - "Load supported authored conversation files from within `bundles/bundle-rantamuta/areas/**` only." (`In Scope`)
    - "A valid minimal authored conversation file loads into one deterministic runtime definition shape." (`Acceptance Criteria`)
    - "Preserve deterministic behavior: identical authored content, runtime state, and binding input must produce identical load outcomes." (`Constraints`)
  - Validation handoff: `S2`, `unit`

- [x] `C05` [binding] Add broken-binding outcome normalization in [conversation-definition-service.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-definition-service.js) so broken configured paths produce maintainer-facing log diagnostics plus a standardized generic actor-visible no-response payload such as `"<npc> has nothing to say."`, while absent bindings remain non-conversable without loader error logging (depends on `C03`, `C04`).
  - Trace:
    - "If the path is missing, the NPC is simply non-conversable." (`Intent`)
    - "If the path is present but broken, the runtime should log a clear maintainer-facing error while player-facing conversation surfaces use only a generic no-response line such as `\"<npc> has nothing to say.\"`" (`Intent`)
    - "An absent `metadata.conversation` path yields a deterministic non-conversable outcome and does not log a loader error." (`Acceptance Criteria`)
    - "A broken, missing, unsupported, or invalid referenced conversation file yields a deterministic broken-binding outcome" (`Acceptance Criteria`)
  - Validation handoff: `S2`, `contract/parity`

- [x] `C06` [startup] Implement `primeConversationDefinitions(state)` in [conversation-definition-service.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-definition-service.js) to iterate loaded NPC definitions with `metadata.conversation`, warm the cache eagerly when practical, and record broken-binding diagnostics without mutating conversation progress or changing unrelated startup behavior (depends on `C02`, `C03`, `C04`, `C05`).
  - Trace:
    - "Validate and cache authored conversations eagerly during bundle or area load when practical" (`In Scope`)
    - "tests proving eager validation/cache behavior, when present, does not alter boot semantics unexpectedly and still leaves broken bindings recoverable through the generic no-response contract" (`Validation Strategy`)
    - "If implementation changes startup semantics, bundle-load behavior, or another compatibility contract named in `AGENTS.md`, pause and update the relevant normative or changelog records before proceeding." (`Compatibility and Records`)
  - Validation handoff: `S3`, `integration/smoke`

- [x] `C07` [startup] Add [conversation.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/server-events/conversation.js) with `startup` and `shutdown` listeners that ensure the conversation-definition service, invoke `primeConversationDefinitions(state)` at startup, and dispose the service on shutdown without introducing a new command surface (depends on `C06`).
  - Trace:
    - "Validate and cache authored conversations eagerly during bundle or area load when practical" (`In Scope`)
    - "Do not introduce hidden search paths, bundle-global lookup magic, or `npcId` fallback conventions." (`Constraints`)
    - "Keep this work focused on documentable, reversible loading and binding behavior rather than growing it into conversation execution." (`Constraints`)
  - Validation handoff: `S3`, `integration/smoke`

- [x] `C08` [tooling] Update [generate-conversation-mermaid.js](/mnt/c/workspace/mud/ranviermud/scripts/generate-conversation-mermaid.js) to call `validateConversationDefinition(...)` from [conversation-definition-validation.js](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/lib/session/conversation-definition-validation.js) for the supported minimal subset instead of maintaining a separate local shape validator (depends on `C01`).
  - Trace:
    - "Keep runtime validation aligned with the existing Mermaid/tooling expectations for the supported minimal subset, ideally through shared validation logic or parity tests." (`In Scope`)
    - "Runtime loading and existing Mermaid/tooling support do not silently disagree on the supported minimal authored shape." (`Acceptance Criteria`)
    - "Risk: runtime validation drifts from the Mermaid generator and authors get conflicting answers from tooling versus runtime." (`Risks and Mitigations`)
  - Validation handoff: `S4`, `contract/parity`

- [x] `C09` [content] Add authored fixture [actorPlanner.conversation.yml](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/areas/test/conversations/actorPlanner.conversation.yml) with the supported minimal structure and set `metadata.conversation: conversations/actorPlanner.conversation.yml` for `actorPlanner` in [npcs.yml](/mnt/c/workspace/mud/ranviermud/bundles/bundle-rantamuta/areas/test/npcs.yml) to provide explicit in-bundle binding coverage without introducing conversation execution behavior (depends on `C01`, `C03`, `C04`).
  - Trace:
    - "Authored conversation files under area-local content paths such as `bundles/bundle-rantamuta/areas/<area>/conversations/*.conversation.yml`" (`Implementation Surfaces`)
    - "NPC authored metadata in `bundles/bundle-rantamuta/areas/*/npcs.yml`" (`Implementation Surfaces`)
    - "Treat bundle-local area content as the only runtime source of authored conversations for this work." (`Constraints`)
  - Validation handoff: `S4`, `integration/smoke`

## Behavior Slices

- `S1`
  - Goal: establish the shared validation contract and the service boundary for explicit NPC conversation-path resolution.
  - Items: `C01`, `C02`, `C03`.
  - Type: behavior

- `S2`
  - Goal: load and normalize deterministic runtime definitions, including the broken-binding outcome contract.
  - Items: `C04`, `C05`.
  - Type: behavior

- `S3`
  - Goal: warm the authored conversation cache at startup through a bounded bundle lifecycle integration.
  - Items: `C06`, `C07`.
  - Type: behavior

- `S4`
  - Goal: align tooling with the shared minimal validator and provide explicit in-bundle authored binding coverage.
  - Items: `C08`, `C09`.
  - Type: behavior
