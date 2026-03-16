'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const ranvierPath = path.join(repoRoot, 'ranvier');
const baseConfigPath = path.join(repoRoot, 'ranvier.json');

function runWrapper({ cwd, outputPath }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [ranvierPath], {
      cwd,
      env: {
        ...process.env,
        RANVIER_WRAPPER_TEST: '1',
        RANVIER_WRAPPER_TEST_OUTPUT: outputPath,
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`wrapper exited with code ${code}: ${stderr}`));
        return;
      }
      resolve();
    });
  });
}

describe('ranvier wrapper smoke tests', function () {
  this.timeout(15000);

  it('boots through bundle loading without starting the server', async function () {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ranvier-smoke-'));
    const outputPath = path.join(tempDir, 'output.json');
    await runWrapper({ cwd: repoRoot, outputPath });

    const payload = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.strictEqual(payload.booted, true);
    assert.strictEqual(payload.configSource, 'ranvier.json');
  });

  it('prefers ranvier.conf.js over ranvier.json when both exist', async function () {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ranvier-conf-'));
    const outputPath = path.join(tempDir, 'output.json');
    const baseConfig = JSON.parse(fs.readFileSync(baseConfigPath, 'utf8'));
    const confConfig = { ...baseConfig, port: 51234 };
    const confPath = path.join(repoRoot, 'ranvier.conf.js');
    fs.writeFileSync(confPath, `module.exports = ${JSON.stringify(confConfig, null, 2)};\n`);

    try {
      await runWrapper({ cwd: repoRoot, outputPath });

      const payload = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      assert.strictEqual(payload.configSource, 'ranvier.conf.js');
      assert.strictEqual(payload.configPort, 51234);
    } finally {
      fs.unlinkSync(confPath);
    }
  });

  it('records data and bundle paths based on the wrapper location', async function () {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ranvier-paths-'));
    const outputPath = path.join(tempDir, 'output.json');
    await runWrapper({ cwd: repoRoot, outputPath });

    const payload = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const expectedDataPath = path.resolve(repoRoot, 'data');
    const expectedBundlesPath = path.resolve(repoRoot, 'bundles');

    assert.strictEqual(path.resolve(payload.dataPath), expectedDataPath);
    assert.strictEqual(path.resolve(payload.bundlesPath), expectedBundlesPath);
    assert.ok(fs.existsSync(expectedDataPath));
    assert.ok(fs.existsSync(expectedBundlesPath));
  });
});
