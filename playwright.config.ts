import { defineConfig, devices } from '@playwright/test';

// Parse proxy credentials from environment (Chromium needs explicit proxy config)
function getProxy() {
  const raw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return {
      server: `${u.protocol}//${u.hostname}:${u.port}`,
      username: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
    };
  } catch {
    return undefined;
  }
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL ?? 'https://silver-octo-succotash.frisemo.dev',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    proxy: getProxy(),
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
