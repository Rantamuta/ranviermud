'use strict';

const assert = require('assert');

const {
  lexInput,
  parseInput,
  UNKNOWN_INTENT_CODE,
  SEMANTIC_ERROR_CODE,
} = require('../bundles/bundle-rantamuta/lib/parse-input');

describe('bundle-rantamuta parse-input', function () {
  it('lexInput trims whitespace and preserves token order', function () {
    const tokens = lexInput('  put   rusty  sword   in old   chest  ');
    assert.deepStrictEqual(tokens, ['put', 'rusty', 'sword', 'in', 'old', 'chest']);
  });

  it('parses intent-only input (look)', function () {
    const result = parseInput('look');

    assert.strictEqual(result.actorInput, 'look');
    assert.strictEqual(result.normalizedInput, 'look');
    assert.strictEqual(result.intentToken, 'look');
    assert.deepStrictEqual(result.primaryTargetSpan, []);
    assert.strictEqual(result.relationToken, null);
    assert.deepStrictEqual(result.secondaryTargetSpan, []);
    assert.strictEqual(result.classification, 'success');
    assert.strictEqual(result.errorEnvelope, null);
  });

  it('parses relation-form input into primary/relation/secondary spans', function () {
    const result = parseInput('put rusty sword in old chest');

    assert.strictEqual(result.actorInput, 'put rusty sword in old chest');
    assert.strictEqual(result.normalizedInput, 'put rusty sword in old chest');
    assert.strictEqual(result.intentToken, 'put');
    assert.deepStrictEqual(result.primaryTargetSpan, ['rusty', 'sword']);
    assert.strictEqual(result.relationToken, 'in');
    assert.deepStrictEqual(result.secondaryTargetSpan, ['old', 'chest']);
    assert.strictEqual(result.classification, 'success');
    assert.strictEqual(result.errorEnvelope, null);
  });

  it('classifies malformed relation form as semantic error', function () {
    const result = parseInput('put in old chest');

    assert.strictEqual(result.intentToken, 'put');
    assert.deepStrictEqual(result.primaryTargetSpan, []);
    assert.strictEqual(result.relationToken, 'in');
    assert.deepStrictEqual(result.secondaryTargetSpan, ['old', 'chest']);
    assert.strictEqual(result.classification, 'semantic error');
    assert.deepStrictEqual(result.errorEnvelope, {
      class: 'semantic error',
      code: SEMANTIC_ERROR_CODE,
      details: {
        intentToken: 'put',
        relationToken: 'in',
        missingSpan: 'primaryTargetSpan',
      },
    });
  });

  it('classifies empty input as unknown intent', function () {
    const result = parseInput('   ');

    assert.strictEqual(result.intentToken, null);
    assert.deepStrictEqual(result.primaryTargetSpan, []);
    assert.strictEqual(result.relationToken, null);
    assert.deepStrictEqual(result.secondaryTargetSpan, []);
    assert.strictEqual(result.classification, 'unknown intent');
    assert.deepStrictEqual(result.errorEnvelope, {
      class: 'unknown intent',
      code: UNKNOWN_INTENT_CODE,
      details: {
        reason: 'missing-intent-token',
      },
    });
  });
});
