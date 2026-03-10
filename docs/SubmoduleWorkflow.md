# Submodule Workflow (Non-Normative)

Status: maintainer guidance (non-normative)

This repo tracks these Git submodules:

- `bundles/bundle-rantamuta`
- `docs/lore`

The root repo records a gitlink pointer to one specific commit for each submodule.

## Why root keeps looking changed

When you commit inside `bundles/bundle-rantamuta`, the root repo sees that pointer move. Root `git status` then shows a submodule change even if no root files were edited.

Tooling can also touch root files (for example `ranvier.json`) during local CI/setup workflows.

## Local noise-reduction config

These commands reduce day-to-day submodule noise in your local clone:

```bash
git config --local submodule.bundles/bundle-rantamuta.ignore all
git config --local submodule.docs/lore.ignore all
git config --local diff.ignoreSubmodules all
git config --local status.submoduleSummary false
```

## What these commands mean

`submodule.bundles/bundle-rantamuta.ignore all`
- Tells Git to treat the bundle submodule as ignored for status/diff in this local repo.
- Effect: root `git status` usually stops flagging bundle pointer churn.

`submodule.docs/lore.ignore all`
- Tells Git to treat the lore submodule as ignored for status/diff in this local repo.
- Effect: root `git status` usually stops flagging lore pointer churn.

`diff.ignoreSubmodules all`
- Suppresses submodule diffs by default.
- Effect: `git diff` in root will not show submodule commit delta unless explicitly overridden.

`status.submoduleSummary false`
- Disables extra submodule summary lines in status output.
- Effect: less status verbosity.

## Safety and implications

These settings are local-only and low-risk operationally:
- They write to `.git/config` in your clone only.
- They do not modify `.gitmodules`.
- They do not unlink either submodule from its repo.
- They do not change remotes, branches, history, CI, or collaborators.

Main tradeoff:
- You can forget to make an intentional root pointer commit when you actually want to publish an integrated state.

## Recommended daily workflow

1. Do submodule development inside the submodule path (for example `bundles/bundle-rantamuta` or `docs/lore`).
2. Commit and push submodule changes there first.
3. If local tooling dirties `ranvier.json`, clean it immediately:

```bash
git restore --staged ranvier.json && git restore ranvier.json
```

4. If isolated `ci:local` fails due local-only submodule commit fetch, run:

```bash
npm run ci:local -- --in-place
```

5. When you want an integration checkpoint, intentionally update root pointer(s):

```bash
git add bundles/bundle-rantamuta
git add docs/lore
git commit -m "Update submodule pointers"
```

## Lore submodule workflow

`docs/lore` is intended to host private lore and planning material while remaining outside runtime behavior.

Typical authoring flow:

```bash
git -C docs/lore checkout main
# edit files under docs/lore
git -C docs/lore add .
git -C docs/lore commit -m "Update lore docs"
git -C docs/lore push

# then record pointer move in this repo
git add docs/lore
git commit -m "Update lore submodule pointer"
```

## How to inspect submodule state on demand

Even with ignore settings enabled, you can check submodule state explicitly:

```bash
git -C bundles/bundle-rantamuta status --short --branch
git -C bundles/bundle-rantamuta log --oneline -n 5
git -C docs/lore status --short --branch
git -C docs/lore log --oneline -n 5
```

And temporarily override root diff behavior for one command:

```bash
git -c diff.ignoreSubmodules=none diff --submodule=log
```

## Undo these local settings

If you want default Git behavior back:

```bash
git config --local --unset submodule.bundles/bundle-rantamuta.ignore
git config --local --unset submodule.docs/lore.ignore
git config --local --unset diff.ignoreSubmodules
git config --local --unset status.submoduleSummary
```

Or set explicit defaults:

```bash
git config --local submodule.bundles/bundle-rantamuta.ignore none
git config --local submodule.docs/lore.ignore none
git config --local diff.ignoreSubmodules none
git config --local status.submoduleSummary true
```
