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
 * - `--throughInput`: route commands through InputEvent `main` using an in-game session.
 * - `--playerEmit:<event> [args]`: emit player events (e.g., `--playerEmit:move east`).
 * - `--failOnUnknown`: exit non-zero if any unknown commands are encountered.
 * - `--json`: emit machine-readable JSON (includes log capture events).
 */
const fs = require('fs');
const path = require('path');

let activeLogCapture = null;

function ensureTrailingSeparator(targetPath) {
  if (!targetPath) {
    return targetPath;
  }

  return /[\\/]$/.test(targetPath) ? targetPath : `${targetPath}${path.sep}`;
}

function printHelp() {
  console.log('Usage: node util/scenario-runner.js [--command "look"] [--scenario <path>] [--room "area:roomId"] [--failOnUnknown] [--json]');
  console.log('       node util/scenario-runner.js [--command <name>] [--args "<args>"]');
  console.log('       node util/scenario-runner.js [--seedInventory "<area:itemId>"] [--seedRoomItem "<area:itemId>"]');
  console.log('       node util/scenario-runner.js --playerEmit:<event> [args]');
  console.log('       --scenario             load directives from .scenario files');
  console.log('       --throughInput         execute command text via InputEvent "main" in an in-game session');
  console.log('       --failOnUnknown        exit non-zero if any unknown commands are encountered');
  console.log('       --json                 emit machine-readable JSON output');
  console.log('       --seedInventory        seed an item into player inventory (repeatable)');
  console.log('       --seedRoomItem         seed an item into the current room (repeatable)');
  console.log('Boots the engine in no-transport mode, loads bundles, and executes one or more commands.');
  console.log('Scenario files are key/value directives: command, room, seedInventory, seedRoomItem.');
  console.log('Unknown flags are ignored.');
}

function loadConfig(root) {
  const confPath = path.join(root, 'ranvier.conf.js');
  const jsonPath = path.join(root, 'ranvier.json');

  if (fs.existsSync(confPath)) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(confPath);
  }

  if (fs.existsSync(jsonPath)) {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }

  throw new Error('No ranvier.json or ranvier.conf.js found');
}

function parseCommandLine(line) {
  if (line && typeof line === 'object' && line.type) {
    return line;
  }

  const trimmed = String(line || '').trim();
  if (!trimmed) {
    return null;
  }

  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return { type: 'command', raw: trimmed, name: trimmed, args: '' };
  }

  return {
    type: 'command',
    raw: trimmed,
    name: trimmed.slice(0, spaceIndex),
    args: trimmed.slice(spaceIndex + 1).trim(),
  };
}

function readScenarioFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/u);
  const directives = [];

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const rawLine = lines[lineNumber];
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf(':');
    if (separator === -1) {
      throw new Error(`Invalid scenario directive at ${filePath}:${lineNumber + 1}`);
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!value) {
      throw new Error(`Missing scenario value for "${key}" at ${filePath}:${lineNumber + 1}`);
    }

    directives.push({ key, value, filePath, lineNumber: lineNumber + 1 });
  }

  return directives;
}

