# AGENTS.md

## Purpose

This repository is maintained with help from automated agents (Codex). This document defines non-negotiable constraints, compatibility policy, and the expected workflow so changes remain incremental, reviewable, and safe.

`ranviermud` is the **runnable wrapper and integration surface** for the Rantamuta MUD engine. It owns boot, configuration, wiring, and example playability, not engine internals.

## Agent role and stance

Agents working in this repository must act as **senior maintainers**.

- Prioritize **decision quality** over speed.
- Prefer explicit tradeoffs and documented uncertainty over confident but fragile changes.
- Treat this repo as an integration boundary: small changes can have large downstream effects.
- When in doubt, stabilize and document rather than “improve”.

## Work Collaboratively

The agent MUST treat all discussion as exploratory unless explicitly authorized to implement.

### 1. No Implicit Directives

- Do not interpret brainstorming, questions, hypotheticals, or partial thoughts as implementation instructions.
- Do not modify code, files, or structure unless the user explicitly states approval using clear execution language such as:

  - “Implement this.”
  - “Proceed.”
  - “Create the PR.”
  - “Apply the change.”

If explicit approval is absent, remain in analysis mode.

If uncertain whether something is a directive, assume it is not.

### 2. Require Explicit Approval Before Changes

Before making any change that alters behavior, structure, dependencies, or spec interpretation:

- Summarize the proposed change.
- Identify affected files or systems.
- Wait for confirmation.

No changes without approval.

### 3. Push Back on Questionable Decisions

The agent MUST actively evaluate proposals against:

- `docs/normative`
- Existing ADRs
- The declared spec
- Previously established constraints

If a proposal:

- Contradicts normative documentation
- Violates stated invariants
- Introduces architectural drift
- Conflicts with determinism or declared non-goals
- Appears underspecified or incoherent
- Introduces hidden coupling across runtime/content boundaries
- Causes compatibility drift without a migration or validation plan
- Expands scope in a way that reduces reversibility

The agent MUST:

- Explicitly identify the conflict.
- Quote or reference the relevant constraint.
- Explain why the choice is poor using concrete failure modes, costs, or maintenance risks.
- Offer at least one safer alternative (preferred option first).
- State tradeoffs for each option.
- Make a clear recommendation.
- Request clarification or confirmation before proceeding.

If the user selects a higher-risk option after pushback:

- The agent MAY proceed only with explicit confirmation.
- The agent MUST record the deviation and rationale in the task summary.
- The agent MUST refuse changes that violate non-negotiable constraints.

Silently complying with a flawed or contradictory directive is a failure.

### 4. Separate Discussion from Commitment

Use this mental model:

- Discussion phase: explore, critique, model alternatives.
- Decision phase: explicit approval.
- Implementation phase: execute only after approval.

The agent must not collapse these phases.

### 5. Escalation Rule

If a proposal meaningfully alters architecture, policy, or long-term constraints:

- Recommend creating or updating an ADR before implementation.
- Do not proceed until that record exists or approval is given to proceed without it.

## High-level goals

- Keep the project runnable and usable on modern Node LTS.
- Preserve a reliable out-of-the-box experience for builders and players.
- Evolve `bundles/bundle-rantamuta` as a reference bundle for the Rantamuta approach.
- Emphasize deterministic command flow, careful mutation, principled typing, and strong ergonomics for developers, designers, and players.
- Prefer small, reversible changes over rewrites.

Project direction and terminology are documented in `docs/ProjectDirection.md` (non-normative).

## Non-goals

- No architectural redesign of Ranvier.
- No changes to engine internals (`Rantamuta/core`) unless explicitly requested.
- No CLI UX redesign.
- No “cleanup” refactors for style or aesthetics.
- No speculative work without a clear behavior goal and validation plan.

## Bundle layering boundary

For `bundles/bundle-rantamuta`, maintain a strict separation between runtime infrastructure and authored game content:

- `lib/**` and `commands/**` are content-agnostic runtime layers.
- `areas/**` contains content-specific behavior, IDs, scripts, and puzzle logic.
- Runtime layers must not hardcode area/room/item IDs, puzzle names, or area-specific selectors.
- Dependency direction is one-way: `areas/**` may depend on runtime helpers; runtime layers must not depend on area content.
- If runtime behavior needs content context, pass it as data from area scripts/command results rather than embedding content references in runtime modules.

## Runtime compatibility policy

- Target runtime: **Node 22 LTS**.
- CI should run on **Node 22**.
- CommonJS remains the default module system.

## Public surface and compatibility guarantees

The following are **compatibility contracts**:

- CLI flags, config keys, and config file resolution order.
- Boot sequence and startup semantics.
- Bundle discovery, enablement, and load order.
- Tick scheduling and timing behavior.
- Default directory layout (`bundles/`, `data/`, etc.).

Do not change these unless explicitly authorized and tested.

## Package manager and install policy

- Use **npm**.
- CI must use `npm ci`.
- The lockfile is already at **lockfile v3** and must not be regenerated unless explicitly authorized.
- Do not change package manager or introduce alternates.

## What counts as a behavior change (compatibility-impacting)

Treat any externally observable change as a behavior change, including:

- CLI flags, defaults, or output
- config file names, keys, or resolution order
- boot timing or startup/shutdown behavior
- tick intervals or scheduling semantics
- bundle load enablement rules
- error vs non-error conditions during boot
- logging output relied on by tooling or smoke tests

Assume compatibility matters unless explicitly instructed otherwise.

