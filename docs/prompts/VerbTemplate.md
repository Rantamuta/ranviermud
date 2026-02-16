# Verb Template

Practical template for adding a new bundle verb in `bundles/bundle-rantamuta`.

This is a shared guide for:

- agents implementing verbs from prompts
- humans reviewing/specifying verb behavior

For strict architecture rules, also read:

- `docs/normative/CommandArchitecture.md`
- `docs/normative/EntityResolution.md`
- `docs/prompts/agents/verb.md`

## 1) Preflight Contract

Fill this before coding:

| Field | Value |
|---|---|
| verbId |  |
| aliases |  |
| rule keys (`intransitive/direct/indirect/directIndirect/relationOnly`) |  |
| acceptedRelations (if relation-bearing) |  |
| scopeProfile.direct |  |
| scopeProfile.indirect |  |
| planner success outcome |  |
| planner failure codes |  |
| success narration contract |  |
| failure message ownership (`metadata.errorMessages`) |  |
| mutator instruction types needed |  |
| tests required |  |

Do not start implementation with unknown fields.

## 2) Command File Skeleton

Create `bundles/bundle-rantamuta/commands/<verbId>.js`:

```js
'use strict';

module.exports = {
  name: '<verbId>',
  aliases: [/* ... */],
  command: state => ({
    metadata: {
      entityResolution: {
        rules: {
          // one or more keyed rules:
          // intransitive: { ... }
          // direct: { scopeProfile: { direct: [ ... ] } }
          // indirect: { acceptedRelations: [ ... ], scopeProfile: { indirect: [ ... ] } }
          // directIndirect: { acceptedRelations: [ ... ], scopeProfile: { direct: [ ... ], indirect: [ ... ] } }
          // relationOnly: { acceptedRelations: [ ... ], scopeProfile: { indirect: [ ... ] } }
        },
      },
      errorMessages: {
        // CODE: 'Player-facing text'
      },
    },

    execute: (args, player, alias, context) => {
      const er = context && context.entityResolution;
      if (!er) {
        return { ok: false, error: { code: 'FORM_NOT_SUPPORTED' } };
      }

      // planner-only behavior:
      // - consume er.ruleKey / er.directTarget / er.indirectTarget
      // - build mutation plan (no direct world mutation)
      // - build render lines/instructions as delivery data
      // - return structured failure codes

      return {
        ok: true,
        plan: [
          // mutator instructions only
        ],
        render: {
          // lines: [ ... ],
          // instructions: [ ... ] // optional delivery instructions
        },
      };
    },
  }),
};
```

## 3) Phase Guardrails

- Entity Resolution is read-only and output-free.
- Capture reads bound entities; no mutation.
- Target builds `{ ok, plan, render? }` or `{ ok:false, error }`.
- Bubble can contribute render data only (no mutation operations).
- Commit is mutator-only.
- Render/Dispatch owns player-facing emission.

## 4) Failure and Narration Rules

- Use stable failure codes in planner.
- Map player text in `metadata.errorMessages`.
- Ensure every non-empty input gets visible feedback.
- Keep narration deterministic (span labels first if available; otherwise entity names).

## 5) Testing Checklist

Add/adjust tests for:

- rule/form selection and errors
- intransitive offramp (when relevant)
- relation canonical behavior (when relevant)
- scope precedence and deterministic tie behavior
- ambiguity vs indistinguishable auto-pick (when relevant)
- resolver no-side-effects guarantee
- dispatch integration path (`resolve -> capture -> target -> commit -> render`)
- success text assertions (stable output)

## 6) Validation Commands

Run and report:

```bash
cd bundles/bundle-rantamuta && npm test -- --runInBand
npm test
npm run ci:local
```

If `ci:local` is blocked, include exact blocker output.
