# Submodule Workflow (Non-Normative)

Status: maintainer guidance (non-normative)

This repo tracks `bundles/bundle-rantamuta` as a Git submodule. That means the root repo records a gitlink pointer to one specific bundle commit.

## Why root keeps looking changed

When you commit inside `bundles/bundle-rantamuta`, the root repo sees that pointer move. Root `git status` then shows a submodule change even if no root files were edited.

Tooling can also touch root files (for example `ranvier.json`) during local CI/setup workflows.

## Local noise-reduction config

These commands reduce day-to-day submodule noise in your local clone:

```bash
git config --local submodule.bundles/bundle-rantamuta.ignore all
git config --local diff.ignoreSubmodules all
git config --local status.submoduleSummary false
```

## What these commands mean

`submodule.bundles/bundle-rantamuta.ignore all`
- Tells Git to treat that submodule as ignored for status/diff in this local repo.
- Effect: root `git status` usually stops flagging the bundle pointer churn.

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
- They do not unlink `bundles/bundle-rantamuta` from its repo.
- They do not change remotes, branches, history, CI, or collaborators.

Main tradeoff:
- You can forget to make an intentional root pointer commit when you actually want to publish an integrated state.

## Recommended daily workflow

1. Do bundle development inside `bundles/bundle-rantamuta`.
2. Commit bundle changes there first.
3. If local tooling dirties `ranvier.json`, clean it immediately:

```bash
git restore --staged ranvier.json && git restore ranvier.json
```

4. If isolated `ci:local` fails due local-only submodule commit fetch, run:

```bash
npm run ci:local -- --in-place
```

5. When you want an integration checkpoint, intentionally update root pointer:

```bash
git add bundles/bundle-rantamuta
git commit -m "Update bundle-rantamuta pointer"
```

## How to inspect submodule state on demand

Even with ignore settings enabled, you can check bundle state explicitly:

```bash
git -C bundles/bundle-rantamuta status --short --branch
git -C bundles/bundle-rantamuta log --oneline -n 5
```

And temporarily override root diff behavior for one command:

```bash
git -c diff.ignoreSubmodules=none diff --submodule=log
```

## Undo these local settings

If you want default Git behavior back:

```bash
git config --local --unset submodule.bundles/bundle-rantamuta.ignore
git config --local --unset diff.ignoreSubmodules
git config --local --unset status.submoduleSummary
```

Or set explicit defaults:

```bash
git config --local submodule.bundles/bundle-rantamuta.ignore none
git config --local diff.ignoreSubmodules none
git config --local status.submoduleSummary true
```
