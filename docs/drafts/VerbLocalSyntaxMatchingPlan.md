# Verb-Local Syntax Matching Plan

## Status

- Status: draft
- Scope: bundle-layer command parsing, syntax-rule selection, and command migration in `bundles/bundle-rantamuta`
- Type: implementation plan for review (not yet implemented)

## Goal

Establish verb-local syntax matching as the primary model for command shape in the bundle-layer runtime.

Instead of a global parser inferring structure from relation-like words, each verb declares the syntax patterns it supports. The runtime matches player input against those ordered patterns and produces a stable interpretation artifact consumed by later command phases.

This plan is motivated by free-text verbs such as `say`, but the model is intended to become the normal command declaration model for bundle-layer verbs.

## Intent

Players should be able to type a command and have the game decide what it means based on that verb's own declared patterns, instead of relying on one global parser to guess the structure from words like `to`, `with`, or `in`.

Command authors should be able to list those patterns in a short, readable form and control priority by putting the rules in the order they want. The runtime should then test those rules in order and choose one stable result by checking both the sentence shape and any entity references involved.

After that meaning is established, the later command phases should keep doing the same jobs they do now. They should receive one finished interpretation of the command instead of trying to figure it out again.

## In Scope

- Replace global relation-word structural inference with verb-local syntax matching as the primary command-shape model.
- Keep `Receive Input` limited to canonicalizing raw input, tokenizing or lexing input, and resolving the verb key.
- Add a linked `Parsing and Entity Resolution` interpretation step that:

  - loads the ordered syntax rules for the resolved verb,
  - matches candidate rules against the remaining token stream,
  - treats connector words as structural only when the rule declares them,
  - captures slot spans during matching,
  - interprets entity-bearing slots as part of rule viability,
  - distinguishes uniquely resolved, missing, and ambiguous entity-bearing results,
  - rejects rules when structural matching or entity interpretation fails,
  - emits either a final interpretation artifact or a structured ambiguity artifact.
- Declare verb-local syntax rules as ordered compact space-separated syntax strings compiled at load time into internal matcher patterns.
- Support the initial slot kinds `TEXT`, `WORD`, `NUMBER`, `ENTITY`, `LIVING`, and `EXIT`.
- Support `(empty)` as author shorthand for a zero-atom rule.
- Use recursive backtracking for rule matching, including greedy variable-width capture with backtracking to satisfy later literals or entity slots.
- Allow an optional literal-presence pre-check only as an optimization gate before deep matching.
- Produce an interpretation artifact that carries the resolved verb, matched syntax rule, captured slot values, token ranges, downstream slot-role mapping, and resolved entity references where applicable.
- Preserve deterministic ambiguity handling so dispatch can assemble combined clarification messages without resolver-owned output.
- Convert all bundle-layer diegetic verbs to verb-local syntax matching as part of the same syntax-model change.
- Remove the legacy parser once conversion is complete.
- Update command-architecture documentation to make the interpretation step explicit and keep downstream phase responsibilities unchanged.

## Out of Scope

- Behavior changes to later command phases beyond consuming the new interpretation artifact or structured ambiguity artifact.
- Changes to current actor and entity hook semantics in later phases, including `canActor`, `canDirect`, `canIndirect`, `planActor`, `planDirect`, `planIndirect`, and command `reactions`.
- Changes to Capture, Plan, React, Commit, or Render responsibilities.
- Mutation semantics or downstream command behavior changes unrelated to syntax matching and command migration.
- Changes to engine internals under `Rantamuta/core`.
- CLI, config, boot, load-order, or tick compatibility changes.
- Broad refactors unrelated to syntax matching and command migration.
- Narrowing broad compatibility slot behavior without explicit design approval.
- Introducing a persistent interactive clarification state mechanic.

## Constraints

