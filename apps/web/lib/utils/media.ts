import { getApiBaseUrl } from '../api/client';

/**
 * Normalizes public asset media URLs (such as tenant logos, product images)
 * to always resolve against the authoritative backend API origin rather than
 * the client application domain.
 *
 * Behavior:
 * 1. Absolute URLs (http://, https://, data:, blob:) -> return unchanged.
 * 2. Root-relative URLs (/uploads/logos/...) -> prepend getApiBaseUrl().
 * 3. Relative URLs (uploads/logos/...) -> prepend getApiBaseUrl() + "/".
 * 4. Empty/null/undefined -> return null.
 */
export function normalizePublicAssetUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  // If already absolute or special schema
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');

  if (trimmed.startsWith('/')) {
    return `${baseUrl}${trimmed}`;
  }

  return `${baseUrl}/${trimmed}`;
}
