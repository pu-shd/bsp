const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const NODE_MAJOR = 26;

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function baseImageMajors(dockerfile) {
  const majors = [...read(dockerfile).matchAll(/^FROM\s+node:(\d+)/gim)].map((m) => Number(m[1]));
  expect(majors.length).toBeGreaterThan(0);
  return majors;
}

describe(`Node.js ${NODE_MAJOR} is used consistently`, () => {
  test.each(['Dockerfile', 'Dockerfile.test'])(`%s builds only from node:${NODE_MAJOR}`, (dockerfile) => {
    expect(new Set(baseImageMajors(dockerfile))).toEqual(new Set([NODE_MAJOR]));
  });

  test('package.json engines allows only this major version', () => {
    const { engines } = JSON.parse(read('package.json'));
    expect(engines && engines.node).toBe(`>=${NODE_MAJOR}.0.0 <${NODE_MAJOR + 1}.0.0`);
  });

  test('package-lock.json root engines matches package.json', () => {
    const lock = JSON.parse(read('package-lock.json'));
    expect(lock.packages[''].engines).toEqual(JSON.parse(read('package.json')).engines);
  });

  test('.nvmrc selects this major version for local development', () => {
    expect(read('.nvmrc').trim()).toBe(String(NODE_MAJOR));
  });

  test('.npmrc makes npm refuse to install on other Node versions', () => {
    const settings = read('.npmrc')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && !line.startsWith(';'));
    expect(settings).toContain('engine-strict=true');
  });
});
