import { test, expect } from '@playwright/test';

test.describe('Sidan laddas', () => {
  test('ska inte vara blank – visar inloggningssida', async ({ page }) => {
    await page.goto('/');
    // Vänta på att Blazor WASM laddar och omdirigerar till login
    await page.waitForURL('**/login', { timeout: 20_000 });
    await expect(page.locator('h2')).toHaveText('LagerApp');
    // Kontrollera att sidan inte är tom
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('inloggningsformuläret syns', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

test.describe('Inloggning', () => {
  test('loggar in med standarduppgifter och visar lagerlistan', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[autocomplete="username"]', 'admin@lager.se');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10_000 });
    await expect(page.locator('h1')).toHaveText('Lagerlista');
  });

  test('visar felmeddelande vid fel lösenord', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[autocomplete="username"]', 'admin@lager.se');
    await page.fill('input[type="password"]', 'felaktigt');
    await page.click('button[type="submit"]');
    await expect(page.locator('.alert-danger')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[autocomplete="username"]', 'admin@lager.se');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10_000 });
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
