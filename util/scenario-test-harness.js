'use strict';

const { parseInput } = require('../bundles/bundle-rantamuta/lib/parse-input');
const { createScenarioRuntimeHarness } = require('./scenario-runner-lib');

async function createScenarioHarness(options = {}) {
  const harness = await createScenarioRuntimeHarness({
    root: options.root || process.cwd(),
    parseInput: options.parseInput || parseInput,
  });

  return {
    async runScenario(args, runOptions = {}) {
      return harness.runArgs(args, runOptions);
    },
    async close() {
      await harness.close();
    },
  };
}

module.exports = {
  createScenarioHarness,
};
