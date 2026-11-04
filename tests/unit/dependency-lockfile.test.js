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
    expect(installedCopies('vitest').length).toBeGreaterThan(0);
  });

  test('deepmerge is not installed (GHSA-gcqx-w48m-w2h4, no patched release)', () => {
    expect(installedCopies('deepmerge')).toEqual([]);
  });

  test('jest is not installed (replaced by vitest; jest-config requires deepmerge)', () => {
    expect(installedCopies('jest')).toEqual([]);
    expect(installedCopies('jest-config')).toEqual([]);
  });

  test('sprintf-js is not installed (GHSA-hp3w-g68c-fv3c, no patched release)', () => {
    expect(installedCopies('sprintf-js')).toEqual([]);
  });

  test('braces is not installed (GHSA-vfj7-8cjw-p6xm, no patched release)', () => {
    expect(installedCopies('braces')).toEqual([]);
  });

  test('js-yaml copies are all at major version 4 or later', () => {
    // No copies is compliant; the first test guards against an empty lockfile.
    const copies = installedCopies('js-yaml');
    const outdated = copies
      .map((key) => `${key}@${packages[key].version}`)
      .filter((entry) => !(Number(entry.split('@').pop().split('.')[0]) >= 4));
    expect(outdated).toEqual([]);
  });

  test('minimatch copies are all at 11.0.1 or later (GHSA-g3hv-75wg-m249)', () => {
    // No copies is compliant; the first test guards against an empty lockfile.
    const copies = installedCopies('minimatch');
    const vulnerable = copies
      .map((key) => `${key}@${packages[key].version}`)
      .filter((entry) => {
        const [major, minor, patch] = entry.split('@').pop().split('.').map(Number);
        return !(major > 11 || (major === 11 && (minor > 0 || patch >= 1)));
      });
    expect(vulnerable).toEqual([]);
  });
});
