#!/usr/bin/env node
'use strict';

/**
 * Conversation Mermaid generator.
 *
 * Purpose:
 * - Convert one authored `*.conversation.yml` file into a derived Markdown file
 *   containing a Mermaid `stateDiagram-v2` preview.
 * - Keep the YAML conversation file as the source of truth while making it easy
 *   to review the state machine visually in editors such as VS Code.
 *
 * What this script does:
 * - parses a conversation YAML file using the existing Ranvier data loader
 * - validates the minimal conversation shape needed for diagram generation
 * - lowers conversation states, `auto` routes, authored events, and
 *   `events.default` into Mermaid state-diagram edges
 * - writes a sibling or explicitly requested `.diagram.md` file
 *
 * What this script does not do:
 * - it does not watch files for changes
 * - it does not modify the source YAML
 * - it does not implement full DSL validation beyond what generation requires
 * - it does not attempt manual diagram layout
 *
 * CLI:
 *   node scripts/generate-conversation-mermaid.js <input-file> [output-file]
 *
 * Examples:
 *   node scripts/generate-conversation-mermaid.js docs/lore/kingDead.conversation.yml
 *   node scripts/generate-conversation-mermaid.js docs/lore/kingDead.conversation.yml docs/lore/kingDead.conversation.diagram.md
 *
 * Output behavior:
 * - if `output-file` is omitted, the script writes beside the input file using
 *   the derived name `<input-without-extension>.diagram.md`
 * - on success, the script prints the resolved output path
 * - on failure, the script exits non-zero and does not intentionally write a
 *   partial output file
 *
 * Shared-code note:
 * - the watch wrapper `scripts/watch-conversation-mermaid.js` calls the
 *   exported `generateConversationMermaid(...)` function from this module so
 *   the actual generation logic remains single-sourced
 */

const fs = require('fs');
const path = require('path');
const Data = require('ranvier/src/Data');

const GENERATED_START = '<!-- GENERATED: conversation-diagram:start -->';
const GENERATED_END = '<!-- GENERATED: conversation-diagram:end -->';

function usage() {
  return 'Usage: node scripts/generate-conversation-mermaid.js <input-file> [output-file]';
}

function deriveOutputPath(inputFile) {
  const ext = path.extname(inputFile);
  const base = ext ? inputFile.slice(0, -ext.length) : inputFile;
  return `${base}.diagram.md`;
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function sanitizeIdentifier(value) {
  const normalized = String(value || '')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^([^A-Za-z_])/, '_$1');

  return normalized || 'state';
}

function createStateIdMap(states) {
  const ids = new Map();
  const used = new Set();

  for (const stateName of Object.keys(states)) {
    let base = sanitizeIdentifier(stateName);
    let candidate = base;
    let index = 2;

    while (used.has(candidate)) {
      candidate = `${base}_${index}`;
      index += 1;
    }

    used.add(candidate);
    ids.set(stateName, candidate);
  }

  return ids;
}

function formatScalar(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null) {
    return 'null';
  }

  return String(value);
}

function formatCondition(condition) {
  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
    return formatScalar(condition);
  }

  if (condition.getActorMetadata && typeof condition.getActorMetadata === 'object') {
    const query = condition.getActorMetadata;
    const key = formatScalar(query.key);

    if (Object.prototype.hasOwnProperty.call(query, 'equals')) {
      return `${key} = ${formatScalar(query.equals)}`;
    }

    if (query.isDefined === true) {
      return `${key} is defined`;
    }

    if (query.isUndefined === true) {
      return `${key} is undefined`;
    }
  }

  const [op, payload] = Object.entries(condition)[0] || [];
  if (op && (typeof payload !== 'object' || payload === null || Array.isArray(payload))) {
    return `${op}: ${formatScalar(payload)}`;
  }

  if (op && payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const fields = Object.entries(payload)
      .map(([key, value]) => `${key}=${formatScalar(value)}`)
      .join(', ');
    return `${op}(${fields})`;
  }

  return JSON.stringify(condition);
}

function isObjectRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateConversation(doc, inputFile) {
  if (!isObjectRecord(doc)) {
    throw new Error(`Conversation file "${inputFile}" must parse to an object.`);
  }

  if (typeof doc.id !== 'string' || !doc.id.trim()) {
    throw new Error(`Conversation file "${inputFile}" must define top-level string "id".`);
  }

  if (typeof doc.initial !== 'string' || !doc.initial.trim()) {
    throw new Error(`Conversation file "${inputFile}" must define top-level string "initial".`);
  }

  if (!isObjectRecord(doc.states)) {
    throw new Error(`Conversation file "${inputFile}" must define object "states".`);
  }

  if (!Object.prototype.hasOwnProperty.call(doc.states, doc.initial)) {
    throw new Error(`Initial state "${doc.initial}" is not defined in "${inputFile}".`);
  }
}

function appendAutoTransitions(lines, ids, stateName, state) {
  if (!Array.isArray(state.auto) || state.auto.length === 0) {
    return;
  }

  for (const route of state.auto) {
    if (!route || typeof route !== 'object' || !route.target) {
      continue;
    }

    const label = route.condition
      ? `auto / ${formatCondition(route.condition)}`
      : 'auto / default';

    lines.push(`    ${ids.get(stateName)} --> ${ids.get(route.target)}: ${label}`);
  }
}

function appendEventTransitions(lines, ids, stateName, state) {
  if (!state.events || typeof state.events !== 'object' || Array.isArray(state.events)) {
    return;
  }

  for (const [eventName, transition] of Object.entries(state.events)) {
    if (!transition || typeof transition !== 'object' || !transition.target) {
      continue;
    }

    const label = eventName === 'default' ? 'default' : eventName;
    lines.push(`    ${ids.get(stateName)} --> ${ids.get(transition.target)}: ${label}`);
  }
}

function buildStateDiagram(doc) {
  const lines = ['stateDiagram-v2'];
  const ids = createStateIdMap(doc.states);
  const declarations = [];

  for (const [stateName, stateId] of ids.entries()) {
    if (stateName !== stateId) {
      declarations.push(`    state "${stateName}" as ${stateId}`);
    }
  }

  if (declarations.length > 0) {
    lines.push(...declarations, '');
  }

  lines.push(`    [*] --> ${ids.get(doc.initial)}`, '');

  for (const [stateName, state] of Object.entries(doc.states)) {
    const before = lines.length;
    appendAutoTransitions(lines, ids, stateName, state);
    appendEventTransitions(lines, ids, stateName, state);
    if (lines.length > before) {
      lines.push('');
    }
  }

  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

function buildMarkdown(inputFile, outputFile, doc, mermaid) {
  const relativeInput = toPosixPath(path.relative(path.dirname(outputFile), inputFile) || path.basename(inputFile));
  return [
    `# ${doc.id} Diagram`,
    '',
    `Derived from [${path.basename(inputFile)}](${relativeInput}).`,
    '',
    GENERATED_START,
    '```mermaid',
    mermaid,
    '```',
    GENERATED_END,
    '',
  ].join('\n');
}

function generateConversationMermaid(inputFile, outputFile = deriveOutputPath(inputFile)) {
  const resolvedInput = path.resolve(inputFile);
  const resolvedOutput = path.resolve(outputFile);

  if (resolvedInput === resolvedOutput) {
    throw new Error('Input and output paths must be different.');
  }

  const doc = Data.parseFile(resolvedInput);
  validateConversation(doc, inputFile);

  const mermaid = buildStateDiagram(doc);
  const markdown = buildMarkdown(resolvedInput, resolvedOutput, doc, mermaid);

  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedOutput, markdown, 'utf8');

  return {
    outputFile: resolvedOutput,
    conversationId: doc.id,
  };
}

function main(argv) {
  const [, , inputFile, outputFile] = argv;

  if (!inputFile) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  try {
    const result = generateConversationMermaid(inputFile, outputFile);
    console.log(`Wrote ${result.outputFile}`);
  } catch (error) {
    console.error(`Failed to generate Mermaid diagram: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  buildMarkdown,
  buildStateDiagram,
  deriveOutputPath,
  formatCondition,
  generateConversationMermaid,
  sanitizeIdentifier,
};
