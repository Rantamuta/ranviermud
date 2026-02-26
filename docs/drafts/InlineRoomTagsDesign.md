# Inline Entity Tags in Perceivable Descriptions (Design Proposal)

## Status

Draft proposal for maintenance-mode implementation in `ranviermud`.

This document preserves a constrained author contract (`[predicate:then|else]`) while making the behavior deterministic, parseable, cacheable, and testable. It explicitly supports nested tags, since compiled parsing already builds a tree representation.

---

## 1) Author-facing syntax contract

### Supported forms

- Predicate conditional with optional else:
  - `[is_slab_open:then]`
  - `[is_slab_open:then|else]`

### Compatibility notes

- Whitespace is allowed after `:`.
  - `[is_slab_open:You see...]` and `[is_slab_open: You see...]` are equivalent.
- Else branch is optional.
  - If omitted and condition is false, output is empty string.
- Nested tags are **supported in v1**.
  - Example: `[isNight:[isRaining:dark and wet|dark and still]|bright]`

---

## 2) Formal grammar (v1)

EBNF-like grammar over a single perceivable description string:

```ebnf
Document        := Segment*
Segment         := Text | Tag
Tag             := '[' Condition ':' Branch ('|' Branch)? ']'

Condition       := PredicateName

PredicateName   := [A-Za-z_][A-Za-z0-9_]*

Branch          := BranchSegment*
BranchSegment   := Text | Tag

Text            := TextChar+
TextChar        := EscapedChar | any codepoint except unescaped '['
EscapedChar     := '\\' ('[' | ']' | ':' | '|' | '\\')
```

Parsing rules:

Implementation note:

- A simple regex can still be used as a fast pre-check for non-nested tags, but full parsing must be depth-aware to correctly support nesting and escaped delimiters.
- Recommended implementation is a **forward-only single-pass scanner** with bracket-depth counting and a tiny stack for current branch state (`then`/`else`).
- No parser generator, no backtracking, no expression engine.


1. `[` starts a tag unless escaped as `\[`.
2. `]` closes the current tag unless escaped as `\]`.
3. `|` splits then/else only at the current tag depth (depth 1 for the currently parsed tag) and only when unescaped.
4. `:` splits condition/body only for the currently parsed tag (depth 1) and only when unescaped.
5. Unescaped `[` inside a branch begins a nested tag; the parser tracks depth until the matching `]`.

---

## 3) Escaping rules

Use backslash escaping consistently in text and branch bodies:

- `\[` literal `[`
- `\]` literal `]`
- `\:` literal `:`
- `\|` literal `|`
- `\\` literal `\`

Unknown escapes (for example `\x`) are treated as literal `\x` for author friendliness.

Rationale: one escape mechanism avoids mode switching for authors and works in prose + tag bodies.

---

## 4) Compiled representation and render contract

### Compile on first render (JIT)

At first render of a perceivable description, parse the template into a compact compiled tree and cache it for subsequent renders:

- `TextNode { value }`
- `TagNode { condition, thenNodes, elseNodes, sourceRange }`

Where:

- `condition` is always:
  - `{ kind: 'predicate', name }`
- `thenNodes` and `elseNodes` are arrays of `TextNode | TagNode` (nested tags supported).

Cache compiled AST by perceivable reference + source hash:

- key: `<surfaceRef>:sha1(description)`
- value: compiled AST + diagnostics (if any)

JIT motivation:

- Large procedural worlds may include many perceivable surfaces that are never visited/read.
- Eager compile-at-load wastes CPU and memory churn for cold content.
- JIT compilation keeps startup and generation costs lower while preserving fast repeated renders for hot rooms.
- First view of a room may pay a small one-time compile cost; subsequent renders are cached.

Validation note:

- Bundle/area validation tools should still be able to parse all perceivable descriptions for author feedback.
- Runtime render path compiles lazily and reuses compiled results.

### Evaluate many

Render algorithm:

1. Walk AST in order.
2. `TextNode`: append raw text.
3. `TagNode`: evaluate condition against resolver interface; recursively render then/else branch nodes.
4. Join to raw resolved prose.
5. Pass output into existing formatting pipeline.

Determinism requirement:

- Rendering must be pure relative to `(compiledTemplate, context, resolver implementation)`.
- No hidden global mutable state.

---

## 5) Resolver interface and safety contract

Condition names are resolved through the area-local predicate registry contract in `docs/normative/PredicateStateRendering.md`:

```js
evaluatePredicate(name, renderContext) -> boolean
```

Evaluation semantics:

- Every condition (`[is_slab_open:...]`) resolves as a registered predicate name.
- Unknown predicate:
  - During validation: warning (or error in strict mode).
  - During runtime: evaluates `false` under the normative predicate evaluator contract.
- Non-boolean predicate returns and predicate throws evaluate `false` under the same contract.

Security properties:

- No expression evaluation.
- No function calls in template.
- No arbitrary code execution.

---

## 6) Formatting pipeline integration

Choose **Option A**:

1. Evaluate inline tags first (to plain resolved text).
2. Run normal markup/ANSI translation based on client capabilities.

Why Option A:

- Keeps this feature independent from renderer-specific markup concerns.
- Avoids mixing two grammars in one parser.
- Preserves current “render text then format for client” architecture used in MUD pipelines.

Constraint:

- Inline parser must treat ANSI-style tokens as ordinary text unless they include unescaped bracket syntax.
- Nested inline tags are resolved before ANSI translation so final rendered prose still flows through one formatter pass.

---

## 7) Whitespace/punctuation policy (v1)

Use explicit author control, no automatic whitespace mutation.

Rules:

- Renderer concatenates exactly what branches produce.
- Empty false branch yields empty string only.
- No auto-trim, no smart space collapse, no punctuation rewriting.

Authoring guidance:

- Include spaces/punctuation inside branches where needed:
  - `turned [isSwitch:on|off].`
  - `[isSwitch: There is light.|]`

Rationale: deterministic and unsurprising; avoids hidden formatting side effects.

---

## 8) Error handling and diagnostics

### Failure mode

- **Validation path (`util/validate-bundles.js`)**: hard fail on syntax errors in perceivable descriptions (default).
- Runtime compiles lazily on first render and should cache the compiled result for subsequent evaluations.
- If a runtime parse fails unexpectedly, output a diegetic fallback line and log diagnostics. Runtime must not expose raw source template text and must not return blank output.

### Diagnostic shape

Each parse error reports:

- perceivable reference (`area:entityId:field`)
- line and column
- absolute index
- short code (`E_TAG_UNTERMINATED`, `E_MISSING_COLON`, etc.)
- readable message
- source snippet with caret

Example:

```
limbo:white rooms.yml:12:34 E_MISSING_COLON
[isSwitch on|off]
         ^ expected ':' after condition
