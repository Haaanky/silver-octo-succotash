import { test, expect } from '@playwright/test';
import { ADMIN, loginAsAdmin } from './helpers';

test.describe('Sidan laddas', () => {
  test('omdirigerar till inloggningssida och visar formulär', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login', { timeout: 20_000 });
    await expect(page.locator('h2')).toHaveText('LagerApp');
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

test.describe('Inloggning', () => {
  test('loggar in med standarduppgifter och visar lagerlistan', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('h1')).toHaveText('Lagerlista');
  });

  test('visar felmeddelande vid fel lösenord', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[autocomplete="username"]', ADMIN.email);
    await page.fill('input[type="password"]', 'felaktigt');
    await page.click('button[type="submit"]');
    await expect(page.locator('.alert-danger')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('kan navigera till Produkter', async ({ page }) => {
    await page.click('a[href="/products"]');
    await expect(page.locator('h1')).toHaveText('Produkter');
  });

  test('kan navigera till Skanna', async ({ page }) => {
    await page.click('a[href="/scan"]');
    await expect(page.locator('h1')).toHaveText('Skanna');
  });
});
