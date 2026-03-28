import type { Page } from '@playwright/test';

export const ADMIN = { email: 'admin@lager.se', password: 'admin123' };

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[autocomplete="username"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/', { timeout: 10_000 });
}
