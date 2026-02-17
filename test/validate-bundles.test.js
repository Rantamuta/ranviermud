'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const VALIDATE_SCRIPT = path.resolve(__dirname, '..', 'util', 'validate-bundles.js');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-bundles-test-'));

  writeJson(path.join(root, 'ranvier.json'), {
    bundles: ['bundle-test'],
  });

  const areaRoot = path.join(root, 'bundles', 'bundle-test', 'areas', 'test-area');
  writeText(path.join(areaRoot, 'manifest.yml'), 'title: Test Area\n');
  writeText(path.join(areaRoot, 'rooms.yml'), '[]\n');
  writeText(path.join(areaRoot, 'items.yml'), '[]\n');
  writeText(path.join(areaRoot, 'npcs.yml'), '[]\n');

  return {
    root,
    areaRoot,
  };
}

function runValidator(root) {
  const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, '--json'], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  try {
    return {
      status: result.status,
      findings: JSON.parse(result.stdout || '[]'),
    };
  } catch (err) {
    throw new Error(`Failed to parse validator output as JSON: ${result.stdout}`);
  }
}

describe('validate-bundles quests file checks', function () {
  it('reports a specific finding when area quests.yml is missing', function () {
    const workspace = createWorkspace();

    try {
      const result = runValidator(workspace.root);
      assert.strictEqual(result.status, 1, JSON.stringify(result.findings, null, 2));

      const questsMissing = result.findings.find((finding) => finding.code === 'AREA_QUESTS_FILE_MISSING');
      assert.ok(
        questsMissing,
        `Expected AREA_QUESTS_FILE_MISSING finding, got: ${JSON.stringify(result.findings, null, 2)}`
      );
      assert.match(questsMissing.message, /create .*quests\.yml.*\[\]/i);
    } finally {
      fs.rmSync(workspace.root, { recursive: true, force: true });
    }
  });

  it('accepts questless areas when quests.yml exists and contains []', function () {
    const workspace = createWorkspace();

    try {
      writeText(path.join(workspace.areaRoot, 'quests.yml'), '[]\n');
      const result = runValidator(workspace.root);
      assert.strictEqual(result.status, 0, JSON.stringify(result.findings, null, 2));

      const questsMissing = result.findings.find((finding) => finding.code === 'AREA_QUESTS_FILE_MISSING');
      assert.strictEqual(questsMissing, undefined);
    } finally {
      fs.rmSync(workspace.root, { recursive: true, force: true });
    }
  });
});
