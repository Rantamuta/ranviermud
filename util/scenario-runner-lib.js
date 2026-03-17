'use strict';

const fs = require('fs');
const path = require('path');

function ensureTrailingSeparator(targetPath) {
  if (!targetPath) {
    return targetPath;
  }

  return /[\\/]$/.test(targetPath) ? targetPath : `${targetPath}${path.sep}`;
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

function parseRunnerArgs(args, root) {
  const scenarioConfig = collectScenarioConfig(args, root);
  const parsedCommands = scenarioConfig.commandLines.map(parseCommandLine).filter(Boolean);
  if (!parsedCommands.length) {
    throw new Error('No commands were provided to execute');
  }

  return {
    commandLines: scenarioConfig.commandLines,
    parsedCommands,
    roomRef: scenarioConfig.roomRef,
    seedRefs: scenarioConfig.seedRefs,
    failOnUnknown: args.includes('--failOnUnknown'),
    jsonOutput: args.includes('--json'),
    includeWhitespace: args.includes('--whitespace'),
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
  return {
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

function resolveCanonicalIntent(parsedInput, raw) {
  if (parsedInput && typeof parsedInput.intentToken === 'string') {
    return parsedInput.intentToken.trim().split(/\s+/u)[0] || '';
  }

  const trimmedRaw = String(raw || '').trim();
  return trimmedRaw ? trimmedRaw.split(/\s+/u)[0] : '';
}

function resolveCommandExact(GameState, commandName) {
  const normalizedName = String(commandName || '').trim().toLowerCase();
  if (!normalizedName) {
    return { command: null, alias: null };
  }

  const manager = GameState && GameState.CommandManager;
  if (!manager || typeof manager !== 'object') {
    return { command: null, alias: null };
  }

  if (typeof manager.get === 'function') {
    const command = manager.get(normalizedName);
    if (!command) {
      return { command: null, alias: null };
    }

    const isAlias = Array.isArray(command.aliases) &&
      command.aliases.includes(normalizedName) &&
      command.name !== normalizedName;

    return { command, alias: isAlias ? normalizedName : null };
  }

  if (typeof manager.find === 'function') {
    const match = manager.find(normalizedName, true);
    if (!match) {
      return { command: null, alias: null };
    }

    if (typeof match === 'object' && 'command' in match && 'alias' in match) {
      if (match.alias !== normalizedName) {
        return { command: null, alias: null };
      }

      return { command: match.command, alias: match.alias };
    }

    return { command: null, alias: null };
  }

  return { command: null, alias: null };
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
  const createdItems = [];

  for (const itemRef of seedRefs.seedInventoryRefs) {
    const item = createSeedItem(GameState, itemRef);
    createdItems.push(item);
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
    createdItems.push(item);
    player.room.addItem(item);
    emitEvent({
      type: 'seed',
      scope: 'room',
      entityReference: itemRef,
      itemName: item.name,
      room: player.room.entityReference,
    });
  }

  return createdItems;
}

function flushOutput(output, emitOutput, writeOutput = process.stdout.write.bind(process.stdout)) {
  if (!output.length) {
    return;
  }

  if (emitOutput) {
    for (const entry of output) {
      const lines = String(entry).split(/\r?\n/u);
      for (let i = 0; i < lines.length; i += 1) {
        emitOutput(lines[i]);
      }
    }
  } else {
    for (const entry of output) {
      writeOutput(String(entry));
    }
  }

  output.length = 0;
}

function stripAnsi(text) {
  return String(text).replace(
    // eslint-disable-next-line no-control-regex
    /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-ntqry=><]))/g,
    ''
  );
}

function isBlankOrAnsiOnly(text) {
  return stripAnsi(text).trim().length === 0;
}

function nullableString(value) {
  return typeof value === 'string' ? value : null;
}

function mapRunEvent(parsedInput, lookup, code) {
  const commandFound = !!lookup.commandFound;
  const outcomeCode = code || (commandFound ? 'OK' : 'UNKNOWN_COMMAND');
  const outcomeOk = outcomeCode === 'OK';
  return {
    parse: {
      intentToken: nullableString(parsedInput.intentToken),
      canonicalInput: typeof parsedInput.canonicalInput === 'string' ? parsedInput.canonicalInput : '',
      normalizedInput: typeof parsedInput.normalizedInput === 'string' ? parsedInput.normalizedInput : '',
      primaryTargetSpan: Array.isArray(parsedInput.primaryTargetSpan) ? parsedInput.primaryTargetSpan : null,
      relationToken: nullableString(parsedInput.relationToken),
      secondaryTargetSpan: Array.isArray(parsedInput.secondaryTargetSpan) ? parsedInput.secondaryTargetSpan : null,
    },
    lookup: {
      commandFound,
      commandName: nullableString(lookup.commandName),
      alias: nullableString(lookup.alias),
    },
    phases: {},
    outcome: {
      ok: outcomeOk,
      phase: outcomeOk ? 'success' : 'lookup',
      code: outcomeCode,
      errorTag: null,
    },
  };
}

function resolveLogLevel(text, fallback) {
  const match = text.match(/\s-\s*(info|warn|error):/i);
  if (match) {
    return match[1].toLowerCase();
  }
  return fallback;
}

function createLogCapture(emitEvent, stdout = process.stdout, stderr = process.stderr) {
  const originalStdoutWrite = stdout.write.bind(stdout);
  const originalStderrWrite = stderr.write.bind(stderr);
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

  stdout.write = (chunk, encoding, callback) => captureWrite('stdout', chunk, encoding, callback);
  stderr.write = (chunk, encoding, callback) => captureWrite('stderr', chunk, encoding, callback);

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
    stdout.write = originalStdoutWrite;
    stderr.write = originalStderrWrite;
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

function getHelpText() {
  return [
    'Usage: node util/scenario-runner.js [--command "look"] [--scenario <path>] [--room "area:roomId"] [--failOnUnknown] [--json]',
    '       node util/scenario-runner.js [--command <name>] [--args "<args>"]',
    '       node util/scenario-runner.js [--seedInventory "<area:itemId>"] [--seedRoomItem "<area:itemId>"]',
    '       node util/scenario-runner.js --playerEmit:<event> [args]',
    '       --scenario             load directives from .scenario files',
    '       --failOnUnknown        exit non-zero if any unknown commands are encountered',
    '       --json                 emit machine-readable JSON output',
    '       --whitespace           with --json, keep blank/ANSI-only output lines',
    '       --seedInventory        seed an item into player inventory (repeatable)',
    '       --seedRoomItem         seed an item into the current room (repeatable)',
    'Boots the engine in no-transport mode, loads bundles, and executes commands through InputEvent "main".',
    'Scenario files are key/value directives: command, room, seedInventory, seedRoomItem.',
    'Unknown flags are ignored.',
  ].join('\n');
}

function cleanupScenarioRun(GameState, player, createdItems) {
  for (let i = createdItems.length - 1; i >= 0; i -= 1) {
    const item = createdItems[i];
    if (!item || item.__pruned) {
      continue;
    }

    GameState.ItemManager.remove(item);
  }

  if (player && !player.__pruned && GameState && GameState.PlayerManager) {
    GameState.PlayerManager.removePlayer(player, false);
  }
}

async function executeScenarioRequest(GameState, request, options = {}) {
  const parseInput = options.parseInput;
  const captureLogs = !!options.captureLogs;
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;
  const output = [];
  const stdoutChunks = [];
  const stderrChunks = [];
  const events = [];
  let player = null;
  let createdItems = [];
  let logCapture = null;

  const emitEvent = (event) => {
    if (request.jsonOutput) {
      events.push(event);
    }
  };
  const emitOutput = request.jsonOutput
    ? (text) => {
      const line = String(text);
      if (!request.includeWhitespace && isBlankOrAnsiOnly(line)) {
        return;
      }
      emitEvent({ type: 'output', text: line });
    }
    : null;
  const writeStdout = (text) => {
    stdoutChunks.push(String(text));
  };
  const writeStderr = (text) => {
    stderrChunks.push(String(text));
  };

  try {
    if (request.jsonOutput && captureLogs) {
      logCapture = createLogCapture(emitEvent, stdout, stderr);
    }

    player = createFakePlayer(output, GameState);
    const inputListeners = getMainInputListeners(GameState);
    if (inputListeners.length === 0) {
      throw new Error('No input-event listeners are registered for "main"');
    }
    const inputSession = createInGameSession(player);

    if (request.roomRef) {
      const room = GameState.RoomManager.getRoom(request.roomRef);
      if (!room) {
        writeStderr(`[error] room not found: ${request.roomRef}\n`);
        return {
          status: 1,
          stdout: '',
          stderr: stderrChunks.join(''),
          payload: null,
          events: [],
          unknown: 0,
        };
      }

      player.room = room;
      if (typeof room.addPlayer === 'function') {
        room.addPlayer(player);
      }
    }

    if (player && typeof player.hydrate === 'function' && !player.__hydrated) {
      player.hydrate(GameState);
    }

    createdItems = applySeeds(GameState, player, request.seedRefs, emitEvent);

    if (request.jsonOutput) {
      emitEvent({ type: 'start', commands: request.parsedCommands.length });
    }

    let unknownCount = 0;

    for (let i = 0; i < request.parsedCommands.length; i += 1) {
      const commandSpec = request.parsedCommands[i];
      if (!request.jsonOutput) {
        writeStdout(`${commandSpec.raw}\n`);
      }

      let runEvent = null;
      if (request.jsonOutput) {
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
        flushOutput(output, emitOutput, writeStdout);
        continue;
      }

      const parsedInput = typeof parseInput === 'function'
        ? parseInput(commandSpec.raw)
        : {
          intentToken: null,
          canonicalInput: commandSpec.raw,
          normalizedInput: commandSpec.raw,
          primaryTargetSpan: null,
          relationToken: null,
          secondaryTargetSpan: null,
        };
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

      flushOutput(output, emitOutput, writeStdout);
    }

    const failed = request.failOnUnknown && unknownCount > 0 ? 1 : 0;
    flushOutput(output, emitOutput, writeStdout);

    let payload = null;
    if (request.jsonOutput) {
      emitEvent({ type: 'complete' });
      if (logCapture) {
        logCapture.flush();
      }
      payload = {
        meta: {
          commands: request.parsedCommands.length,
          unknown: unknownCount,
          failed,
        },
        events,
      };
      if (logCapture) {
        logCapture.writeStdoutRaw(`${JSON.stringify(payload, null, 2)}\n`);
      } else {
        writeStdout(`${JSON.stringify(payload, null, 2)}\n`);
      }
    }

    return {
      status: failed,
      stdout: stdoutChunks.join(''),
      stderr: stderrChunks.join(''),
      payload,
      events,
      unknown: unknownCount,
    };
  } finally {
    if (logCapture) {
      logCapture.restore();
    }
    cleanupScenarioRun(GameState, player, createdItems);
  }
}

async function createScenarioRuntimeHarness(options = {}) {
  const root = options.root || process.cwd();
  const config = options.config || loadConfig(root);
  const GameState = options.GameState || await bootEngine(root, config);
  const parseInput = options.parseInput;

  return {
    GameState,
    async runArgs(args, runOptions = {}) {
      const request = parseRunnerArgs(args, root);
      return executeScenarioRequest(GameState, request, {
        parseInput: typeof runOptions.parseInput === 'function' ? runOptions.parseInput : parseInput,
        captureLogs: runOptions.captureLogs,
        stdout: runOptions.stdout,
        stderr: runOptions.stderr,
      });
    },
    async runRequest(request, runOptions = {}) {
      return executeScenarioRequest(GameState, request, {
        parseInput: typeof runOptions.parseInput === 'function' ? runOptions.parseInput : parseInput,
        captureLogs: runOptions.captureLogs,
        stdout: runOptions.stdout,
        stderr: runOptions.stderr,
      });
    },
    async close() {
      return undefined;
    },
  };
}

async function runScenarioCli(args, options = {}) {
  const root = options.root || process.cwd();
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;
  const parseInput = options.parseInput;

  if (args.includes('--help')) {
    stdout.write(`${getHelpText()}\n`);
    return 0;
  }

  const request = parseRunnerArgs(args, root);
  const harness = await createScenarioRuntimeHarness({
    root,
    parseInput: typeof parseInput === 'function' ? parseInput : undefined,
  });
  const result = await harness.runRequest(request, {
    captureLogs: true,
    stdout,
    stderr,
  });
  if (result.stdout && !request.jsonOutput) {
    stdout.write(result.stdout);
  }
  if (result.stderr) {
    stderr.write(result.stderr);
  }
  return result.status;
}

module.exports = {
  applySeeds,
  bootEngine,
  collectScenarioConfig,
  createScenarioRuntimeHarness,
  createFakePlayer,
  createInGameSession,
  createLogCapture,
  executeScenarioRequest,
  flushOutput,
  getHelpText,
  getMainInputListeners,
  isBlankOrAnsiOnly,
  loadConfig,
  mapRunEvent,
  parseCommandLine,
  parseRunnerArgs,
  readScenarioFile,
  resolveCanonicalIntent,
  resolveCommandExact,
  resolveMovementCommand,
  runScenarioCli,
  stripAnsi,
};
