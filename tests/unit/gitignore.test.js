const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('.gitignore', () => {
  const patterns = fs
    .readFileSync(path.join(ROOT, '.gitignore'), 'utf8')
    .split('\n')
    .map((line) => line.trim());

  // Local agent settings and notes are per-developer and must not be published.
  test.each(['.claude/', 'CLAUDE.md'])('ignores %s', (pattern) => {
    expect(patterns).toContain(pattern);
  });
});
