const path = require('path');

const lockfile = require(path.join(__dirname, '..', '..', 'package-lock.json'));
const packages = lockfile.packages || {};

function installedCopies(name) {
  return Object.keys(packages).filter(
    (key) => key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`)
  );
}

describe('package-lock.json dependency policy', () => {
  test('lockfile lists installed packages', () => {
    // Guards against the checks below passing vacuously on an empty or malformed lockfile.
    expect(lockfile.lockfileVersion).toBeGreaterThanOrEqual(2);
    expect(installedCopies('jest').length).toBeGreaterThan(0);
  });

  test('sprintf-js is not installed (GHSA-hp3w-g68c-fv3c, no patched release)', () => {
    expect(installedCopies('sprintf-js')).toEqual([]);
  });

  test('braces is not installed (GHSA-vfj7-8cjw-p6xm, no patched release)', () => {
    expect(installedCopies('braces')).toEqual([]);
  });

  test('js-yaml copies are all at major version 4 or later', () => {
    const copies = installedCopies('js-yaml');
    expect(copies.length).toBeGreaterThan(0);
    const outdated = copies
      .map((key) => `${key}@${packages[key].version}`)
      .filter((entry) => !(Number(entry.split('@').pop().split('.')[0]) >= 4));
    expect(outdated).toEqual([]);
  });
});
