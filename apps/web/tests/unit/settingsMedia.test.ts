import { normalizePublicAssetUrl } from '../../lib/utils/media';

describe('Settings Media Resolution Suite', () => {
  it('1. Returns null for falsy/empty values', () => {
    expect(normalizePublicAssetUrl('')).toBeNull();
    expect(normalizePublicAssetUrl(undefined as any)).toBeNull();
    expect(normalizePublicAssetUrl(null as any)).toBeNull();
  });

  it('2. Preserves absolute HTTP/HTTPS URLs', () => {
    const url = 'https://cdn.example.com/images/logo.webp';
    expect(normalizePublicAssetUrl(url)).toBe(url);
  });

  it('3. Preserves Data URIs', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ';
    expect(normalizePublicAssetUrl(dataUri)).toBe(dataUri);
  });

  it('4. Resolves root-relative /uploads/ paths to API origin', () => {
    const relativePath = '/uploads/logos/brand-logo.webp';
    const resolved = normalizePublicAssetUrl(relativePath);
    expect(resolved).toMatch(/^https?:\/\//);
    expect(resolved).toContain('/uploads/logos/brand-logo.webp');
  });

  it('5. Handles relative paths without leading slash', () => {
    const path = 'uploads/logos/brand-logo.webp';
    const resolved = normalizePublicAssetUrl(path);
    expect(resolved).toMatch(/^https?:\/\//);
    expect(resolved).toContain('/uploads/logos/brand-logo.webp');
  });
});
