# Entity Resolution Investigation: Legacy Mode Removal

Status: draft  
Audience: Maintainers of `ranviermud` and `bundle-rantamuta`  
Scope: Investigation only for bundle-layer command interpretation and downstream command contracts

## 1) Why this investigation exists

`bundles/bundle-rantamuta/lib/runtime/command/entity-resolution.js` still contains a legacy mode and several legacy-shaped compatibility surfaces.

The key question investigated here is:

- was verb-local syntax matching implemented as a thin wrapper over the old direct/indirect classifier, or
- was real syntax-based matching implemented, with old legacy behavior retained afterward?

This document records the current answer, the historical sequence, and the practical work required if maintainers choose to remove the remaining legacy mode.

## 2) Short answer

For the current codebase, the answer is:

- verb-local syntax matching is real and primary,
- but legacy classifier machinery and legacy-shaped downstream contracts still remain.

So the present state is closer to:

- the new syntax-based rules were built,
- and the old legacy mode was left behind,

than to:

- the new syntax system being only a wrapper over the old one.

There is one important historical nuance:

- the first syntax-matching implementation briefly included a wrapper that auto-derived `syntaxRules` from legacy rule metadata,
- but that wrapper was removed shortly afterward.

## 3) Current state of the runtime

### 3.1 Receive Input no longer performs legacy structural inference

The parser intake stage now explicitly preserves the post-verb body token stream without splitting it into direct/indirect spans or inferring relation structure.

Evidence:

- `bundles/bundle-rantamuta/lib/parse-input.js`
  - `parseInput(...)` preserves `bodyTokens`
  - comments state it must not split direct/indirect spans or infer relation structure

Implication:

- legacy global relation-word structural inference is no longer the parser model.

### 3.2 Verb-local syntax matching is real

The syntax matcher is not fake. It is implemented as an ordered rule compiler plus recursive backtracking matcher.

Evidence:

- `bundles/bundle-rantamuta/lib/runtime/command/verb-local-syntax.js`
  - `compileSyntaxRule(...)`
  - `compileSyntaxRules(...)`
  - `tryMatchRule(...)`

Current supported slot kinds:

- `TEXT`
- `WORD`
- `NUMBER`
- `ENTITY`
- `LIVING`
- `EXIT`

The matcher:

- compiles authored syntax strings into literal/slot atoms,
- tries rules in declaration order,
- performs greedy variable-width capture with backtracking,
- resolves entity-bearing slots during matching rather than in a detached legacy post-pass.

Implication:

- syntax matching is a real interpretation system, not only a facade over the old classifier.

### 3.3 Entity resolution still contains legacy scaffolding

Although syntax matching is real, `entity-resolution.js` still carries legacy logic in several places.

Evidence in `bundles/bundle-rantamuta/lib/runtime/command/entity-resolution.js`:

- `detectLegacyShape(...)`
- `selectLegacyRuleKey(...)`
- `fallbackNoMatchForLegacyDeclaration(...)`
- `inferStructuralFailureRole(...)`
- `classifyStructuralBindingFailure(...)`
- fallback output with `ruleKey: 'legacy'` when no declaration exists

What this means:

- successful interpretation does not depend on the old direct/indirect parser path,
- but failure classification and no-declaration fallback still use legacy shape reasoning,
- and the resolver still emits a legacy-shaped downstream artifact.

### 3.4 Successful syntax matches are still projected into legacy buckets

Even when a syntax rule matches successfully, the runtime still derives and exports legacy-shaped rule categories:

- `intransitive`
- `direct`
- `indirect`
- `directIndirect`
- `relationOnly`

Evidence:

- `bundles/bundle-rantamuta/lib/runtime/command/verb-local-syntax.js`
  - `compileSyntaxRule(...)` computes `derivedRuleKey`
- `bundles/bundle-rantamuta/lib/runtime/command/entity-resolution.js`
  - `buildInterpretationValue(...)` exposes `ruleKey: selectedRule.derivedRuleKey || 'syntax'`

Implication:

- the old rule-shape vocabulary no longer drives parsing,
- but it still drives much of the command contract after parsing succeeds.

## 4) Historical sequence

This investigation also traced bundle history inside the `bundle-rantamuta` repository.

