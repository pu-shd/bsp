const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const README = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');

// Body of a "## " section whose heading contains `title`, up to the next "## ".
function section(title) {
  const lines = README.split('\n');
  const start = lines.findIndex((line) => line.startsWith('## ') && line.includes(title));
  expect(start).toBeGreaterThanOrEqual(0);
  const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
}

describe('README covers setting up from a fresh clone', () => {
  test('Quick Start clones with the schemas submodule and creates .env before starting', () => {
    const quickStart = section('Quick Start');
    const clone = quickStart.indexOf('git clone --recurse-submodules');
    const env = quickStart.indexOf('cp example.env .env');
    const up = quickStart.indexOf('docker-compose up');
    expect(clone).toBeGreaterThanOrEqual(0);
    expect(env).toBeGreaterThan(clone);
    expect(up).toBeGreaterThan(env);
  });

  test('a restore section lists what git cannot bring back', () => {
    const restore = section('Fresh Machine');
    for (const item of ['.env', 'storage/storageState.json', 'git submodule update --init', 'SSH']) {
      expect(restore).toContain(item);
    }
  });

  test('only the current env template is referenced', () => {
    expect(README).not.toMatch(/(^|[^.\w])env\.example|\.env\.example/);
  });

  test('the schema docs say how schemas/sites is (not) used', () => {
    expect(section('Architecture')).toMatch(/schemas\/sites[\s\S]*not read/);
  });
});
