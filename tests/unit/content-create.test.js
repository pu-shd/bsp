const PlaywrightManager = require('../../src/playwrightManager');

vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 });

describe('PlaywrightManager - Content Creation', () => {
  let manager;
  let mockPage;
  let mockContext;
  let mockBrowser;
  let mockLocator;

  beforeEach(() => {
    // Create mock locator factory for proper chaining
    function createMockLocator() {
      const locator = {
        count: vi.fn().mockResolvedValue(1),
        fill: vi.fn().mockResolvedValue(undefined),
        check: vi.fn().mockResolvedValue(undefined),
        uncheck: vi.fn().mockResolvedValue(undefined),
        selectOption: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
        getAttribute: vi.fn().mockResolvedValue('text'),
        first: vi.fn()
      };
      locator.first.mockImplementation(() => createMockLocator());
      return locator;
    }
    mockLocator = createMockLocator();

    // Create mock page
    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      url: vi.fn().mockReturnValue('https://example.com/node/add/article'),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      waitForURL: vi.fn().mockResolvedValue(undefined),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      locator: vi.fn().mockReturnValue(mockLocator),
      evaluate: vi.fn().mockResolvedValue('article'),
      title: vi.fn().mockResolvedValue('Create Article')
    };

    // Create mock context
    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      storageState: vi.fn().mockResolvedValue({ cookies: [], origins: [] }),
      close: vi.fn().mockResolvedValue(undefined)
    };

    // Create mock browser
    mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn().mockResolvedValue(undefined),
      contexts: vi.fn().mockReturnValue([])
    };

    // Create manager instance and inject mocks
    manager = new PlaywrightManager();
    manager.browser = mockBrowser;
    manager.context = mockContext;
    manager.page = mockPage;

    // Mock updateFormFields method
    manager.updateFormFields = vi.fn().mockResolvedValue({
      updated: [{ field: 'title', value: 'New Article' }],
      skipped: []
    });

    // Set environment variable for BASE_URL
    process.env.BASE_URL = 'https://example.com';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createContent', () => {
    test('should throw error if no page is available', async () => {
      manager.page = null;

      const result = await manager.createContent('article', { title: 'New Article' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active page');
    });

    test('should throw error if BASE_URL is not set', async () => {
      delete process.env.BASE_URL;

      const result = await manager.createContent('article', { title: 'New Article' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('BASE_URL environment variable is required');

      // Restore BASE_URL
      process.env.BASE_URL = 'https://example.com';
    });

    test('should throw error if content type is not provided', async () => {
      const result = await manager.createContent('', { title: 'New Article' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content type');
    });

    test('should throw error if fields are not provided', async () => {
      const result = await manager.createContent('article', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('field');
    });

    test('should verify content type exists before creating', async () => {
      // Mock queryContentTypes to return available types
      manager.queryContentTypes = vi.fn().mockResolvedValue({
        success: true,
        contentTypes: [
          { name: 'Article', machineName: 'article' },
          { name: 'Page', machineName: 'page' }
        ]
      });

      mockPage.url.mockReturnValue('https://example.com/node/123'); // Post-creation URL

      await manager.createContent('article', { title: 'New Article' });

      expect(manager.queryContentTypes).toHaveBeenCalled();
    });

    test('should throw error if content type does not exist', async () => {
      // Mock queryContentTypes to return available types
      manager.queryContentTypes = vi.fn().mockResolvedValue({
        success: true,
        contentTypes: [
          { name: 'Article', machineName: 'article' },
          { name: 'Page', machineName: 'page' }
        ]
      });

      const result = await manager.createContent('nonexistent', { title: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content type "nonexistent" not found');
      expect(result.error).toContain('Available types: article, page');
    });

    test('should navigate to content creation page with correct URL', async () => {
      manager.queryContentTypes = vi.fn().mockResolvedValue({
        success: true,
        contentTypes: [{ name: 'Article', machineName: 'article' }]
      });

      mockPage.url.mockReturnValue('https://example.com/node/123');

      await manager.createContent('article', { title: 'New Article' });

      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://example.com/node/add/article',
        expect.objectContaining({ waitUntil: 'domcontentloaded' })
      );
    });

    test('should wait for form to be loaded', async () => {
      manager.queryContentTypes = vi.fn().mockResolvedValue({
        success: true,
        contentTypes: [{ name: 'Article', machineName: 'article' }]
      });

      mockPage.url.mockReturnValue('https://example.com/node/123');

      await manager.createContent('article', { title: 'New Article' });

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('form', expect.any(Object));
    });

    test('should return success when creation completes', async () => {
      manager.queryContentTypes = vi.fn().mockResolvedValue({
        success: true,
        contentTypes: [{ name: 'Article', machineName: 'article' }]
      });

      // First call after goto returns create page URL, second call after submit returns node URL
      mockPage.url
        .mockReturnValueOnce('https://example.com/node/add/article')  // After navigation
        .mockReturnValueOnce('https://example.com/node/123');         // After form submission
      mockLocator.count.mockResolvedValue(1);
      mockLocator.getAttribute.mockResolvedValue('/node/123/edit'); // For edit link extraction

      const result = await manager.createContent('article', { title: 'New Article' });

      expect(result.success).toBe(true);
      expect(result.nodeId).toBe(123);
      expect(result.contentType).toBe('article');
      expect(result.message).toContain('Content created successfully');
    });

    test('should extract node ID from redirect URL', async () => {
      manager.queryContentTypes = vi.fn().mockResolvedValue({
        success: true,
        contentTypes: [{ name: 'Article', machineName: 'article' }]
      });

      mockPage.url
        .mockReturnValueOnce('https://example.com/node/add/article')
        .mockReturnValueOnce('https://example.com/node/456');
      mockLocator.count.mockResolvedValue(1);
      mockLocator.getAttribute.mockResolvedValue('/node/456/edit');

      const result = await manager.createContent('article', { title: 'New Article' });

      expect(result.success).toBe(true);
      expect(result.nodeId).toBe(456);
    });

    test('should include filled fields in response', async () => {
      manager.queryContentTypes = vi.fn().mockResolvedValue({
        success: true,
        contentTypes: [{ name: 'Article', machineName: 'article' }]
      });

      mockPage.url
        .mockReturnValueOnce('https://example.com/node/add/article')
        .mockReturnValueOnce('https://example.com/node/123');
      mockLocator.count.mockResolvedValue(1);
      mockLocator.getAttribute.mockResolvedValue('/node/123/edit');

      const result = await manager.createContent('article', { title: 'New Article' });

      expect(result.filledFields).toBeDefined();
      expect(Array.isArray(result.filledFields)).toBe(true);
    });

    test('should include skipped fields in response', async () => {
      manager.queryContentTypes = vi.fn().mockResolvedValue({
        success: true,
        contentTypes: [{ name: 'Article', machineName: 'article' }]
      });

      // No schema so no required field validation
      manager.loadSchemaForContentType = vi.fn().mockResolvedValue(null);

      // Override the mock for this specific test to return skipped fields
      manager.updateFormFields = vi.fn().mockResolvedValue({
        updated: [],
        skipped: [{ field: 'nonexistent_field', reason: 'Field not found' }]
      });

      mockPage.url
        .mockReturnValueOnce('https://example.com/node/add/article')
        .mockReturnValueOnce('https://example.com/node/123');
      mockLocator.count.mockResolvedValue(0); // Field not found
      mockLocator.getAttribute.mockResolvedValue('/node/123/edit');

      const result = await manager.createContent('article', { nonexistent_field: 'value' });

      expect(result.skippedFields).toBeDefined();
      expect(Array.isArray(result.skippedFields)).toBe(true);
    });

    test('should validate required fields from schema', async () => {
      manager.queryContentTypes = vi.fn().mockResolvedValue({
        success: true,
        contentTypes: [{ name: 'Article', machineName: 'article' }]
      });

      manager.loadSchemaForContentType = vi.fn().mockResolvedValue({
        fields: {
          title: { selector: '[name="title[0][value]"]', type: 'text', required: true },
          body: { selector: '[name="body[0][value]"]', type: 'textarea', required: false }
        }
      });

      const result = await manager.createContent('article', { body: 'Content' }); // Missing required title

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields: title');
    });

    test('should allow creation with all required fields', async () => {
      manager.queryContentTypes = vi.fn().mockResolvedValue({
        success: true,
        contentTypes: [{ name: 'Article', machineName: 'article' }]
      });

      manager.loadSchemaForContentType = vi.fn().mockResolvedValue({
        fields: {
          title: { selector: '[name="title[0][value]"]', type: 'text', required: true }
        }
      });

      mockPage.url
        .mockReturnValueOnce('https://example.com/node/add/article')
        .mockReturnValueOnce('https://example.com/node/123');
      mockLocator.count.mockResolvedValue(1);
      mockLocator.getAttribute.mockResolvedValue('/node/123/edit');

      const result = await manager.createContent('article', { title: 'Required Title' });

      expect(result.success).toBe(true);
    });
  });
});
