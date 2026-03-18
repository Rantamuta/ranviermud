'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function getPreferredTempRoot() {
  if (process.platform !== 'win32' && fs.existsSync('/tmp')) {
    return '/tmp';
  }

  return os.tmpdir();
}

function runCommand(command, options = {}) {
  const {
    workRoot = process.cwd(),
    env = process.env,
  } = options;

  const result = spawnSync(command.bin, command.args, {
    cwd: command.cwd || workRoot,
    stdio: command.captureStdoutTo ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    env: { ...env },
    encoding: command.captureStdoutTo ? 'utf8' : undefined,
  });

  if (result.error) {
    console.error(result.error.message);
    return result.status || 1;
  }

  if (command.captureStdoutTo) {
    const output = typeof result.stdout === 'string' ? result.stdout : '';
    fs.writeFileSync(command.captureStdoutTo, output);
  }

  if (result.signal) {
    console.error(`Command terminated by signal ${result.signal}`);
    return 1;
  }

  if (!command.allowFailure && typeof result.status === 'number' && result.status !== 0) {
    return result.status;
  }

  return 0;
}

function runCommands(commands, options = {}) {
  for (const command of commands) {
    const exitCode = runCommand(command, options);
    if (exitCode !== 0) {
      return exitCode;
    }
  }

  return 0;
}

function ensureCleanWorkingTree(options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    forceMode = false,
    dirtyMessage = 'Working tree is not clean.',
    preface,
  } = options;

  const result = spawnSync('git', ['status', '--porcelain'], {
    cwd,
    env: { ...env },
    encoding: 'utf8',
  });

  if (result.error) {
    console.error(result.error.message);
    return result.status || 1;
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    return result.status;
  }

  if (result.stdout.trim()) {
    if (forceMode) {
      console.warn(`Warning: ${dirtyMessage} Continuing because --force was provided.`);
      return 0;
    }

    if (preface) {
      console.error(preface);
    }
    console.error(dirtyMessage);
    return 1;
  }

  return 0;
}

function createDetachedWorktree(repoRoot, prefix = 'ranviermud-worktree-') {
  const tempRoot = fs.mkdtempSync(path.join(getPreferredTempRoot(), prefix));
  const result = spawnSync('git', ['worktree', 'add', '--detach', tempRoot, 'HEAD'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });

  if (result.error) {
    console.error(result.error.message);
    return { exitCode: result.status || 1 };
  }

  if (result.signal) {
    console.error(`Command terminated by signal ${result.signal}`);
    return { exitCode: 1 };
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    return { exitCode: result.status };
  }

  return { exitCode: 0, path: tempRoot };
}

function removeDetachedWorktree(repoRoot, pathToRemove) {
  const result = spawnSync('git', ['worktree', 'remove', '--force', pathToRemove], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });

  if (result.error) {
    console.error(result.error.message);
    return result.status || 1;
  }

  if (result.signal) {
    console.error(`Command terminated by signal ${result.signal}`);
    return 1;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    return result.status;
  }

  return 0;
}

module.exports = {
  createDetachedWorktree,
  ensureCleanWorkingTree,
  getPreferredTempRoot,
  removeDetachedWorktree,
  runCommand,
  runCommands,
};
