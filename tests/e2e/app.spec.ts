import { test, expect } from '@playwright/test';
import { ADMIN, loginAsAdmin, goto, seedProducts } from './helpers';

// ─── Auth ────────────────────────────────────────────────────────────────────

test.describe('Inloggningssida', () => {
  test('omdirigerar till /login och visar formulär', async ({ page }) => {
    await goto(page, '/');
    await page.waitForURL('**/login', { timeout: 30_000 });
    await expect(page.locator('h1')).toHaveText('LagerApp');
    await expect(page.locator('input[autocomplete="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('visar felmeddelande vid fel lösenord', async ({ page }) => {
    await goto(page, '/login');
    await expect(page.locator('input[autocomplete="email"]')).toBeVisible({ timeout: 30_000 });
    await page.fill('input[autocomplete="email"]', ADMIN.email);
    await page.fill('input[type="password"]', 'felaktigt');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('loggar in med standarduppgifter och landar på lagerlistan', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('h1')).toHaveText('Lagerlista');
  });
});

// ─── Lagerlista (Index) ───────────────────────────────────────────────────────

test.describe('Lagerlista', () => {
  test.beforeEach(async ({ page }) => {
    await seedProducts(page);
    await loginAsAdmin(page);
  });

  test('visar tabellrubriker', async ({ page }) => {
    // Wait for products to load so the table is fully rendered
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('table thead')).toBeVisible();
    // Use CSS-based th locators to avoid accessibility-tree lag
    await expect(page.locator('table thead th').filter({ hasText: 'Produkt' })).toBeVisible();
    await expect(page.locator('table thead th').filter({ hasText: 'SKU' })).toBeVisible();
    await expect(page.locator('table thead th').filter({ hasText: 'Saldo' })).toBeVisible();
  });

  test('sökfältet filtrerar produkter', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });
    const totalRows = await page.locator('table tbody tr').count();

    await page.fill('input[type="search"]', 'zzznomatch999');
    await expect(page.locator('table tbody tr')).toHaveCount(0);
    await expect(page.getByText('Inga produkter hittades.')).toBeVisible();

    await page.fill('input[type="search"]', '');
    await expect(page.locator('table tbody tr')).toHaveCount(totalRows);
  });
});

// ─── Navigation ──────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('navbar visas efter inloggning', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('header').getByText('LagerApp')).toBeVisible();
  });

  test('visar inloggad användares e-post i navbar', async ({ page }) => {
    await expect(page.locator('header').getByText(ADMIN.email)).toBeVisible();
  });

  test('kan navigera till Skanna', async ({ page }) => {
    await page.click('a[href="/scan"]');
    await expect(page.locator('h1')).toHaveText('Skanna');
  });

  test('kan navigera till Produkter', async ({ page }) => {
    await page.click('a[href="/products"]');
    await expect(page.locator('h1')).toHaveText('Produkter');
  });

  test('kan navigera till Historik', async ({ page }) => {
    await page.click('a[href="/history"]');
    await expect(page.locator('h1')).toHaveText('Historik');
  });

  test('kan navigera till Export', async ({ page }) => {
    await page.click('a[href="/export"]');
    await expect(page.locator('h1')).toHaveText('Exportera data');
  });

  test('logga ut omdirigerar till /login', async ({ page }) => {
    await page.click('button:has-text("Logga ut")');
    await page.waitForURL('**/login', { timeout: 15_000 });
    await expect(page.locator('h1')).toHaveText('LagerApp');
  });
});

// ─── Produkter ───────────────────────────────────────────────────────────────

test.describe('Produkthantering', () => {
  test.beforeEach(async ({ page }) => {
    await seedProducts(page);
    await loginAsAdmin(page);
    await page.click('a[href="/products"]');
    await expect(page.locator('h1')).toHaveText('Produkter');
  });

  test('visar produktlista', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible({ timeout: 15_000 });
  });

  test('kan skapa ny produkt', async ({ page }) => {
    const name = `Testprodukt ${Date.now()}`;

    await page.click('button:has-text("Ny produkt")');
    await expect(page.locator('h2').filter({ hasText: 'Ny produkt' })).toBeVisible();

    const inputs = page.locator('div.card input[type="text"]');
    await inputs.nth(0).fill(name);        // Namn
    await inputs.nth(1).fill('TST-001');   // SKU
    await inputs.nth(2).fill('1234567890'); // Streckkod
    await inputs.nth(3).fill('st');        // Enhet
    await page.locator('input[type="number"]').nth(0).fill('5');  // Miniminivå
    await page.locator('input[type="number"]').nth(1).fill('10'); // Startsaldo

    await page.click('button:has-text("Skapa produkt")');

    await expect(page.locator('h2').filter({ hasText: 'Ny produkt' })).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('table')).toContainText(name);
  });

  test('visar valideringsfel vid tomt namn', async ({ page }) => {
    await page.click('button:has-text("Ny produkt")');
    await page.click('button:has-text("Skapa produkt")');
    await expect(page.locator('[role="alert"]')).toContainText('Namn');
  });

  test('kan redigera en produkt', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });
    await page.locator('button:has-text("Redigera")').first().click();
    await expect(page.locator('h2').filter({ hasText: 'Redigera produkt' })).toBeVisible();

    const nameInput = page.locator('div.card input[type="text"]').first();
    const editedName = `Redigerad ${Date.now()}`;
    await nameInput.fill(editedName);
    await page.click('button:has-text("Spara ändringar")');

    await expect(page.locator('h2').filter({ hasText: 'Redigera produkt' })).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('table')).toContainText(editedName);
  });

  test('kan avbryta redigering', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });
    await page.locator('button:has-text("Redigera")').first().click();
    await expect(page.locator('h2').filter({ hasText: 'Redigera produkt' })).toBeVisible();
    await page.click('button:has-text("Avbryt")');
    await expect(page.locator('h2').filter({ hasText: 'Redigera produkt' })).toHaveCount(0, { timeout: 10_000 });
  });
});

