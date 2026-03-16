#!/usr/bin/env node
'use strict';

const SLOT_KINDS = new Set(['TEXT', 'WORD', 'NUMBER', 'ENTITY', 'LIVING', 'EXIT']);
const VARIABLE_WIDTH_SLOTS = new Set(['TEXT', 'ENTITY', 'LIVING', 'EXIT']);

const VERB_RULES = {
  close: ['ENTITY'],
  go: ['EXIT'],
  inventory: ['(empty)'],
  lock: ['ENTITY with ENTITY', 'ENTITY'],
  look: ['(empty)', 'ENTITY'],
  open: ['ENTITY with ENTITY', 'ENTITY'],
  pull: ['ENTITY'],
  push: ['ENTITY'],
  put: ['ENTITY in ENTITY', 'ENTITY on ENTITY', 'ENTITY'],
  say: ['TEXT to LIVING', 'TEXT'],
  take: ['ENTITY from ENTITY', 'ENTITY'],
  unlock: ['ENTITY with ENTITY', 'ENTITY'],
};

const WORLD = {
  actorId: 'player:hero',
  entities: [
    { id: 'player:hero', name: 'hero', aliases: ['me'], isNpc: true, scope: 'actor' },
    { id: 'npc:bob', name: 'bob', aliases: ['guard bob'], isNpc: true, scope: 'room.livings' },
    { id: 'npc:alice', name: 'alice', aliases: ['merchant alice'], isNpc: true, scope: 'room.livings' },
    { id: 'item:oak-chest', name: 'old oak chest', aliases: ['oak chest', 'chest'], isNpc: false, scope: 'room.items' },
    { id: 'item:small-chest', name: 'small chest', aliases: ['chest'], isNpc: false, scope: 'room.items' },
    { id: 'item:silver-key', name: 'silver key', aliases: ['key'], isNpc: false, scope: 'inventory' },
    { id: 'item:rusty-key', name: 'rusty key', aliases: ['key'], isNpc: false, scope: 'inventory' },
    { id: 'item:apple', name: 'apple', aliases: ['fruit'], isNpc: false, scope: 'inventory' },
    { id: 'item:red-apple', name: 'red apple', aliases: ['apple'], isNpc: false, scope: 'room.items' },
    { id: 'item:blue-envelope', name: 'blue envelope', aliases: ['envelope'], isNpc: false, scope: 'room.items' },
    { id: 'item:green-envelope', name: 'green envelope', aliases: ['envelope'], isNpc: false, scope: 'room.items' },
  ],
  exits: [
    { id: 'exit:north', name: 'north', aliases: ['n'] },
    { id: 'exit:south', name: 'south', aliases: ['s'] },
    { id: 'exit:north-gate', name: 'north gate', aliases: ['gate'] },
  ],
};

