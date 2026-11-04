const Module = require('module');

/**
 * Replace a CommonJS module for every later `require()` in this test file.
 *
 * vitest's `vi.mock` only intercepts ESM imports, but the code under test
 * loads its dependencies with native `require`. Seeding Node's module cache
 * gives the same effect. Call it before requiring the code under test.
 * vitest isolates each test file in its own worker, so the mock does not
 * leak into other files.
 *
 * @param {string} request - Module specifier, e.g. 'playwright'.
 * @param {object} exports - The mock's exports.
 * @returns {object} The installed exports.
 */
function mockModule(request, exports) {
  const filename = require.resolve(request);
  const mocked = new Module(filename);
  mocked.filename = filename;
  mocked.loaded = true;
  mocked.exports = exports;
  require.cache[filename] = mocked;
  return exports;
}

module.exports = { mockModule };
