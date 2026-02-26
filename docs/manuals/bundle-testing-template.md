# Bundle Testing Template (`node:test`)

Use this template in a bundle repository to enable lightweight unit tests with Node's built-in test runner.

## `package.json` snippet

```json
{
  "scripts": {
    "test": "node --test"
  }
}
```

## Suggested layout

- `lib/` for pure logic modules
- `test/` for test files

Example:

```text
my-bundle/
  lib/
    combat-math.js
  test/
    combat-math.test.js
  package.json
```

## Example test

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function add(a, b) {
  return a + b;
}

test('add() sums two numbers', () => {
  assert.equal(add(2, 3), 5);
});
```

Run tests with:

```bash
npm test
```
