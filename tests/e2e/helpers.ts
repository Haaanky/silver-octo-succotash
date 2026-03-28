import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const ADMIN = { email: 'admin@lager.se', password: 'admin123' };

/** Navigate to a URL and wait only for DOM content – Blazor WASM loads async. */
export async function goto(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
}

export async function loginAsAdmin(page: Page) {
  await goto(page, '/login');
  await expect(page.locator('input[autocomplete="username"]')).toBeVisible({ timeout: 30_000 });
  await page.fill('input[autocomplete="username"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from /login and lagerlistan heading
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30_000 });
  await expect(page.locator('h1')).toHaveText('Lagerlista', { timeout: 30_000 });
}
