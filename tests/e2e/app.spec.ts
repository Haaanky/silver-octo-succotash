import { test, expect } from '@playwright/test';
import { ADMIN, loginAsAdmin, goto, seedProducts } from './helpers';

// ─── Auth ────────────────────────────────────────────────────────────────────

test.describe('Inloggningssida', () => {
  test('omdirigerar till /login och visar formulär', async ({ page }) => {
    await goto(page, '/');
    await page.waitForURL('**/login', { timeout: 30_000 });
    await expect(page.locator('h2')).toHaveText('LagerApp');
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('visar felmeddelande vid fel lösenord', async ({ page }) => {
    await goto(page, '/login');
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible({ timeout: 30_000 });
    await page.fill('input[autocomplete="username"]', ADMIN.email);
    await page.fill('input[type="password"]', 'felaktigt');
    await page.click('button[type="submit"]');
    await expect(page.locator('.alert-danger')).toBeVisible();
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
    await expect(page.locator('nav.navbar')).toBeVisible();
    await expect(page.locator('a.navbar-brand')).toHaveText('LagerApp');
  });

  test('visar inloggad användares e-post i navbar', async ({ page }) => {
    await expect(page.locator('.navbar-text')).toContainText(ADMIN.email);
  });

  test('kan navigera till Skanna', async ({ page }) => {
    await page.click('a[href="/scan"]');
    await expect(page.locator('h1')).toHaveText('Registrera rörelse');
  });

  test('kan navigera till Produkter', async ({ page }) => {
    await page.click('a[href="/products"]');
    await expect(page.locator('h1')).toHaveText('Produkter');
  });

  test('kan navigera till Historik', async ({ page }) => {
    await page.click('a[href="/history"]');
    await expect(page.locator('h1')).toHaveText('Transaktionshistorik');
  });

  test('kan navigera till Export', async ({ page }) => {
    await page.click('a[href="/export"]');
    await expect(page.locator('h1')).toHaveText('Exportera data');
  });

  test('logga ut omdirigerar till /login', async ({ page }) => {
    await page.click('button:has-text("Logga ut")');
    await page.waitForURL('**/login', { timeout: 15_000 });
    await expect(page.locator('h2')).toHaveText('LagerApp');
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
    await expect(page.locator('.card-header')).toContainText('Skapa produkt');

    const inputs = page.locator('.card-body input[type="text"], .card-body input:not([type])');
    await inputs.nth(0).fill(name);        // Namn
    await inputs.nth(1).fill('TST-001');   // SKU
    await inputs.nth(2).fill('1234567890'); // Streckkod
    await inputs.nth(3).fill('st');        // Enhet
    await page.locator('input[type="number"]').nth(0).fill('5');  // Miniminivå
    await page.locator('input[type="number"]').nth(1).fill('10'); // Startsaldo

    await page.click('button:has-text("Spara")');

    await expect(page.locator('.card-header')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('table')).toContainText(name);
  });

  test('visar valideringsfel vid tomt namn', async ({ page }) => {
    await page.click('button:has-text("Ny produkt")');
    await page.click('button:has-text("Spara")');
    await expect(page.locator('.alert-danger')).toContainText('Namn krävs');
  });

  test('kan redigera en produkt', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });
    await page.locator('button:has-text("Redigera")').first().click();
    await expect(page.locator('.card-header')).toContainText('Redigera produkt');

    const nameInput = page.locator('.card-body input[type="text"], .card-body input:not([type])').first();
    const editedName = `Redigerad ${Date.now()}`;
    await nameInput.fill(editedName);
    await page.click('button:has-text("Spara")');

    await expect(page.locator('.card-header')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('table')).toContainText(editedName);
  });

  test('kan avbryta redigering', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });
    await page.locator('button:has-text("Redigera")').first().click();
    await expect(page.locator('.card-header')).toBeVisible();
    await page.click('button:has-text("Avbryt")');
    await expect(page.locator('.card-header')).toHaveCount(0, { timeout: 10_000 });
  });
});

// ─── Skanna ───────────────────────────────────────────────────────────────────

test.describe('Skanna / Transaktioner', () => {
  test.beforeEach(async ({ page }) => {
    await seedProducts(page);
    await loginAsAdmin(page);
    await page.click('a[href="/scan"]');
    await expect(page.locator('h1')).toHaveText('Registrera rörelse');
  });

  test('visar streckkodsscanner-vy', async ({ page }) => {
    await expect(page.getByText('Scanna en streckkod eller ange manuellt.')).toBeVisible();
  });

  test('visar varning för okänd streckkod', async ({ page }) => {
    const scanInput = page.locator('input[type="text"], input:not([type="password"]):not([type="search"]):not([type="number"])').first();
    await scanInput.fill('OKANDSTRECKKOD999');
    await scanInput.press('Enter');
    await expect(page.locator('.alert-warning')).toContainText('Produkt hittades inte', { timeout: 15_000 });
  });

  test('kan registrera inleverans för befintlig produkt', async ({ page }) => {
    // Get a real barcode from the products page
    await goto(page, '/products');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });
    const barcodeCell = page.locator('table tbody tr').first().locator('code').nth(1);
    const barcode = (await barcodeCell.textContent()) ?? '';
    expect(barcode.length).toBeGreaterThan(0);

    await goto(page, '/scan');
    await expect(page.locator('h1')).toHaveText('Registrera rörelse', { timeout: 30_000 });

    const scanInput = page.locator('input[type="text"], input:not([type="password"]):not([type="search"]):not([type="number"])').first();
    await scanInput.fill(barcode);
    await scanInput.press('Enter');

    await expect(page.locator('.card h5')).toBeVisible({ timeout: 15_000 });

    await page.selectOption('select', 'in');
    await page.fill('input[type="number"]', '1');
    await page.click('button:has-text("Registrera")');

    await expect(page.locator('.alert-success')).toContainText('inleverans', { timeout: 15_000 });
  });
});

// ─── Historik ─────────────────────────────────────────────────────────────────

test.describe('Transaktionshistorik', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('a[href="/history"]');
    await expect(page.locator('h1')).toHaveText('Transaktionshistorik');
  });

  test('visar historiktabell eller tomt-meddelande', async ({ page }) => {
    const table = page.locator('table');
    const empty = page.getByText('Inga transaktioner registrerade än.');
    await expect(table.or(empty)).toBeVisible({ timeout: 15_000 });
  });

  test('tabellen har rätt kolumner om transaktioner finns', async ({ page }) => {
    const table = page.locator('table');
    const empty = page.getByText('Inga transaktioner registrerade än.');
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
    await expect(page.getByRole('button', { name: 'Ladda ned CSV', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ladda ned JSON', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ladda ned CSV.*e-post/ })).toBeVisible();
  });

  test('CSV-nedladdning visar bekräftelsemeddelande', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Ladda ned CSV")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/lagerexport_\d+\.csv/);
    await expect(page.locator('.alert-info')).toContainText('CSV-fil nedladdad', { timeout: 15_000 });
  });

  test('JSON-nedladdning visar bekräftelsemeddelande', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Ladda ned JSON")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/lagerexport_\d+\.json/);
    await expect(page.locator('.alert-info')).toContainText('JSON-fil nedladdad', { timeout: 15_000 });
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
