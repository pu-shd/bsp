// Restore the app's BASE_URL, which Vite overwrites with its own '/'.
// See vitest.config.mjs.
if (process.env.BSP_OUTER_BASE_URL_SET === '1') {
  process.env.BASE_URL = process.env.BSP_OUTER_BASE_URL;
} else {
  delete process.env.BASE_URL;
}