- Preserve deterministic behavior: identical input and identical world state must produce identical interpretation results.
- Preserve the runtime/content split in `bundles/bundle-rantamuta`: runtime infrastructure in `lib/**` and `commands/**` must stay content-agnostic and must not hardcode area-specific content.
- Keep CommonJS and Node 22 compatibility intact.
- Preserve exact command/verb lookup during `Receive Input`; this plan changes syntax interpretation after verb resolution, not verb discovery semantics.
- Treat declaration order as the only rule-priority mechanism. No hidden weighting or precedence rules may be introduced.
- Treat literal matching as operating on canonicalized token values produced by `Receive Input`.
- Treat the design draft as the source of truth for this plan. Any concrete repo-policy or normative conflict must be called out separately rather than silently altering scope.

## Command Interpretation Model

### Receive Input

`Receive Input` remains a small preparation step with these responsibilities:

- canonicalize raw input,
- tokenize or lex input,
- preserve enough source information to reconstruct opaque spans for later captures, and
- resolve the verb key.

No structural interpretation should occur here beyond identifying the verb.

### Parsing and Entity Resolution

`Parsing and Entity Resolution` becomes the interpretation step that establishes command meaning before later phases run.

Responsibilities:

- load ordered syntax rules for the verb,
- match rules against the post-verb token stream,
- treat literal connector words as structural only when declared by the rule,
- capture slot spans during matching,
- resolve entity-bearing slots as part of rule viability,
- distinguish `resolved`, `missing`, and `ambiguous` entity-bearing outcomes,
- emit one final interpretation artifact for downstream phases, or emit one structured ambiguity artifact for downstream clarification rendering.

Structural matching and entity-bearing interpretation co-determine rule viability.

## Architecture Fit

The command architecture described by this plan is:

`Receive Input -> Parsing and Entity Resolution -> Capture -> Plan -> React -> Commit -> Render`

The purpose of this wording is to make the interpretation step explicit. It does not change the intended responsibilities of downstream phases after interpretation succeeds.

Later phases should treat the interpretation artifact as the canonical description of the command.

This plan should preserve the current downstream hook surfaces and phase ownership introduced in the command architecture, including `canActor`, `canDirect`, `canIndirect`, `planActor`, `planDirect`, `planIndirect`, and command `reactions`.

The command architecture document should be updated to:

1. replace wording that implies syntax parsing completes independently before entity resolution begins,
2. describe rule matching and entity-bearing interpretation as a linked interpretation step,
3. state that later phases consume a completed interpretation artifact or ambiguity artifact,
4. keep phase responsibilities after interpretation unchanged.

No behavioral change to command execution is required beyond making the interpretation stage explicit.

## Rule Declaration Model

Each verb declares an ordered list of syntax rules.

- Rules define the grammar for that verb.
- Rule order is authoritative.
- Rules are authored as compact space-separated syntax strings.
- The matcher must evaluate those rules strictly in declaration order.
- The first declaration-order rule that yields a successful interpretation or an ambiguity result becomes the selected rule.

Example:

```js
syntaxRules: [
  'TEXT to LIVING',
  'TEXT',
]
```

Each syntax string is compiled at load time into an ordered internal pattern used by the matcher.

This keeps command declarations compact while still giving the matcher explicit structural patterns.

## Syntax Strings

Syntax strings are space-separated rule declarations such as:

```text
TEXT
TEXT to LIVING
EXIT
ENTITY in ENTITY
ENTITY with ENTITY for TEXT
```

Compilation rules:

- recognized symbolic slot tokens compile to slot placeholders,
- all other words compile to literal connector tokens,
- `(empty)` compiles to a zero-atom rule.

Initial supported slot kinds:

- `TEXT`
- `WORD`
- `NUMBER`
- `ENTITY`
- `LIVING`
- `EXIT`

Additional kinds may be introduced later if required.

`TEXT` is a variable-width opaque span slot. It must capture one or more tokens.

`WORD` is a fixed-width one-token slot.

`NUMBER` is a fixed-width one-token slot that must parse as a valid number under the implementation's accepted numeric format.