### 4.1 Before verb-local syntax matching

Before the syntax-matching work, `entity-resolution.js` used legacy rule metadata directly:

- keyed rule-form declarations such as `intransitive`, `direct`, `indirect`, `directIndirect`, `relationOnly`
- shape detection from direct span / indirect span / relation token
- direct rule selection from those shapes

### 4.2 Initial syntax-matching implementation briefly included a wrapper

Commit:

- `0eb33dbe` `Implement verb-local syntax matching`

That first implementation introduced real syntax matching, but it also included:

- `legacyRulesToSyntaxRules(...)` in `verb-local-syntax.js`

and used it here:

- `entity-resolution.js`
  - `syntaxRules: syntaxRules || Syntax.legacyRulesToSyntaxRules({ rules: legacyRules || {} })`

So, at that moment in history, there really was a wrapper layer:

- if explicit `syntaxRules` were absent,
- the runtime synthesized them from legacy rule metadata.

### 4.3 The wrapper was then removed

Commit:

- `b714ae69` `Add syntaxRules to tests`

This commit removed:

- `legacyRulesToSyntaxRules(...)`
- the old fully legacy success path `resolveLegacyDeclaration(...)`

and changed resolver behavior to require actual authored `syntaxRules` for successful interpretation.

Soon after:

- `171089a3` `Add missing syntaxRules`

updated tests so commands and fixtures explicitly declare `syntaxRules`.

Implication:

- the current codebase is not still using the old wrapper approach,
- even though it passed through that stage during the initial rollout.

## 5) Current downstream contract still depends on legacy-shaped interpretation

Even though syntax matching is primary, most commands still branch on legacy-derived `ruleKey` values.

Examples:

- `bundles/bundle-rantamuta/commands/inventory.js`
- `bundles/bundle-rantamuta/commands/look.js`
- `bundles/bundle-rantamuta/commands/go.js`
- `bundles/bundle-rantamuta/commands/put.js`
- `bundles/bundle-rantamuta/commands/take.js`
- `bundles/bundle-rantamuta/commands/open.js`
- `bundles/bundle-rantamuta/commands/lock.js`
- `bundles/bundle-rantamuta/commands/unlock.js`
- `bundles/bundle-rantamuta/commands/pull.js`
- `bundles/bundle-rantamuta/commands/push.js`
- `bundles/bundle-rantamuta/commands/close.js`

Typical current pattern:

- accept or reject by `resolution.ruleKey`
- branch behavior by `direct` vs `directIndirect`
- still read `entityResolution.rules` metadata keyed by legacy form names

### 5.1 `say` is the clearest example of the intended future direction

`say` has already moved farther than the other commands.

Evidence:

- `bundles/bundle-rantamuta/commands/say.js`
  - requires `matchedRuleText`
  - throws if only legacy `ruleKey` is present
  - branches on explicit rule text such as:
    - `TEXT to LIVING`
    - `TEXT`
    - `(empty)`

Supporting test:

- `bundles/bundle-rantamuta/tests/say.command.test.js`
  - asserts that invoking `say` with only legacy `ruleKey` and no `matchedRuleText` throws

Implication:

- `say` demonstrates that command logic can target verb-local syntax artifacts directly,
- but most other commands have not been migrated to that model.

## 6) Normative direction

The current normative contract aligns with syntax-first interpretation rather than legacy keyed rule forms.

Evidence:

- `docs/normative/EntityResolution.md`

Important statements there:

- each verb declares ordered `syntaxRules`
- keyed rule-form objects such as `intransitive`, `direct`, `indirect`, and `directIndirect` are no longer normative for command-shape declaration
- matching must not use global relation-word inference
- downstream semantic roles still remain `direct` and `indirect`

This distinction matters:

- `direct` / `indirect` as downstream semantic roles are still in contract
- `direct` / `indirect` / `directIndirect` as top-level command-shape declaration and routing vocabulary are not the normative command-shape model anymore

## 7) Conclusion to the original question

The most accurate answer is:

1. A real syntax-based matcher was implemented.
2. The initial rollout briefly included a wrapper that auto-derived syntax rules from legacy rule metadata.
3. That wrapper was removed.
4. What remains now is not parser-level legacy dependency so much as:
   - resolver-side legacy fallback/error machinery, and
   - a still-live downstream contract shaped around legacy `ruleKey` categories and legacy keyed rule metadata.

