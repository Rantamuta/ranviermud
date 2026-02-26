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

test('parse-input CLI outputs parse artifact for a normal input string', () => {
  const result = runCli(['look']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.intentToken, 'look');
  assert.equal(payload.normalizedInput, 'look');
});

test('parse-input CLI outputs parse artifact for explicit empty input string', () => {
  const result = runCli(['']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.actorInput, '');
  assert.equal(payload.normalizedInput, '');
  assert.equal(payload.intentToken, undefined);
});

test('parse-input CLI outputs parse artifact for missing argv input (empty actor input)', () => {
  const result = runCli([]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.actorInput, '');
  assert.equal(payload.normalizedInput, '');
  assert.equal(payload.intentToken, undefined);
});