`ENTITY` is a variable-width entity-bearing slot. It must capture one or more tokens and attempt resolution through the shared entity-resolution pipeline.

`LIVING` is an entity-bearing slot kind that behaves like `ENTITY` but is restricted to character-like entities. In the current runtime this restriction is implemented by requiring `.isNpc === true`. Due to existing driver behavior this boolean is set for both NPC entities and player-character entities, so `LIVING` effectively means "character-like entity" rather than "NPC only".

`EXIT` is an entity-bearing slot kind used for exit-shaped targets resolved through the shared entity-resolution pipeline from `room.exits`.

Entity-bearing slots are span-based, not single-token placeholders. This is required for names such as `old oak chest`, `north gate`, or `silver key`.

This representation is intentionally minimal. It avoids legacy rule-form metadata and explicit authored rule identifiers in command content.

## Matching Model

Rule matching uses recursive backtracking.

For a resolved verb, compiled syntax rules are evaluated strictly in declaration order. A rule is viable only if it consumes the entire post-verb token stream. Matching is left-to-right and recursive. Literal atoms must match canonicalized tokens in exact sequence. Fixed-width slots (`WORD`, `NUMBER`) consume one token. Variable-width slots (`TEXT`, `ENTITY`, `LIVING`, `EXIT`) must try candidate spans greedily from longest to shortest and backtrack as needed to satisfy later atoms. Entity-bearing slots participate in rule viability during matching. The matcher must not use hidden weighting, precedence, or global relation-word inference.

### Rule Evaluation Outcomes

Each rule evaluation must end in exactly one of these outcomes:

- `success`

  - the rule matches structurally,
  - the full post-verb token stream is consumed,
  - every required entity-bearing slot is uniquely resolved,
  - and all rule-local semantic checks pass.
- `ambiguous`

  - the rule matches structurally,
  - the full post-verb token stream is consumed,
  - no required entity-bearing slot is missing,
  - one or more required entity-bearing slots remain ambiguous,
  - and all non-ambiguity rule-local checks pass.
- `nonViable`

  - the rule fails structural matching, or
  - the rule leaves unmatched post-verb tokens, or
  - one or more required entity-bearing slots are missing, or
  - a required fixed-width slot does not satisfy its slot contract, or
  - a required rule-local semantic check fails.

`nonViable` remains the top-level outcome class, but implementations may preserve more specific underlying entity-bearing failure reasons for diagnostics or tooling. For example, a rule may remain `nonViable` while still reporting a specific cause such as `ENTITY_SLOT_MISSING` or `ENTITY_SLOT_NO_VIABLE_BINDING` rather than collapsing all such cases into one generic variable-slot failure.

### Rule Selection Algorithm

The matcher must select rules as follows:

1. evaluate rules in declaration order,
2. ignore rules that end as `nonViable`,
3. for the first declaration-order rule that ends as `success`, return a final interpretation artifact,
4. for the first declaration-order rule that ends as `ambiguous`, return a structured ambiguity artifact,
5. do not continue to later rules once an earlier rule yields `success` or `ambiguous`.

This means an earlier ambiguous rule blocks later fallback rules.

### Recursive Exploration

- Matching proceeds atom by atom from left to right.
- Variable-width slots may initially capture larger spans and shrink during backtracking to satisfy later literals or entity slots.
- `TEXT` and entity-bearing slots must try spans from longest to shortest.

This must allow commands such as:

```text
say hello there to bob
```

to match:

```text
TEXT to LIVING
```

This must also allow commands such as:

```text
say to be or not to be to bob
```

to match:

```text
TEXT to LIVING
```

with `TEXT` capturing `to be or not to be` and `LIVING` resolving `bob`.

### Literal Pre-Check

A fast literal-presence check may run before deep matching, but only as an optimization gate. Full positional correctness is still decided by recursive matching.

### Entity Slot Participation

Entity-bearing slots participate in candidate viability during matching.

A candidate entity-bearing slot span must resolve under the slot kind's resolver contract. Entity-bearing slot interpretation is tri-state:

