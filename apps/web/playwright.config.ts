import { defineConfig, devices } from '@playwright/test';

const LOCAL_WEB_URL = 'http://localhost:3100';
const LOCAL_API_URL = 'http://localhost:8181';
const STAGING_WEB_URL = 'https://staging.billing.vcorganics.com';
const STAGING_API_URL = 'https://api-staging.vcorganics.com';
const PRODUCTION_WEB_URL = 'https://billing.vcorganics.com';
const PRODUCTION_API_URL = 'https://api.vcorganics.com';

function cleanUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  const markdownMatch = trimmed.match(/^\[(https?:\/\/[^\]]+)\]\(https?:\/\/[^\)]+\)$/);
  return (markdownMatch?.[1] || trimmed).replace(/\/+$/, '');
}

function configuredEnvironment(): string {
  return (
    process.env.PLAYWRIGHT_ENV ||
    process.env.TEST_ENV ||
    process.env.E2E_ENV ||
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.NEXT_PUBLIC_DEPLOY_ENV ||
    process.env.NEXT_PUBLIC_ENVIRONMENT ||
    process.env.APP_ENV ||
    process.env.DEPLOY_ENV ||
    process.env.VERCEL_ENV ||
    ''
  ).toLowerCase();
}

function isLocalUrl(url: string): boolean {
  const parsed = new URL(url);
  return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
}

function inferApiBaseUrl(baseURL: string, environment: string): string {
  const explicitApiUrl = cleanUrl(process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || process.env.REAL_AUTH_API_BASE_URL);
  if (explicitApiUrl) return explicitApiUrl;
  if (environment === 'staging' || baseURL === STAGING_WEB_URL) return STAGING_API_URL;
  if (environment === 'production' || baseURL === PRODUCTION_WEB_URL) return PRODUCTION_API_URL;
  if (isLocalUrl(baseURL)) return LOCAL_API_URL;

  throw new Error(
    `[Playwright config] Missing API base URL for remote E2E target '${baseURL}'. Set NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_API_URL explicitly.`
  );
}

function resolveE2EEnvironment() {
  const explicitBaseURL = cleanUrl(process.env.PLAYWRIGHT_BASE_URL || process.env.TEST_BASE_URL);
  const environment = configuredEnvironment();

  let baseURL: string;
  let resolvedEnvironment: 'local' | 'staging' | 'production' | 'custom';

  if (explicitBaseURL) {
    baseURL = explicitBaseURL;
    if (baseURL === STAGING_WEB_URL) resolvedEnvironment = 'staging';
    else if (baseURL === PRODUCTION_WEB_URL) resolvedEnvironment = 'production';
    else if (isLocalUrl(baseURL)) resolvedEnvironment = 'local';
    else resolvedEnvironment = 'custom';
  } else if (environment === 'staging') {
    baseURL = STAGING_WEB_URL;
    resolvedEnvironment = 'staging';
  } else if (environment === 'production') {
    baseURL = PRODUCTION_WEB_URL;
    resolvedEnvironment = 'production';
  } else if (!environment || environment === 'development' || environment === 'local' || environment === 'test') {
    baseURL = LOCAL_WEB_URL;
    resolvedEnvironment = 'local';
  } else {
    throw new Error(
      `[Playwright config] Ambiguous E2E environment '${environment}'. Set PLAYWRIGHT_BASE_URL, TEST_BASE_URL, or PLAYWRIGHT_ENV=staging|production|local.`
    );
  }

  const apiBaseURL = inferApiBaseUrl(baseURL, resolvedEnvironment);
  if (resolvedEnvironment === 'staging' && apiBaseURL === PRODUCTION_API_URL) {
    throw new Error(
      `[Playwright config] Staging E2E cannot use production API '${PRODUCTION_API_URL}'. Set NEXT_PUBLIC_API_BASE_URL=${STAGING_API_URL}.`
    );
  }
  if (resolvedEnvironment === 'production' && apiBaseURL === STAGING_API_URL) {
    throw new Error(
      `[Playwright config] Production E2E cannot use staging API '${STAGING_API_URL}'. Set NEXT_PUBLIC_API_BASE_URL=${PRODUCTION_API_URL}.`
    );
  }
  const useLocalWebServer = resolvedEnvironment === 'local';

  console.log(`[Playwright config] PLAYWRIGHT BASE URL: ${baseURL}`);
  console.log(`[Playwright config] API BASE URL: ${apiBaseURL}`);
  console.log(`[Playwright config] ENVIRONMENT: ${resolvedEnvironment}`);

  return { baseURL, apiBaseURL, useLocalWebServer };
}

const e2eEnvironment = resolveE2EEnvironment();

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: process.env.REAL_AUTH_RBAC_E2E === '1' ? [] : ['**/*.real-auth.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: e2eEnvironment.baseURL,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: e2eEnvironment.useLocalWebServer
    ? {
        command: 'npx next dev --port 3100',
        url: LOCAL_WEB_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        env: {
          ...process.env,
          NEXT_PUBLIC_API_BASE_URL: e2eEnvironment.apiBaseURL,
          NEXT_PUBLIC_API_URL: e2eEnvironment.apiBaseURL,
          NEXT_PUBLIC_APP_ENV: 'local'
        }
      }
    : undefined
});
