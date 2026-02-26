# Inline Tags Phase 1 Implementation Checklist

## Goal

Implement a first-pass, predicate-only inline-tag runtime for room, item, and PC descriptions using JIT compile + AST caching, while explicitly deferring strict validation mode and eager precompile controls to the immediate follow-up phase.

## Scope

- In scope:
  - Implement runtime parser/evaluator integration for `[predicate:then|else]` tags on room, item, and PC descriptions.
  - Support nested tags and documented escaping semantics.
  - Enforce v1 runtime cache policy (LRU, default capacity 10000).
  - Add performance tests for cold compile, warm cache, and mixed access patterns.
  - Document deferred immediate-follow-up work (strict mode in bundle validation, eager precompile design).
- Out of scope:
  - Strict mode implementation in `util/validate-bundles.js`.
  - Eager compile-on-load implementation and opt-in config surface.
  - Metrics instrumentation and rollback runbook finalization.

## Non-Goals

- No engine-core redesign.
- No non-predicate condition grammar.
- No unrelated refactors.

## Preconditions (Command 2)

- [ ] Approval to execute this checklist is explicit.
- [ ] Working tree is clean in repository root.
- [ ] Working tree is clean in `bundles/bundle-rantamuta`.
- [ ] Branch created and checked out (`<imperative>-<noun>` descriptive name).
- [ ] Task classification recorded: `behavior-changing`.

## Checklist

- [ ] Confirm existing room/item/PC render entry points and list touched files; acceptance: file list is recorded in this checklist Execution Log.
- [ ] Add fail-first parser unit tests for predicate tags, escaping, malformed syntax, and nesting; acceptance: new tests fail before implementation.
- [ ] Commit failing parser/evaluator tests with subject beginning `Test `; acceptance: commit hash recorded.
- [ ] Implement parser/AST module for `[predicate:then|else]`; acceptance: add `bundles/bundle-rantamuta/lib/inline-tags/parseInlineTags.js` exporting `parseInlineTags(template, options)` plus node typedefs (`TextNode`, `TagNode`, `ConditionNode`), and add `bundles/bundle-rantamuta/test/inline-tags/parseInlineTags.spec.js` covering grammar/escaping/nesting without weakening assertions.
- [ ] Add fail-first evaluator/render tests for true/false branches, unknown predicate fallback-to-false, throw/non-boolean handling, and deterministic output; acceptance: tests fail before evaluator changes.
- [ ] Commit failing evaluator/render tests with subject beginning `Test `; acceptance: commit hash recorded.
- [ ] Implement evaluator integration against predicate runtime contract and room/item/PC render paths; acceptance: add `bundles/bundle-rantamuta/lib/inline-tags/renderInlineTags.js` exporting `renderInlineTags(ast, renderContext, evaluatePredicate)` and wire room/item/PC description render entry points so this executes in render-time assembly (not Capture/Plan/Commit/Bubble), preserving command architecture boundaries in `docs/normative/CommandArchitecture.md` and `docs/normative/PredicateStateRendering.md`.
- [ ] Add fail-first runtime cache tests for LRU behavior and default capacity 10000; acceptance: tests fail before cache implementation.
- [ ] Commit failing cache tests with subject beginning `Test `; acceptance: commit hash recorded.
- [ ] Implement LRU compiled-template cache keyed by surface reference + source hash; acceptance: cache tests pass.
- [ ] Add performance tests for cold compile, hot cache throughput, and mixed-surface access; acceptance: tests are runnable and produce stable pass/fail thresholds or invariant assertions.
- [ ] Update design/progress docs to record deferred-immediate follow-up items (strict validation mode + eager precompile controls) and runtime mutation policy constraints; acceptance: decisions are explicit and unambiguous.


## Proposed File/Function Map (Phase 1 target)

- `bundles/bundle-rantamuta/lib/inline-tags/parseInlineTags.js`
  - `parseInlineTags(template, { surfaceRef }) -> { ast, diagnostics }`
- `bundles/bundle-rantamuta/lib/inline-tags/renderInlineTags.js`
  - `renderInlineTags(ast, renderContext, evaluatePredicate) -> string`
- `bundles/bundle-rantamuta/lib/inline-tags/cache.js`
  - `getCompiledTemplate(surfaceRef, sourceText)` / `putCompiledTemplate(surfaceRef, sourceText, compiled)`
- `bundles/bundle-rantamuta/test/inline-tags/parseInlineTags.spec.js`
- `bundles/bundle-rantamuta/test/inline-tags/renderInlineTags.spec.js`
- `bundles/bundle-rantamuta/test/inline-tags/cache.spec.js`

Notes:

- Exact file names may be adjusted to existing repo conventions discovered in checklist item 1, but function responsibilities and command-phase boundaries must remain equivalent.
- Hook-in point is description render assembly only; no inline-tag evaluation in command mutation phases.

## Commit Plan (Optional but Recommended)

- Test commit subject(s):
  - `Test inline tag parser grammar`
  - `Test inline tag evaluator semantics`
  - `Test inline tag cache behavior`
- Implementation commit subject(s):
  - `Implement inline tag parser and AST`
  - `Integrate predicate inline tag rendering`
  - `Add inline tag LRU cache`
  - `Add inline tag performance tests`
  - `Document deferred strict/eager follow-up`

## Execution Log (Fill During Command 2)

For each completed item:

- [ ] Item checked off in this document.
- [ ] Test commit made if required.
- [ ] Implementation commit made.
- [ ] `bundles/bundle-rantamuta` commit hash (or `clean/no commit`):
  - `<hash or note>`
- [ ] Root repo commit hash (or `clean/no commit`):
  - `<hash or note>`

## Verification

- [ ] Required validations per `AGENTS.md` `Validation requirements by task type` are complete and passing.
- [ ] `npm test` run and passing.
- [ ] `npm run ci:local` run and passing.
- [ ] Additional task-specific validation:
  - [ ] `npm test -- inline-tags` (or repository-equivalent focused command for new parser/evaluator/cache tests)

## Archive Handoff

- [ ] Move this checklist from `docs/drafts/checklists/` to `docs/archive/implementations/` after execution completion.

## Approval Gate

- [ ] Checklist is complete, unambiguous, and ready for maintainer approval before implementation.
