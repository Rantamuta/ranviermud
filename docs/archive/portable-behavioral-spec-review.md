# Review: Portable Behavioral Spec — Command-to-Output Interaction Model

## Updated verdict for your stated goal ("good enough", not perfect parity)

For the goal you clarified—**a robust, consistent verb/command contract in Rantamuta without transcript-perfect parity**—the original spec is **already sufficient**.

In practical terms: **yes, you can build a stable command interface across verbs from the first version**. The stage model, failure taxonomy, fallback behavior, and canonical-event fanout are enough to enforce consistent behavior and avoid ad hoc verb implementations.

## Recommendation between the two versions

- **Prefer the first/original document as the implementation mandate.**
- Treat the newer, more detailed version as an **optional guideline/reference appendix**, not a hard requirement.

Why:

1. The first version cleanly defines the behavioral contract every verb must satisfy.
2. It preserves implementation freedom, which is valuable while porting into a different runtime architecture.
3. The second version introduces parity-oriented constraints (ordering profiles, error envelopes, strict precedence declarations) that improve determinism but can over-constrain early integration work.

## What the first version already guarantees (enough for a robust verb contract)

- One shared pipeline shape for every command: intake → normalize → interpret → resolve → validate → execute → render → dispatch (+ fallback only on unknown).
- Stable failure classes that prevent ambiguous "generic fail" behavior.
- Clear separation between world mutation (execution) and message fanout (render/dispatch).
- Canonical semantic event requirement that keeps multi-recipient messaging coherent.
- Acceptance examples that anchor expected behavior for common and edge paths.

This is exactly the foundation needed to enforce a consistent interface across verbs.

## Minimal hardening (small, non-overreaching)

If you want a little extra safety without drifting into over-specification, add only these three normative clarifications to the first version:

1. **Validation error precedence is deterministic** (first failed check wins).
2. **Unknown fallback must fully complete before any terminal unknown output** (already implied; make explicit).
3. **Execution failure policy**: no persistent mutation on failure unless a legacy exception is explicitly documented.

These three items tighten consistency materially while keeping the document lightweight.

## Practical conclusion

- If your target is **consistency and regularity across verbs**: the first spec is good enough now.
- If your target later becomes **strict transcript parity**: adopt selected sections from the second spec incrementally (as a test-driven addendum), not as an immediate mandate.

## First step for us (before prompts or large implementation)

The best first move is to align on a **small, explicit verb contract slice** and treat it as the template for all other verbs.

### Step 1: Define a "core-verb contract matrix" for 3 verbs

Start with `look`, `get`, and one utility verb (`help`):

1. List accepted input shapes per verb (minimal grammar).
2. Map each shape to one terminal class (`success`, `semantic`, `ambiguous`, `invalid-context`, `forbidden`, `unknown`).
3. Define target-resolution expectations for each shape (required/optional targets and relation forms).
4. Define recipient sets per outcome (actor only vs actor + eligible bystanders).
5. Define mutation expectation per outcome (read-only vs mutating).

### Why this is first

- It converts the spec into an executable contract without overcommitting to framework details.
- It gives us one shared review artifact before writing broad command infrastructure.
- It surfaces disagreements early (taxonomy, ordering, or recipient semantics) while changes are cheap.

### Concrete output of Step 1

Produce one short table checked into `docs/` (or issue comment) that becomes the acceptance source for the first implementation pass.

Once that matrix is agreed, implementation can begin directly; a prompt can come later if we want automation support, but it is not the critical first dependency.

## Parser direction: start simple (your proposal is the right first build)

I agree with your direction: for this stage, build a **simple token parser**, not a language parser.

### Recommended first parser contract

1. Normalize input with trim + whitespace collapse.
2. Split on spaces into a token array.
3. Interpret `tokens[0]` as the command key (verb/alias).
4. Pass remaining tokens as positional arguments into verb-specific resolvers.
5. Keep relation words (`at`, `from`, `in`, `with`, `on`) as plain tokens for resolver logic.

This gives you consistency now, with very low implementation risk.

### Why this is a better first step than a character-level parser

- It matches your current goal (regular verb behavior, not full natural-language parsing).
- It keeps command handling debuggable and testable per verb contract.
- It avoids committing early to grammar complexity that is expensive to unwind.

### Guardrails so "simple" does not become ad hoc

- Keep one shared parse output shape for every command.
- Keep one shared failure taxonomy.
- Keep fallback handling centralized (only on unknown command key).
- Add quoted-string support only when a concrete command needs it.

### Practical sequence from here

1. Lock the 3-verb contract matrix (`look`, `get`, `help`).
2. Implement the shared split-based parser contract above.
3. Wire those three verbs to the shared pipeline and failure classes.
4. Add transcript-style smoke checks for those three verbs.

That sequence gives you a working, coherent command layer quickly, while leaving room to add richer parsing later only where evidence says it is needed.


## Assessment of your latest updated spec draft

Yes—this update answers the previously open questions and is now **implementation-ready** for a robust, contract-driven command layer.

### What your update resolves well

- It explicitly resolves the previously open strict-text boundary using a behavioral rule (non-diegetic commands strict-text, diegetic verbs semantic-equivalent).
- It makes atomicity normative (no legacy non-atomic exceptions under the reference profile).
- It declares a canonical delivery ordering profile and ties compatibility to a profile/version mechanism.
- It adds deterministic verb resolution and grammar ownership constraints that reduce parser ambiguity.

### Maintainer caution (scope control)

Your draft is now strong enough that it can be treated as a **mandate** for the reference profile. The main tradeoff is that it is no longer "minimal"—it is intentionally prescriptive.

Recommended adoption posture:

1. Keep this as the **Reference Profile v1** contract.
2. Keep implementation startup simple (split-token parser + verb-owned grammar patterns) as long as behavior satisfies the profile.
3. Version any future behavioral changes rather than editing rules in place.

### Practical next step

Proceed to implementation using the 3-verb starter slice (`look`, `get`, `help`) under this profile. If those pass with deterministic outcomes and ordering, expand verb families incrementally.
