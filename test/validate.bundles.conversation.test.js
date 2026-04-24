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

function createBundleModule(tempRoot, source, relativePath = path.join('lib', 'session', 'conversation-definition-service.js')) {
  const modulePath = path.join(
    tempRoot,
    'bundles',
    'bundle-test',
    relativePath
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

test('loadBundleConversationValidator prefers the runtime conversation-definition-service path when both validators are valid', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-bundles-conversation-'));
  createBundleModule(tempRoot, [
    "'use strict';",
    'module.exports = {',
    '  _validateConversationDefinitions() {',
    "    return [{ code: 'RUNTIME_VALIDATOR_USED', level: 'warning' }];",
    '  },',
    '};',
    '',
  ].join('\n'), path.join('lib', 'runtime', 'conversation', 'conversation-definition-service.js'));
  createBundleModule(tempRoot, [
    "'use strict';",
    'module.exports = {',
    '  _validateConversationDefinitions() {',
    "    return [{ code: 'LEGACY_VALIDATOR_USED', level: 'warning' }];",
    '  },',
    '};',
    '',
  ].join('\n'));

  const validator = loadBundleConversationValidator(tempRoot, 'bundle-test');

  assert.equal(typeof validator, 'function');
  assert.deepEqual(validator(), [
    { code: 'RUNTIME_VALIDATOR_USED', level: 'warning' },
  ]);
});

test('loadBundleConversationValidator falls back to the legacy validator when the runtime file lacks the expected export', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-bundles-conversation-'));
  createBundleModule(tempRoot, [
    "'use strict';",
    'module.exports = {',
    '  validateConversationDefinitions() {',
    "    return [{ code: 'WRONG_RUNTIME_EXPORT', level: 'warning' }];",
    '  },',
    '};',
    '',
  ].join('\n'), path.join('lib', 'runtime', 'conversation', 'conversation-definition-service.js'));
  createBundleModule(tempRoot, [
    "'use strict';",
    'module.exports = {',
    '  _validateConversationDefinitions() {',
    "    return [{ code: 'LEGACY_VALIDATOR_USED', level: 'warning' }];",
    '  },',
    '};',
    '',
  ].join('\n'));

  const validator = loadBundleConversationValidator(tempRoot, 'bundle-test');

  assert.equal(typeof validator, 'function');
  assert.deepEqual(validator(), [
    { code: 'LEGACY_VALIDATOR_USED', level: 'warning' },
  ]);
});

test('loadBundleConversationValidator falls back to the legacy validator when the runtime file throws during require', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-bundles-conversation-'));
  createBundleModule(tempRoot, [
    "'use strict';",
    "throw new Error('broken runtime validator module');",
    '',
  ].join('\n'), path.join('lib', 'runtime', 'conversation', 'conversation-definition-service.js'));
  createBundleModule(tempRoot, [
    "'use strict';",
    'module.exports = {',
    '  _validateConversationDefinitions() {',
    "    return [{ code: 'LEGACY_VALIDATOR_USED', level: 'warning' }];",
    '  },',
    '};',
    '',
  ].join('\n'));

  const validator = loadBundleConversationValidator(tempRoot, 'bundle-test');

  assert.equal(typeof validator, 'function');
  assert.deepEqual(validator(), [
    { code: 'LEGACY_VALIDATOR_USED', level: 'warning' },
  ]);
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
  const modulePath = createBundleModule(tempRoot, [
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
  assert.equal(findings[0].detail.modulePath, modulePath);
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
