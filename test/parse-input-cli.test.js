'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');

function runCli(args) {
  return spawnSync(process.execPath, ['util/parse-input-cli.js', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

test('parse-input CLI help exits successfully', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /--bundle <bundle-name>/);
});

test('parse-input CLI parses input for default bundle in JSON mode', () => {
  const result = runCli(['--json', 'look']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.bundle, 'bundle-rantamuta');
  assert.equal(payload.actorInput, 'look');
  assert.equal(payload.parsedInput.intentToken, 'look');
  assert.equal(payload.parsedInput.classification, 'success');
});

test('parse-input CLI treats explicit empty string argument as actor input', () => {
  const result = runCli(['--json', '']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.actorInput, '');
  assert.equal(payload.parsedInput.classification, 'unknown intent');
});

test('parse-input CLI reports missing bundle parser path clearly', () => {
  const result = runCli(['--bundle', 'does-not-exist', '--json', 'look']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Parser not found for bundle "does-not-exist"/);
});
