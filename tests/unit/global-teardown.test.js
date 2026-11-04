// The global teardown runs on whatever machine runs the tests, including a
// developer's Mac, so it must only kill Playwright-managed browsers (installed
// under an ms-playwright directory), never the user's own Chrome or Chromium.
describe('global test teardown', () => {
  let commands;

  beforeEach(() => {
    commands = [];
    vi.resetModules();
    vi.doMock('node:child_process', () => ({
      execSync: vi.fn((cmd) => { commands.push(cmd); return ''; }),
    }));
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.doUnmock('node:child_process');
    vi.restoreAllMocks();
  });

  test('only targets processes under an ms-playwright directory', async () => {
    const { teardown } = await import('../global-setup.mjs');
    await teardown();

    expect(commands.length).toBeGreaterThan(0);
    for (const cmd of commands) {
      const pattern = cmd.match(/^pkill -f (\S+)/);
      expect(pattern && pattern[1]).toContain('s-playwright/');
    }
  });
});

describe('test files do not kill browsers broadly', () => {
  const fs = require('fs');
  const path = require('path');
  const testsDir = path.join(__dirname, '..');

  function sourceFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return /\.(c|m)?js$/.test(entry.name) ? [full] : [];
    });
  }

  test('every pkill in tests/ targets only ms-playwright browsers', () => {
    const files = sourceFiles(testsDir).filter((file) => file !== __filename);
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.flatMap((file) =>
      [...fs.readFileSync(file, 'utf8').matchAll(/pkill\s+-f\s+(\S+)/g)]
        .filter((m) => !m[1].includes('s-playwright/'))
        .map((m) => `${path.relative(testsDir, file)}: pkill -f ${m[1]}`));
    expect(offenders).toEqual([]);
  });
});
