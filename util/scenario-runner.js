#!/usr/bin/env node
'use strict';

/**
 * Scenario runner for command/bundle smoke checks.
 *
 * Boots Rantamuta/ranviermud in no-transport mode, loads bundles, and executes one or more
 * commands through the CommandManager using a real Player instance backed by a
 * dummy socket (stdout capture only). This gives a lightweight way to validate
 * command parsing, movement, and execution order without starting the telnet server.
 *
 * Usage:
 * - `node util/scenario-runner.js --command "look" --command "north"`
 * - `node util/scenario-runner.js --scenario test/scenarios/smoke.scenario`
 * - `node util/scenario-runner.js --room "test:room" --command "look"`
 *
 * Flags:
 * - `--command <text>`: add a command line to run (repeatable).
 * - `--scenario <path>`: load scenario directives from file.
 * - `--args "<args>"`: legacy args appended to a single `--command`.
 * - `--room "<area:roomId>"`: start the player in a specific room.
 * - `--seedInventory "<area:itemId>"`: seed a resolved item into player inventory (repeatable).
 * - `--seedRoomItem "<area:itemId>"`: seed a resolved item into the player's room (repeatable).
 * - `--playerEmit:<event> [args]`: emit player events (e.g., `--playerEmit:move east`).
 * - `--failOnUnknown`: exit non-zero if any unknown commands are encountered.
 * - `--json`: emit machine-readable JSON (includes log capture events).
 * - `--whitespace`: with --json, include blank/ANSI-only output lines.
 */
const { parseInput } = require('../bundles/bundle-rantamuta/lib/parse-input');
const {
  applySeeds,
  bootEngine,
  collectScenarioConfig,
  createFakePlayer,
  createInGameSession,
  createLogCapture,
  flushOutput,
  getMainInputListeners,
  isBlankOrAnsiOnly,
  loadConfig,
  mapRunEvent,
  parseCommandLine,
  resolveCanonicalIntent,
  resolveCommandExact,
  resolveMovementCommand,
} = require('./scenario-runner-lib');

let activeLogCapture = null;

