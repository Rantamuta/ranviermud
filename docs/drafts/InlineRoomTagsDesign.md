# Inline Predicate Tags in Description Text (Phase 1 Plan)

## Status

Draft implementation plan for maintenance-mode delivery in `ranviermud`.

Purpose: define a checklist-ready Phase 1 that is implementable with current runtime architecture and low drift against normative contracts.

---

## 1) Locked decisions for Phase 1

1. Syntax is predicate-only in Phase 1:
   - `[predicate:then]`
   - `[predicate:then|else]`
2. Nested tags are supported in Phase 1.
3. Escaping uses backslash for delimiters:
   - `\[` `\]` `\:` `\|` `\\`
4. Condition evaluation uses existing predicate runtime contract:
   - `runtime.evaluate(name, renderContext) => boolean`
5. Formatting order is fixed:
   - resolve inline tags first
   - run existing formatting pipeline after resolution
6. Rendering remains read-only and deterministic.
7. Runtime compilation is JIT with LRU AST cache (default capacity `10000`).
8. Phase 1 does not add eager compile, strict validation mode, or new config surface.

---

## 2) Author-facing syntax contract (Phase 1)

### Supported forms

- `[predicate:then]`
- `[predicate:then|else]`

### Behavior notes

- Else branch is optional.
  - If omitted and condition is false, rendered output is empty string.
- Nested tags are valid in both `then` and `else` branches.
  - Example: `[is_night:[is_raining:dark and wet|dark and still]|bright]`
- Whitespace in branch text is preserved exactly; renderer does not auto-trim.

### Deferred forms (not in Phase 1)

- Numeric comparators such as `[stat>10:text]`.
- Any expression language beyond a single predicate identifier.

---

## 3) Grammar (Phase 1)

```ebnf
Document        := Segment*
Segment         := Text | Tag
Tag             := '[' Predicate ':' Branch ('|' Branch)? ']'
Predicate       := Identifier
Identifier      := [A-Za-z_][A-Za-z0-9_]*
Branch          := BranchSegment*
BranchSegment   := Text | Tag
Text            := TextChar+
TextChar        := EscapedChar | any codepoint except unescaped '['
EscapedChar     := '\\' ('[' | ']' | ':' | '|' | '\\')
```

Parser requirements:

- Depth-aware parsing for nested tags.
- Single-pass scanner with explicit depth tracking.
- No parser generator, no backtracking, no expression evaluator.
- `:` and `|` split only at current tag depth and only when unescaped.

---

## 4) Evaluation contract

Evaluation of a tag condition must call:

```js
runtime.evaluate(predicateName, renderContext)
```

Semantics align with `docs/normative/PredicateStateRendering.md`:

- `true` => render `then`
- `false` => render `else` if present, else empty string
- unknown predicate => false
- thrown predicate => false
- non-boolean predicate return => false

No inline-tag code may bypass predicate runtime or evaluate arbitrary expressions.

---

## 5) Render integration boundaries

Phase boundary is fixed:

- Inline tag resolution is render-time description assembly only.
- No evaluation during Capture/Plan/Commit/Bubble/lifecycle hooks.

Phase 1 integration points in current codebase:

- `bundles/bundle-rantamuta/lib/helpers/room-view-helper.js`
  - room base description
  - `metadata.descriptionVariants[].text`
  - `metadata.descriptionFragments[].text`
  - room item `roomDesc`
  - room NPC `roomDesc`
- `bundles/bundle-rantamuta/commands/look.js`
  - direct target `description`

Phase 1 does not require adding new entity-resolution scope sources.

---

## 6) Compilation and cache policy

### Compile model

- Compile template text to AST on first render of a unique source string.
- Reuse cached AST for subsequent renders.

### Node shape

- `TextNode { value }`
- `TagNode { predicate, thenNodes, elseNodes }`

### Cache key and policy

- Key: `<surfaceRef>:sha1(sourceText)`
- Policy: LRU
- Default capacity: `10000`

`surfaceRef` shape for Phase 1:

- `<entityRef>|<surface>`
- Examples:
  - `test:lantern|room.description`
  - `test:lantern|variant:0`
  - `test:lantern|fragment:2`
  - `item:lantern|look.description`

Runtime/cache ownership for Phase 1:

- Default to module-singleton runtime/cache ownership.
- Allow optional injected runtime/cache from world/context for future migration without interface break.

### Invalidation

- Source-hash keying is sufficient for Phase 1.
- If source text changes, a new key is produced; old entry ages out via LRU.

---

## 7) Error handling and diagnostics

### Runtime parse failures

- Fail-open for player stability:
  - return original source text unchanged
  - log warning diagnostic

### Runtime diagnostics

- Parser emits short error codes (`E_TAG_UNTERMINATED`, `E_MISSING_COLON`, etc.).
- Warning diagnostics should include at least:
  - `surfaceRef`
  - diagnostic code
- Route warnings to engine logger from GameState/world when available; fallback to Ranvier `Logger` only when world logger is unavailable.

### Validation path (Phase 1)

- No strict-mode expansion in Phase 1.
- Dedicated validator integration for inline-tag syntax is deferred to immediate follow-up.

---

## 8) Whitespace and formatting policy

- Renderer concatenates exactly what text/tag branches produce.
- No automatic whitespace collapse.
- No punctuation rewriting.
- Resolved output is passed through existing formatter unchanged in order.

---

## 9) Phase 1 scope for checklist authoring

### In scope

- Parser module for predicate-only inline tags with nesting/escaping.
- Evaluator/renderer module that walks AST and calls `runtime.evaluate`.
- LRU cache module with default capacity `10000`.
- Integration in room-view helper and direct-look target rendering.
- Unit/integration tests for parser, evaluator, cache, and integration paths.

### Out of scope

- Numeric comparator syntax.
- Strict validator mode and unknown-tag strictness flags.
- Eager compile-on-load.
- New feature flags/config keys.
- Metrics instrumentation and dashboarding.
- Entity-resolution expansion for new look scopes.

---

## 10) Checklist-ready acceptance baseline

A Phase 1 implementation is complete when all are true:

1. Predicate-only inline tags render correctly in covered surfaces.
2. Nested tags and escaping behave per grammar.
3. Rendering is read-only and deterministic for same input/context.
4. Predicate runtime remains the sole condition authority.
5. JIT compile + LRU cache are active with default capacity `10000`.
6. Runtime parse failures do not break rendering and are diagnosable.
7. `npm test` and `npm run ci:local` pass for behavior-changing work.

---

## 11) Immediate follow-up plan (post Phase 1)

1. Add validator integration for inline-tag syntax in `util/validate-bundles.js`.
2. Decide and implement strict-mode behavior for unknown identifiers.
3. Evaluate optional eager compile controls for hot content.
4. Reassess comparator syntax only after Phase 1 stability window.
