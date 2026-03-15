# ADR-0003: Adopt Verb-Local Syntax Matching for Bundle Command Interpretation

- Status: proposed
- Date: 2026-03-15
- Owner: maintainers

## Context

The current bundle-layer command contract separates parsing shape from entity resolution and normatively describes command forms through keyed rule objects such as `intransitive`, `direct`, `indirect`, and `directIndirect`.

That model has proven awkward for commands whose structure is naturally owned by the verb itself, especially free-text verbs such as `say`, where connector words may be either literal speech content or structural relation markers depending on the declared form.

Recent design and prototype work established a better fit:

- each verb declares its own ordered syntax patterns,
- literal connector words are structural only when declared by that rule,
- entity-bearing slots participate in rule viability during matching,
- the matcher emits a stable interpretation artifact or a structured ambiguity artifact,
- later phases continue to consume a finished interpretation rather than re-parsing.

Without an explicit architecture record, the repo would have a major contract shift in normative docs and implementation planning without a permanent rationale record.

## Decision

Adopt verb-local ordered syntax matching as the primary command-shape model for bundle-layer diegetic command interpretation.

This decision establishes these architectural rules:

1. The early command pipeline is:
   - `Receive Input -> Parsing and Entity Resolution -> Capture -> Plan -> React -> Commit -> Render/Dispatch`
2. `Receive Input` is limited to canonicalization, tokenization or lexing, and exact verb-key resolution.
3. `Parsing and Entity Resolution` owns both structural rule matching and entity-bearing slot interpretation.
4. Verbs declare ordered compact syntax strings rather than keyed rule-form objects.
5. Rule priority is declaration order only.
6. Entity-bearing slots are evaluated during recursive matching, not as a detached post-pass.
7. The matcher emits either:
   - a final interpretation artifact, or
   - a structured ambiguity artifact
8. Later phases keep their current responsibilities and consume the finished artifact rather than re-establishing command meaning.
9. Resolver-owned output remains prohibited; ambiguity artifacts carry structured data only, while player-facing clarification is assembled later by dispatch or command error-message mapping.

## Consequences

Positive:

- The command-shape model becomes verb-owned and easier to reason about.
- Free-text and connector-heavy verbs fit the command model without parser-specific hacks.
- Ambiguity handling becomes explicit, structured, and deterministic.
- Later phases keep a cleaner boundary because they consume one canonical interpretation artifact.

Tradeoffs:

- This is a contract rewrite, not a local parser tweak.
- Existing keyed rule declarations and related normative wording must be replaced.
- Migrating bundle commands requires careful parity testing because player-visible command interpretation changes.
- The matcher and resolver boundary must stay disciplined so recursive viability checks do not turn into an unstructured implementation blob.

## Follow-ups

1. Update `docs/normative/CommandArchitecture.md` to make the linked interpretation step explicit.
2. Update `docs/normative/EntityResolution.md` to replace keyed form declarations with the verb-local syntax contract.
3. Bring implementation into conformance with the updated normative contract.
4. Re-run plan conformance on the verb-local syntax plan once the normative conflict is removed.

## Related

- `docs/drafts/VerbLocalSyntaxMatchingDesign.md`
- `docs/drafts/VerbLocalSyntaxMatchingPlan.md`
- `docs/normative/CommandArchitecture.md`
- `docs/normative/EntityResolution.md`
