# Submodule Workflow (Non-Normative)

Status: maintainer guidance (non-normative)

This repository tracks one Git submodule:

- `bundles/bundle-rantamuta`

`docs/lore` is intentionally not tracked by this repository. It is expected to be a local clone and is ignored by Git in `ranviermud`.

## Quick mental model

For tracked submodules, the superproject stores a gitlink pointer (mode `160000`) to one commit in the submodule repository.

- `ranviermud` is the superproject repository.
- `bundles/bundle-rantamuta` is a separate repository nested under it.
- `.gitmodules` maps submodule path to remote URL.

Committing inside the bundle submodule and committing the pointer update in the superproject are separate operations.

## Why root keeps looking changed

When you commit inside `bundles/bundle-rantamuta`, the root repository sees that pointer move. Root `git status` then shows a submodule change even if no root files were edited.

Tooling can also touch root files (for example `ranvier.json`) during local setup workflows.

## Why submodule conflicts look strange

Submodule conflicts are pointer conflicts, not content merge conflicts. A conflict hunk like this:

```diff
-Subproject commit <sha-a>
+Subproject commit <sha-b>
```

means "which submodule commit should the superproject point to?"

Resolve by selecting the intended commit SHA, then stage the pointer:

```bash
# only needed if <desired-sha> is not present locally
git -C bundles/bundle-rantamuta fetch --all --tags
git -C bundles/bundle-rantamuta checkout <desired-sha>
git add bundles/bundle-rantamuta
```

Then continue merge/rebase as usual.

## Local noise-reduction config

These commands reduce day-to-day bundle submodule noise in your local clone:

```bash
git config --local submodule.bundles/bundle-rantamuta.ignore all
git config --local diff.ignoreSubmodules all
git config --local status.submoduleSummary false
```

## Safety and implications

These settings are local-only:

- They write to `.git/config` in your clone only.
- They do not modify `.gitmodules`.
- They do not unlink `bundles/bundle-rantamuta`.

Main tradeoff:

- You can forget to make an intentional root pointer commit when you want to publish an integrated state.

## Recommended daily workflow

1. Do bundle development inside `bundles/bundle-rantamuta`.
2. Commit and push bundle changes there first.
3. If local tooling dirties `ranvier.json`, clean it:

```bash
git restore --staged ranvier.json && git restore ranvier.json
```

4. If isolated `ci:local` fails due local-only submodule commit fetch, run:

```bash
npm run ci:local -- --in-place
```

5. When you want an integration checkpoint, intentionally update the bundle pointer in root:

```bash
git add bundles/bundle-rantamuta
git commit -m "Update bundle-rantamuta pointer"
```

## Lore local-clone workflow

`docs/lore` is local-only from `ranviermud`'s perspective:

- not in `.gitmodules`
- ignored by `.gitignore`
- not committed in `ranviermud`

Typical setup:

```bash
git clone https://github.com/Rantamuta/lore.git docs/lore
```

Typical authoring flow:

```bash
git -C docs/lore checkout main
# edit files under docs/lore
git -C docs/lore add .
git -C docs/lore commit -m "Update lore docs"
git -C docs/lore push
```

No pointer update commit is required in `ranviermud` for lore updates.

## How to inspect bundle state on demand

```bash
git -C bundles/bundle-rantamuta status --short --branch
git -C bundles/bundle-rantamuta log --oneline -n 5
```

Temporarily override root diff behavior for one command:

```bash
git -c diff.ignoreSubmodules=none diff --submodule=log
```

## Undo local noise-reduction settings

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
