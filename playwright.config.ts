import './scripts/test-browser.mjs';
import { defineConfig, devices } from '@playwright/test';
import chromium from '@sparticuz/chromium';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    ...devices['iPhone 13'],
    defaultBrowserType: 'chromium',
    launchOptions: {
      executablePath: process.platform === 'linux' ? await chromium.executablePath() : undefined,
      args: process.platform === 'linux' ? chromium.args.filter(arg => arg !== '--single-process') : [],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
});
