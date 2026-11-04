const { mockModule } = require('../helpers/mock-module');

// Mock Playwright before the code under test requires it.
mockModule('playwright', { chromium: { launch: vi.fn() } });

const PlaywrightManager = require('../../src/playwrightManager');

// The manager under test never launches a real browser here; the resource
// handles are injected directly so teardown can be driven deterministically.

describe('PlaywrightManager shutdown', () => {
  let manager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new PlaywrightManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const hangingHandle = () => ({ close: vi.fn(() => new Promise(() => {})) });

  test('close() gives up on a wedged browser instead of hanging forever', async () => {
    manager.page = hangingHandle();
    manager.context = hangingHandle();
    manager.browser = hangingHandle();

    let settled = false;
    const closing = manager.close().then(() => { settled = true; });

    // Nothing resolves on its own, so close() is still waiting on the page.
    await Promise.resolve();
    expect(settled).toBe(false);

    // Each step is bounded at 10s; 3 hanging steps must still complete.
    await vi.advanceTimersByTimeAsync(31000);
    await closing;

    expect(settled).toBe(true);
    expect(manager.page).toBeNull();
    expect(manager.context).toBeNull();
    expect(manager.browser).toBeNull();
  });

  test('close() drops handles even when a close call rejects', async () => {
    const rejecting = () => ({ close: vi.fn().mockRejectedValue(new Error('target closed')) });
    manager.page = rejecting();
    manager.context = rejecting();
    manager.browser = rejecting();

    await manager.close();

    expect(manager.page).toBeNull();
    expect(manager.context).toBeNull();
    expect(manager.browser).toBeNull();
  });

  test('close() closes page, context and browser in order when healthy', async () => {
    const order = [];
    manager.page = { close: vi.fn(async () => { order.push('page'); }) };
    manager.context = { close: vi.fn(async () => { order.push('context'); }) };
    manager.browser = { close: vi.fn(async () => { order.push('browser'); }) };

    await manager.close();

    expect(order).toEqual(['page', 'context', 'browser']);
    expect(manager.page).toBeNull();
    expect(manager.context).toBeNull();
    expect(manager.browser).toBeNull();
  });

  test('close() is safe to call twice', async () => {
    const page = { close: vi.fn().mockResolvedValue() };
    manager.page = page;

    await manager.close();
    await manager.close();

    expect(page.close).toHaveBeenCalledTimes(1);
    expect(manager.page).toBeNull();
  });
});
