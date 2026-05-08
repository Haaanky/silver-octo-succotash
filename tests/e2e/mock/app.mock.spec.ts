import { test, expect } from '@playwright/test';
import {
  ADMIN,
  WORKER,
  DELETABLE_USER,
  SEED_PRODUCT,
  MockStore,
  setupMockRoutes,
  goto,
  loginAsAdmin,
  loginAsWorker,
} from './handlers';

// ─── Auth ────────────────────────────────────────────────────────────────────

test.describe('Inloggningssida', () => {
  let store: MockStore;

  test.beforeEach(async ({ page }) => {
    store = new MockStore();
    await setupMockRoutes(page, store);
  });

  test('omdirigerar till /login och visar formulär', async ({ page }) => {
    await goto(page, '/');
    await page.waitForURL((url) => url.hash.includes('login'), { timeout: 10_000 });
    await expect(page.locator('h1')).toHaveText('LagerApp');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('visar felmeddelande vid fel lösenord', async ({ page }) => {
    await goto(page, '/#/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', 'felaktigt');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10_000 });
  });

  test('loggar in med standarduppgifter och landar på lagerlistan', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('h1')).toHaveText('Lagerlista');
  });
});

// ─── Lagerlista ───────────────────────────────────────────────────────────────

test.describe('Lagerlista', () => {
  let store: MockStore;

  test.beforeEach(async ({ page }) => {
    store = new MockStore();
    await setupMockRoutes(page, store);
    await loginAsAdmin(page);
  });

  test('visar tabellrubriker', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('table thead th').filter({ hasText: 'Produkt' })).toBeVisible();
    await expect(page.locator('table thead th').filter({ hasText: 'SKU' })).toBeVisible();
    await expect(page.locator('table thead th').filter({ hasText: 'Saldo' })).toBeVisible();
  });

  test('sökfältet filtrerar produkter', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });

    await page.fill('input[type="search"]', 'zzznomatch999');
    await expect(page.locator('table tbody tr')).toHaveCount(0);
    await expect(page.getByText('Inga produkter hittades.')).toBeVisible();

    await page.fill('input[type="search"]', '');
    await expect(page.locator('table tbody tr')).toHaveCount(store.products.length);
  });

  test('visar statistikkort med saldostatus', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Totalt produkter')).toBeVisible();
    await expect(page.getByText('OK lager')).toBeVisible();
    await expect(page.getByText('Lågt lager', { exact: true })).toBeVisible();
    await expect(page.getByText('Tomt lager')).toBeVisible();
  });

  test('visar saldostatus-badge (OK) för seed-produkt', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
    const seedRow = page.locator('table tbody tr').filter({ hasText: SEED_PRODUCT.name });
    await expect(seedRow).toBeVisible();
    await expect(seedRow.locator('.badge-green')).toBeVisible();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const store = new MockStore();
    await setupMockRoutes(page, store);
    await loginAsAdmin(page);
  });

  test('header visas efter inloggning', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('header').getByText('LagerApp')).toBeVisible();
  });

  test('visar inloggad användares e-post i header', async ({ page }) => {
    await expect(page.locator('header').getByText(ADMIN.email)).toBeVisible();
  });

  test('kan navigera till Skanna', async ({ page }) => {
    await page.getByRole('link', { name: 'Skanna' }).click();
    await expect(page.locator('h1')).toHaveText('Skanna');
  });

  test('kan navigera till Produkter', async ({ page }) => {
    await page.getByRole('link', { name: 'Produkter' }).click();
    await expect(page.locator('h1')).toHaveText('Produkter');
  });

  test('kan navigera till Historik', async ({ page }) => {
    await page.getByRole('link', { name: 'Historik' }).click();
    await expect(page.locator('h1')).toHaveText('Historik');
  });

  test('kan navigera till Export', async ({ page }) => {
    await page.getByRole('link', { name: 'Export' }).click();
    await expect(page.locator('h1')).toHaveText('Exportera data');
  });

  test('logga ut omdirigerar till /login', async ({ page }) => {
    await page.click('button:has-text("Logga ut")');
    await page.waitForURL((url) => url.hash.includes('login'), { timeout: 10_000 });
    await expect(page.locator('h1')).toHaveText('LagerApp');
  });
});

