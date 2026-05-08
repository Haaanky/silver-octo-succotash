import type { Page, Route, Request } from '@playwright/test';
import { expect } from '@playwright/test';

export const ADMIN = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@lager.se',
  password: 'admin123',
  role: 'admin' as const,
};

export const WORKER = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'worker@lager.se',
  password: 'worker123',
  role: 'worker' as const,
};

export const DELETABLE_USER = {
  id: '00000000-0000-0000-0000-000000000099',
  email: 'test-delete-playwright@playwright-test.local',
  role: 'worker' as const,
};

export const SEED_PRODUCT = {
  id: '00000000-0000-0000-0000-000000000042',
  name: 'Testprodukt Seed',
  sku: 'SEED-001',
  barcode: '1234567890123',
  unit: 'st',
  min_stock: 5,
  current_stock: 10,
  created_at: '2024-01-01T00:00:00Z',
};

export interface MockProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  created_at: string;
}

export interface MockUserProfile {
  id: string;
  email: string;
  role: 'admin' | 'worker';
}

export interface MockTransaction {
  id: string;
  product_id: string;
  type: 'in' | 'out';
  quantity: number;
  user_id: string;
  timestamp: string;
}

function b64url(s: string): string {
  return Buffer.from(s)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function makeJwt(userId: string, email: string): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      sub: userId,
      email,
      role: 'authenticated',
      aal: 'aal1',
      exp: 9_999_999_999,
      iat: 1_700_000_000,
    }),
  );
  return `${header}.${payload}.mock-sig`;
}