```

---

## 9) Validation tooling plan

Add validation to bundle/area load path and `util/validate-bundles.js`:

- Parse every perceivable `description` surface (rooms/items/NPCs/look-read outputs).
- Emit diagnostics with room/file location mapping.
- Exit non-zero on syntax errors.
- Optional `--warn-unknown-tags` for unresolved predicate names.

This gives fast author feedback before runtime playtesting.

---

## 10) Test matrix (minimum)

1. Predicate true/false with and without else.
2. Whitespace variants around predicate names and `:`.
3. Adjacent tags with no separators.
4. Escaped delimiters in prose and in branches.
5. Unknown predicates (validation warning + runtime false).
6. Non-boolean/throwing predicate handling delegates to normative evaluator behavior.
7. Nested tag rendering:
   - nested true/false branches
   - nested tags in else branches
   - nested tags adjacent to text and punctuation
8. Malformed tags:
   - unterminated tag
   - missing `:`
   - invalid predicate name token
   - malformed nested close/open balance
9. Deterministic output snapshot for same input/context.
10. Formatting integration:
    - resolved string still parses through ANSI pipeline
    - stripping/translation behavior unchanged except conditional inclusion

---

## 11) Rollout plan (maintenance-safe)

1. Implement parser + evaluator in isolated module.
2. Add unit tests for parser/evaluator first.
3. Integrate into perceivable description render paths directly (no feature flag).
4. Add bundle validation checks.
5. Enable in example content and smoke test.
This staged approach limits compatibility risk while preserving author-facing syntax.


---

## 12) Engineering judgment and pushback

This approach is reasonable and does **not** need to become a large templating subsystem if we keep strict boundaries.

### Where this is simple

- Author syntax stays inline in prose (`[...]`).
- Parsing can be done with one forward scan and depth counting.
- Rendering is simple tree walk + string concatenation + existing formatter.

### Where this becomes messy (and should be rejected)

- If conditions become arbitrary expressions (for example `a && (b || c)`).
- If inline templates can call arbitrary functions or execute script.
- If whitespace rewriting becomes heuristic and implicit.

### Guardrails to keep complexity contained

- Keep condition language small: predicate name only.
- Keep resolver interface explicit and whitelisted.
- Keep parser deterministic and linear-time with clear diagnostics.
- Keep formatting pipeline order fixed: resolve tags first, then ANSI/web formatting.

Net: with these constraints, this is a practical maintenance-grade feature, not an architectural risk.

---

## 13) Decision record and deferred follow-ups before implementation

The following captures decisions made during review and what is intentionally deferred.

### A) Runtime strategy and caching

1. **Optional eager compile-on-load is deferred to the immediate post-phase-1 follow-up.**
   - v1 runtime strategy remains JIT-only for first implementation pass.
2. **Eager compile opt-in name/location is deferred with eager-compile support itself.**
   - Resolve config surface only if/when eager precompile is introduced.
3. **Runtime cache policy for v1:** LRU.
4. **Runtime cache capacity for v1:** default `10000` compiled templates.
5. **Runtime description mutation policy (recorded decision):**
   - Description mutation is generally allowed.
   - If a runtime mutation attempts to set a description containing inline tags, the mutation should fail with a warning in v1.
   - Rationale: avoid coupling dynamic prose mutation paths with inline-tag template compilation during initial rollout.

### B) Validation and failure policy

6. **Unknown predicates remain warnings by default for initial implementation.**
7. **Strict mode in `util/validate-bundles.js` is deferred to immediate post-phase-1 work.**
   - Intent is to add strict-mode harnessing right after baseline runtime implementation is proven.

### C) Resolver contract

9. **Predicates only in v1 (no flags/stats/attribute comparators).**
   - Conditions must map to area-local registered predicates per `docs/normative/PredicateStateRendering.md`.
10. **Numeric coercion is explicitly out of scope for this round.**
   - Comparator/value grammar is deferred until non-predicate conditions are introduced.
11. **Diagnostic rate-limiting is deferred.**
   - Start with straightforward diagnostics; revisit dedupe only if log noise proves operationally painful.

### D) Rollout and observability

12. **Performance validation is required before broad rollout.**
   - Add performance tests that exercise cold compile cost, hot-cache render throughput, and mixed-surface access patterns.
13. **Metrics remain out of scope for this round.**
   - Revisit production counters after initial performance test evidence.
14. **Rollback mechanics documentation is deferred.**
   - Add explicit rollback runbook details once implementation shape is concrete.
