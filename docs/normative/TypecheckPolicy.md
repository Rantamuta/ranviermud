# Typecheck Policy

This document defines the normative process for triaging and fixing typecheck failures in this repository.

## Status

- Status: normative-v1
- Scope: Typecheck triage and remediation workflow
- Binding: yes

## Purpose

- Treat typecheck failures as compatibility signals.
- Resolve contract drift at the source rather than bypassing type safety.
- Keep type-only remediation distinct from behavior changes.

## Triage Requirement

When `npm run typecheck` fails, triage MUST occur before editing code.

For each error, record:

- `file:line`
- error text
- classification:
  - `local type definition error`
  - `local implementation error`
  - `core typedef error`
- reason and proposed fix type:
  - `type-only`
  - `behavior-changing`

## Default Fix Rule

Default for typecheck tasks: type-only fixes unless behavior change is explicitly approved.

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

## Behavior-Change Escalation

If a type error appears to require behavior change:

- stop and request explicit approval
- present two options:
  - type-only containment
  - behavior-changing implementation fix

## Core Typedef Handling

- Do not edit `node_modules` directly.
- Do not contort local runtime code to satisfy a suspected wrong core typedef.
- If a core typedef is wrong, propose a core typedef patch (or local override shim) and request approval, because engine/core changes are out of scope unless explicitly authorized.

## Validation Requirements

- include `npm run typecheck` result before and after
- include `npm test` result after changes
- state explicitly whether behavior changed (`no` for type-only fixes)