// ─── Produkthantering ─────────────────────────────────────────────────────────

test.describe('Produkthantering', () => {
  let store: MockStore;

  test.beforeEach(async ({ page }) => {
    store = new MockStore();
    await setupMockRoutes(page, store);
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Produkter' }).click();
    await expect(page.locator('h1')).toHaveText('Produkter');
  });

  test('visar produktlista', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });
  });

  test('kan skapa ny produkt', async ({ page }) => {
    const name = `Testprodukt ${Date.now()}`;

    await page.click('button:has-text("Ny produkt")');
    await expect(page.locator('h2')).toContainText('Ny produkt');

    await page.fill('input[placeholder="Produktnamn"]', name);
    await page.fill('input[placeholder="Artikelnummer"]', 'TST-001');
    await page.fill('input[placeholder="EAN/QR-kod"]', '9876543210');
    await page.fill('input[placeholder="st, kg, l..."]', 'st');

    await page.click('button:has-text("Skapa produkt")');

    await expect(page.locator('h2')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('table')).toContainText(name);
  });

  test('visar valideringsfel vid tomt namn', async ({ page }) => {
    await page.click('button:has-text("Ny produkt")');
    await page.click('button:has-text("Skapa produkt")');
    await expect(page.getByText('Namn är obligatoriskt')).toBeVisible();
  });

  test('kan redigera en produkt', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
    await page.locator('button:has-text("Redigera")').first().click();
    await expect(page.locator('h2')).toContainText('Redigera produkt');

    const editedName = `Redigerad ${Date.now()}`;
    await page.locator('input[placeholder="Produktnamn"]').fill(editedName);
    await page.click('button:has-text("Spara ändringar")');

    await expect(page.locator('h2')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('table')).toContainText(editedName);
  });

  test('kan avbryta redigering', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
    await page.locator('button:has-text("Redigera")').first().click();
    await expect(page.locator('h2')).toBeVisible();
    await page.click('button:has-text("Avbryt")');
    await expect(page.locator('h2')).toHaveCount(0, { timeout: 10_000 });
  });

  test('kan ta bort en produkt', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
    const rowsBefore = await page.locator('table tbody tr').count();

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('button:has-text("Ta bort")').first().click();

    await expect(page.locator('table tbody tr')).toHaveCount(rowsBefore - 1, { timeout: 10_000 });
  });

  test('visar skannerknapp i produktformulär', async ({ page }) => {
    await page.click('button:has-text("Ny produkt")');
    await expect(page.locator('h2')).toContainText('Ny produkt');
    await expect(page.locator('button[title="Skanna streckkod"]')).toBeVisible();
    await expect(page.locator('button[title="Skanna text från kamera"]').first()).toBeVisible();
    await expect(page.locator('button[title="Skanna text från kamera"]')).toHaveCount(2);
  });

  test('öppnar och stänger skannermodalen', async ({ page }) => {
    await page.click('button:has-text("Ny produkt")');
    await expect(page.locator('h2')).toContainText('Ny produkt');

    await page.locator('button[title="Skanna streckkod"]').click();
    await expect(page.locator('button[aria-label="Stäng scanner"]')).toBeVisible({
      timeout: 5_000,
    });

    const modal = page.locator('.fixed.inset-0');
    await expect(modal.locator('button:has-text("Streckkod")')).toBeVisible();
    await expect(modal.locator('button:has-text("Skanna text")')).toBeVisible();

    await page.locator('button[aria-label="Stäng scanner"]').click();
    await expect(page.locator('button[aria-label="Stäng scanner"]')).toHaveCount(0, {
      timeout: 5_000,
    });
    await expect(page.locator('h2')).toContainText('Ny produkt');
  });
});

// ─── Skanna ───────────────────────────────────────────────────────────────────

