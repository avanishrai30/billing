import { resolveApiBaseUrl } from '../../lib/api/client';

describe('API environment isolation', () => {
  it('uses NEXT_PUBLIC_API_BASE_URL when configured', () => {
    expect(resolveApiBaseUrl({
      env: {
        NEXT_PUBLIC_API_BASE_URL: 'https://api-staging.vcorganics.com/'
      },
      hostname: 'staging.billing.vcorganics.com'
    })).toBe('https://api-staging.vcorganics.com');
  });

  it('defaults explicit staging environment to the staging API', () => {
    expect(resolveApiBaseUrl({
      env: {
        NEXT_PUBLIC_APP_ENV: 'staging'
      },
      hostname: 'unknown.example.com'
    })).toBe('https://api-staging.vcorganics.com');
  });

  it('defaults explicit production environment to the production API', () => {
    expect(resolveApiBaseUrl({
      env: {
        NEXT_PUBLIC_APP_ENV: 'production'
      },
      hostname: 'unknown.example.com'
    })).toBe('https://api.vcorganics.com');
  });

  it('maps known staging and production hostnames without cross-environment fallback', () => {
    expect(resolveApiBaseUrl({ env: {}, hostname: 'staging.billing.vcorganics.com' }))
      .toBe('https://api-staging.vcorganics.com');
    expect(resolveApiBaseUrl({ env: {}, hostname: 'billing.vcorganics.com' }))
      .toBe('https://api.vcorganics.com');
  });

  it('keeps local development on the local backend', () => {
    expect(resolveApiBaseUrl({ env: {}, hostname: 'localhost' })).toBe('http://localhost:8181');
    expect(resolveApiBaseUrl({ env: {}, hostname: '127.0.0.1' })).toBe('http://localhost:8181');
  });

  it('does not silently return production for an undefined remote environment', () => {
    expect(() => resolveApiBaseUrl({
      env: {},
      hostname: 'preview.billing.example.com'
    })).toThrow(/Missing API environment configuration/);
  });
});
