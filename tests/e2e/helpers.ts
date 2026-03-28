import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const ADMIN = { email: 'admin@lager.se', password: 'admin123' };

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await expect(page.locator('input[autocomplete="username"]')).toBeVisible({ timeout: 20_000 });
  await page.fill('input[autocomplete="username"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from /login and for the inventory heading to appear
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15_000 });
  await expect(page.locator('h1')).toHaveText('Lagerlista', { timeout: 15_000 });
}
