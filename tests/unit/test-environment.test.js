// Vite (and so vitest) defines its own BASE_URL ('/'), which collides with the
// app's BASE_URL setting. The test runner must pass the outer value through
// unchanged, or code under test sees '/' instead of the configured site.
describe('test runner environment', () => {
  test('BASE_URL is left as the outer environment set it', () => {
    expect(process.env.BSP_OUTER_BASE_URL_SET).toMatch(/^[01]$/);
    const expected = process.env.BSP_OUTER_BASE_URL_SET === '1'
      ? process.env.BSP_OUTER_BASE_URL
      : undefined;
    expect(process.env.BASE_URL).toBe(expected);
  });
});
