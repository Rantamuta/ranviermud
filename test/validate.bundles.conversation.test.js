'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  loadBundleConversationValidator,
  mapConversationFinding,
  validateConversations,
} = require('../util/validate-bundles');

function createBundleModule(tempRoot, source) {
  const modulePath = path.join(
    tempRoot,
    'bundles',
    'bundle-test',
    'lib',
    'session',
    'conversation-definition-service.js'
  );
  fs.mkdirSync(path.dirname(modulePath), { recursive: true });
  fs.writeFileSync(modulePath, source, 'utf8');
  return modulePath;
}

test('loadBundleConversationValidator returns a bundle validator when exported', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-bundles-conversation-'));
  createBundleModule(tempRoot, [
    "'use strict';",
    'module.exports = {',
    '  _validateConversationDefinitions() {',
    '    return [];',
    '  },',
    '};',
    '',
  ].join('\n'));

  const validator = loadBundleConversationValidator(tempRoot, 'bundle-test');

  assert.equal(typeof validator, 'function');
});

test('mapConversationFinding preserves conversation validator fields', () => {
  const output = mapConversationFinding({
    level: 'error',
    code: 'CONVERSATION_FILE_MISSING',
    message: 'Conversation file missing',
    bundle: 'bundle-override',
    area: 'test',
    path: 'conversations/missing.conversation.yml',
    detail: { npcRef: 'test:actorPlanner' },
  }, 'bundle-test');

  assert.deepEqual(output, {
    level: 'error',
    code: 'CONVERSATION_FILE_MISSING',
    message: 'Conversation file missing',
    bundle: 'bundle-override',
    area: 'test',
    path: 'conversations/missing.conversation.yml',
    detail: { npcRef: 'test:actorPlanner' },
  });
});

test('validateConversations appends findings from bundle conversation validators', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-bundles-conversation-'));
  createBundleModule(tempRoot, [
    "'use strict';",
    'module.exports = {',
    '  _validateConversationDefinitions() {',
    '    return [',
    '      {',
    "        level: 'error',",
    "        code: 'CONVERSATION_FILE_MISSING',",
    "        message: 'Conversation file missing',",
    "        area: 'test',",
    "        path: 'conversations/missing.conversation.yml',",
    "        detail: { npcRef: 'test:actorPlanner' },",
    '      },',
    '    ];',
    '  },',
    '};',
    '',
  ].join('\n'));

  const findings = [];
  validateConversations(tempRoot, { bundles: ['bundle-test'] }, {}, findings);

  assert.deepEqual(findings, [
    {
      level: 'error',
      code: 'CONVERSATION_FILE_MISSING',
      message: 'Conversation file missing',
      bundle: 'bundle-test',
      area: 'test',
      path: 'conversations/missing.conversation.yml',
      detail: { npcRef: 'test:actorPlanner' },
    },
  ]);
});

test('validateConversations records validator load failures as warnings', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-bundles-conversation-'));
  createBundleModule(tempRoot, [
    "'use strict';",
    "throw new Error('broken validator module');",
    '',
  ].join('\n'));

  const findings = [];
  validateConversations(tempRoot, { bundles: ['bundle-test'] }, {}, findings);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, 'warn');
  assert.equal(findings[0].code, 'CONVERSATION_VALIDATOR_LOAD_FAILED');
  assert.equal(findings[0].bundle, 'bundle-test');
});

test('validateConversations records validator execution failures as warnings', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-bundles-conversation-'));
  createBundleModule(tempRoot, [
    "'use strict';",
    'module.exports = {',
    '  _validateConversationDefinitions() {',
    "    throw new Error('validator explosion');",
    '  },',
    '};',
    '',
  ].join('\n'));

  const findings = [];
  validateConversations(tempRoot, { bundles: ['bundle-test'] }, {}, findings);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, 'warn');
  assert.equal(findings[0].code, 'CONVERSATION_VALIDATION_FAILED');
  assert.equal(findings[0].bundle, 'bundle-test');
});
