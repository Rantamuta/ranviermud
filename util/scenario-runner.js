#!/usr/bin/env node
'use strict';

const { parseInput } = require('../bundles/bundle-rantamuta/lib/parse-input');
const { runScenarioCli } = require('./scenario-runner-lib');

runScenarioCli(process.argv.slice(2), {
  root: process.cwd(),
  parseInput,
}).then((status) => {
  process.exit(status || 0);
}).catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
