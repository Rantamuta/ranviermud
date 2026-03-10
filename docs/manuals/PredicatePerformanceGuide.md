# Predicate Performance Guide

This guide explains how to read predicate benchmark results and what a failing performance check means.

## What these benchmarks are for

The predicate system is intentionally small and deterministic.  
These benchmarks help us catch accidental slowdowns in:

- Predicate evaluation (`predicate-runtime`)
- Description assembly (`room-view`)
- End-to-end scenario execution (`scenario-runner`)

This is a guardrail, not a correctness test.  
A failure does **not** always mean there is a functional bug.

## Commands

- `npm run bench:all`
  - Prints human-readable benchmark tables.
- `npm run bench:record`
  - Captures the current machine’s numbers into `bundles/bundle-rantamuta/tests/benchmarks/predicate-baseline.json`.
- `npm run bench:check`
  - Compares current numbers against the recorded baseline and fails if thresholds are exceeded.

## What a failing `bench:check` means

`bench:check` fails for three kinds of reasons:

- A case got slower beyond allowed thresholds.
- A benchmark case was added/removed but the baseline was not updated.
- A benchmark suite expected by the checker is missing.

When it fails, the output includes:

- the suite and case name
- baseline mean and current mean
- percent increase and absolute slowdown
- the threshold that was exceeded

## Friendly interpretation

Most failures are one of these:

1. **Real regression**  
   A code path now does more work than before.
2. **Measurement noise**  
   Laptop power mode, thermal throttling, or background processes changed timing.
3. **Intentional change**  
   We accepted new behavior and now need a new baseline.

## What to do next

1. Re-run `npm run bench:check` once.  
   This quickly filters out one-off noise.
2. If it still fails, run `npm run bench:all`.  
   Confirm which suites/cases changed and by how much.
3. Decide whether the slowdown is acceptable.  
   If not, investigate the changed code path.
4. If acceptable and intentional, run `npm run bench:record` and commit the baseline update.

## Practical notes

- Baselines are machine-sensitive. Record/check on similar hardware when possible.
- Node major version changes can affect timing; checker prints a warning for this.
- Keep benchmark fixtures stable (`test:predicates`) so comparisons stay meaningful.
