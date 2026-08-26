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
/**
 * Validates if an absolute URL is a safe, allowed scheme (http, https, blob, data for inline images).
 * Explicitly rejects javascript:, file:, data:text/html, etc.
 */
function isSafeAbsoluteMediaUrl(url: string): boolean {
  if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('blob:')) {
    return true;
  }
  if (url.startsWith('data:image/')) {
    return true;
  }
  return false;
}

/**
 * Normalizes public asset media URLs (such as tenant logos, product images)
 * to always resolve against the authoritative backend API origin rather than
 * the client application domain.
 *
 * Behavior:
 * 1. Absolute URLs (http://, https://, data:image/..., blob:) -> return unchanged.
 * 2. Root-relative URLs (/uploads/logos/...) -> prepend getApiBaseUrl().
 * 3. Relative URLs (uploads/logos/...) -> prepend getApiBaseUrl() + "/".
 * 4. Dangerous schemes / path traversal -> return null.
 * 5. Empty/null/undefined -> return null.
 */
export function normalizePublicAssetUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  // Reject malicious schemes and path traversal attempts
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html') ||
    trimmed.includes('../') ||
    trimmed.includes('..\\')
  ) {
    return null;
  }

  // If already absolute or special schema
  if (isSafeAbsoluteMediaUrl(trimmed)) {
    return trimmed;
  }

  // If starts with another untrusted scheme (e.g. file:, ftp:), reject
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return null;
  }

  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');

  if (trimmed.startsWith('/')) {
    return `${baseUrl}${trimmed}`;
  }

  return `${baseUrl}/${trimmed}`;
}

/**
 * Normalizes user avatar URLs with environment isolation, security validation,
 * and deterministic timestamp/version cache busting.
 *
 * Version parameter can be avatarUpdatedAt or updatedAt timestamp.
 * Deterministic version query param is only appended for non-data/non-blob URLs.
 */
export function normalizeUserAvatarUrl(
  avatar?: string | null,
  version?: string | number | null
): string | null {
  const baseResolved = normalizePublicAssetUrl(avatar);
  if (!baseResolved) {
    return null;
  }

  // If data: or blob:, do not append query string
  if (baseResolved.startsWith('data:') || baseResolved.startsWith('blob:')) {
    return baseResolved;
  }

  if (version !== undefined && version !== null && String(version).trim().length > 0) {
    const versionStr = String(version).trim();
    // Only append if url doesn't already have a version query param
    if (!baseResolved.includes('?v=') && !baseResolved.includes('&v=')) {
      const separator = baseResolved.includes('?') ? '&' : '?';
      return `${baseResolved}${separator}v=${encodeURIComponent(versionStr)}`;
    }
  }

  return baseResolved;
}
