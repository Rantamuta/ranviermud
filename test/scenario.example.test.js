'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');

function runScenario(args) {
  return spawnSync(process.execPath, ['util/scenario-runner.js', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

test('scenario runner help exits successfully', () => {
  const result = runScenario(['--help']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /--commandsFile/);
  assert.match(result.stdout, /--command/);
});

test('scenario runner executes command lines in order and continues on unknown commands', () => {
  const result = runScenario(['--command', 'unknown-first', '--command', 'unknown-second', '--failOnUnknown']);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /\[info\] scenario starting \(commands=2\)/);
  assert.match(result.stdout, /\[run\] 1\/2: unknown-first/);
  assert.match(result.stdout, /Unknown command\./);
  assert.match(result.stdout, /\[run\] 2\/2: unknown-second/);
  assert.match(result.stdout, /\[info\] scenario complete \(commands=2, unknown=2, failed=1\)/);
});

test('scenario runner command file ignores comments and blank lines', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ranvier-scenario-'));
  const commandsPath = path.join(tmpDir, 'scenario.commands');

  fs.writeFileSync(commandsPath, '# comment\n\nunknown-alpha\n\n# another\nunknown-beta\n', 'utf8');

  const result = runScenario(['--commandsFile', commandsPath, '--failOnUnknown']);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /\[info\] scenario starting \(commands=2\)/);
  assert.match(result.stdout, /\[run\] 1\/2: unknown-alpha/);
  assert.match(result.stdout, /Unknown command\./);
  assert.match(result.stdout, /\[run\] 2\/2: unknown-beta/);
  assert.match(result.stdout, /\[info\] scenario complete \(commands=2, unknown=2, failed=1\)/);
});

test('scenario runner reports error for missing --commandsFile value', () => {
  const result = runScenario(['--commandsFile']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing value for --commandsFile/);
});

test('scenario runner reports error for missing --command value', () => {
  const result = runScenario(['--command']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing value for --command/);
});

test('scenario runner legacy --command/--args fallback builds one command line', () => {
  const result = runScenario(['--command', 'legacy-unknown', '--args', 'abc def']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[info\] scenario starting \(commands=1\)/);
  assert.match(result.stdout, /\[run\] 1\/1: legacy-unknown abc def/);
  assert.match(result.stdout, /Unknown command\./);
  assert.match(result.stdout, /\[info\] scenario complete \(commands=1, unknown=1, failed=0\)/);
});

test('scenario runner --throughInput executes via input events and reports unknown text commands', () => {
  const result = runScenario([
    '--throughInput',
    '--room', 'rantamuta:start',
    '--command', 'look',
    '--command', 'east',
    '--failOnUnknown',
  ]);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /\[info\] scenario starting \(commands=2\)/);
  assert.match(result.stdout, /\[run\] 1\/2: look/);
  assert.match(result.stdout, /Rantamuta/);
  assert.match(result.stdout, /\[run\] 2\/2: east/);
  assert.match(result.stdout, /Unknown command\./);
  assert.match(result.stdout, /\[info\] scenario complete \(commands=2, unknown=1, failed=1\)/);
});

test('scenario runner --throughInput keeps unknown-command output stable for malformed relation text', () => {
  const result = runScenario([
    '--throughInput',
    '--room', 'rantamuta:start',
    '--command', 'put in old chest',
    '--failOnUnknown',
  ]);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stdout, /\[run\] 1\/1: put in old chest/);
  assert.match(result.stdout, /Unknown command\./);
  assert.match(result.stdout, /\[info\] scenario complete \(commands=1, unknown=1, failed=1\)/);
});