function collectScenarioConfig(args, root) {
  const commandLines = [];
  const seedInventoryRefs = [];
  const seedRoomItemRefs = [];
  let roomRef = null;
  let legacyArgs = '';
  let sawScenarioFile = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--command') {
      if (i + 1 >= args.length) {
        throw new Error('Missing value for --command');
      }

      commandLines.push(args[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--scenario') {
      if (i + 1 >= args.length) {
        throw new Error('Missing value for --scenario');
      }

      const scenarioPath = path.resolve(root, args[i + 1]);
      const directives = readScenarioFile(scenarioPath);
      for (const directive of directives) {
        switch (directive.key) {
          case 'command':
            commandLines.push(directive.value);
            break;
          case 'room':
            roomRef = directive.value;
            break;
          case 'seedInventory':
            seedInventoryRefs.push(directive.value);
            break;
          case 'seedRoomItem':
            seedRoomItemRefs.push(directive.value);
            break;
          default:
            throw new Error(`Unknown scenario directive "${directive.key}" at ${directive.filePath}:${directive.lineNumber}`);
        }
      }

      sawScenarioFile = true;
      i += 1;
      continue;
    }

    if (arg === '--commandsFile') {
      throw new Error('--commandsFile is not supported. Use --scenario <path>.');
    }

    if (arg.startsWith('--playerEmit:')) {
      const eventName = arg.slice('--playerEmit:'.length).trim();
      if (!eventName) {
        throw new Error('Missing value for --playerEmit');
      }

      let argValue = '';
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        argValue = args[i + 1];
        i += 1;
      }

      const raw = argValue ? `playerEmit:${eventName} ${argValue}` : `playerEmit:${eventName}`;
      commandLines.push({
        type: 'playerEmit',
        raw,
        event: eventName,
        args: argValue,
      });
      continue;
    }

    if (arg === '--args') {
      if (i + 1 >= args.length) {
        throw new Error('Missing value for --args');
      }

      legacyArgs = args[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--room') {
      if (i + 1 >= args.length) {
        throw new Error('Missing value for --room');
      }

      roomRef = args[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--seedInventory') {
      if (i + 1 >= args.length) {
        throw new Error('Missing value for --seedInventory');
      }

      seedInventoryRefs.push(args[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--seedRoomItem') {
      if (i + 1 >= args.length) {
        throw new Error('Missing value for --seedRoomItem');
      }

      seedRoomItemRefs.push(args[i + 1]);
      i += 1;
      continue;
    }
  }

  if (commandLines.length === 1 && legacyArgs && !sawScenarioFile) {
    if (typeof commandLines[0] === 'string') {
      commandLines[0] = `${commandLines[0]} ${legacyArgs}`;
    } else if (commandLines[0].type === 'command') {
      commandLines[0].raw = `${commandLines[0].raw} ${legacyArgs}`;
      commandLines[0].args = legacyArgs;
    }
  }

  if (!commandLines.length) {
    const commandIndex = args.indexOf('--command');
    const commandName = commandIndex >= 0 ? args[commandIndex + 1] : 'look';
    const commandArgs = legacyArgs;
    commandLines.push(commandArgs ? `${commandName} ${commandArgs}` : commandName);
  }

  return {
    commandLines,
    roomRef,
    seedRefs: {
      seedInventoryRefs,
      seedRoomItemRefs,
    },
  };
}

async function bootEngine(root, config) {
  const Ranvier = require('ranvier');
  Ranvier.Data.setDataPath(ensureTrailingSeparator(path.join(root, 'data')));
  Ranvier.Config.load(config);

  const GameState = {
    AccountManager: new Ranvier.AccountManager(),
    AreaBehaviorManager: new Ranvier.BehaviorManager(),
    AreaFactory: new Ranvier.AreaFactory(),
    AreaManager: new Ranvier.AreaManager(),
    AttributeFactory: new Ranvier.AttributeFactory(),
    ChannelManager: new Ranvier.ChannelManager(),
    CommandManager: new Ranvier.CommandManager(),
    Config: Ranvier.Config,
    EffectFactory: new Ranvier.EffectFactory(),
    HelpManager: new Ranvier.HelpManager(),
    InputEventManager: new Ranvier.EventManager(),
    ItemBehaviorManager: new Ranvier.BehaviorManager(),
    ItemFactory: new Ranvier.ItemFactory(),
    ItemManager: new Ranvier.ItemManager(),
    MobBehaviorManager: new Ranvier.BehaviorManager(),
    MobFactory: new Ranvier.MobFactory(),
    MobManager: new Ranvier.MobManager(),
    PartyManager: new Ranvier.PartyManager(),
    PlayerManager: new Ranvier.PlayerManager(),
    QuestFactory: new Ranvier.QuestFactory(),
    QuestGoalManager: new Ranvier.QuestGoalManager(),
    QuestRewardManager: new Ranvier.QuestRewardManager(),
    RoomBehaviorManager: new Ranvier.BehaviorManager(),
    RoomFactory: new Ranvier.RoomFactory(),
    RoomManager: new Ranvier.RoomManager(),
    SkillManager: new Ranvier.SkillManager(),
    SpellManager: new Ranvier.SkillManager(),
    ServerEventManager: new Ranvier.EventManager(),
    GameServer: new Ranvier.GameServer(),
    DataLoader: Ranvier.Data,
    EntityLoaderRegistry: new Ranvier.EntityLoaderRegistry(),
    DataSourceRegistry: new Ranvier.DataSourceRegistry(),
  };

  GameState.DataSourceRegistry.load(require, root, config.dataSources);
  GameState.EntityLoaderRegistry.load(GameState.DataSourceRegistry, config.entityLoaders);
  GameState.AccountManager.setLoader(GameState.EntityLoaderRegistry.get('accounts'));
  GameState.PlayerManager.setLoader(GameState.EntityLoaderRegistry.get('players'));

  const bundleManager = new Ranvier.BundleManager(`${path.join(root, 'bundles')}/`, GameState);
  GameState.BundleManager = bundleManager;
  await bundleManager.loadBundles();

  return GameState;
}

function createNullSocket(output) {
  const socket = {
    writable: true,
    _prompted: false,
    write: (line) => {
      output.push(String(line));
      return true;
    },
    command: () => undefined,
    toggleEcho: () => undefined,
    end: () => undefined,
    destroy: () => undefined,
    pause: () => undefined,
    resume: () => undefined,
    setEncoding: () => undefined,
    once: function () { return this; },
    on: function () { return this; },
    emit: () => false,
  };

  return socket;
}

function createFakePlayer(output, GameState) {
  const Ranvier = require('ranvier');
  const socket = createNullSocket(output);
  const player = new Ranvier.Player({
    name: 'ScenarioPlayer',
    socket,
  });

  player.send = (line) => output.push(String(line));
  player.echo = (line) => output.push(String(line));

  if (GameState && GameState.PlayerManager) {
    GameState.PlayerManager.events.attach(player);
    GameState.PlayerManager.addPlayer(player);
  }

  return player;
}

function createInGameSession(player) {
  return {
    state: 'inGame',
    socket: player.socket,
    username: player.name,
    account: player.account || null,
    player,
    isNewAccount: false,
    processing: false,
  };
}

function getMainInputListeners(GameState) {
  const listeners = GameState.InputEventManager.get('main');
  if (!listeners || listeners.size === 0) {
    return [];
  }

  return [...listeners];
}

function hasUnknownCommandOutput(output, fromIndex) {
  const addedOutput = output.slice(fromIndex);
  return addedOutput.some(line => String(line).includes('Unknown command.'));
}

function createSeedItem(GameState, itemRef) {
  const area = GameState.AreaManager.getAreaByReference(itemRef);
  if (!area) {
    throw new Error(`seed area not found for item: ${itemRef}`);
  }

  let item;
  try {
    item = GameState.ItemFactory.create(area, itemRef);
  } catch (error) {
    throw new Error(`seed item not found: ${itemRef}`);
  }

  item.hydrate(GameState);
  GameState.ItemManager.add(item);
  return item;
}

function applySeeds(GameState, player, seedRefs, emitEvent) {
  for (const itemRef of seedRefs.seedInventoryRefs) {
    const item = createSeedItem(GameState, itemRef);
    player.addItem(item);
    emitEvent({
      type: 'seed',
      scope: 'inventory',
      entityReference: itemRef,
      itemName: item.name,
    });
  }

  for (const itemRef of seedRefs.seedRoomItemRefs) {
    if (!player.room) {
      throw new Error('Cannot seed room items without a room. Pass --room "<area:roomId>".');
    }

    const item = createSeedItem(GameState, itemRef);
    player.room.addItem(item);
    emitEvent({
      type: 'seed',
      scope: 'room',
      entityReference: itemRef,
      itemName: item.name,
      room: player.room.entityReference,
    });
  }
}

function flushOutput(output, emitOutput) {
  if (output.length) {
    if (emitOutput) {
      for (const entry of output) {
        const lines = String(entry).split(/\r?\n/u);
        for (let i = 0; i < lines.length; i += 1) {
          emitOutput(lines[i]);
        }
      }
    } else {
      process.stdout.write(`${output.join('\n')}\n`);
    }
    output.length = 0;
  }
}

function resolveLogLevel(text, fallback) {
  const match = text.match(/\s-\s*(info|warn|error):/i);
  if (match) {
    return match[1].toLowerCase();
  }
  return fallback;
}

function createLogCapture(emitEvent) {
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  let stdoutBuffer = '';
  let stderrBuffer = '';

  const emitLogLine = (line, fallback) => {
    if (!line) {
      return;
    }
    emitEvent({
      type: 'log',
      level: resolveLogLevel(line, fallback),
      text: line,
    });
  };

  const captureWrite = (kind, chunk, encoding, callback) => {
    let cb = callback;
    let enc = encoding;
    if (typeof encoding === 'function') {
      cb = encoding;
      enc = undefined;
    }

    const text = Buffer.isBuffer(chunk) ? chunk.toString(enc) : String(chunk);
    if (kind === 'stdout') {
      stdoutBuffer += text;
      const lines = stdoutBuffer.split(/\r?\n/u);
      stdoutBuffer = lines.pop();
      for (const line of lines) {
        emitLogLine(line, 'info');
      }
    } else {
      stderrBuffer += text;
      const lines = stderrBuffer.split(/\r?\n/u);
      stderrBuffer = lines.pop();
      for (const line of lines) {
        emitLogLine(line, 'error');
      }
    }

    if (typeof cb === 'function') {
      cb();
    }

    return true;
  };

  process.stdout.write = (chunk, encoding, callback) => captureWrite('stdout', chunk, encoding, callback);
  process.stderr.write = (chunk, encoding, callback) => captureWrite('stderr', chunk, encoding, callback);

  const flush = () => {
    if (stdoutBuffer) {
      emitLogLine(stdoutBuffer, 'info');
      stdoutBuffer = '';
    }
    if (stderrBuffer) {
      emitLogLine(stderrBuffer, 'error');
      stderrBuffer = '';
    }
  };

  const restore = () => {
    flush();
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  };

  return {
    flush,
    restore,
    writeStdoutRaw: originalStdoutWrite,
    writeStderrRaw: originalStderrWrite,
  };
}

function resolveMovementCommand(player, command) {
  if (!player.room) {
    return null;
  }

  const room = player.room;
  const primaryDirections = ['north', 'south', 'east', 'west', 'up', 'down'];
  for (const direction of primaryDirections) {
    if (direction.indexOf(command) === 0) {
      const exit = room.getExits().find(roomExit => roomExit.direction === direction) || null;
      return { direction, roomExit: exit };
    }
  }

  const secondaryDirections = [
    { abbr: 'ne', name: 'northeast' },
    { abbr: 'nw', name: 'northwest' },
    { abbr: 'se', name: 'southeast' },
    { abbr: 'sw', name: 'southwest' },
  ];

  for (const direction of secondaryDirections) {
    if (direction.abbr === command || direction.name.indexOf(command) === 0) {
      const exit = room.getExits().find(roomExit => roomExit.direction === direction.name) || null;
      return { direction: direction.name, roomExit: exit };
    }
  }

  const otherExit = room.getExits().find(roomExit => roomExit.direction === command);
  if (otherExit) {
    return { direction: otherExit.direction, roomExit: otherExit };
  }

  return null;
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
  const throughInput = args.includes('--throughInput');
  const failOnUnknown = args.includes('--failOnUnknown');
  const jsonOutput = args.includes('--json');

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
    ? (text) => emitEvent({ type: 'output', text })
    : null;
  const logCapture = jsonOutput ? createLogCapture(emitEvent) : null;
  activeLogCapture = logCapture;

  const config = loadConfig(root);
  const GameState = await bootEngine(root, config);
  const output = [];
  const player = createFakePlayer(output, GameState);
  const inputListeners = throughInput ? getMainInputListeners(GameState) : [];
  if (throughInput && inputListeners.length === 0) {
    throw new Error('No input-event listeners are registered for "main"');
  }
  const inputSession = throughInput ? createInGameSession(player) : null;

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
  } else {
    console.log(`[info] scenario starting (commands=${parsedCommands.length})`);
  }
  let unknownCount = 0;

  for (let i = 0; i < parsedCommands.length; i += 1) {
    const commandSpec = parsedCommands[i];

    if (jsonOutput) {
      emitEvent({ type: 'run', index: i + 1, raw: commandSpec.raw });
    } else {
      console.log(`[run] ${i + 1}/${parsedCommands.length}: ${commandSpec.raw}`);
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
      flushOutput(output, emitOutput);
      continue;
    }

    const commandName = commandSpec.name.toLowerCase();
    if (throughInput) {
      const outputStart = output.length;
      for (const listener of inputListeners) {
        await listener(inputSession, commandSpec.raw);
      }
      if (hasUnknownCommandOutput(output, outputStart)) {
        unknownCount += 1;
        emitEvent({ type: 'unknown', index: i + 1, raw: commandSpec.raw });
      }
      flushOutput(output, emitOutput);
      continue;
    }

    const movement = resolveMovementCommand(player, commandName);
    if (movement) {
      player.emit('move', { roomExit: movement.roomExit, originalCommand: movement.direction });
      flushOutput(output, emitOutput);
      continue;
    }

    const commandMatch = GameState.CommandManager.find(commandSpec.name, true);
    if (!commandMatch) {
      unknownCount += 1;
      player.send('Unknown command.');
      emitEvent({ type: 'unknown', index: i + 1, raw: commandSpec.raw });
      flushOutput(output, emitOutput);
      continue;
    }

    const { command, alias } = commandMatch;
    await command.execute(commandSpec.args, player, alias);
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
  } else {
    console.log(`[info] scenario complete (commands=${parsedCommands.length}, unknown=${unknownCount}, failed=${failed})`);
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
