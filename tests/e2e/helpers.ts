import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const ADMIN = { email: 'admin@lager.se', password: 'admin123' };

/** A stable seed product used by tests that require pre-existing products. */
export const SEED_PRODUCT = {
  Id: 'test-seed-product-001',
  Name: 'Testprodukt Seed',
  Sku: 'SEED-001',
  Barcode: '1234567890123',
  Unit: 'st',
  MinStock: 5,
  CurrentStock: 10,
};

/**
 * Registers an init script that seeds lager_products into localStorage
 * BEFORE the page loads. Must be called before goto/loginAsAdmin.
 */
export async function seedProducts(page: Page) {
  await page.addInitScript((products) => {
    localStorage.setItem('lager_products', JSON.stringify(products));
  }, [SEED_PRODUCT]);
}

/** Navigate to a URL. React uses HashRouter so paths become /#/path. */
export async function goto(page: Page, url: string) {
  const target = url === '/' ? '/' : `/#${url}`;
  await page.goto(target, { waitUntil: 'domcontentloaded' });
}

export async function loginAsAdmin(page: Page) {
  await goto(page, '/login');
  await expect(page.locator('input[autocomplete="email"]')).toBeVisible({ timeout: 30_000 });
  await page.fill('input[autocomplete="email"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  // With HashRouter, pathname is always '/'; wait for hash to leave /login
  await page.waitForURL(url => !url.hash.includes('/login'), { timeout: 30_000 });
  await expect(page.locator('h1')).toHaveText('Lagerlista', { timeout: 30_000 });
}
