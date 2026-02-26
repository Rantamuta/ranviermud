#!/usr/bin/env node
'use strict';

/**
 * Semantic Message CLI Harness
 * ----------------------------
 *
 * Purpose:
 * - Provide a standalone command-line harness for the bundle semantic-message renderer.
 * - Let maintainers/designers test template behavior without wiring into command dispatch.
 *
 * Scope:
 * - Harness-only utility. This file does not mutate game state and is not part of runtime command execution.
 * - Consumes one template string and optional participant/audience flags.
 *
 * Output:
 * - Default: one rendered line (or empty line when recipient POV is excluded by audience policy).
 * - `--json`: structured renderer result envelope.
 *
 * Examples:
 * - `node util/message "{actor.you} {verb:wave}." --actor "{name:Foo}" --pov self --audience self`
 * - `node util/message "{actor.you} {verb:wave} at {target.you}." --actor "{name:Foo}" --target "{name:Bar}" --pov target --audience self_target_and_others`
 * - `node util/message "{actor.you} {verb:wave} at {target.you}." --actor "{name:Foo}" --target "{name:Bar}" --pov other --audience self`
 * - `node util/message "{actor.you} {verb:stab} {target.you} in {target.poss} neck!" --actor "{name:Foo,pronoun:he}" --target "{name:Bar,pronoun:she}" --pov other --audience self_target_and_others`
 */

const path = require('path');

const messageModulePath = path.resolve(
  process.cwd(),
  'bundles',
  'bundle-rantamuta',
  'lib',
  'session',
  'semantic-message.js'
);
// eslint-disable-next-line global-require, import/no-dynamic-require
const { renderSemanticEvent } = require(messageModulePath);

/**
 * @param {string[]} argv
 * @returns {{ template: string, actor: object | null, target: object | null, direct: object | null, indirect: object | null, pov: 'self' | 'target' | 'other', audiencePolicy: string, json: boolean }}
 */
function parseArgs(argv) {
  /** @type {{ template: string, actor: object | null, target: object | null, direct: object | null, indirect: object | null, pov: 'self' | 'target' | 'other', audiencePolicy: string, json: boolean }} */
  const result = {
    template: '',
    actor: null,
    target: null,
    direct: null,
    indirect: null,
    pov: 'self',
    audiencePolicy: 'self_and_others',
    json: false,
  };

  if (!argv.length) {
    return result;
  }

  result.template = String(argv[0]);

  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === '--json') {
      result.json = true;
      continue;
    }

    if (token === '--actor') {
      result.actor = parseEntityLiteral(next);
      i += 1;
      continue;
    }

    if (token === '--target') {
      result.target = parseEntityLiteral(next);
      i += 1;
      continue;
    }

    if (token === '--direct') {
      result.direct = parseEntityLiteral(next);
      i += 1;
      continue;
    }

    if (token === '--indirect') {
      result.indirect = parseEntityLiteral(next);
      i += 1;
      continue;
    }

    if (token === '--pov') {
      const pov = normalize(next).toLowerCase();
      if (pov === 'self' || pov === 'target' || pov === 'other' || pov === 'others') {
        result.pov = pov === 'others' ? 'other' : pov;
      }
      i += 1;
      continue;
    }

    if (token === '--audience' || token === '--audiencePolicy') {
      result.audiencePolicy = normalize(next);
      i += 1;
      continue;
    }
  }

  return result;
}

/**
 * @param {*} value
 * @returns {string}
 */
function normalize(value) {
  return String(value || '').trim();
}

/**
 * Parse entity literals from CLI.
 *
 * Supported input:
 * - strict JSON object: '{"name":"Foo"}'
 * - relaxed object: '{name:Foo}'
 * - bare string: 'Foo' -> { name: 'Foo' }
 *
 * Supported entity keys in v1:
 * - `name`
 * - `pronoun` (`he` | `she` | `it`)
 *
 * @param {*} input
 * @returns {object | null}
 */
function parseEntityLiteral(input) {
  const raw = normalize(input);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_ignored) {
    // Continue to relaxed parse.
  }

  if (raw.startsWith('{') && raw.endsWith('}')) {
    const body = raw.slice(1, -1).trim();
    if (!body) {
      return {};
    }

    const obj = {};
    const pairs = body.split(',');
    for (const pair of pairs) {
      const idx = pair.indexOf(':');
      if (idx === -1) {
        continue;
      }
      const key = stripQuotes(pair.slice(0, idx).trim());
      const value = parseRelaxedScalar(pair.slice(idx + 1).trim());
      if (key) {
        obj[key] = value;
      }
    }
    return obj;
  }

  return { name: raw };
}

/**
 * @param {string} value
 * @returns {string}
 */
function stripQuotes(value) {
  const trimmed = normalize(value);
  return trimmed.replace(/^["']|["']$/g, '');
}

/**
 * Parse one relaxed object scalar from CLI input.
 *
 * Examples:
 * - `true` -> boolean true
 * - `false` -> boolean false
 * - `null` -> null
 * - quoted strings and bare tokens -> string
 *
 * @param {string} value
 * @returns {string | boolean | null}
 */
function parseRelaxedScalar(value) {
  const trimmed = normalize(value);
  const unquoted = stripQuotes(trimmed);
  const lower = unquoted.toLowerCase();

  if (lower === 'true') {
    return true;
  }
  if (lower === 'false') {
    return false;
  }
  if (lower === 'null') {
    return null;
  }
  return unquoted;
}

function printUsage() {
  const usage = [
    'Usage:',
    '  node util/message "<template>" [options]',
    '',
    'Options:',
    '  --actor <json|{name:Foo}|Foo>',
    '  --target <json|{name:Bar}|Bar>',
    '  --direct <json|{name:Thing}|Thing>',
    '  --indirect <json|{name:Thing}|Thing>',
    '  --pov <self|target|other>',
    '  --audience <self|others|self_and_others|self_target_and_others|target_and_others>',
    '  --audiencePolicy <same values as --audience>',
    '  --json',
  ];
  process.stdout.write(`${usage.join('\n')}\n`);
}

const parsed = parseArgs(process.argv.slice(2));
if (!parsed.template) {
  printUsage();
  process.exitCode = 1;
} else {
  const instruction = {
    type: 'semanticEvent',
    template: parsed.template,
    audiencePolicy: parsed.audiencePolicy,
    participants: {
      actor: { selector: 'currentPlayer' },
    },
  };

  const context = {
    currentPlayer: parsed.actor,
    directTarget: parsed.direct,
    indirectTarget: parsed.indirect || parsed.target,
  };

  if (parsed.target) {
    instruction.participants.target = {
      selector: 'entityByContextRole',
      role: 'indirectTarget',
    };
  }

  if (parsed.direct) {
    instruction.participants.direct = {
      selector: 'entityByContextRole',
      role: 'directTarget',
    };
  }

  if (parsed.indirect) {
    instruction.participants.indirect = {
      selector: 'entityByContextRole',
      role: 'indirectTarget',
    };
  }

  const result = renderSemanticEvent(instruction, context, parsed.pov);

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${result.ok && result.included ? result.text : ''}\n`);
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}
