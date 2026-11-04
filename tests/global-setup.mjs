import { execSync } from 'node:child_process';

// Runs once after all test files: clean up Playwright processes.
export async function teardown() {
  console.log('Running global test teardown...');

  try {
    // Only Playwright-managed browsers: they live under an ms-playwright
    // directory on Linux and macOS. A bare 'chrome' pattern would also kill
    // the developer's own browser when tests run on the host.
    console.log('Cleaning up Playwright browser processes...');
    // '[m]' keeps the pattern from matching this pkill's own shell.
    execSync("pkill -f '[m]s-playwright/' || true", { stdio: 'inherit' });

    console.log('Browser cleanup completed');
  } catch {
    console.log('Cleanup completed (some processes may not have been running)');
  }

  // Give processes time to terminate
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
