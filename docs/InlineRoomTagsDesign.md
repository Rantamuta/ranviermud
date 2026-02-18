# Inline Entity Tags in Room Descriptions (Design Proposal)

## Status

Draft proposal for maintenance-mode implementation in `ranviermud`.

This document preserves the existing author contract (`[cond:then|else]` and `[sense>n:text]`) while making the behavior deterministic, parseable, cacheable, and testable. It explicitly supports nested tags, since compiled parsing already builds a tree representation.

---

## 1) Author-facing syntax contract

### Supported forms

- Boolean conditional with optional else:
  - `[flag:then]`
  - `[flag:then|else]`
- Numeric comparator:
  - `[stat>10:text]`
  - `[stat>=10:text]`
  - `[stat<10:text]`
  - `[stat<=10:text]`
  - `[stat==10:text]`
  - `[stat!=10:text]`

### Compatibility notes

- Whitespace is allowed around operators and after `:`.
  - `[hear>10:You hear...]` and `[hear > 10: You hear...]` are equivalent.
- Else branch is optional.
  - If omitted and condition is false, output is empty string.
- Nested tags are **supported in v1**.
  - Example: `[isNight:[isRaining:dark and wet|dark and still]|bright]`

---

## 2) Formal grammar (v1)

EBNF-like grammar over a single room description string:

```ebnf
Document        := Segment*
Segment         := Text | Tag
Tag             := '[' Condition ':' Branch ('|' Branch)? ']'

Condition       := Identifier Comparator Number
                 | Identifier

Comparator      := '>=' | '<=' | '==' | '!=' | '>' | '<'
Identifier      := [A-Za-z_][A-Za-z0-9_]*
Number          := '-'? [0-9]+ ('.' [0-9]+)?

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

### Compile once

At area load (or bundle validation), parse each room description into a compact compiled tree:

- `TextNode { value }`
- `TagNode { condition, thenNodes, elseNodes, sourceRange }`

Where:

- `condition` is either:
  - `{ kind: 'flag', name }`
  - `{ kind: 'compare', name, op, rhs }`
- `thenNodes` and `elseNodes` are arrays of `TextNode | TagNode` (nested tags supported).

Cache compiled AST by room reference + source hash:

- key: `<area>:<roomId>:sha1(description)`
- value: compiled AST + diagnostics (if any)

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

Condition names are resolved through explicit whitelisted resolvers only:

```js
resolveFlag(name, ctx) -> boolean | undefined
resolveStat(name, ctx) -> number | undefined
```

Evaluation semantics:

- Bare identifier (`[isSwitch:...]`) uses `resolveFlag`.
- Comparator condition (`[hear>10:...]`) uses `resolveStat`.
- Unknown identifier:
  - During validation: warning (or error in strict mode).
  - During runtime: evaluates `false`.
- Type mismatch (`resolveStat` returns non-number): evaluates `false` and logs debug diagnostic once per template.

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

- **Area/bundle load**: hard fail on syntax errors in descriptions (default).
- Runtime should not parse; it only evaluates previously compiled templates.

### Diagnostic shape

Each parse error reports:

- room reference (`area:roomId`)
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

- Parse every room `description`.
- Emit diagnostics with room/file location mapping.
- Exit non-zero on syntax errors.
- Optional `--warn-unknown-tags` for unresolved identifiers.

This gives fast author feedback before runtime playtesting.

---

## 10) Test matrix (minimum)

1. Boolean true/false with and without else.
2. Numeric comparators for each operator.
3. Whitespace variants around condition and `:`.
4. Adjacent tags with no separators.
5. Escaped delimiters in prose and in branches.
6. Unknown identifiers (validation warning + runtime false).
7. Type mismatch on numeric resolver.
8. Nested tag rendering:
   - nested true/false branches
   - nested tags in else branches
   - nested tags adjacent to text and punctuation
9. Malformed tags:
   - unterminated tag
   - missing `:`
   - invalid comparator
   - malformed nested close/open balance
10. Deterministic output snapshot for same input/context.
11. Formatting integration:
    - resolved string still parses through ANSI pipeline
    - stripping/translation behavior unchanged except conditional inclusion

---

## 11) Rollout plan (maintenance-safe)

1. Implement parser + evaluator in isolated module.
2. Add unit tests for parser/evaluator first.
3. Integrate into room description render path behind config flag:
   - `features.inlineRoomTags` default `false` for first release.
4. Add bundle validation checks.
5. Enable in example content and smoke test.
6. After confidence window, default flag to `true` (optional follow-up).

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

- Keep condition language small: boolean identifier or numeric comparison only.
- Keep resolver interface explicit and whitelisted.
- Keep parser deterministic and linear-time with clear diagnostics.
- Keep formatting pipeline order fixed: resolve tags first, then ANSI/web formatting.

Net: with these constraints, this is a practical maintenance-grade feature, not an architectural risk.
