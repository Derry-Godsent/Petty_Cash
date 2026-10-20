import { test, expect, Page } from '@playwright/test';

const OWNER = 'a'.repeat(64), VIEWER = 'b'.repeat(64);
const row = { id: '11111111-1111-4111-8111-111111111111', date: '2026-10-20', description: 'Existing purchase', category: 'Staff Meals', amount: 12.5, type: 'expense', created_at: '2026-10-20T12:00:00Z' };
const ACCESS_KEY = 'petty-cash-private-link-v1';
const backend = (existing = false) => ({ owner: OWNER, viewer: VIEWER, rows: existing ? [{ ...row }] : [] as any[], settings: {} as Record<string, unknown>, writes: [] as Record<string, unknown>[] });

async function mockSupabase(page: Page, options: { failInsert?: boolean; failSettings?: boolean; existing?: boolean; invalid?: boolean; viewer?: boolean; noAccess?: boolean } = {}, state = backend(Boolean(options.existing))) {
  if (!options.noAccess) await page.addInitScript(({ key, token, viewerToken }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ token, ...(viewerToken ? { viewerToken } : {}) }));
  }, { key: ACCESS_KEY, token: options.viewer ? VIEWER : OWNER, viewerToken: options.viewer ? '' : VIEWER });
  await page.route('**/rest/v1/rpc/**', async route => {
    const fn = new URL(route.request().url()).pathname.split('/').pop();
    const args = route.request().postDataJSON();
    const deny = (message = 'This link is view-only.') => route.fulfill({ status: 403, json: { message, code: '42501' } });
    if (fn === 'pc_create') { state.owner = args.p_owner_token; state.viewer = args.p_viewer_token; }
    const token = args.p_token || args.p_owner_token;
    if (options.invalid || (token !== state.owner && token !== state.viewer)) return deny('This access link is invalid or has been replaced');
    if (fn !== 'pc_open' && fn !== 'pc_create' && token !== state.owner) return deny();
    if (fn === 'pc_open' || fn === 'pc_create') return route.fulfill({ json: { id: 'cashbook-1', role: token === state.owner ? 'owner' : 'viewer', settings: state.settings, transactions: state.rows } });
    if (fn === 'pc_add') {
      state.writes.push(args.p_transaction);
      await new Promise(resolve => setTimeout(resolve, 250));
      if (options.failInsert) return deny('Transaction access denied');
      const existing = state.rows.find(row => row.id === args.p_transaction.id);
      const saved = existing || { ...args.p_transaction, created_at: new Date().toISOString() };
      if (!existing) state.rows.push(saved);
      return route.fulfill({ json: saved });
    }
    if (fn === 'pc_delete') state.rows = state.rows.filter(row => row.id !== args.p_id);
    if (fn === 'pc_save_settings') {
      if (options.failSettings) return deny('Settings access denied');
      state.settings = args.p_settings;
    }
    if (fn === 'pc_clear') { state.rows = []; state.settings = {}; }
    if (fn === 'pc_replace_viewer') state.viewer = args.p_viewer_token;
    await route.fulfill({ json: null });
  });
  return state;
}

async function fillTransaction(page: Page) {
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await page.getByPlaceholder('0.00').fill('25.50');
  await page.getByPlaceholder('What was this for?').fill('Taxi to office');
  await page.getByRole('button', { name: 'Transport / Fuel', exact: true }).click();
}

test('loads cashbook with no settings and mobile tabs do not overflow', async ({ page }) => {
  await mockSupabase(page, { existing: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByText('Existing purchase')).toBeVisible();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const tab of ['Home', 'History', 'Report', 'Settings']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});

test('saves once, awaits persistence and shows the confirmed transaction', async ({ page }) => {
  const state = await mockSupabase(page);
  await page.goto('/');
  await fillTransaction(page);
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByText('Taxi to office')).toBeVisible();
  expect(state.writes).toHaveLength(1);
});

test('failed insert keeps form and input with useful error; retries use the same ID', async ({ page }) => {
  const state = await mockSupabase(page, { failInsert: true });
  await page.goto('/');
  await fillTransaction(page);
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Transaction access denied');
  await expect(page.getByPlaceholder('What was this for?')).toHaveValue('Taxi to office');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByPlaceholder('What was this for?').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add Transaction', exact: true })).toBeEnabled();
  expect(state.writes).toHaveLength(2);
  expect(state.writes[0].id).toBe(state.writes[1].id);
});

test('owner gets separate private owner and view-only links without auth or registration', async ({ page }) => {
  let authRequests = 0;
  page.on('request', request => { if (request.url().includes('/auth/v1')) authRequests++; });
  await mockSupabase(page, { noAccess: true });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Create cashbook' })).toBeVisible();
  await page.getByRole('button', { name: 'Create cashbook' }).click();
  const owner = await page.getByRole('textbox', { name: 'Owner link', exact: true }).inputValue();
  const viewer = await page.getByRole('textbox', { name: 'View-only link', exact: true }).inputValue();
  expect(owner).toContain('&view=');
  expect(viewer).not.toContain('&view=');
  expect(owner.split('#access=')[1].split('&')[0]).not.toBe(viewer.split('#access=')[1]);
  expect(authRequests).toBe(0);
});