function makeSession(user: { id: string; email: string }) {
  return {
    access_token: makeJwt(user.id, user.email),
    refresh_token: `mock-refresh-${user.id}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 9_999_999_999,
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
    },
  };
}

export class MockStore {
  products: MockProduct[];
  users: MockUserProfile[];
  transactions: MockTransaction[];

  constructor(opts: { withWorker?: boolean; withDeletableUser?: boolean } = {}) {
    this.products = [{ ...SEED_PRODUCT }];
    this.users = [{ id: ADMIN.id, email: ADMIN.email, role: ADMIN.role }];
    this.transactions = [];

    if (opts.withWorker) {
      this.users.push({ id: WORKER.id, email: WORKER.email, role: WORKER.role });
    }
    if (opts.withDeletableUser) {
      this.users.push({ ...DELETABLE_USER });
    }
  }
}

// ─── Route handlers ──────────────────────────────────────────────────────────

async function handleAuth(route: Route, request: Request, store: MockStore) {
  const url = new URL(request.url());
  const path = url.pathname;

  if (path.endsWith('/logout')) {
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (path.endsWith('/user')) {
    const authHeader = request.headers()['authorization'] ?? '';
    const token = authHeader.replace('Bearer ', '');
    try {
      const rawPayload = token.split('.')[1] ?? '';
      // pad to multiple of 4 for atob
      const padded = rawPayload + '='.repeat((4 - (rawPayload.length % 4)) % 4);
      const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as {
        sub: string;
        email: string;
      };
      const user = store.users.find((u) => u.id === payload.sub);
      if (user) {
        await route.fulfill({
          status: 200,
          json: { id: user.id, email: user.email, role: 'authenticated' },
        });
        return;
      }
    } catch {
      // fall through to 401
    }
    await route.fulfill({ status: 401, json: { message: 'Invalid token' } });
    return;
  }

  // /token endpoint (login + refresh)
  const body = request.postDataJSON() as {
    email?: string;
    password?: string;
    refresh_token?: string;
  } | null;

  if (body?.refresh_token) {
    const userId = body.refresh_token.replace('mock-refresh-', '');
    const profile = store.users.find((u) => u.id === userId);
    if (profile) {
      await route.fulfill({ status: 200, json: makeSession(profile) });
    } else {
      await route.fulfill({ status: 400, json: { error: 'invalid_grant' } });
    }
    return;
  }

  if (body?.email === ADMIN.email && body?.password === ADMIN.password) {
    await route.fulfill({ status: 200, json: makeSession(ADMIN) });
  } else if (body?.email === WORKER.email && body?.password === WORKER.password) {
    await route.fulfill({ status: 200, json: makeSession(WORKER) });
  } else {
    await route.fulfill({
      status: 400,
      json: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
    });
  }
}

function isSingleAccept(request: Request): boolean {
  return (request.headers()['accept'] ?? '').includes('vnd.pgrst.object');
}

async function handleProducts(route: Route, request: Request, store: MockStore) {
  const method = request.method();
  const url = new URL(request.url());
  const single = isSingleAccept(request);

  if (method === 'GET') {
    let results = [...store.products];

    const barcode = url.searchParams.get('barcode');
    if (barcode?.startsWith('eq.')) {
      results = results.filter((p) => p.barcode === barcode.slice(3));
    }

    const sku = url.searchParams.get('sku');
    if (sku?.startsWith('ilike.')) {
      const term = sku.slice(6).toLowerCase();
      results = results.filter((p) => p.sku.toLowerCase() === term);
    }

    const order = url.searchParams.get('order');
    if (order?.startsWith('name')) {
      results.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
    }

    if (single) {
      await route.fulfill({
        status: results[0] ? 200 : 406,
        json: results[0] ?? null,
      });
    } else {
      await route.fulfill({
        status: 200,
        json: results,
        headers: { 'Content-Range': `0-${Math.max(results.length - 1, 0)}/${results.length}` },
      });
    }
    return;
  }

  if (method === 'POST') {
    const body = request.postDataJSON() as Partial<MockProduct>;
    const product: MockProduct = {
      id: body.id ?? crypto.randomUUID(),
      name: body.name ?? '',
      sku: body.sku ?? '',
      barcode: body.barcode ?? '',
      unit: body.unit ?? '',
      min_stock: body.min_stock ?? 0,
      current_stock: body.current_stock ?? 0,
      created_at: new Date().toISOString(),
    };
    store.products.push(product);
    await route.fulfill({ status: 201, json: single ? product : [product] });
    return;
  }

  if (method === 'PATCH') {
    const idParam = url.searchParams.get('id');
    const id = idParam?.startsWith('eq.') ? idParam.slice(3) : null;
    const body = request.postDataJSON() as Partial<MockProduct>;
    const idx = store.products.findIndex((p) => p.id === id);
    if (idx >= 0) {
      store.products[idx] = { ...store.products[idx], ...body };
      await route.fulfill({
        status: 200,
        json: single ? store.products[idx] : [store.products[idx]],
      });
    } else {
      await route.fulfill({ status: 200, json: single ? null : [] });
    }
    return;
  }

  if (method === 'DELETE') {
    const idParam = url.searchParams.get('id');
    const id = idParam?.startsWith('eq.') ? idParam.slice(3) : null;
    store.products = store.products.filter((p) => p.id !== id);
    await route.fulfill({ status: 200, json: [] });
    return;
  }

  await route.continue();
}

async function handleTransactions(route: Route, request: Request, store: MockStore) {
  const method = request.method();

  if (method === 'GET') {
    const sorted = [...store.transactions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    await route.fulfill({ status: 200, json: sorted });
    return;
  }

  if (method === 'POST') {
    const body = request.postDataJSON() as Omit<MockTransaction, 'id'>;
    const tx: MockTransaction = { id: crypto.randomUUID(), ...body };
    store.transactions.push(tx);
    const product = store.products.find((p) => p.id === tx.product_id);
    if (product) {
      product.current_stock += tx.type === 'in' ? tx.quantity : -tx.quantity;
    }
    await route.fulfill({ status: 201, json: [tx] });
    return;
  }

  await route.continue();
}

async function handleProfiles(route: Route, request: Request, store: MockStore) {
  const url = new URL(request.url());
  const single = isSingleAccept(request);

  const idParam = url.searchParams.get('id');
  const id = idParam?.startsWith('eq.') ? idParam.slice(3) : null;

  const profile = id ? (store.users.find((u) => u.id === id) ?? null) : (store.users[0] ?? null);

  if (single) {
    await route.fulfill({ status: profile ? 200 : 406, json: profile });
  } else {
    await route.fulfill({ status: 200, json: profile ? [profile] : [] });
  }
}

async function handleInviteUser(route: Route, request: Request, store: MockStore) {
  const body = request.postDataJSON() as {
    action?: string;
    email?: string;
    userId?: string;
  } | null;

  if (body?.action === 'list') {
    await route.fulfill({ status: 200, json: { users: store.users } });
  } else if (body?.action === 'invite') {
    const email = body.email ?? '';
    const newUser: MockUserProfile = { id: crypto.randomUUID(), email, role: 'worker' };
    store.users.push(newUser);
    await route.fulfill({
      status: 200,
      json: { success: true, userId: newUser.id, emailSent: true },
    });
  } else if (body?.action === 'delete') {
    store.users = store.users.filter((u) => u.id !== body.userId);
    await route.fulfill({ status: 200, json: { success: true } });
  } else {
    await route.fulfill({ status: 400, json: { error: 'Unknown action' } });
  }
}

// ─── Public setup ─────────────────────────────────────────────────────────────

export async function setupMockRoutes(page: Page, store: MockStore) {
  await page.route('**/auth/v1/**', (route, request) => handleAuth(route, request, store));
  await page.route('**/rest/v1/profiles**', (route, request) =>
    handleProfiles(route, request, store),
  );
  await page.route('**/rest/v1/products**', (route, request) =>
    handleProducts(route, request, store),
  );
  await page.route('**/rest/v1/stock_transactions**', (route, request) =>
    handleTransactions(route, request, store),
  );
  await page.route('**/functions/v1/invite-user**', (route, request) =>
    handleInviteUser(route, request, store),
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function goto(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
}

export async function loginAsAdmin(page: Page) {
  await goto(page, '/#/login');
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
  await page.fill('input[type="email"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.hash.includes('login'), { timeout: 15_000 });
  await expect(page.locator('h1')).toHaveText('Lagerlista', { timeout: 15_000 });
}

export async function loginAsWorker(page: Page) {
  await goto(page, '/#/login');
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
  await page.fill('input[type="email"]', WORKER.email);
  await page.fill('input[type="password"]', WORKER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.hash.includes('login'), { timeout: 15_000 });
  await expect(page.locator('h1')).toHaveText('Lagerlista', { timeout: 15_000 });
}
