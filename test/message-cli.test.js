'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');

function runCli(args) {
  return spawnSync(process.execPath, ['util/message.js', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

test('message CLI renders a self perspective line', () => {
  const result = runCli([
    '{actor.you} {verb:wave} at {target.you}.',
    '--actor', '{"name":"Foo"}',
    '--target', '{"name":"Bar"}',
    '--pov', 'self',
    '--audience', 'self_target_and_others',
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), 'You wave at Bar.');
});

test('message CLI returns empty output when pov is excluded by audience policy', () => {
  const result = runCli([
    '{actor.you} {verb:wave} at {target.you}.',
    '--actor', '{"name":"Foo"}',
    '--target', '{"name":"Bar"}',
    '--pov', 'other',
    '--audience', 'self',
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), '');
});

test('message CLI supports relaxed object input syntax', () => {
  const result = runCli([
    '{actor.you} {verb:wave}.',
    '--actor', '{name:Foo}',
    '--pov', 'self',
    '--audience', 'self',
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), 'You wave.');
});

test('message CLI can return JSON output', () => {
  const result = runCli([
    '{actor.you} {verb:don\'t}.',
    '--actor', '{"name":"Foo"}',
    '--pov', 'other',
    '--audience', 'others',
    '--json',
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.deepEqual(payload, {
    ok: true,
    included: true,
    text: "Foo doesn't.",
  });
});

test('message CLI supports pronoun field for possessive rendering', () => {
  const result = runCli([
    '{actor.you} {verb:stab} {target.you} in {target.poss} neck!',
    '--actor', '{"name":"Foo","pronoun":"he"}',
    '--target', '{"name":"Bar","pronoun":"she"}',
    '--pov', 'other',
    '--audience', 'self_target_and_others',
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), "Foo stabs Bar in her neck!");
});

test('message CLI supports explicit name_poss placeholders', () => {
  const result = runCli([
    '{actor.you} points at {target.name_poss} blade.',
    '--actor', '{"name":"Foo","pronoun":"he"}',
    '--target', '{"name":"Bar","pronoun":"she"}',
    '--pov', 'other',
    '--audience', 'self_target_and_others',
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), "Foo points at Bar's blade.");
});

test('message CLI falls back to name possessive for character targets without pronoun', () => {
  const result = runCli([
    '{actor.you} {verb:stab} {target.you} in {target.poss} neck.',
    '--actor', '{"name":"Foo","isNpc":false}',
    '--target', '{"name":"Bar","isNpc":true}',
    '--pov', 'other',
    '--audience', 'self_target_and_others',
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), "Foo stabs Bar in Bar's neck.");
});

test('message CLI falls back to its for non-character targets without pronoun', () => {
  const result = runCli([
    '{actor.you} {verb:polish} {target.you} and admires {target.poss} shine.',
    '--actor', '{"name":"Foo","isNpc":false}',
    '--target', '{"name":"Lantern"}',
    '--pov', 'other',
    '--audience', 'self_target_and_others',
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), 'Foo polishes Lantern and admires its shine.');
});
