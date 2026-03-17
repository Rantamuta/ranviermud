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

module.exports = {
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
  readScenarioFile,
  resolveCanonicalIntent,
  resolveCommandExact,
  resolveMovementCommand,
  stripAnsi,
};