- `resolved`

  - exactly one viable candidate remains after normal resolver filtering and deterministic ranking,
- `missing`

  - no viable candidates remain,
- `ambiguous`

  - more than one viable candidate remains and no deterministic single-winner rule applies.

A rule with any missing required entity-bearing slot is `nonViable`.

A rule with one or more ambiguous required entity-bearing slots may yield `ambiguous`, but only if the rule is otherwise structurally complete and has no missing required entity-bearing slots.

### Capture Semantics

- quoted and unquoted input must remain reconstructible as opaque spans in captures,
- text slots use greedy capture with backtracking,
- literal connectors must match exact canonicalized tokens,
- all rules require full post-verb token consumption.

This plan does not require quoted text to behave as a distinct syntax feature. It requires only that the lexer preserve enough source information for later span reconstruction.

## Interpretation Artifact

When a rule succeeds, the matcher produces a stable interpretation artifact.

Artifact contents:

- resolved verb,
- selected rule index,
- matched syntax rule text,
- compiled-rule identifier derived internally from declaration order or compiled matcher state,
- captured slot values,
- token ranges,
- downstream slot-role mapping,
- resolved entity references where applicable.

The artifact must provide enough stable information for downstream phases to preserve current actor/direct/indirect hook behavior.

Entity-bearing slots must expose stable downstream semantic roles so existing command hooks (`canDirect`, `canIndirect`, `planDirect`, `planIndirect`) continue to behave correctly.

In the general case, downstream role mapping may be derived automatically from syntax shape during compilation:

- an entity-bearing slot with no immediately preceding literal preposition maps to `direct`,
- an entity-bearing slot immediately preceded by a literal connector token maps to `indirect`.

Under this rule, forms such as `ENTITY to ENTITY`, `ENTITY with ENTITY`, `ENTITY in ENTITY`, and `TEXT to LIVING` compile naturally to the expected downstream roles without requiring every rule to spell roles out separately.

Examples:

- `ENTITY` → `direct`
- `ENTITY with ENTITY` → `direct`, `indirect`
- `ENTITY in ENTITY` → `direct`, `indirect`
- `TEXT to LIVING` → `indirect`
- `ENTITY to ENTITY` → `direct`, `indirect`

This derived mapping must be attached to the interpretation artifact so downstream phases receive stable semantic roles.

If a future rule shape cannot be represented correctly by this general inference, that rule must provide an explicit compile-time override rather than relying on positional inference alone.

Non-entity slots may be surfaced positionally or by a stable compiled name, but their mapping must be deterministic.

## Ambiguity Artifact

When a rule yields ambiguity, the matcher produces a structured ambiguity artifact instead of a final interpretation artifact.

The ambiguity artifact must contain, at minimum:

- resolved verb,
- selected rule index,
- matched syntax rule text,
- slot-role mapping,
- one ambiguity entry for each ambiguous slot,
- deterministic candidate ordering for each ambiguous slot.

Each ambiguity entry must contain, at minimum:

- slot index,
- slot kind,
- downstream slot role,
- captured surface text,
- token range,
- ordered candidate list.

Downstream slot roles in ambiguity artifacts use the same compiled role mapping as successful interpretation artifacts.

Candidate lists in ambiguity artifacts must preserve deterministic resolver ranking order so identical input and state produce identical clarification ordering.

Resolver/output separation remains intact. Entity resolution emits structured ambiguity data only. It does not assemble player-facing clarification text. Player-facing clarification text is assembled later by dispatch or command error-message mapping.

## Fallback Policy

There is no hidden fallback mechanism.

The normal fallback mechanism is declaration order plus rule viability.

A more specific rule may appear before a more general rule. If the earlier rule is `nonViable`, evaluation continues to the next rule. If the earlier rule yields `success` or `ambiguous`, later rules are not considered.

This means command authors express specific-before-general behavior by ordering rules accordingly.

For example, `say` should declare:

