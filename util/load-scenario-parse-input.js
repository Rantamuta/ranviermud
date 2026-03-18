'use strict';

const fs = require('fs');
const path = require('path');

function getCandidateModulePaths(root) {
  return [
    path.join(root, 'bundles', 'bundle-rantamuta', 'lib', 'parse-input'),
    path.join(root, 'lib', 'parse-input'),
  ];
}

function loadScenarioParseInput(root = process.cwd()) {
  for (const modulePath of getCandidateModulePaths(root)) {
    if (!fs.existsSync(`${modulePath}.js`)) {
      continue;
    }

    // eslint-disable-next-line global-require, import/no-dynamic-require
    const moduleExports = require(modulePath);
    if (moduleExports && typeof moduleExports.parseInput === 'function') {
      return moduleExports.parseInput;
    }
  }

  throw new Error(`Scenario parser not found for root ${root}`);
}

module.exports = {
  getCandidateModulePaths,
  loadScenarioParseInput,
};
