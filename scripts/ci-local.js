#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  createDetachedWorktree,
  ensureCleanWorkingTree: ensureGitClean,
  removeDetachedWorktree,
  runCommands,
} = require('./lib/worktree-runner');

const repoRoot = path.resolve(__dirname, '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCmd = process.execPath;

const argv = process.argv.slice(2);
const runInPlace = argv.includes('--in-place');
const keepWorktree = argv.includes('--keep-worktree');
const forceMode = argv.includes('--force');

let workRoot = repoRoot;
let worktreePath = null;

function ensureCleanWorkingTree() {
  return ensureGitClean({
    cwd: workRoot,
    forceMode,
    dirtyMessage: 'Working tree is not clean.',
  });
}

function ensureRepoCleanBeforeWorktree() {
  return ensureGitClean({
    cwd: repoRoot,
    forceMode,
    dirtyMessage: 'Working tree has uncommitted changes.',
    preface: 'Commit your changes before running ci:local.',
  });
}

function buildSteps() {
  const auditJsonPath = path.join(workRoot, 'audit.json');
  const auditTempPath = path.join(os.tmpdir(), `ranviermud-audit-${process.pid}.json`);

  return [
    // CI: actions/checkout@v4 (SKIPPED)
    // Reason: local runs use the current working tree or an isolated worktree.
    // CI: Use Node.js 22 (SKIPPED)
    // Reason: local runs use the current Node installation.
    // CI: Report Node.js and npm versions
    {
      label: 'Report Node.js and npm versions',
      commands: [
        { bin: nodeCmd, args: ['-v'] },
        { bin: npmCmd, args: ['-v'] },
      ],
    },
    // CI: Install dependencies
    {
      label: 'Install dependencies',
      commands: [
        { bin: npmCmd, args: ['ci'] },
      ],
    },
    // CI: Capture npm audit report (JSON)
    {
      label: 'Capture npm audit report (JSON)',
      commands: [
        { bin: npmCmd, args: ['audit', '--json'], allowFailure: true, captureStdoutTo: auditJsonPath },
      ],
    },
    // CI: Capture npm audit report (JSON)
    {
      label: 'Capture npm audit report (JSON)',
      commands: [
        { bin: npmCmd, args: ['audit', '--json'], allowFailure: true, captureStdoutTo: auditTempPath },
      ],
    },
    // CI: Upload npm audit report (SKIPPED)
    // Reason: CI-only artifact upload.
    // CI: Ensure clean working tree
    {
      label: 'Ensure clean working tree',
      run: ensureCleanWorkingTree,
    },
    // CI: Install bundles (CI)
    {
      label: 'Install bundles (CI)',
      commands: [
        { bin: npmCmd, args: ['run', 'ci:init'] },
      ],
    },
    // CI: Smoke test login
    {
      label: 'Smoke test login',
      commands: [
        { bin: npmCmd, args: ['run', 'smoke:login'] },
      ],
    },
    // CI: Run tests
    {
      label: 'Run tests',
      commands: [
        { bin: npmCmd, args: ['test'] },
      ],
    },
  ];
}

function runSteps(steps) {
  for (const step of steps) {
    console.log(`\n==> ${step.label}`);
    const exitCode = step.run ? step.run() : runCommands(step.commands, { workRoot });
    if (exitCode !== 0) {
      return exitCode;
    }
  }
  return 0;
}

function main() {
  let exitCode = 0;

  try {
    if (!runInPlace) {
      const preflightCode = ensureRepoCleanBeforeWorktree();
      if (preflightCode !== 0) {
        return preflightCode;
      }
      console.log('\n==> Create isolated worktree');
      const result = createDetachedWorktree(repoRoot, 'ranviermud-ci-local-');
      if (result.exitCode !== 0) {
        return result.exitCode;
      }
      worktreePath = result.path;
      workRoot = worktreePath;
    } else {
      console.log('\n==> Running in-place');
    }

    const steps = buildSteps();
    exitCode = runSteps(steps);
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
