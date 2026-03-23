'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const {
  buildStateDiagram,
  deriveOutputPath,
  generateConversationMermaid,
} = require('../scripts/generate-conversation-mermaid');
const {
  collectConversationFiles,
  isConversationFilePath,
} = require('../scripts/watch-conversation-mermaid');

test('deriveOutputPath appends .diagram.md beside the input file', () => {
  assert.equal(
    deriveOutputPath('docs/lore/kingDead.conversation.yml'),
    'docs/lore/kingDead.conversation.diagram.md'
  );

  assert.equal(
    deriveOutputPath('docs/lore/example.yml'),
    'docs/lore/example.diagram.md'
  );
});

test('buildStateDiagram includes initial, auto, event, and default transitions', () => {
  const diagram = buildStateDiagram({
    id: 'sample',
    initial: 'start',
    states: {
      start: {
        auto: [
          {
            target: 'ready',
            condition: {
              getActorMetadata: {
                key: 'death.isDead',
                equals: false,
              },
            },
          },
          {
            target: 'fallback',
          },
        ],
      },
      ready: {
        events: {
          continue: {
            target: 'done',
          },
          default: {
            target: 'ready',
          },
        },
      },
      fallback: {},
      done: {
        final: true,
      },
    },
  });

  assert.match(diagram, /^\s*stateDiagram-v2/m);
  assert.match(diagram, /\[\*\] --> start/);
  assert.match(diagram, /start --> ready: auto \/ death\.isDead = false/);
  assert.match(diagram, /start --> fallback: auto \/ default/);
  assert.match(diagram, /ready --> done: continue/);
  assert.match(diagram, /ready --> ready: default/);
});

test('generateConversationMermaid writes markdown next to the source by default', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'conversation-mermaid-'));
  const inputFile = path.join(tempRoot, 'sample.conversation.yml');
  const source = [
    'id: sample_conversation',
    'initial: greeting',
    'states:',
    '  greeting:',
    '    auto:',
    '      - target: introducing',
    '  introducing:',
    '    events:',
    '      ask_name:',
    '        target: done',
    '      default:',
    '        target: introducing',
    '  done:',
    '    final: true',
    '',
  ].join('\n');

  fs.writeFileSync(inputFile, source, 'utf8');

  const result = generateConversationMermaid(inputFile);
  const output = fs.readFileSync(result.outputFile, 'utf8');

  assert.equal(
    path.basename(result.outputFile),
    'sample.conversation.diagram.md'
  );
  assert.match(output, /# sample_conversation Diagram/);
  assert.match(output, /Derived from \[sample\.conversation\.yml\]\(sample\.conversation\.yml\)\./);
  assert.match(output, /```mermaid/);
  assert.match(output, /\[\*\] --> greeting/);
  assert.match(output, /greeting --> introducing: auto \/ default/);
  assert.match(output, /introducing --> done: ask_name/);
  assert.match(output, /introducing --> introducing: default/);
});

test('generateConversationMermaid rejects files that fail shared conversation validation', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'conversation-mermaid-invalid-'));
  const inputFile = path.join(tempRoot, 'invalid.conversation.yml');
  fs.writeFileSync(inputFile, [
    'id: invalid_conversation',
    'initial: missing',
    'states:',
    '  greeting:',
    '    events:',
    '      continue:',
    '        target: greeting',
    '',
  ].join('\n'), 'utf8');

  assert.throws(() => generateConversationMermaid(inputFile), /CONVERSATION_INITIAL_STATE_MISSING|Initial state/);
});

test('CLI exits non-zero when input path is missing', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/generate-conversation-mermaid.js'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
});

test('watch helper recognizes conversation file names and collects them recursively', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'conversation-watch-'));
  const nestedDir = path.join(tempRoot, 'nested');
  const conversationA = path.join(tempRoot, 'alpha.conversation.yml');
  const conversationB = path.join(nestedDir, 'beta.conversation.yml');
  const ignored = path.join(nestedDir, 'notes.md');

  fs.mkdirSync(nestedDir, { recursive: true });
  fs.writeFileSync(conversationA, 'id: alpha\ninitial: start\nstates:\n  start: {}\n', 'utf8');
  fs.writeFileSync(conversationB, 'id: beta\ninitial: start\nstates:\n  start: {}\n', 'utf8');
  fs.writeFileSync(ignored, '# ignore\n', 'utf8');

  assert.equal(isConversationFilePath(conversationA), true);
  assert.equal(isConversationFilePath(ignored), false);

  const found = collectConversationFiles(tempRoot).map((filePath) => path.basename(filePath));
  assert.deepEqual(found, ['alpha.conversation.yml', 'beta.conversation.yml']);
});
