import { test, expect } from '@playwright/test';

test('built app fills the viewport, retains only home-indicator space, and keeps report amounts on one line', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('petty-cash-private-link-v1', JSON.stringify({ token: 'a'.repeat(64) })));
  await page.route('**/rest/v1/rpc/pc_open', route => route.fulfill({ json: {
    id: 'book', role: 'owner', settings: {}, transactions: [
      { id: 'income', date: '2026-10-20', description: 'Petty Cash', category: 'Cash Advance', amount: 1000, type: 'income', created_at: '2026-10-20T12:00:00Z' },
      { id: 'expense', date: '2026-10-20', description: 'Polytank', category: 'Miscellaneous', amount: 300, type: 'expense', created_at: '2026-10-20T12:01:00Z' },
    ],
  } }));
  await page.clock.setFixedTime(new Date('2026-10-20T12:00:00Z'));
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav).toBeVisible();
  await page.addStyleTag({ content: '.bottom-nav { padding-bottom: 34px; }' });
  for (const size of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById('root')!.getBoundingClientRect().bottom - window.innerHeight))).toBeLessThanOrEqual(1);
    for (const tab of ['Home', 'History', 'Report', 'Settings']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      const metrics = await page.evaluate(() => {
        const root = document.getElementById('root')!;
        const nav = document.querySelector('nav')!;
        const main = document.querySelector('main')!;
        main.scrollTop = main.scrollHeight;
        return {
          rootTop: root.getBoundingClientRect().top,
          rootBottom: root.getBoundingClientRect().bottom,
          navBottom: nav.getBoundingClientRect().bottom,
          navHeight: nav.getBoundingClientRect().height,
          position: getComputedStyle(root).position,
          viewport: window.innerHeight,
          documentScroll: document.scrollingElement!.scrollTop,
        };
      });
      expect(metrics.position).toBe('fixed');
      expect(metrics.rootTop).toBe(0);
      expect(Math.abs(metrics.rootBottom - metrics.viewport)).toBeLessThanOrEqual(1);
      expect(Math.abs(metrics.navBottom - metrics.viewport)).toBeLessThanOrEqual(1);
      expect(metrics.navHeight).toBe(99);
      expect(metrics.documentScroll).toBe(0);
      if (tab === 'Report') {
        const amounts = page.locator('.report-summary-amount');
        await expect(amounts).toHaveCount(3);
        for (const amount of await amounts.all()) {
          expect(await amount.evaluate(element => getComputedStyle(element).whiteSpace)).toBe('nowrap');
          expect(await amount.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(24);
        }
        await expect(amounts.first()).toContainText('1000.00');
      }
    }
  }
});

test('reported iPhone geometry keeps every tab label visible without double bottom padding', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__viewport = { layout: 797, visual: 797 };
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    Object.defineProperty(screen, 'width', { value: 390, configurable: true });
    Object.defineProperty(screen, 'height', { value: 844, configurable: true });
    Object.defineProperty(window, 'innerHeight', { get: () => (window as any).__viewport.layout, configurable: true });
    Object.defineProperty(window.visualViewport!, 'height', { get: () => (window as any).__viewport.visual, configurable: true });
    localStorage.setItem('petty-cash-private-link-v1', JSON.stringify({ token: 'a'.repeat(64) }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/rest/v1/rpc/pc_open', route => route.fulfill({ json: { id: 'book', role: 'owner', settings: {}, transactions: [] } }));
  await page.goto('/');
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.addStyleTag({ content: '.viewport-safe-area-probe { padding-top: 47px; padding-bottom: 34px; }' });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await expect.poll(() => page.locator('#root').evaluate(element => element.getBoundingClientRect().bottom)).toBe(797);
  await expect.poll(() => page.getByRole('navigation').evaluate(element => element.getBoundingClientRect().bottom)).toBe(797);
  expect(await page.getByRole('navigation').evaluate(element => getComputedStyle(element).paddingBottom)).toBe('0px');
  for (const tab of ['Home', 'History', 'Report', 'Settings']) {
    const label = page.getByRole('navigation').getByText(tab, { exact: true });
    const bounds = await label.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(797);
    await expect(label).toBeInViewport({ ratio: 1 });
  }
  await page.evaluate(() => {
    (window as any).__viewport.visual = 480;
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect.poll(() => page.locator('#root').evaluate(element => element.getBoundingClientRect().height)).toBe(480);
  await page.evaluate(() => {
    (window as any).__viewport.visual = 797;
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect.poll(() => page.getByRole('navigation').evaluate(element => element.getBoundingClientRect().bottom)).toBe(797);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Display diagnostics', { exact: true }).click();
  const diagnostics = await page.locator('details pre').innerText();
  expect(diagnostics).toContain('viewport-5');
  expect(diagnostics).toContain('standalone');
  expect(diagnostics).not.toContain('a'.repeat(64));
  expect(diagnostics).not.toContain('#access');
});