function canonicalizeInput(input) {
  return String(input || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function tokenize(input) {
  if (!input) {
    return [];
  }

  return input.split(' ');
}

function compileRule(ruleText, compiledRuleId) {
  if (ruleText === '(empty)') {
    return { ruleText, compiledRuleId, atoms: [] };
  }

  const atoms = ruleText.split(' ').map((raw) => {
    if (SLOT_KINDS.has(raw)) {
      return { type: 'slot', kind: raw };
    }

    return { type: 'literal', value: raw };
  });

  return { ruleText, compiledRuleId, atoms };
}

function compileVerbRules(ruleMap) {
  return Object.fromEntries(
    Object.entries(ruleMap).map(([verb, rules]) => [
      verb,
      rules.map((ruleText, ruleIndex) => compileRule(ruleText, `${verb}:${ruleIndex}`)),
    ]),
  );
}

function isEntityBearingSlot(kind) {
  return kind === 'ENTITY' || kind === 'LIVING' || kind === 'EXIT';
}

function cloneCandidates(candidates) {
  return candidates.map((candidate) => ({ ...candidate }));
}

function cloneResolution(result) {
  return {
    kind: result.kind,
    status: result.status,
    surface: result.surface || null,
    selected: result.selected ? { ...result.selected } : null,
    candidates: cloneCandidates(result.candidates || []),
  };
}

function cloneCapture(capture) {
  return {
    kind: capture.kind,
    start: capture.start,
    end: capture.end,
    tokens: capture.tokens.slice(),
  };
}

function tryMatchRule(rule, tokens, world) {
  const captures = [];
  const slotStates = [];

  function recurse(atomIndex, tokenIndex) {
    if (atomIndex === rule.atoms.length) {
      if (tokenIndex === tokens.length) {
        const outcome = slotStates.some((entry) => entry.status === 'ambiguous') ? 'ambiguous' : 'success';
        return {
          ok: true,
          outcome,
          captures: captures.map(cloneCapture),
          slotStates: slotStates.map(cloneResolution),
        };
      }

      return { ok: false, reason: 'UNCONSUMED_TOKENS' };
    }

    const atom = rule.atoms[atomIndex];
    if (atom.type === 'literal') {
      if (tokens[tokenIndex] !== atom.value) {
        return { ok: false, reason: 'LITERAL_MISMATCH' };
      }

      return recurse(atomIndex + 1, tokenIndex + 1);
    }

    if (atom.kind === 'WORD' || atom.kind === 'NUMBER') {
      const token = tokens[tokenIndex];
      if (!token) {
        return { ok: false, reason: 'MISSING_FIXED_SLOT' };
      }

      if (atom.kind === 'NUMBER' && Number.isNaN(Number(token))) {
        return { ok: false, reason: 'NUMBER_PARSE_FAILED' };
      }

      captures.push({ kind: atom.kind, start: tokenIndex, end: tokenIndex + 1, tokens: [token] });
      slotStates.push({ kind: atom.kind, status: 'resolved' });
      const next = recurse(atomIndex + 1, tokenIndex + 1);
      if (next.ok) {
        return next;
      }

      captures.pop();
      slotStates.pop();
      return next;
    }

    if (VARIABLE_WIDTH_SLOTS.has(atom.kind)) {
      const minimumRemaining = countRemainingMinimumTokens(rule.atoms, atomIndex + 1);
      const maxEndExclusive = tokens.length - minimumRemaining;
      let firstAmbiguous = null;
      let firstSpecificFailure = null;
      let sawResolvedEntitySpan = false;
      let sawMissingEntitySpan = false;

      for (let endExclusive = maxEndExclusive; endExclusive > tokenIndex; endExclusive -= 1) {
        const span = tokens.slice(tokenIndex, endExclusive);
        captures.push({ kind: atom.kind, start: tokenIndex, end: endExclusive, tokens: span });
        if (isEntityBearingSlot(atom.kind)) {
          const resolution = resolveEntityCapture({ kind: atom.kind, tokens: span }, world);
          if (resolution.status === 'missing') {
            sawMissingEntitySpan = true;
            captures.pop();
            continue;
          }

          sawResolvedEntitySpan = true;
          slotStates.push({ kind: atom.kind, ...resolution });
        } else {
          slotStates.push({ kind: atom.kind, status: 'resolved' });
        }

        const next = recurse(atomIndex + 1, endExclusive);
        if (next.ok) {
          if (next.outcome === 'success') {
            return next;
          }

          if (!firstAmbiguous) {
            firstAmbiguous = next;
          }
        } else if (
          !firstSpecificFailure &&
          (next.reason === 'ENTITY_SLOT_MISSING' || next.reason === 'ENTITY_SLOT_NO_VIABLE_BINDING')
        ) {
          firstSpecificFailure = next;
        }

        captures.pop();
        slotStates.pop();
      }

      if (firstAmbiguous) {
        return firstAmbiguous;
      }

      if (firstSpecificFailure) {
        return firstSpecificFailure;
      }

      if (isEntityBearingSlot(atom.kind)) {
        if (sawMissingEntitySpan && !sawResolvedEntitySpan) {
          return { ok: false, reason: 'ENTITY_SLOT_MISSING' };
        }

        if (sawResolvedEntitySpan) {
          return { ok: false, reason: 'ENTITY_SLOT_NO_VIABLE_BINDING' };
        }
      }

      return { ok: false, reason: 'VARIABLE_SLOT_NO_SPAN' };
    }

    return { ok: false, reason: 'UNKNOWN_ATOM' };
  }

  return recurse(0, 0);
}

function countRemainingMinimumTokens(atoms, startIndex) {
  let min = 0;
  for (let index = startIndex; index < atoms.length; index += 1) {
    const atom = atoms[index];
    if (atom.type === 'literal') {
      min += 1;
    } else if (atom.kind === 'WORD' || atom.kind === 'NUMBER' || VARIABLE_WIDTH_SLOTS.has(atom.kind)) {
      min += 1;
    }
  }

  return min;
}

function entityScopesFor(kind) {
  if (kind === 'EXIT') {
    return ['exits'];
  }

  if (kind === 'LIVING') {
    return ['room.livings', 'actor'];
  }

  return ['inventory', 'room.items', 'room.livings', 'actor'];
}

function computeMatchScore(entity, surface) {
  const direct = [entity.name, ...(entity.aliases || [])].map((value) => value.toLowerCase());
  if (direct.includes(surface)) {
    return 3;
  }

  const surfaceTokens = surface.split(' ');
  return surfaceTokens.every((token) => direct.some((phrase) => phrase.split(' ').includes(token))) ? 1 : 0;
}

function resolveEntityCapture(capture, world) {
  const surface = capture.tokens.join(' ');
  const scopes = entityScopesFor(capture.kind);

  const candidates = [];
  for (const entity of world.entities) {
    if (!scopes.includes(entity.scope)) {
      continue;
    }

    if (capture.kind === 'LIVING' && entity.isNpc !== true) {
      continue;
    }

    const score = computeMatchScore(entity, surface);
    if (score > 0) {
      candidates.push({
        id: entity.id,
        name: entity.name,
        scope: entity.scope,
        score,
      });
    }
  }

  if (capture.kind === 'EXIT') {
    for (const exit of world.exits) {
      const exitNames = [exit.name, ...(exit.aliases || [])].map((value) => value.toLowerCase());
      if (exitNames.includes(surface)) {
        candidates.push({ id: exit.id, name: exit.name, scope: 'exits', score: 3 });
      }
    }
  }

  const ranked = candidates.sort((left, right) => {
    const scopeDelta = scopes.indexOf(left.scope) - scopes.indexOf(right.scope);
    if (scopeDelta !== 0) {
      return scopeDelta;
    }

    if (left.score !== right.score) {
      return right.score - left.score;
    }

    return left.id.localeCompare(right.id);
  });

  if (ranked.length === 0) {
    return { status: 'missing', surface, candidates: [] };
  }

  if (ranked.length === 1) {
    return { status: 'resolved', surface, candidates: ranked, selected: ranked[0] };
  }

  return { status: 'ambiguous', surface, candidates: ranked };
}

function deriveRoleMapping(captures, rule) {
  const mapping = [];
  let slotCount = 0;

  for (let atomIndex = 0; atomIndex < rule.atoms.length; atomIndex += 1) {
    const atom = rule.atoms[atomIndex];
    if (atom.type !== 'slot') {
      continue;
    }

    const capture = captures[slotCount];
    const prev = rule.atoms[atomIndex - 1];
    let role = null;
    if (capture && isEntityBearingSlot(capture.kind)) {
      role = prev && prev.type === 'literal' ? 'indirect' : 'direct';
    }

    mapping.push({ slotIndex: slotCount, kind: capture ? capture.kind : atom.kind, role });
    slotCount += 1;
  }

  return mapping;
}

function evaluateRule(rule, tokens, world) {
  const structural = tryMatchRule(rule, tokens, world);
  if (!structural.ok) {
    return {
      outcome: 'nonViable',
      reason: structural.reason,
      ruleText: rule.ruleText,
      compiledRuleId: rule.compiledRuleId,
    };
  }

  const captures = structural.captures.map((capture) => ({
    kind: capture.kind,
    text: capture.tokens.join(' '),
    tokenRange: [capture.start, capture.end],
    tokens: capture.tokens,
  }));

  const roleMapping = deriveRoleMapping(structural.captures, rule);
  const slotResults = captures.map((capture, slotIndex) => {
    const base = {
      slotIndex,
      kind: capture.kind,
      role: roleMapping[slotIndex] ? roleMapping[slotIndex].role : null,
      tokenRange: capture.tokenRange,
    };
    const state = structural.slotStates[slotIndex];

    if (!isEntityBearingSlot(capture.kind)) {
      return { ...base, status: 'resolved' };
    }

    return {
      ...base,
      status: state.status,
      surface: state.surface,
      selected: state.selected || null,
      candidates: cloneCandidates(state.candidates || []),
    };
  });

  const ambiguous = slotResults.filter((entry) => entry.status === 'ambiguous');

  if (structural.outcome === 'ambiguous') {
    return {
      outcome: 'ambiguous',
      ruleText: rule.ruleText,
      compiledRuleId: rule.compiledRuleId,
      captures,
      roleMapping,
      ambiguity: ambiguous,
      slotResults,
    };
  }

  return {
    outcome: 'success',
    ruleText: rule.ruleText,
    compiledRuleId: rule.compiledRuleId,
    captures,
    roleMapping,
    slotResults,
  };
}

function interpretInput(actorInput, compiledRules, world) {
  const canonicalInput = canonicalizeInput(actorInput);
  const tokens = tokenize(canonicalInput);
  const verb = tokens[0] || '';
  const postVerbTokens = tokens.slice(1);

  if (!verb || !compiledRules[verb]) {
    return {
      actorInput,
      canonicalInput,
      outcome: 'nonViable',
      reason: 'UNKNOWN_VERB',
      verb,
      selectedRule: null,
      evaluatedRules: [],
    };
  }

  const evaluatedRules = [];
  for (let ruleIndex = 0; ruleIndex < compiledRules[verb].length; ruleIndex += 1) {
    const rule = compiledRules[verb][ruleIndex];
    const outcome = evaluateRule(rule, postVerbTokens, world);
    evaluatedRules.push({ ruleIndex, ...outcome });

    if (outcome.outcome === 'success' || outcome.outcome === 'ambiguous') {
      return {
        actorInput,
        canonicalInput,
        verb,
        outcome: outcome.outcome,
        selectedRule: {
          ruleIndex,
          ruleText: rule.ruleText,
        },
        ...outcome,
        evaluatedRules,
      };
    }
  }

  return {
    actorInput,
    canonicalInput,
    verb,
    outcome: 'nonViable',
    reason: 'NO_VIABLE_RULE',
    selectedRule: null,
    evaluatedRules,
  };
}

function main() {
  const actorInput = process.argv.slice(2).join(' ');
  const compiled = compileVerbRules(VERB_RULES);
  const output = {
    metadata: {
      cli: 'verb-local-syntax-cli',
      model: 'prototype',
      deterministicWorld: true,
    },
    result: interpretInput(actorInput, compiled, WORLD),
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  canonicalizeInput,
  tokenize,
  compileRule,
  compileVerbRules,
  interpretInput,
  VERB_RULES,
  WORLD,
};
