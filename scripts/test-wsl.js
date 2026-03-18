#!/usr/bin/env node
'use strict';

/**
 * Fast local test runner for WSL checkouts on mounted Windows filesystems.
 *
 * Why this exists:
 * - Running `npm test` directly from a repository under `/mnt/c/...` in WSL is
 *   dramatically slower for this project than running the same suite from the
 *   native Linux filesystem.
 * - This repo's tests do a lot of Node process startup, module loading,
 *   filesystem reads, bundle loading, and subprocess work. Those patterns are
 *   especially expensive on WSL-mounted Windows paths.
 * - Running the suite from `/tmp` avoids most of that penalty.
 *
 * What this script does:
 * - creates a detached git worktree under `/tmp`
 * - installs dependencies inside that worktree with `npm ci`
 * - initializes submodules in that worktree
 * - runs `npm test` there
 * - removes the worktree afterward unless `--keep-worktree` is passed
 *
 * Important caveats:
 * - This is a committed-snapshot runner, not an in-place working-tree runner.
 *   The detached worktree is created from `HEAD`, so uncommitted edits in the
 *   live checkout are not included in the test run.
 * - `--force` only bypasses the clean-tree guard. It does not copy local
 *   uncommitted changes into the temporary worktree.
 * - If you want to test the exact current dirty workspace, use plain
 *   `npm test` instead.
 *
 * Intended use:
 * - Use `npm run test:wsl` when developing from a WSL checkout under
 *   `/mnt/c/...` and you want a much faster whole-suite run against committed
 *   state.
 */
const path = require('path');
const {
  createDetachedWorktree,
  ensureCleanWorkingTree,
  removeDetachedWorktree,
  runCommands,
} = require('./lib/worktree-runner');

const repoRoot = path.resolve(__dirname, '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const argv = process.argv.slice(2);
const keepWorktree = argv.includes('--keep-worktree');
const forceMode = argv.includes('--force');

function main() {
  let exitCode = 0;
  let worktreePath = null;

  try {
    const preflightCode = ensureCleanWorkingTree({
      cwd: repoRoot,
      forceMode,
      dirtyMessage: 'Working tree has uncommitted changes.',
      preface: [
        'Commit your changes before running test:wsl.',
        'To run against the committed snapshot anyway, use:',
        '  npm run test:wsl -- --force',
      ].join('\n'),
    });
    if (preflightCode !== 0) {
      return preflightCode;
    }

    console.log('\n==> Create isolated worktree');
    const result = createDetachedWorktree(repoRoot, 'ranviermud-test-wsl-');
    if (result.exitCode !== 0) {
      return result.exitCode;
    }

    worktreePath = result.path;

    console.log('\n==> Install dependencies');
    exitCode = runCommands([
      { bin: npmCmd, args: ['ci'] },
    ], { workRoot: worktreePath });
    if (exitCode !== 0) {
      return exitCode;
    }

    console.log('\n==> Initialize submodules');
    exitCode = runCommands([
      { bin: 'git', args: ['submodule', 'update', '--init', '--recursive'] },
    ], { workRoot: worktreePath });
    if (exitCode !== 0) {
      return exitCode;
    }

    console.log('\n==> Run npm test in Linux tmp worktree');
    exitCode = runCommands([
      { bin: npmCmd, args: ['test'] },
    ], { workRoot: worktreePath });
  } finally {
    if (worktreePath && !keepWorktree) {
      console.log('\n==> Remove isolated worktree');
      const cleanupCode = removeDetachedWorktree(repoRoot, worktreePath);
      if (cleanupCode !== 0 && exitCode === 0) {
        exitCode = cleanupCode;
      }
    } else if (worktreePath && keepWorktree) {
      console.log(`\n==> Worktree preserved at ${worktreePath}`);
    }
  }

  return exitCode;
}

process.exit(main());
