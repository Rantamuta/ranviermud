# Review: Portable Behavioral Spec — Command-to-Output Interaction Model

## Verdict

The document is **strong enough to build a functionally similar system** in Rantamuta at the behavioral-contract level, but it is **not yet strict enough** for full-fidelity transcript compatibility without additional constraints.

## What is already well-specified

- Clearly defined terminal outcomes (`success`, handled failures, unknown after fallback exhaustion).
- A stable stage order with explicit fallback trigger conditions.
- Useful failure taxonomy (`unknown`, `semantic`, `ambiguous`, `invalid-context`, `forbidden`).
- Clear requirement that multi-audience text comes from a single canonical semantic event.
- Acceptance examples that cover core command shapes and key edge conditions.

Together, these provide a solid implementation skeleton and significantly reduce architectural ambiguity.

## What is missing for an implementation that matches behavior tightly

1. **Input grammar and normalization contract**
   - The spec says normalization is deterministic but does not define canonical tokenization, quoting, punctuation handling, stop-word treatment, or case-folding details.

2. **Target-resolution precedence rules**
   - The spec references context scopes but not deterministic lookup order and tie-breakers (inventory vs room, equipped vs carried, aliases, numeric selectors like `2.sword`).

3. **Fallback semantics details**
   - It defines when fallback runs, but not how many fallback strategies are attempted, their priority, or whether fallback can return non-unknown failures.

4. **Validation rule ordering**
   - It states validation exists, but rule order matters for user-visible error precedence and reproducibility.

5. **Execution atomicity boundaries**
   - The document says command-level atomic “appearance,” but rollback behavior and partial-failure handling need explicit transaction boundaries.

6. **Recipient eligibility snapshot timing**
   - It requires eligibility filtering but not whether eligibility is evaluated before or after mutation, which can change recipient sets.

7. **Delivery ordering guarantees**
   - Open question #2 acknowledges this; full parity requires a normative ordering contract.

8. **Exact-text compatibility profile**
   - Open question #3 acknowledges this; define command families requiring strict text matching versus semantic equivalence.

9. **Concurrency/re-entrancy contract**
   - No explicit policy for simultaneous commands, queued processing, or interleaving events during long-running actions.

10. **Error payload contract for tests**
    - Failure classes are defined, but machine-assertable error codes/fields are not.

## Practical conclusion for porting into Rantamuta

- **Yes**, the spec is sufficient to build a **similar** system that preserves high-level behavior, branch structure, and user experience patterns.
- **No**, it is not sufficient by itself to guarantee **high-fidelity parity** (especially transcript-level determinism) without a small normative addendum.

## Recommended “Spec v1.1” addendum (minimal)

To make this implementation-ready for parity-sensitive work, add:

1. Deterministic input grammar + normalization rules (with examples).
2. Deterministic target-resolution order and disambiguation tie-breakers.
3. Fallback chain definition (ordered strategies + terminal behavior per strategy).
4. Validation rule order and error-precedence matrix.
5. Atomicity/rollback policy with explicit exception list.
6. Recipient eligibility evaluation timing (pre/post execution snapshot).
7. Delivery ordering contract (actor/target/bystander ordering guarantees).
8. Compatibility profile: semantic vs strict-text command subsets.
9. Concurrency model (single-threaded queue vs other), including event interleaving policy.
10. Machine-assertable error envelope schema (`class`, `code`, `details`).

## Suggested confidence framing

- **Current document confidence for similar-system port:** High.
- **Current document confidence for strict behavioral parity:** Medium.
- **Post-addendum confidence for strict parity implementation:** High.
