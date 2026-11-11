const path = require('path');
const { spawnSync } = require('child_process');
const { validateConfig } = require('../../src/config');

const ROOT = path.join(__dirname, '..', '..');

describe('validateConfig', () => {
  test('accepts an https BASE_URL', () => {
    expect(validateConfig({ BASE_URL: 'https://site.princeton.edu' })).toEqual([]);
  });

  test('accepts an optional http(s) DEFAULT_LOGIN_URL', () => {
    expect(
      validateConfig({
        BASE_URL: 'https://site.princeton.edu',
        DEFAULT_LOGIN_URL: 'https://site.princeton.edu/user/login',
      }),
    ).toEqual([]);
  });

  test.each([
    ['missing', {}],
    ['blank', { BASE_URL: '   ' }],
  ])('rejects a %s BASE_URL and points at example.env', (_label, env) => {
    const errors = validateConfig(env);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/BASE_URL is required/);
    expect(errors[0]).toMatch(/cp example\.env \.env/);
  });

  test.each(['not a url', 'ftp://site.princeton.edu', 'site.princeton.edu'])(
    'rejects BASE_URL=%s as not an http(s) URL',
    (value) => {
      const errors = validateConfig({ BASE_URL: value });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/BASE_URL must be an http\(s\) URL/);
    },
  );

  test('rejects the unedited template placeholder', () => {
    const errors = validateConfig({ BASE_URL: 'https://your-drupal-site.com' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/placeholder/);
  });

  test('rejects an invalid DEFAULT_LOGIN_URL', () => {
    const errors = validateConfig({
      BASE_URL: 'https://site.princeton.edu',
      DEFAULT_LOGIN_URL: 'login',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/DEFAULT_LOGIN_URL must be an http\(s\) URL/);
  });

  test('reports every problem at once', () => {
    expect(validateConfig({ DEFAULT_LOGIN_URL: 'login' })).toHaveLength(2);
  });
});

describe('server startup', () => {
  function startServer(env) {
    const childEnv = { PATH: process.env.PATH, NODE_ENV: 'production', PORT: '0', ...env };
    return spawnSync(process.execPath, ['server.js'], {
      cwd: ROOT,
      env: childEnv,
      encoding: 'utf8',
      // A server that accepted the config would keep running; the timeout
      // turns that into a visible failure instead of a hang.
      timeout: 15000,
    });
  }

  test('exits non-zero with a clear message when BASE_URL is missing', () => {
    const result = startServer({});
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/BASE_URL is required/);
    expect(result.stdout).not.toMatch(/Server running on port/);
  });

  test('exits non-zero when BASE_URL is the template placeholder', () => {
    const result = startServer({ BASE_URL: 'https://your-drupal-site.com' });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/placeholder/);
  });
});
