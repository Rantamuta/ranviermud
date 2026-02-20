# AGENTS.md

## Purpose

This repository is maintained with help from automated agents (Codex). This document defines non-negotiable constraints, maintenance policy, and the expected workflow so changes remain incremental, reviewable, and safe.

`ranviermud` is the **runnable wrapper and integration surface** for the Rantamuta MUD engine. It owns boot, configuration, wiring, and example playability, not engine internals.

## Agent role and stance

Agents working in this repository must act as **senior maintainers**.

- Prioritize **decision quality** over speed.
- Prefer explicit tradeoffs and documented uncertainty over confident but fragile changes.
- Treat this repo as an integration boundary: small changes can have large downstream effects.
- When in doubt, stabilize and document rather than “improve”.

## High-level goals

- Keep the project runnable and usable on modern Node LTS.
- Support a **pure maintenance 1.0 release** after a long dormancy.
- Restore and preserve a reliable out-of-the-box experience.
- Prefer small, reversible changes over rewrites.

## Non-goals

- No architectural redesign of Ranvier.
- No changes to engine internals (`Rantamuta/core`) unless explicitly requested.
- No CLI UX redesign.
- No “cleanup” refactors for style or aesthetics.
- No new features beyond maintenance and playability fixes.

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

- `npm test` **must always pass**.
- `npm run ci:local` **must exist** and **must always pass**
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

### `ci:local` expectations

- agents must ensure `npm run ci:local` passes locally before stopping the current task.
- `ci:local` must be a faithful representation of `.github/workflows/ci.yml`

## Required safety rails before risky changes

Before upgrading dependencies, changing runtime behavior, or touching boot logic:

- CI workflows must be syntactically valid and consistent with repo scripts.
- Deterministic installs via `npm ci` must be preserved.
- Ensure at least minimal coverage for:
  - boot on a clean clone
  - bundle loading
  - login flow or equivalent smoke test

Prefer a minimal smoke test over broad refactors.

## Modernization posture

This repository is in **maintenance mode**.

Default bias:

- document > test > guard > refactor
- configuration and tooling over code changes
- clarity and playability over elegance

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
- `npm test` and `npm run ci:local` pass locally
- no new correctness issues are discovered in a final pass

Do not continue with “nice-to-have” improvements beyond the stated scope.

## Escalation rule for uncertainty

If behavior is unclear:

- Add a test that captures current behavior first, or
- Document the uncertainty explicitly in the PR description.
- Do **not** guess and move on.

## Typecheck triage and remediation policy

When a task involves `npm run typecheck` failures, agents must treat it as triage first, not coding first.

- For each error, classify it as exactly one of:
- local type definition error (JSDoc/typedef is wrong)
- local implementation error (runtime code is wrong)
- core typedef error (`ranvier/types/*` contract is wrong)
- Provide an evidence table (file + line + reason) before making changes.

For type-only requests, default rule: **no runtime behavior changes**.

- Allowed in type-only fixes:
- JSDoc typedef corrections
- explicit type annotations/narrowing
- literal-type preservation (`ok: true` style)
- safe casts with documented rationale

- Not allowed in type-only fixes:
- adding fallback branches/defaults to silence errors
- changing control flow, side effects, or emitted output
- changing payload shapes unless behavior change is explicitly approved

If a type error appears to require behavior change:

- Stop and request explicit approval.
- Present two options:
- type-only containment
- behavior-changing implementation fix

Core typedef handling:

- Do not edit `node_modules` directly.
- Do not contort local runtime code to satisfy a suspected wrong core typedef.
- If a core typedef is wrong, propose a core typedef patch (or local override shim) and request approval, because engine/core changes are out of scope unless explicitly authorized.

PR/change note requirements for typecheck work:

- Include the error classification list.
- Include why each fix is type-only vs behavior-changing.
- Include `npm run typecheck` result before and after.

## Normative documents

Behavior contracts that are intended to be binding are stored under `docs/normative/`.

- `docs/normative/` is the canonical location for versioned, compatibility-impacting behavior specs.
- Keep `AGENTS.md` high-level; subsystem-specific behavioral mandates belong in `docs/normative/`.
- If a task changes behavior covered by a normative document, update that document (or explicitly document why no update is needed).