test('settings failures are not reported as saved', async ({ page }) => {
  await mockSupabase(page, { failSettings: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Save Settings', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Settings access denied');
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveCount(0);
});

test('invalid access provides reconnect rather than an empty working-looking cashbook', async ({ page }) => {
  await mockSupabase(page, { invalid: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Unable to connect' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reconnect' })).toBeVisible();
});

test('manifest includes installable raster icons and standalone display', async ({ request }) => {
  const manifest = await (await request.get('/manifest.json')).json();
  expect(manifest.display).toBe('standalone');
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((entry: { sizes: string }) => entry.sizes === `${size}x${size}`);
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
});

test('confirmed deletion removes the transaction after database success', async ({ page }) => {
  await mockSupabase(page, { existing: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: /Existing purchase/ }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete Transaction', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('No transactions found')).toBeVisible();
});

test('custom category remains selectable and form fits a short viewport', async ({ page }) => {
  await mockSupabase(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await fillTransaction(page);
  await page.getByRole('button', { name: 'Add Custom Category', exact: true }).click();
  await page.getByPlaceholder('Enter custom category').fill('Site visit');
  await page.getByRole('button', { name: 'Add Category', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add Transaction', exact: true })).toBeEnabled();
  expect(await page.getByRole('dialog').evaluate(el => el.getBoundingClientRect().height <= window.innerHeight)).toBe(true);
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('boss link shows existing transactions without edit, delete, settings or owner link access', async ({ page }) => {
  await mockSupabase(page, { noAccess: true, existing: true });
  await page.goto('/#access=' + VIEWER);
  await expect(page.getByText('View only', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: /Existing purchase/ }).click();
  await expect(page.getByRole('button', { name: 'Delete Transaction', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add transaction', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe('');
  expect(await page.evaluate(key => localStorage.getItem(key), ACCESS_KEY)).not.toContain(OWNER);
  await page.reload();
  await expect(page.getByText('View only', { exact: true })).toBeVisible();
});

test('same owner link restores cashbook in a separate installed-app-like browser context', async ({ page, browser }) => {
  const state = await mockSupabase(page, { existing: true });
  await page.goto('/');
  const context = await browser.newContext();
  try {
    const app = await context.newPage();
    await mockSupabase(app, { noAccess: true }, state);
    await app.goto(`http://127.0.0.1:3000/#access=${OWNER}&view=${VIEWER}`);
    await expect(app.getByText('Existing purchase')).toBeVisible();
    await expect(app.getByRole('button', { name: 'Add transaction', exact: true })).toBeVisible();
    await app.reload();
    await expect(app.getByText('Existing purchase')).toBeVisible();
    await app.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(app.getByRole('textbox', { name: 'Owner link', exact: true })).toHaveValue(`http://127.0.0.1:3000/#access=${OWNER}&view=${VIEWER}`);
  } finally { await context.close(); }
});

test('viewer receives updates when returning to the app online', async ({ page, browser }) => {
  const state = await mockSupabase(page);
  await page.goto('/');
  const context = await browser.newContext();
  try {
    const boss = await context.newPage();
    await mockSupabase(boss, { viewer: true }, state);
    await boss.goto('http://127.0.0.1:3000/');
    await expect(boss.getByText('View only', { exact: true })).toBeVisible();
    await page.bringToFront();
    await fillTransaction(page);
    await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await boss.bringToFront();
    await boss.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(boss.getByText('Taxi to office')).toBeVisible();
  } finally { await context.close(); }
});

test('iPhone browser shows Home Screen requirement without prompting permission', async ({ page }) => {
  await mockSupabase(page, { viewer: true });
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Notifications', exact: true })).toBeVisible();
  await expect(page.getByText('Add to Home Screen to enable notifications.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable notifications' })).toHaveCount(0);
});

test('push opt-in and opt-out use the viewing capability, with no owner key or registration', async ({ page }) => {
  await mockSupabase(page, { viewer: true });
  const calls: { name: string; args: any }[] = [];
  await page.route('**/rest/v1/rpc/pc_push_*', async route => {
    const name = route.request().url().split('/').pop()!;
    const args = route.request().postDataJSON();
    calls.push({ name, args });
    await route.fulfill({ json: name === 'pc_push_status' ? true : null });
  });
  await page.goto('/');
  const result = await page.evaluate(async token => {
    let unsubscribed = false;
    const subscription = {
      endpoint: 'https://web.push.apple.com/device',
      toJSON: () => ({ endpoint: 'https://web.push.apple.com/device', keys: { p256dh: 'test-public-key', auth: 'test-auth-key' } }),
      unsubscribe: async () => { unsubscribed = true; return true; },
    };
    Object.defineProperty(Notification, 'requestPermission', { value: async () => 'granted', configurable: true });
    Object.defineProperty(navigator.serviceWorker, 'getRegistration', {
      value: async () => ({ active: {}, pushManager: { getSubscription: async () => subscription } }), configurable: true,
    });
    const path = '/src/lib/notifications.ts';
    const notifications = await import(path);
    await notifications.enablePush(token);
    const enabled = await notifications.isPushEnabled(token);
    await notifications.disablePush(token);
    return { enabled, unsubscribed };
  }, VIEWER);
  expect(result).toEqual({ enabled: true, unsubscribed: true });
  expect(calls.map(call => call.name)).toEqual(['pc_push_subscribe', 'pc_push_status', 'pc_push_unsubscribe']);
  for (const call of calls) {
    expect(call.args.p_token).toBe(VIEWER);
    expect(JSON.stringify(call)).not.toContain(OWNER);
  }
});

test('denied push permission never registers a server subscription', async ({ page }) => {
  await mockSupabase(page, { viewer: true });
  let registrations = 0;
  await page.route('**/rest/v1/rpc/pc_push_subscribe', route => { registrations++; return route.fulfill({ json: null }); });
  await page.goto('/');
  const message = await page.evaluate(async token => {
    Object.defineProperty(Notification, 'requestPermission', { value: async () => 'denied', configurable: true });
    const path = '/src/lib/notifications.ts';
    const notifications = await import(path);
    try { await notifications.enablePush(token); return ''; }
    catch (error) { return (error as Error).message; }
  }, VIEWER);
  expect(message).toBe('Notifications are blocked in device settings.');
  expect(registrations).toBe(0);
});

test('bottom navigation stays inside the app viewport while only content scrolls', async ({ page }) => {
  await mockSupabase(page, { existing: true });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav).toBeVisible();
  // Simulate a home indicator on both short and tall phone viewports.
  await page.addStyleTag({ content: '.bottom-nav { padding-bottom: 34px; }' });
  for (const height of [844, 568, 932]) {
    await page.setViewportSize({ width: 390, height });
    for (const tab of ['Home', 'History', 'Report', 'Settings']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      const metrics = await nav.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const main = document.querySelector('main')!;
        main.scrollTop = main.scrollHeight;
        return {
          bottom: bounds.bottom, height: bounds.height, viewport: window.innerHeight,
          mainBottom: main.getBoundingClientRect().bottom,
          navTop: bounds.top, documentScroll: document.scrollingElement!.scrollTop,
          overflow: getComputedStyle(main).overflowY,
        };
      });
      expect(Math.abs(metrics.bottom - metrics.viewport)).toBeLessThanOrEqual(1);
      expect(metrics.height).toBe(99); // 64px controls + 34px safe area + 1px border
      expect(metrics.mainBottom).toBeLessThanOrEqual(metrics.navTop + 1);
      expect(metrics.documentScroll).toBe(0);
      expect(metrics.overflow).toBe('auto');
    }
  }
});

test('viewport height never exceeds the drawable area and reserved insets are not doubled', async ({ page }) => {
  await page.goto('/');
  const heights = await page.evaluate(async () => {
    const path = '/src/lib/viewport.ts';
    const { appViewportHeight, appBottomInset } = await import(path);
    const base = { layoutHeight: 797, visualHeight: 797, visualOffsetTop: 0, screenHeight: 844, screenWidth: 390, width: 390, safeTop: 47, standaloneIOS: true };
    return [
      appViewportHeight(base),
      appViewportHeight({ ...base, standaloneIOS: false }), // Android/browser: no screen-height stretching
      appViewportHeight({ ...base, width: 320 }), // Split-screen/embedded width: don't assume fullscreen
      appViewportHeight({ ...base, safeTop: 0 }), // Opaque OS status bar: its space is not app space
      appViewportHeight({ ...base, visualHeight: 480 }), // Keyboard covers bottom
      appViewportHeight({ ...base, layoutHeight: 480, visualHeight: 480 }), // OS also resizes layout for keyboard
      appViewportHeight({ ...base, screenHeight: 1024 }), // Unrelated screen/viewport mismatch
      appBottomInset(base, 34),
      appBottomInset({ ...base, standaloneIOS: false }, 34),
      appBottomInset({ ...base, width: 320 }, 34),
      appBottomInset({ ...base, safeTop: 0 }, 34),
      appBottomInset({ ...base, visualHeight: 480 }, 34),
      appBottomInset({ ...base, layoutHeight: 844, visualHeight: 844 }, 34),
    ];
  });
  expect(heights).toEqual([797, 797, 797, 797, 480, 480, 797, 0, 34, 34, 34, 34, 34]);
});
