'use strict';

const { loadScenarioParseInput } = require('./load-scenario-parse-input');
const { createScenarioRuntimeHarness } = require('./scenario-runner-lib');

const root = process.env.SCENARIO_HARNESS_ROOT || process.cwd();
const parseInput = loadScenarioParseInput(root);
const harnessPromise = createScenarioRuntimeHarness({ root, parseInput });

function serializeError(error) {
  return {
    message: error && error.message ? error.message : String(error),
    stack: error && error.stack ? error.stack : '',
  };
}

function send(message) {
  if (typeof process.send === 'function') {
    process.send(message);
  }
}

process.on('message', async (message) => {
  if (!message || typeof message !== 'object') {
    return;
  }

  if (message.type === 'run') {
    try {
      const harness = await harnessPromise;
      const result = await harness.runArgs(message.args || []);
      send({ type: 'response', id: message.id, result });
    } catch (error) {
      send({ type: 'response', id: message.id, error: serializeError(error) });
    }
    return;
  }

  if (message.type === 'close') {
    try {
      const harness = await harnessPromise;
      await harness.close();
    } catch (error) {
      send({ type: 'close-error', error: serializeError(error) });
    } finally {
      process.exit(0);
    }
  }
});

send({ type: 'ready', pid: process.pid });