// ─── Skanna ───────────────────────────────────────────────────────────────────

test.describe('Skanna / Transaktioner', () => {
  test.beforeEach(async ({ page }) => {
    await seedProducts(page);
    await loginAsAdmin(page);
    await page.click('a[href="/scan"]');
    await expect(page.locator('h1')).toHaveText('Skanna');
  });

  test('visar streckkodsscanner-vy', async ({ page }) => {
    await expect(page.getByText('Eller ange manuellt:')).toBeVisible();
  });

  test('visar varning för okänd streckkod', async ({ page }) => {
    const scanInput = page.locator('input[placeholder="Streckkod eller SKU"]');
    await scanInput.fill('OKANDSTRECKKOD999');
    await scanInput.press('Enter');
    await expect(page.locator('[role="alert"]')).toContainText('Okänd streckkod', { timeout: 15_000 });
  });

  test('kan registrera inleverans för befintlig produkt', async ({ page }) => {
    // Get a real barcode from the products page
    await goto(page, '/products');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });
    const barcodeCell = page.locator('table tbody tr').first().locator('td').nth(2);
    const barcode = (await barcodeCell.textContent()) ?? '';
    expect(barcode.length).toBeGreaterThan(0);

    await goto(page, '/scan');
    await expect(page.locator('h1')).toHaveText('Skanna', { timeout: 30_000 });

    const scanInput = page.locator('input[placeholder="Streckkod eller SKU"]');
    await scanInput.fill(barcode);
    await scanInput.press('Enter');

    await expect(page.getByText('Produkt hittad')).toBeVisible({ timeout: 15_000 });

    await page.selectOption('select', 'in');
    await page.fill('input[type="number"]', '1');
    await page.click('button:has-text("Registrera")');

    await expect(page.getByText('Registrerad!')).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Historik ─────────────────────────────────────────────────────────────────

test.describe('Transaktionshistorik', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('a[href="/history"]');
    await expect(page.locator('h1')).toHaveText('Historik');
  });

  test('visar historiktabell eller tomt-meddelande', async ({ page }) => {
    const table = page.locator('table');
    const empty = page.getByText('Ingen historik ännu');
    await expect(table.or(empty)).toBeVisible({ timeout: 15_000 });
  });

  test('tabellen har rätt kolumner om transaktioner finns', async ({ page }) => {
    const table = page.locator('table');
    const empty = page.getByText('Ingen historik ännu');
    await expect(table.or(empty)).toBeVisible({ timeout: 15_000 });

    if (await table.isVisible()) {
      await expect(page.getByRole('columnheader', { name: 'Tidpunkt' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Produkt' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Typ' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Antal' })).toBeVisible();
    }
  });
});

// ─── Export ───────────────────────────────────────────────────────────────────

test.describe('Export', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('a[href="/export"]');
    await expect(page.locator('h1')).toHaveText('Exportera data');
  });

  test('visar alla exportknappar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Ladda ner CSV', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ladda ner JSON', exact: true })).toBeVisible();
  });

  test('CSV-nedladdning visar bekräftelsemeddelande', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Ladda ner CSV")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/lager-export\.csv/);
    await expect(page.getByText('CSV-fil nedladdad!')).toBeVisible({ timeout: 15_000 });
  });

  test('JSON-nedladdning visar bekräftelsemeddelande', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Ladda ner JSON")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/lager-export\.json/);
    await expect(page.getByText('JSON-fil nedladdad!')).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Sessionshantering ────────────────────────────────────────────────────────

test.describe('Sessionshantering', () => {
  test('skyddad sida utan session omdirigerar till /login', async ({ page }) => {
    await goto(page, '/products');
    await page.waitForURL('**/login', { timeout: 30_000 });
  });

  test('efter utloggning kan man inte nå skyddade sidor', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('button:has-text("Logga ut")');
    await page.waitForURL('**/login', { timeout: 15_000 });
    await goto(page, '/products');
    await page.waitForURL('**/login', { timeout: 15_000 });
  });
});
