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
