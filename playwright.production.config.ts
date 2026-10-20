import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: '**/*.production.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3001', serviceWorkers: 'block' },
  webServer: {
    command: 'npx vite preview --host 0.0.0.0 --port 3001 --strictPort',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: false,
  },
});
