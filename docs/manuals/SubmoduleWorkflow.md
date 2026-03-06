# Submodule Workflow (Non-Normative)

Status: maintainer guidance (non-normative)

This repo tracks these Git submodules:

- `bundles/bundle-rantamuta`
- `docs/lore`

The root repo records a gitlink pointer to one specific commit for each submodule.

## Quick mental model

Think of a submodule as a pinned dependency implemented with Git itself. The superproject does not “contain” the bundle’s files in its history. It stores exactly one piece of information about it: a commit SHA. That SHA says, “when this superproject commit was created, it expected the bundle repository to be at *this exact commit*.”

So there are always two repositories with two independent histories:

* The bundle repository has normal commits, branches, diffs, and merges like any other repo.
* The superproject has its own history, and in that history the submodule appears as a single entry whose value is just a commit pointer.

When you commit inside `bundles/bundle-rantamuta`, you are advancing the bundle’s history only. The superproject still points to the old SHA until you explicitly `git add bundles/bundle-rantamuta` and commit in the root. That root commit does not copy files. It simply updates the recorded pointer from “bundle at SHA A” to “bundle at SHA B.”

Most confusion around submodules comes from forgetting that updating content and updating the pointer are two separate operations in two separate repositories.

* `ranviermud` is the superproject repository.
* `bundles/bundle-rantamuta` is a separate repository nested under it.
* The superproject stores only a gitlink pointer (mode `160000`) to one submodule commit, not the submodule file contents.
* `.gitmodules` only maps submodule path to remote URL; it does not store branch history.
* Typical checkpoint flow is two commits: first in the bundle repo, then in the superproject to record the moved pointer.

## Why root keeps looking changed

When you commit inside `bundles/bundle-rantamuta`, the root repo sees that pointer move. Root `git status` then shows a submodule change even if no root files were edited.

Tooling can also touch root files (for example `ranvier.json`) during local CI/setup workflows.

## Why submodule conflicts look strange

Submodule conflicts are pointer conflicts, not content merge conflicts. A conflict hunk like this:

```diff
-Subproject commit <sha-a>
+Subproject commit <sha-b>
```

means "which bundle commit should the superproject point to?"

Resolve by selecting the intended commit SHA, then stage the pointer:

```bash
# only needed if <desired-sha> is not present locally
git -C bundles/bundle-rantamuta fetch --all --tags
git -C bundles/bundle-rantamuta checkout <desired-sha>
git add bundles/bundle-rantamuta
```

Then continue your merge/rebase as usual.

## Local noise-reduction config

These commands reduce day-to-day submodule noise in your local clone:

```bash
git config --local submodule.bundles/bundle-rantamuta.ignore all
git config --local submodule.docs/lore.ignore all
git config --local diff.ignoreSubmodules all
git config --local status.submoduleSummary false
```

### What these commands mean

These settings affect *visibility*, not history. They do not stop Git from recording submodule pointer changes. They only reduce how loudly Git reports them in day-to-day commands.

`submodule.bundles/bundle-rantamuta.ignore all`
- Tells Git to treat the bundle submodule as ignored for status/diff in this local repo.
- Effect: root `git status` usually stops flagging bundle pointer churn.

`submodule.docs/lore.ignore all`
- Tells Git to treat the lore submodule as ignored for status/diff in this local repo.
- Effect: root `git status` usually stops flagging lore pointer churn.

`diff.ignoreSubmodules all`

* Suppresses submodule commit diffs in root-level `git diff`.
* Effect: you do not see the old SHA → new SHA delta unless you override the config for that command.
* Important: this does not suppress merge behavior, conflict detection, or commit recording. If two branches point to different bundle SHAs, Git will still produce a submodule pointer conflict during merge. You just will not see routine SHA churn in everyday diffs.

`status.submoduleSummary false`

* Disables the extra submodule summary lines that show commit ranges and log snippets in `git status`.
* Effect: cleaner, less noisy status output.
* Important: the submodule pointer is still part of the index and still part of the commit graph. Only the summary display is removed.

Submodule commit data continues to be committed exactly as before. The gitlink entry in the superproject still updates when you stage it. Merges still compare SHAs. Conflicts still occur when branches disagree on the pointer.

These configs do not change repository semantics. They only reduce how often Git reminds you that the pointer moved.

## Safety and implications

These settings are local-only and low-risk operationally:
- They write to `.git/config` in your clone only.
- They do not modify `.gitmodules`.
- They do not unlink either submodule from its repo.
- They do not change remotes, branches, history, CI, or collaborators.

Main tradeoff:

* You can forget to make an intentional root pointer commit when you actually want to publish an integrated state.

## Recommended daily workflow

1. Do submodule development inside the submodule path (for example `bundles/bundle-rantamuta` or `docs/lore`).
2. Commit and push submodule changes there first.
3. If local tooling dirties `ranvier.json`, clean it immediately:

```bash
git restore --staged ranvier.json && git restore ranvier.json
```

1. If isolated `ci:local` fails due local-only submodule commit fetch, run:

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
