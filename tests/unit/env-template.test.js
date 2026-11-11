const fs = require('fs');
const path = require('path');
const { validateConfig } = require('../../src/config');

const ROOT = path.join(__dirname, '..', '..');
const TEMPLATE = 'example.env';

// Set by docker-compose / the runtime, not by the operator in .env.
const RUNTIME_ONLY = new Set(['DISPLAY', 'NODE_ENV', 'NOVNC_URL', 'PORT']);

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function envVarsReadBy(files) {
  const names = new Set();
  for (const file of files) {
    for (const match of read(file).matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
      names.add(match[1]);
    }
  }
  return names;
}

function parseAssignments(text) {
  const values = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

describe(`${TEMPLATE} is the single .env template`, () => {
  test(`${TEMPLATE} exists`, () => {
    expect(fs.existsSync(path.join(ROOT, TEMPLATE))).toBe(true);
  });

  test.each(['env.example', '.env.example'])('stale template %s is gone', (file) => {
    expect(fs.existsSync(path.join(ROOT, file))).toBe(false);
  });

  test('documents every setting the server reads', () => {
    const appFiles = ['server.js', ...fs.readdirSync(path.join(ROOT, 'src')).map((f) => path.join('src', f))];
    const settings = [...envVarsReadBy(appFiles)].filter((name) => !RUNTIME_ONLY.has(name));
    expect(settings.length).toBeGreaterThan(0);

    const template = read(TEMPLATE);
    const undocumented = settings.filter((name) => !new RegExp(`\\b${name}\\b`).test(template));
    expect(undocumented).toEqual([]);
  });

  test('documents the docker-compose host port variables', () => {
    const composeVars = [...read('docker-compose.yml').matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)].map((m) => m[1]);
    expect(composeVars.length).toBeGreaterThan(0);
    const template = read(TEMPLATE);
    expect(composeVars.filter((name) => !template.includes(name))).toEqual([]);
  });

  test('copied unedited, it is rejected only for the BASE_URL placeholder', () => {
    const errors = validateConfig(parseAssignments(read(TEMPLATE)));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/placeholder/);
  });

  test('.gitignore keeps every real .env file out of git', () => {
    const patterns = read('.gitignore').split('\n').map((line) => line.trim());
    expect(patterns).toContain('.env*');
  });
});
