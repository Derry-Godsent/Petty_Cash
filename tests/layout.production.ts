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
