'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function runCli(args) {
  const scriptPath = path.resolve(__dirname, '..', 'util', 'verb-local-syntax-cli.js');
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });
}

test('verb-local CLI emits success with selected say rule', () => {
  const result = runCli(['say', 'hello', 'to', 'bob']);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.result.outcome, 'success');
  assert.equal(payload.result.selectedRule.ruleText, 'TEXT to LIVING');
  assert.equal(payload.result.verb, 'say');
});

test('verb-local CLI emits ambiguity for unlock chest with key', () => {
  const result = runCli(['unlock', 'chest', 'with', 'key']);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.result.outcome, 'ambiguous');
  assert.equal(payload.result.selectedRule.ruleText, 'ENTITY with ENTITY');
  assert.ok(Array.isArray(payload.result.ambiguity));
  assert.ok(payload.result.ambiguity.length >= 1);
});

test('verb-local CLI emits unknown-verb nonViable for unsupported command', () => {
  const result = runCli(['dance', 'quickly']);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.result.outcome, 'nonViable');
  assert.equal(payload.result.reason, 'UNKNOWN_VERB');
});
