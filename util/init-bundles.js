#!/usr/bin/env node
'use strict';

const cp = require('child_process');
const fs = require('fs');
const readline = require('readline');

const argv = process.argv.slice(2);
const assumeYes = argv.includes('--yes') || argv.includes('-y');
const allowDirty = argv.includes('--force') || argv.includes('--allow-dirty');

const gitRoot = cp.execSync('git rev-parse --show-toplevel').toString('utf8').trim();
process.chdir(gitRoot);

function isPathIgnored(targetPath) {
  const result = cp.spawnSync('git', ['check-ignore', '-q', targetPath], { stdio: 'ignore' });
  if (result.status === 0) {
    return true;
  }
  if (result.status === 1) {
    return false;
  }
  return false;
}

function getBundleName(remote) {
  const name = remote
    .trim()
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '')
    .split('/')
    .pop();

  return name;
}

function hasSubmoduleStageEntry(stageOutput) {
  return stageOutput
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .some(line => line.startsWith('160000 '));
}

function isTrackedSubmodule(bundlePath) {
  const result = cp.spawnSync('git', ['ls-files', '--stage', '--', bundlePath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  if (result.status !== 0) {
    return false;
  }

  return hasSubmoduleStageEntry(result.stdout || '');
}

function ensureSubmoduleInitialized(bundlePath) {
  if (!isTrackedSubmodule(bundlePath)) {
    return;
  }

  cp.execSync(`git submodule update --init -- ${bundlePath}`);
}

async function prompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve, reject) => {
    rl.question('Do you want to install the example bundles? [Y/n] ', resolve);
  });
}

async function main() {

  if (!assumeYes) {
    try {
      let answer = await prompt();

      if (answer === 'n') {
        throw 'foo';
      }
    } catch (err) {
      console.log('Done.');
      process.exit(0);
    }
  }

  const defaultBundles = [
    'https://github.com/Rantamuta/bundle-rantamuta',
  ];

  if (!allowDirty) {
    const modified = cp.execSync('git status -uno --porcelain').toString();
    if (modified) {
      console.warn('You have uncommitted changes. For safety setup-bundles must be run on a clean repository.');
      console.warn('Use --force to bypass this check if you know what you are doing.');
      process.exit(1);
    }
  }

  // install each bundle
  for (const bundle of defaultBundles) {
    const bundleName = getBundleName(bundle);
    const bundlePath = `bundles/${bundleName}`;
    ensureSubmoduleInitialized(bundlePath);
    cp.execSync(`npm run install-bundle ${bundle}`);
  }
  console.info('Done.');

  console.info('Enabling bundles...');
  const ranvierJsonPath = __dirname + '/../ranvier.json';
  const ranvierJson = require(ranvierJsonPath);
  ranvierJson.bundles = defaultBundles.map(getBundleName);
  fs.writeFileSync(ranvierJsonPath, JSON.stringify(ranvierJson, null, 2));
  console.info('Done.');

  cp.execSync('git add ranvier.json');

  const bundlesIgnored = isPathIgnored('bundles/.bundle-ignore-check');
  const bundleMode = bundlesIgnored ? 'locally under bundles/ (ignored by git)' : 'as submodules';
  const commitHint = bundlesIgnored
    ? '  git commit -m "Enable example bundles"'
    : '  git commit -m "Install bundles"';

  console.info(`
-------------------------------------------------------------------------------
Example bundles have been installed ${bundleMode}. It's recommended that you now
run the following command to save the ranvier.json update:

${commitHint}

You're all set! See https://ranviermud.com for guides and API references
`);

  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  getBundleName,
  hasSubmoduleStageEntry,
};
