import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export const ADMIN = { email: 'admin@lager.se', password: 'admin123' };
export const WORKER = { email: 'worker@lager.se', password: 'worker123' };

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ihqqqynuqclycffgraxl.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

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

/**
 * Ensures the worker user exists. Uses service role if available, otherwise
 * falls back to signUp (assumes email confirmation is disabled).
 * Treats "user already registered" as success.
 */
export async function seedWorker() {
  if (SERVICE_ROLE_KEY) {
    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await serviceClient.auth.admin.createUser({
      email: WORKER.email,
      password: WORKER.password,
      email_confirm: true,
    });
    // Ignore "already registered / already exists" errors
    if (error && !/already registered|user already exists/i.test(error.message)) {
      throw new Error(`seedWorker (admin) failed: ${error.message}`);
    }
    return;
  }
  if (!ANON_KEY) return;
  // Fallback: signUp (email confirmation must be disabled in the Supabase project)
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error } = await client.auth.signUp({
    email: WORKER.email,
    password: WORKER.password,
  });
  // Ignore "User already registered" — user exists and can log in
  if (error && !/already registered|user already exists/i.test(error.message)) {
    throw new Error(`seedWorker (signUp) failed: ${error.message}`);
  }
}

/**
 * Removes the worker test user. Only possible with service role key.
 */
export async function cleanupWorker() {
  if (!SERVICE_ROLE_KEY) return;
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data } = await serviceClient.auth.admin.listUsers();
  const worker = data?.users?.find(u => u.email === WORKER.email);
  if (worker) {
    await serviceClient.auth.admin.deleteUser(worker.id);
  }
}

export async function loginAsWorker(page: Page) {
  await goto(page, '/#/login');
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 30_000 });
  await page.fill('input[type="email"]', WORKER.email);
  await page.fill('input[type="password"]', WORKER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.hash.includes('login') && !url.pathname.includes('login'), { timeout: 30_000 });
  await expect(page.locator('h1')).toHaveText('Lagerlista', { timeout: 30_000 });
}

// E-post för testanvändare som ska kunna tas bort via UI
export const DELETABLE_USER_EMAIL = 'test-delete-playwright@playwright-test.local';

/**
 * Skapar en testanvändare som kan tas bort i UI-testet för användarhantering.
 * Använder service role när den finns, annars fallback via vanlig signUp.
 */
export async function seedDeletableUser() {
  if (SERVICE_ROLE_KEY) {
    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await serviceClient.auth.admin.createUser({
      email: DELETABLE_USER_EMAIL,
      password: 'deletable123',
      email_confirm: true,
    });
    if (error && !/already registered|user already exists/i.test(error.message)) {
      throw new Error(`seedDeletableUser failed: ${error.message}`);
    }
    return;
  }

  if (!ANON_KEY) {
    throw new Error('seedDeletableUser failed: missing SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY');
  }

  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { error } = await anonClient.auth.signUp({
    email: DELETABLE_USER_EMAIL,
    password: 'deletable123',
  });
  if (error && !/already registered|user already exists/i.test(error.message)) {
    throw new Error(`seedDeletableUser failed: ${error.message}`);
  }
}

/**
 * Tar bort testanvändaren som skapades för borttagningstest.
 * Kräver SUPABASE_SERVICE_ROLE_KEY.
 */
export async function cleanupDeletableUser() {
  if (!SERVICE_ROLE_KEY) return;
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data } = await serviceClient.auth.admin.listUsers();
  const user = data?.users?.find(u => u.email === DELETABLE_USER_EMAIL);
  if (user) {
    await serviceClient.auth.admin.deleteUser(user.id);
  }
}
