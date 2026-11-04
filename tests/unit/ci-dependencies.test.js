const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CHECKOUT_MIN_MAJOR = 7;

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

describe('CI dependencies stay current', () => {
  test(`workflows use actions/checkout v${CHECKOUT_MIN_MAJOR} or later`, () => {
    const workflows = fs.readdirSync(path.join(ROOT, '.github', 'workflows'))
      .filter((f) => /\.ya?ml$/.test(f))
      .map((f) => path.join('.github', 'workflows', f));
    const refs = workflows.flatMap((file) =>
      [...read(file).matchAll(/uses:\s*actions\/checkout@v(\d+)/g)].map((m) => `${file}@v${m[1]}`));
    // Guards against passing vacuously if no workflow checks out code.
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.filter((r) => Number(r.split('@v').pop()) < CHECKOUT_MIN_MAJOR)).toEqual([]);
  });

  test('Dependabot watches npm, docker and github-actions', () => {
    const ecosystems = [...read('.github/dependabot.yml').matchAll(/package-ecosystem:\s*"?([\w-]+)"?/g)]
      .map((m) => m[1]);
    expect(new Set(ecosystems)).toEqual(new Set(['npm', 'docker', 'github-actions']));
  });
});
