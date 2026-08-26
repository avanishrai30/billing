import { normalizePublicAssetUrl, normalizeUserAvatarUrl } from '../../lib/utils/media';
import { getApiBaseUrl } from '../../lib/api/client';

describe('Public Media & Brand Asset URL Resolver', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('1. Returns null for null, undefined, empty, or whitespace strings', () => {
    expect(normalizePublicAssetUrl(null)).toBeNull();
    expect(normalizePublicAssetUrl(undefined)).toBeNull();
    expect(normalizePublicAssetUrl('')).toBeNull();
    expect(normalizePublicAssetUrl('   ')).toBeNull();
  });

  it('2. Leaves absolute HTTP and HTTPS URLs unchanged', () => {
    expect(normalizePublicAssetUrl('https://cdn.vcorganics.com/logos/main.webp')).toBe(
      'https://cdn.vcorganics.com/logos/main.webp'
    );
    expect(normalizePublicAssetUrl('http://example.com/static/brand.png')).toBe(
      'http://example.com/static/brand.png'
    );
    expect(normalizePublicAssetUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=')).toBe(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE='
    );
  });

  it('3. Prepends API base URL to root-relative paths (/uploads/logos/...)', () => {
    const apiBase = getApiBaseUrl().replace(/\/+$/, '');
    const resolved = normalizePublicAssetUrl('/uploads/logos/vcorganic-logo.webp');
    expect(resolved).toBe(`${apiBase}/uploads/logos/vcorganic-logo.webp`);
    expect(resolved).toMatch(/^https?:\/\//);
  });

  it('4. Prepends API base URL to relative paths without leading slash (uploads/logos/...)', () => {
    const apiBase = getApiBaseUrl().replace(/\/+$/, '');
    const resolved = normalizePublicAssetUrl('uploads/logos/vcorganic-logo.webp');
    expect(resolved).toBe(`${apiBase}/uploads/logos/vcorganic-logo.webp`);
  });

  it('5. Respects NEXT_PUBLIC_API_BASE_URL environment variable', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.vcorganics.com';
    const resolved = normalizePublicAssetUrl('/uploads/logos/custom-tenant.webp');
    expect(resolved).toBe('https://api.vcorganics.com/uploads/logos/custom-tenant.webp');
  });

  it('6. Rejects malicious javascript: schemes and directory traversals', () => {
    expect(normalizePublicAssetUrl('javascript:alert(1)')).toBeNull();
    expect(normalizePublicAssetUrl('vbscript:msgbox(1)')).toBeNull();
    expect(normalizePublicAssetUrl('/uploads/../etc/passwd')).toBeNull();
    expect(normalizePublicAssetUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('7. normalizeUserAvatarUrl appends deterministic version parameter for cache-busting', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api-staging.vcorganics.com';
    const version = '2026-08-26T12:00:00.000Z';
    const resolved = normalizeUserAvatarUrl('/uploads/users/rajesh-1723321234.webp', version);
    expect(resolved).toBe(`https://api-staging.vcorganics.com/uploads/users/rajesh-1723321234.webp?v=${encodeURIComponent(version)}`);
  });

  it('8. normalizeUserAvatarUrl does not duplicate version parameter if already present', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.vcorganics.com';
    const resolved = normalizeUserAvatarUrl('/uploads/users/user.webp?v=123', '456');
    expect(resolved).toBe('https://api.vcorganics.com/uploads/users/user.webp?v=123');
  });

  it('9. normalizeUserAvatarUrl preserves data and blob URLs without query strings', () => {
    const dataUrl = 'data:image/webp;base64,UklGRmQAAABXRUJQVlA4...';
    expect(normalizeUserAvatarUrl(dataUrl, '123')).toBe(dataUrl);
    const blobUrl = 'blob:http://localhost:3000/1234-5678';
    expect(normalizeUserAvatarUrl(blobUrl, '123')).toBe(blobUrl);
  });
});