```text
TEXT to LIVING
TEXT
```

Under that ordering:

- `say hello there to bob` matches `TEXT to LIVING` when `bob` resolves as `LIVING`,
- `say to be or not` falls through to `TEXT` when no viable addressed-target form exists,
- `say to be or not to be to bob` matches `TEXT to LIVING` with greedy backtracking.

No global parser fallback behavior is allowed.

## Example Coverage

### `say`

Minimal rule set:

```text
TEXT to LIVING
TEXT
```

Expected behavior:

```text
say hello there           -> TEXT
say hello there to bob    -> TEXT to LIVING
say to be or not          -> TEXT
say to be or not to be to bob -> TEXT to LIVING
```

Connector words inside speech remain literal unless the matched rule explicitly treats them as structure.

### `unlock`

Representative rule set:

```text
ENTITY with ENTITY
ENTITY
```

Expected behavior:

```text
unlock old oak chest                -> ENTITY
unlock chest with silver key        -> ENTITY with ENTITY
unlock chest with key               -> ambiguity on indirect slot if multiple viable keys remain
unlock chest with key               -> may also yield ambiguity on both direct and indirect slots if both spans remain ambiguous
```

If an earlier `ENTITY with ENTITY` rule is structurally complete and yields ambiguity, later `ENTITY` is not considered.

### General Verb Shapes

Representative supported declarations:

```text
go:
EXIT

put:
ENTITY in ENTITY
ENTITY on ENTITY
ENTITY

give:
ENTITY to ENTITY

search:
ENTITY
for TEXT
ENTITY with ENTITY
ENTITY for TEXT

look:
(empty)
ENTITY
```

## Migration Model

The target end state is one command syntax model for bundle-layer verbs.

Migration sequence:

1. implement verb-local syntax rule support,
2. implement the recursive matcher and structured ambiguity handling,
3. convert all remaining bundle-layer diegetic verbs,
4. remove the legacy parser once conversion is complete.

No bundle-layer diegetic verb should remain authored on the legacy parser model when this work is complete.

## Implementation Surfaces

- `bundles/bundle-rantamuta/lib/parse-input.js`

  - Keep this surface within `Receive Input` responsibilities: canonicalization, tokenization or lexing, source-span preservation sufficient for later capture reconstruction, and verb-key resolution.
  - Remove global structural inference based on relation-like words so later interpretation is driven by verb-local syntax rules.
- `bundles/bundle-rantamuta/lib/session/command-dispatch.js`

  - Replace the current parse-then-resolve orchestration with the linked `Parsing and Entity Resolution` step described by this plan.
  - Treat the emitted interpretation artifact as the canonical downstream input while leaving later phase responsibilities unchanged.
  - Treat the emitted ambiguity artifact as structured clarification input without granting resolver ownership of player-facing output.
  - Preserve current downstream hook behavior and ordering for `canActor`, `canDirect`, `canIndirect`, `planActor`, `planDirect`, `planIndirect`, and command `reactions`.
- `bundles/bundle-rantamuta/lib/session/entity-resolution.js`

  - Rework or replace the current rule-selection and role-binding model so ordered syntax strings, structural matching, entity-bearing-slot viability, and ambiguity classification are handled together.
  - Preserve deterministic entity binding behavior inside the new interpretation step.
- `bundles/bundle-rantamuta/lib/helpers/entity-resolution-helper.js`

  - Continue to provide content-agnostic entity matching support needed by entity-bearing syntax slots.
- `bundles/bundle-rantamuta/lib/session/*` matcher support module(s)

  - Own syntax-string compilation, recursive matching, literal pre-check optimization, interpretation-artifact assembly, and ambiguity-artifact assembly if the implementation is split across dedicated helper modules.
- `bundles/bundle-rantamuta/commands/*.js`

  - Move command declarations to verb-local ordered syntax rules, beginning with `bundles/bundle-rantamuta/commands/say.js` and then all remaining bundle-layer diegetic verbs.
  - Keep command declarations compact and content-agnostic.