So if maintainers ask, “Which is it?”, the answer should be:

- historically, both happened during rollout,
- but in the current codebase the syntax matcher is real and primary,
- while legacy classifier artifacts and contracts remain as retained compatibility scaffolding.

## 8) What must be done to remove the remaining legacy mode

This breaks into two layers.

### 8.1 Layer A: remove resolver legacy fallback/scaffolding

This is the narrower cleanup.

It would require removing from `entity-resolution.js`:

- `detectLegacyShape(...)`
- `selectLegacyRuleKey(...)`
- `fallbackNoMatchForLegacyDeclaration(...)`
- `inferStructuralFailureRole(...)`
- `classifyStructuralBindingFailure(...)`
- fallback success output with `ruleKey: 'legacy'`

It would also require revisiting tests that currently expect legacy-shaped failure codes or no-declaration behavior.

This layer removes obvious resolver cruft.

### 8.2 Layer B: remove the live legacy-shaped downstream contract

This is the larger and more consequential change.

It would require:

- reducing or removing command branching on `resolution.ruleKey`
- reducing or removing dependence on keyed `entityResolution.rules` form names for command-shape routing
- moving more commands toward `matchedRuleText` or another syntax-native rule identity
- reworking helper contracts such as the door helpers that currently return legacy keyed rule config
- updating command tests that currently inject synthetic `ruleKey` fixtures

This touches a large surface area:

- command implementations
- command tests
- command-dispatch tests
- resolver tests
- likely some docs and design notes

## 9) Practical risk assessment

Removing the remaining legacy mode is not one single deletion pass.

There are at least three distinct risk levels:

### Low risk

- remove dead wrapper history assumptions
- remove unreachable or unnecessary legacy compatibility helpers if they are truly no longer exercised

### Medium risk

- remove resolver legacy fallback and legacy-only no-declaration behavior
- change how structural failure codes are produced

### Higher risk

- replace `ruleKey` as the operative command-routing surface across many commands and tests
- replace keyed `entityResolution.rules` shape vocabulary with a more syntax-native runtime contract

This higher-risk layer is closer to contract migration than cleanup.

## 10) Recommended next step

If maintainers want to proceed, the safest next step would be a scoped follow-up plan that separates:

1. resolver legacy fallback removal,
2. downstream `ruleKey` contract migration,
3. keyed `entityResolution.rules` policy migration.

Those should not be treated as one blind “delete legacy mode” task.

## 11) Files most relevant to a future removal effort

Primary runtime files:

- `bundles/bundle-rantamuta/lib/runtime/command/entity-resolution.js`
- `bundles/bundle-rantamuta/lib/runtime/command/verb-local-syntax.js`
- `bundles/bundle-rantamuta/lib/parse-input.js`

Representative commands:

- `bundles/bundle-rantamuta/commands/say.js`
- `bundles/bundle-rantamuta/commands/put.js`
- `bundles/bundle-rantamuta/commands/take.js`
- `bundles/bundle-rantamuta/commands/look.js`
- `bundles/bundle-rantamuta/commands/inventory.js`
- `bundles/bundle-rantamuta/commands/go.js`
- `bundles/bundle-rantamuta/commands/open.js`
- `bundles/bundle-rantamuta/commands/lock.js`
- `bundles/bundle-rantamuta/commands/unlock.js`
- `bundles/bundle-rantamuta/lib/runtime/doors/door-command-helper.js`

Representative tests:

- `bundles/bundle-rantamuta/tests/entity.resolution.test.js`
- `bundles/bundle-rantamuta/tests/verb.local.syntax.test.js`
- `bundles/bundle-rantamuta/tests/say.command.test.js`
- `bundles/bundle-rantamuta/tests/command.dispatch.test.js`
- command surface tests such as:
  - `inventory.command.test.js`
  - `look.command.test.js`
  - `go.command.test.js`
  - `put.command.test.js`
  - `take.command.test.js`
  - `door.commands.surface.test.js`

Normative contract:

- `docs/normative/EntityResolution.md`
