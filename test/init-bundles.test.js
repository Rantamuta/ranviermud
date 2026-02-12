'use strict';

const assert = require('assert');

const {
  getBundleName,
  hasSubmoduleStageEntry,
} = require('../util/init-bundles');

describe('init-bundles helpers', function () {
  it('extracts bundle names from https remotes', function () {
    const name = getBundleName('https://github.com/Rantamuta/bundle-rantamuta');
    assert.strictEqual(name, 'bundle-rantamuta');
  });

  it('strips a .git suffix before extracting the bundle name', function () {
    const name = getBundleName('https://github.com/Rantamuta/bundle-rantamuta.git');
    assert.strictEqual(name, 'bundle-rantamuta');
  });

  it('ignores trailing slashes when extracting the bundle name', function () {
    const name = getBundleName('https://github.com/Rantamuta/bundle-rantamuta.git/');
    assert.strictEqual(name, 'bundle-rantamuta');
  });

  it('detects a submodule stage entry in git ls-files output', function () {
    const stageOutput = '160000 b848e371f563fe0035542157273ffb0da6b91b64 0\tbundles/bundle-rantamuta\n';
    assert.strictEqual(hasSubmoduleStageEntry(stageOutput), true);
  });

  it('does not detect a submodule stage entry for normal file modes', function () {
    const stageOutput = '100644 0123456789abcdef0123456789abcdef01234567 0\tREADME.md\n';
    assert.strictEqual(hasSubmoduleStageEntry(stageOutput), false);
  });
});