- Tests in `bundles/bundle-rantamuta/tests/**`

  - Update parser, interpretation, dispatch, and command-surface tests to cover ordered rule matching, entity-slot participation, ambiguity behavior, fallback by declaration order, and migration stability.
- `docs/normative/CommandArchitecture.md`

  - Update the normative command-flow contract if this plan is approved for implementation, while preserving the current actor and entity hook surfaces in Capture, Plan, and React.
- `docs/normative/EntityResolution.md`

  - Update the normative interpretation and binding contract if this plan is approved for implementation.

## Risks and Mitigations

- Rule ambiguity

  - Mitigation: declaration order is authoritative and must be covered by focused tests.
- Behavior drift during migration

  - Mitigation: add characterization tests for converted commands and preserve legacy behavior until each command is migrated.
- Parser scope creep

  - Mitigation: keep later command phases strictly outside parsing and entity resolution.
- Migration blast radius

  - Mitigation: keep changes inside bundle-layer parsing, interpretation, ambiguity signaling, and command declarations; do not widen scope into engine internals or unrelated runtime concerns.
- Non-deterministic clarification ordering

  - Mitigation: require deterministic resolver ranking and preserve that ranking in ambiguity artifacts.

## Acceptance Criteria

1. Verbs declare ordered syntax rules as compact space-separated syntax strings.
2. Rule declaration order is the only rule-priority mechanism.
3. `(empty)` is supported as a zero-atom rule and matches only an empty post-verb token stream.
4. `Receive Input` does not perform structural interpretation beyond identifying the verb.
5. The linked `Parsing and Entity Resolution` step matches syntax rules and evaluates entity-bearing slots together.
6. Recursive matching handles variable-width spans correctly, including greedy capture with backtracking.
7. Literal connector words are structural only when declared by the matched rule.
8. The interpretation artifact is produced deterministically and contains the resolved verb, matched syntax rule, captured slot values, token ranges, slot-role mapping, and resolved entity references where applicable.
9. Entity-bearing ambiguity produces a deterministic ambiguity artifact with per-slot candidate sets and deterministic candidate ordering.
10. Dispatch can assemble combined clarification text from ambiguity artifacts without resolver-owned output.
11. Later command phases keep their current responsibilities and consume the finished interpretation artifact.
12. Specific-before-general rule behavior is expressed only by declaration order and ordinary rule viability. No hidden fallback behavior exists.
13. `say` is migrated successfully under the new model with rule order `TEXT to LIVING`, then `TEXT`.
14. Multi-slot ambiguity cases such as `unlock chest with key` produce structured ambiguity rather than generic failure when structure matches and required entity-bearing slots are ambiguous.
15. All remaining bundle-layer diegetic verbs are converted to verb-local syntax matching, and no bundle-layer diegetic verb remains authored on the legacy parser model when this work is complete.
16. The legacy parser is removed after conversion is complete.

## Validation Strategy

This plan changes runtime behavior and normative command contracts. Validation must include unit, integration or smoke, and contract or parity evidence.

### Unit

Required evidence:

- syntax-string compilation tests,
- `(empty)` compilation and empty-input matching tests,
- ordered rule-selection tests,
- recursive backtracking tests for `TEXT`,
- recursive backtracking tests for variable-width entity-bearing slots,
- literal-order and literal-position tests,
- fixed-width slot tests for `WORD` and `NUMBER`,
- entity-slot participation tests,
- ambiguous single-slot resolution tests,
- ambiguous multi-slot resolution tests,
- early-rule ambiguity blocking later-rule evaluation tests,
- deterministic candidate-order tests for ambiguity artifacts.

Pass condition:

The matcher and interpretation step select the intended rule deterministically for identical input and state, reject structurally invalid or missing-entity candidates in the expected way, and preserve ambiguity information deterministically when a selected rule is ambiguous.

### Integration or Smoke

Required evidence:

