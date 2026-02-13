#!/usr/bin/env node
'use strict';

/**
 * CLI helper for exercising bundle parser behavior from the terminal.
 *
 * Purpose:
 * - Load a bundle-local parser implementation at
 *   `bundles/<bundle-name>/lib/parse-input.js`
 * - Parse one provided actor-input string, or run interactively when no input
 *   is provided.
 *
 * Scope:
 * - This tool is for parser artifact inspection only.
 * - It does not perform command execution, world lookup, or state mutation.
 *
 * Typical usage:
 * - `node util/parse-input-cli.js --json "look"`
 * - `node util/parse-input-cli.js --bundle bundle-rantamuta`
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function printHelp() {
  console.log('Usage: node util/parse-input-cli.js [--bundle <bundle-name>] [--json] [actor input]');
  console.log('');
  console.log('Examples:');
  console.log('  node util/parse-input-cli.js "look"');
  console.log('  node util/parse-input-cli.js --json "put rusty sword in old chest"');
  console.log('  node util/parse-input-cli.js --bundle bundle-rantamuta');
  console.log('');
  console.log('Flags:');
  console.log('  --bundle <bundle-name>  Bundle to load parser from (default: bundle-rantamuta)');
  console.log('  --json                  Emit JSON output');
  console.log('  --help                  Show this message');
}

function parseArgs(argv) {
  const options = {
    bundleName: 'bundle-rantamuta',
    json: false,
    actorInput: null,
    actorInputProvided: false,
  };

  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help') {
      options.help = true;
      continue;
    }

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--bundle') {
      if (i + 1 >= argv.length) {
        throw new Error('Missing value for --bundle');
      }

      options.bundleName = argv[i + 1];
      i += 1;
      continue;
    }

    positional.push(arg);
  }

  if (positional.length) {
    options.actorInput = positional.join(' ');
    options.actorInputProvided = true;
  }

  return options;
}

function resolveParserPath(bundleName, cwd) {
  return path.resolve(cwd, 'bundles', bundleName, 'lib', 'parse-input.js');
}

function loadParserModule(parserPath, bundleName) {
  if (!fs.existsSync(parserPath)) {
    throw new Error(
      `Parser not found for bundle "${bundleName}" at ${parserPath}. ` +
      'Ensure the bundle is installed and includes lib/parse-input.js.'
    );
  }

  // eslint-disable-next-line global-require, import/no-dynamic-require
  const parserModule = require(parserPath);
  if (!parserModule || typeof parserModule.parseInput !== 'function') {
    throw new Error(`Parser module at ${parserPath} does not export parseInput(actorInput).`);
  }

  return parserModule;
}

function parseOnce(parseInput, actorInput, options, parserPath) {
  const parsedInput = parseInput(actorInput);

  if (options.json) {
    process.stdout.write(`${JSON.stringify({
      bundle: options.bundleName,
      parserPath,
      actorInput,
      parsedInput,
    }, null, 2)}\n`);
    return;
  }

  console.log(`bundle: ${options.bundleName}`);
  console.log(`input: ${actorInput}`);
  console.log('parsed:');
  console.log(JSON.stringify(parsedInput, null, 2));
}

function startInteractive(parseInput, options, parserPath) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'parse-input> ',
  });

  if (!options.json) {
    console.log(`bundle: ${options.bundleName}`);
    console.log(`parser: ${parserPath}`);
    console.log('Type input lines to parse. Type "exit" or "quit" to leave.');
  }

  rl.prompt();

  rl.on('line', line => {
    const actorInput = String(line || '').trim();
    if (actorInput === 'exit' || actorInput === 'quit') {
      rl.close();
      return;
    }

    if (!actorInput) {
      rl.prompt();
      return;
    }

    try {
      parseOnce(parseInput, actorInput, options, parserPath);
    } catch (error) {
      console.error(error.message);
    }

    rl.prompt();
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return 0;
  }

  const parserPath = resolveParserPath(options.bundleName, process.cwd());
  const parserModule = loadParserModule(parserPath, options.bundleName);

  if (options.actorInputProvided) {
    parseOnce(parserModule.parseInput, options.actorInput, options, parserPath);
    return 0;
  }

  startInteractive(parserModule.parseInput, options, parserPath);
  return 0;
}

try {
  process.exit(main());
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
