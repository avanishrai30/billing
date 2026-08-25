import { defineConfig } from '@playwright/test';
import webConfig from './apps/web/playwright.config';

const config = webConfig as any;

export default defineConfig({
  ...config,
  testDir: './apps/web/tests/e2e',
  webServer: config.webServer
    ? {
        ...config.webServer,
        command: 'cd apps/web && npx next dev --port 3100'
      }
    : undefined
});