- command-dispatch tests that exercise the full command pipeline with the new interpretation artifact,
- command-dispatch tests that exercise ambiguity artifacts through clarification rendering,
- `say` behavior tests covering plain speech, addressed speech, and speech that contains connector words as plain text,
- `unlock` behavior tests covering unique resolution, direct ambiguity, indirect ambiguity, and simultaneous direct-plus-indirect ambiguity,
- command behavior tests for each migrated verb.

Pass condition:

Converted commands behave the same where behavior is intended to stay the same, verbs moved to verb-local syntax matching behave according to their declared rules across the full dispatch pipeline, and ambiguity cases produce deterministic structured clarification rather than generic parse failure.

### Contract or Parity

Required evidence:

- normative doc updates for command architecture and interpretation or binding behavior,
- confirmation that later phases still honor existing Capture, Plan, React, Commit, and Render responsibilities,
- confirmation that `canActor`, `canDirect`, `canIndirect`, `planActor`, `planDirect`, `planIndirect`, and command `reactions` keep their current downstream semantics and ordering,
- confirmation that no CLI, config, boot, load-order, or tick contracts changed.

Pass condition:

The implementation matches the updated normative docs, preserves repo compatibility boundaries outside this plan's approved scope, and does not introduce behavior changes outside bundle-layer command interpretation, ambiguity signaling, and command migration.

### Required Commands

Per repository policy for behavior-changing work:

```text
npm test
npm run ci:local
```

### Success Condition

Matching behavior is deterministic, ambiguity behavior is deterministic, and legacy commands remain stable until migration is complete.

## Compatibility and Records

- Affected compatibility boundary:

  - bundle-layer command interpretation and the normative command-flow or entity-binding contracts consumed by bundle commands.
- Normative contract status:

  - `docs/normative/CommandArchitecture.md`
  - `docs/normative/EntityResolution.md`
- ADR status:

  - proposed ADR recorded at `docs/drafts/adr/ADR-0003-verb-local-syntax-matching.md`
- `CHANGELOG.md` update required on runtime implementation:

  - yes, because command interpretation behavior is player-visible and runtime-visible.
- Current alignment:

  - the normative command-flow contract has been updated to make `Parsing and Entity Resolution` explicit in `docs/normative/CommandArchitecture.md`
  - the normative interpretation contract has been updated to use ordered verb-local syntax rules in `docs/normative/EntityResolution.md`
  - the architecture rationale has been recorded as a proposed ADR in `docs/drafts/adr/ADR-0003-verb-local-syntax-matching.md`

## Appendix: Current Diegetic Verbs and Putative Rules

This appendix lists the current bundle-layer diegetic verb set and the putative verb-local syntax rules each verb would declare under this plan.

These rules are planning-oriented and are intended to make the migration target concrete. They reflect the current diegetic verb surface together with the design direction already captured in this plan.

All rules listed here require full post-verb token consumption.

- `close`

  - `ENTITY`
- `go`

  - `EXIT`
- `inventory`

  - `(empty)`
- `lock`

  - `ENTITY with ENTITY`
  - `ENTITY`
- `look`

  - `(empty)`
  - `ENTITY`
- `open`

  - `ENTITY with ENTITY`
  - `ENTITY`
- `pull`

  - `ENTITY`
- `push`

  - `ENTITY`
- `put`

  - `ENTITY in ENTITY`
  - `ENTITY on ENTITY`
  - `ENTITY`
- `say`

  - `TEXT to LIVING`
  - `TEXT`
- `take`

  - `ENTITY from ENTITY`
  - `ENTITY`
- `unlock`

  - `ENTITY with ENTITY`
  - `ENTITY`

## Stopping Condition

Once:

- the normative contract is updated,
- the matcher behavior is understood,
- the minimal compatible implementation is applied,
- ambiguity behavior is deterministic,
- and `npm test` plus `npm run ci:local` are green for the right reason,

this work should stop.

Further command-surface redesign should be treated as separate follow-on work, not bundled into this migration.
