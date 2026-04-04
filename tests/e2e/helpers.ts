import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export const ADMIN = { email: 'admin@lager.se', password: 'admin123' };

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://ihqqqynuqclycffgraxl.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

export const SEED_PRODUCT = {
  id: '00000000-0000-0000-0000-000000000042',
  name: 'Testprodukt Seed',
  sku: 'SEED-001',
  barcode: '1234567890123',
  unit: 'st',
  min_stock: 5,
  current_stock: 10,
};

/**
 * Seeds test products directly via Supabase service role (bypasses RLS).
 * Falls back to signing in as admin when SERVICE_ROLE_KEY is absent.
 * Requires SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY env variable.
 */
export async function seedProducts(_page: Page) {
  if (SERVICE_ROLE_KEY) {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await admin.from('products').upsert([SEED_PRODUCT], { onConflict: 'id' });
    if (error) throw new Error(`seedProducts failed: ${error.message}`);
    return;
  }
  if (!ANON_KEY) return;
  // Fallback: authenticate as admin then upsert via RLS-allowed role
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error: signInError } = await client.auth.signInWithPassword({
    email: ADMIN.email,
    password: ADMIN.password,
  });
  if (signInError) throw new Error(`seedProducts sign-in failed: ${signInError.message}`);
  try {
    const { error } = await client.from('products').upsert([SEED_PRODUCT], { onConflict: 'id' });
    if (error) throw new Error(`seedProducts upsert failed: ${error.message}`);
  } finally {
    await client.auth.signOut();
  }
}

/**
 * Deletes seed test data. Call in afterEach/afterAll to keep DB clean.
 */
export async function cleanupSeedProducts() {
  if (SERVICE_ROLE_KEY) {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    await admin.from('products').delete().eq('id', SEED_PRODUCT.id);
    return;
  }
  if (!ANON_KEY) return;
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error: signInError } = await client.auth.signInWithPassword({
    email: ADMIN.email,
    password: ADMIN.password,
  });
  if (signInError) throw new Error(`cleanupSeedProducts sign-in failed: ${signInError.message}`);
  try {
    const { error } = await client.from('products').delete().eq('id', SEED_PRODUCT.id);
    if (error) throw new Error(`cleanupSeedProducts delete failed: ${error.message}`);
  } finally {
    await client.auth.signOut();
  }
}

export async function goto(page: Page, url: string) {
  // Convert absolute paths (e.g. '/#/login') to base-relative paths ('./#/login')
  // so navigation stays within the preview sub-path when BASE_URL includes one.
  const resolved = url.startsWith('/') ? '.' + url : url;
  await page.goto(resolved, { waitUntil: 'domcontentloaded' });
}

export async function loginAsAdmin(page: Page) {
  await goto(page, '/#/login');
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 30_000 });
  await page.fill('input[type="email"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.hash.includes('login') && !url.pathname.includes('login'), { timeout: 30_000 });
  await expect(page.locator('h1')).toHaveText('Lagerlista', { timeout: 30_000 });
}