test.describe('Skanna / Transaktioner', () => {
  test.beforeEach(async ({ page }) => {
    const store = new MockStore();
    await setupMockRoutes(page, store);
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Skanna' }).click();
    await expect(page.locator('h1')).toHaveText('Skanna');
  });

  test('visar steg-indikator och manuellt inmatningsfält', async ({ page }) => {
    await expect(page.getByText('Skanna', { exact: true }).first()).toBeVisible();
    await expect(page.locator('input[placeholder="Streckkod eller SKU"]')).toBeVisible();
  });

  test('visar varning för okänd streckkod', async ({ page }) => {
    await page.fill('input[placeholder="Streckkod eller SKU"]', 'OKANDSTRECKKOD999');
    await page.click('button:has-text("Sök")');
    await expect(page.locator('[role="alert"]')).toContainText('Okänd streckkod', {
      timeout: 10_000,
    });
  });

  test('registrerar inleverans för känd produkt (happy path)', async ({ page }) => {
    await page.fill('input[placeholder="Streckkod eller SKU"]', SEED_PRODUCT.barcode);
    await page.click('button:has-text("Sök")');

    await expect(page.getByText('Produkt hittad')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(SEED_PRODUCT.name)).toBeVisible();

    await page.selectOption('select', 'in');
    await page.click('button:has-text("Registrera")');

    await expect(page.getByText('Registrerad!')).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Historik ─────────────────────────────────────────────────────────────────

test.describe('Transaktionshistorik', () => {
  test.beforeEach(async ({ page }) => {
    const store = new MockStore();
    await setupMockRoutes(page, store);
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Historik' }).click();
    await expect(page.locator('h1')).toHaveText('Historik');
  });

  test('visar historiktabell eller tomt-meddelande', async ({ page }) => {
    const table = page.locator('table');
    const empty = page.getByText('Ingen historik ännu');
    await expect(table.or(empty)).toBeVisible({ timeout: 10_000 });
  });

  test('tabellen har rätt kolumner om transaktioner finns', async ({ page }) => {
    const table = page.locator('table');
    const empty = page.getByText('Ingen historik ännu');
    await expect(table.or(empty)).toBeVisible({ timeout: 10_000 });

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
    const store = new MockStore();
    await setupMockRoutes(page, store);
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Export' }).click();
    await expect(page.locator('h1')).toHaveText('Exportera data');
  });

  test('visar CSV- och JSON-knappar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Ladda ner CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ladda ner JSON' })).toBeVisible();
  });

  test('CSV-nedladdning fungerar och visar bekräftelse', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Ladda ner CSV")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('lager-export.csv');
    await expect(page.getByText('CSV-fil nedladdad!')).toBeVisible({ timeout: 10_000 });
  });

  test('JSON-nedladdning fungerar och visar bekräftelse', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Ladda ner JSON")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('lager-export.json');
    await expect(page.getByText('JSON-fil nedladdad!')).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Sessionshantering ────────────────────────────────────────────────────────

test.describe('Sessionshantering', () => {
  test('skyddad sida utan session omdirigerar till /login', async ({ page }) => {
    const store = new MockStore();
    await setupMockRoutes(page, store);
    await goto(page, '/#/products');
    await page.waitForURL((url) => url.hash.includes('login'), { timeout: 10_000 });
  });

  test('efter utloggning kan man inte nå skyddade sidor', async ({ page }) => {
    const store = new MockStore();
    await setupMockRoutes(page, store);
    await loginAsAdmin(page);
    await page.click('button:has-text("Logga ut")');
    await page.waitForURL((url) => url.hash.includes('login'), { timeout: 10_000 });
    await goto(page, '/#/products');
    await page.waitForURL((url) => url.hash.includes('login'), { timeout: 10_000 });
  });
});

// ─── Användarhantering ────────────────────────────────────────────────────────

test.describe('Användarhantering (admin)', () => {
  let store: MockStore;

  test.beforeEach(async ({ page }) => {
    store = new MockStore({ withDeletableUser: true });
    await setupMockRoutes(page, store);
    await loginAsAdmin(page);
  });

  test('Användare-länk visas i nav för admin', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Användare' })).toBeVisible();
  });

  test('Admin kan navigera till /users', async ({ page }) => {
    await page.getByRole('link', { name: 'Användare' }).click();
    await expect(page.locator('h1')).toHaveText('Användare');
  });

  test('Sidan visar lista med befintliga användare', async ({ page }) => {
    await goto(page, '/#/users');
    await expect(page.locator('h1')).toHaveText('Användare', { timeout: 10_000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('table')).toContainText(ADMIN.email);
  });

  test('Admin kan bjuda in ny användare', async ({ page }) => {
    const mockEmail = 'ny-anvandare@example.com';
    await goto(page, '/#/users');
    await expect(page.locator('h1')).toHaveText('Användare', { timeout: 10_000 });
    await expect(page.locator('table')).toContainText(ADMIN.email, { timeout: 10_000 });

    await page.fill('input[type="email"][placeholder*="E-post"]', mockEmail);
    await page.click('button:has-text("Bjud in")');

    await expect(
      page.locator('[role="status"]').filter({ hasText: 'Inbjudan skickad' }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('table')).toContainText(mockEmail, { timeout: 10_000 });
  });

  test('Felmeddelande visas om e-post är ogiltig', async ({ page }) => {
    await goto(page, '/#/users');
    await expect(page.locator('h1')).toHaveText('Användare', { timeout: 10_000 });
    await page.fill('input[type="email"][placeholder*="E-post"]', 'inte-en-epost');
    await page.click('button:has-text("Bjud in")');
    const isInvalid = await page
      .locator('input[type="email"][placeholder*="E-post"]')
      .evaluate((el: HTMLInputElement) => !el.validity.valid);
    const errorMsg = page.locator('[role="alert"]');
    expect(isInvalid || (await errorMsg.isVisible())).toBeTruthy();
  });

  test('Admin kan ta bort en användare', async ({ page }) => {
    await goto(page, '/#/users');
    await expect(page.locator('h1')).toHaveText('Användare', { timeout: 10_000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('table').getByText(DELETABLE_USER.email)).toBeVisible({
      timeout: 10_000,
    });

    const row = page.locator('tr').filter({ hasText: DELETABLE_USER.email });
    await row.getByRole('button', { name: /Ta bort/ }).click();
    await row.getByRole('button', { name: /Bekräfta/ }).click();

    await expect(page.locator('table').getByText(DELETABLE_USER.email)).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});

// ─── Lagerarbetare-roll ───────────────────────────────────────────────────────

test.describe('Lagerarbetare-roll', () => {
  test.beforeEach(async ({ page }) => {
    const store = new MockStore({ withWorker: true });
    await setupMockRoutes(page, store);
    await loginAsWorker(page);
  });

  test('worker ser rätt nav-länkar (Lagerlista, Skanna, Export)', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Lagerlista' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Skanna' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Export' })).toBeVisible();
  });

  test('worker ser inte admin-länkar (Produkter, Historik)', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Produkter' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Historik' })).toHaveCount(0);
  });

  test('worker omdirigeras från /products till lagerlistan', async ({ page }) => {
    await goto(page, '/#/products');
    await expect(page.locator('h1')).toHaveText('Lagerlista', { timeout: 10_000 });
  });

  test('worker omdirigeras från /history till lagerlistan', async ({ page }) => {
    await goto(page, '/#/history');
    await expect(page.locator('h1')).toHaveText('Lagerlista', { timeout: 10_000 });
  });

  test('worker kan navigera till Skanna', async ({ page }) => {
    await page.getByRole('link', { name: 'Skanna' }).click();
    await expect(page.locator('h1')).toHaveText('Skanna');
  });

  test('navbar visar worker-roll', async ({ page }) => {
    await expect(page.getByText('worker', { exact: true })).toBeVisible();
  });

  test('worker ser inte Användare-länk i nav', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Användare' })).toHaveCount(0);
  });

  test('worker omdirigeras från /users till lagerlistan', async ({ page }) => {
    await goto(page, '/#/users');
    await expect(page.locator('h1')).toHaveText('Lagerlista', { timeout: 10_000 });
  });
});
