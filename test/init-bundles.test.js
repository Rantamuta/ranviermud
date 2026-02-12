'use strict';

const assert = require('assert');

const { getBundleName } = require('../util/init-bundles');

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
});