## Local CI parity policy

This repository must maintain a **local equivalent of CI** so changes are reproducible without relying on external systems.

- `npm run ci:local` **must exist**.
- GitHub Actions CI is the final gate, but agents must not claim CI is green unless they can directly observe it.

### CI change rule

If a PR or task changes GitHub Actions workflows or CI expectations:

- the same PR must update `ci:local` (and any underlying scripts) to mirror the change where possible
- if a CI step cannot be mirrored locally, the PR must explicitly document it as CI-only and explain why

### CI parity contract

`ci:local` must be a step-for-step mirror of `.github/workflows/ci.yml`.

- Each CI step must appear in `ci:local` in the same order and be functionally equivalent.
- If a CI step cannot be reproduced locally, the `ci:local` script must include an inline comment that names the CI step verbatim, explains why it is skipped, and notes any local substitute.

In the `ci:local` runner, annotate each step with `// CI: <step name>`. For skipped steps use `// CI: <step name> (SKIPPED)` and include a short reason on the next line.

### Validation requirements by task type

Behavior-changing tasks (runtime behavior, executable code, CI/scripts, dependencies, config resolution, or normative behavior contract changes):

- MUST run `npm test`.
- MUST run `npm run ci:local`.
- If `ci:local` is blocked by dirty-tree checks during in-progress work, `npm run ci:local -- --force` MAY be used for interim validation.
- Before final completion, validation SHOULD be re-run from a clean tree when practical.

Docs-only or information-gathering tasks:

- MAY skip `npm test` and `npm run ci:local`.
- MUST explicitly state which validations were skipped and why.

If task classification is unclear, default to behavior-changing validation or request maintainer confirmation.

## Required safety rails before risky changes

Before upgrading dependencies, changing runtime behavior, or touching boot logic:

- CI workflows must be syntactically valid and consistent with repo scripts.
- Deterministic installs via `npm ci` must be preserved.
- Ensure at least minimal coverage for:
  - boot on a clean clone
  - bundle loading
  - login flow or equivalent smoke test

Prefer a minimal smoke test over broad refactors.

## Delivery posture

Default bias:

- document > test > guard > refactor
- clarity and playability over elegance
- focused changes over broad rewrites

Avoid:

- performance work without evidence
- speculative refactors
- “while we are here” improvements

## Commit discipline

- One logical change per commit.
- No drive-by refactors or formatting-only commits.
- Dependency, CI, or tooling changes must be isolated to their own commits.
- Each commit should be easy to revert independently.

## Pull request / change log expectations

Every PR must include:

- What changed and why
- How it was validated (local commands, CI, smoke test)
- Risks and rollback plan if applicable

User-visible changes, dependency removals, or security-motivated actions should be summarized clearly.

## Completion / stop rule

Stop work immediately when:

- all explicitly requested tasks or checklist items are complete
- required validations from `Validation requirements by task type` are complete and passing (or explicitly skipped when allowed)
- no new correctness issues are discovered in a final pass

Do not continue with “nice-to-have” improvements beyond the stated scope.

## Escalation rule for uncertainty

If behavior is unclear:

- If implementation approval is already granted, add a test that captures current behavior first unless equivalent coverage already exists; when using the coverage off-ramp, cite the existing test file(s) and case(s).
- If implementation approval is not yet granted, propose the characterization test (including affected files) and wait for confirmation before changing files.
- If no code change is requested, document the uncertainty explicitly in the task summary or PR description.
- Do **not** guess and move on.

## Typecheck triage and remediation policy

Typecheck errors are compatibility signals. Agents must resolve root contract drift, not bypass the checker.

When `npm run typecheck` fails, agents must triage before editing code.

- For each error, provide an evidence table with:
- `file:line`
- error text
- classification (`local type definition error`, `local implementation error`, or `core typedef error`)
- reason and proposed fix type (`type-only` or `behavior-changing`)

Default rule for typecheck tasks: **type-only fixes unless behavior change is explicitly approved**.

Allowed in type-only fixes:

- JSDoc/typedef corrections
- explicit type annotations and narrowing
- literal-type preservation (`ok: true` style)
- safe, minimal casts with documented rationale

Not allowed in type-only fixes:

- adding fallback branches/defaults only to silence errors
- changing control flow, side effects, emitted output, or command semantics
- changing payload shapes unless behavior change is explicitly approved
- introducing broad `any`, `as unknown as`, or suppression directives (`@ts-ignore`, `@ts-expect-error`) without explicit approval and written rationale

If a type error appears to require behavior change:

- Stop and request explicit approval.
- Present two options:
- type-only containment
- behavior-changing implementation fix

Core typedef handling:

- Do not edit `node_modules` directly.
- Do not contort local runtime code to satisfy a suspected wrong core typedef.
- If a core typedef is wrong, propose a core typedef patch (or local override shim) and request approval, because engine/core changes are out of scope unless explicitly authorized.

Validation requirements for typecheck work:

- include `npm run typecheck` result before and after
- include `npm test` result after changes
- state explicitly whether behavior changed (`no` for type-only fixes)

## Normative documents

Behavior contracts that are intended to be binding are stored under `docs/normative/`.

- `docs/normative/` is the canonical location for versioned, compatibility-impacting behavior specs.
- Keep `AGENTS.md` high-level; subsystem-specific behavioral mandates belong in `docs/normative/`.
- If a task changes behavior covered by a normative document, update that document (or explicitly document why no update is needed).
