import { defineConfig, devices } from '@playwright/test';

// Local mock tests: serves the app via Vite dev server and intercepts all
// Supabase API calls with page.route() – no database connection required.
export default defineConfig({
  testDir: './tests/e2e/mock',
  timeout: 30_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-mock' }]],
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm --prefix web run dev:mock',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [{ name: 'chromium-mock', use: { ...devices['Desktop Chrome'] } }],
});