function printHelp() {
  console.log('Usage: node util/scenario-runner.js [--command "look"] [--scenario <path>] [--room "area:roomId"] [--failOnUnknown] [--json]');
  console.log('       node util/scenario-runner.js [--command <name>] [--args "<args>"]');
  console.log('       node util/scenario-runner.js [--seedInventory "<area:itemId>"] [--seedRoomItem "<area:itemId>"]');
  console.log('       node util/scenario-runner.js --playerEmit:<event> [args]');
  console.log('       --scenario             load directives from .scenario files');
  console.log('       --failOnUnknown        exit non-zero if any unknown commands are encountered');
  console.log('       --json                 emit machine-readable JSON output');
  console.log('       --whitespace           with --json, keep blank/ANSI-only output lines');
  console.log('       --seedInventory        seed an item into player inventory (repeatable)');
  console.log('       --seedRoomItem         seed an item into the current room (repeatable)');
  console.log('Boots the engine in no-transport mode, loads bundles, and executes commands through InputEvent "main".');
  console.log('Scenario files are key/value directives: command, room, seedInventory, seedRoomItem.');
  console.log('Unknown flags are ignored.');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    printHelp();
    return;
  }

  const root = process.cwd();
  const scenarioConfig = collectScenarioConfig(args, root);
  const commandLines = scenarioConfig.commandLines;
  const parsedCommands = commandLines.map(parseCommandLine).filter(Boolean);
  const roomRef = scenarioConfig.roomRef;
  const seedRefs = scenarioConfig.seedRefs;
  const failOnUnknown = args.includes('--failOnUnknown');
  const jsonOutput = args.includes('--json');
  const includeWhitespace = args.includes('--whitespace');

  if (!parsedCommands.length) {
    throw new Error('No commands were provided to execute');
  }

  const events = [];
  const emitEvent = (event) => {
    if (jsonOutput) {
      events.push(event);
    }
  };
  const emitOutput = jsonOutput
    ? (text) => {
      const line = String(text);
      if (!includeWhitespace && isBlankOrAnsiOnly(line)) {
        return;
      }
      emitEvent({ type: 'output', text: line });
    }
    : null;
  const logCapture = jsonOutput ? createLogCapture(emitEvent) : null;
  activeLogCapture = logCapture;

  const config = loadConfig(root);
  const GameState = await bootEngine(root, config);
  const output = [];
  const player = createFakePlayer(output, GameState);
  const inputListeners = getMainInputListeners(GameState);
  if (inputListeners.length === 0) {
    throw new Error('No input-event listeners are registered for "main"');
  }
  const inputSession = createInGameSession(player);

  if (roomRef) {
    const room = GameState.RoomManager.getRoom(roomRef);
    if (!room) {
      if (logCapture) {
        logCapture.restore();
        activeLogCapture = null;
      }
      console.error(`[error] room not found: ${roomRef}`);
      process.exit(1);
      return;
    }

    player.room = room;
    if (typeof room.addPlayer === 'function') {
      room.addPlayer(player);
    }
  }

  if (player && typeof player.hydrate === 'function' && !player.__hydrated) {
    player.hydrate(GameState);
  }

  applySeeds(GameState, player, seedRefs, emitEvent);

  if (jsonOutput) {
    emitEvent({ type: 'start', commands: parsedCommands.length });
  }
  let unknownCount = 0;

  for (let i = 0; i < parsedCommands.length; i += 1) {
    const commandSpec = parsedCommands[i];
    if (!jsonOutput) {
      process.stdout.write(`${commandSpec.raw}\n`);
    }

    let runEvent = null;

    if (jsonOutput) {
      runEvent = { type: 'run', index: i + 1, raw: commandSpec.raw };
      emitEvent(runEvent);
    }

    if (commandSpec.type === 'playerEmit') {
      if (commandSpec.event === 'move') {
        const direction = (commandSpec.args || '').trim().toLowerCase();
        const movement = direction ? resolveMovementCommand(player, direction) : null;
        const roomExit = movement ? movement.roomExit : null;
        player.emit('move', { roomExit, originalCommand: direction });
      } else {
        player.emit(commandSpec.event, commandSpec.args);
      }
      if (runEvent) {
        Object.assign(runEvent, {
          parse: {
            intentToken: null,
            canonicalInput: '',
            normalizedInput: '',
            primaryTargetSpan: null,
            relationToken: null,
            secondaryTargetSpan: null,
          },
          lookup: {
            commandFound: false,
            commandName: null,
            alias: null,
          },
          phases: {
            input: { ok: true, code: 'PLAYER_EVENT' },
          },
          outcome: {
            ok: true,
            phase: 'success',
            code: 'PLAYER_EVENT',
            errorTag: null,
          },
        });
      }
      flushOutput(output, emitOutput);
      continue;
    }

    const parsedInput = parseInput(commandSpec.raw);
    const intentToken = typeof parsedInput.intentToken === 'string'
      ? parsedInput.intentToken
      : resolveCanonicalIntent(parsedInput, commandSpec.raw);
    const { command, alias } = resolveCommandExact(GameState, intentToken);
    const fallbackLookup = {
      commandFound: !!command,
      commandName: command && typeof command.name === 'string' ? command.name : (intentToken || null),
      alias: alias || null,
    };

    for (const listener of inputListeners) {
      await listener(inputSession, commandSpec.raw);
    }

    if (runEvent) {
      Object.assign(runEvent, mapRunEvent(parsedInput, fallbackLookup));
      const outcome = runEvent.outcome && typeof runEvent.outcome === 'object'
        ? runEvent.outcome
        : null;
      if (outcome && outcome.code === 'UNKNOWN_COMMAND') {
        unknownCount += 1;
        emitEvent({ type: 'unknown', index: i + 1, raw: commandSpec.raw });
      }
    } else if (!fallbackLookup.commandFound) {
      unknownCount += 1;
    }

    flushOutput(output, emitOutput);
  }

  const failed = failOnUnknown && unknownCount > 0 ? 1 : 0;
  flushOutput(output, emitOutput);

  if (jsonOutput) {
    emitEvent({ type: 'complete' });
    if (logCapture) {
      logCapture.flush();
    }
    const payload = {
      meta: {
        commands: parsedCommands.length,
        unknown: unknownCount,
        failed,
      },
      events,
    };
    if (logCapture) {
      logCapture.writeStdoutRaw(`${JSON.stringify(payload, null, 2)}\n`);
      logCapture.restore();
      activeLogCapture = null;
    } else {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    }
  }
  process.exit(failed);
}

main().catch((error) => {
  if (activeLogCapture) {
    activeLogCapture.restore();
    activeLogCapture = null;
  }
  console.error(error.stack || error.message);
  process.exit(1);
});
