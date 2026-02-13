#!/usr/bin/env node
'use strict';

/**
 * Minimal parser CLI.
 *
 * Contract:
 * - Input: one actor-input string from argv (all args joined with spaces).
 * - Output: exactly one JSON object, the parse artifact from parseInput().
 * - No interactive mode and no flags.
 * - Empty input is valid and is parsed as empty actor input.
 */

const path = require('path');

const parserPath = path.resolve(process.cwd(), 'bundles', 'bundle-rantamuta', 'lib', 'parse-input.js');
// eslint-disable-next-line global-require, import/no-dynamic-require
const { parseInput } = require(parserPath);

const actorInput = process.argv.slice(2).join(' ');
const parsed = parseInput(actorInput);
process.stdout.write(`${JSON.stringify(parsed, null, 2)}\n`);
