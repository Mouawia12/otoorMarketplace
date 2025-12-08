import { getResolvedAssetBaseUrl } from '../lib/runtimeConfig';
import { resolveStaticAssetUrl } from './staticAssets';

let cachedBaseUrl: string | null = null;

export const getAssetBaseUrl = () => {
  if (!cachedBaseUrl) {
    cachedBaseUrl = getResolvedAssetBaseUrl();
  }
  return cachedBaseUrl;
};

const isLocalhostUrl = (url: string) =>
  /^http:\/\/(localhost|127\.0\.0\.1)/i.test(url);

export const resolveImageUrl = (input?: string | null) => {
  if (!input) return '';
  const value = input.trim();
  if (!value) return '';

  const staticAsset = resolveStaticAssetUrl(value);
  if (staticAsset !== value) {
    return staticAsset;
  }

  if (/^https?:\/\//i.test(value)) {
    if (isLocalhostUrl(value)) {
      try {
        const parsed = new URL(value);
        return `${getAssetBaseUrl()}${parsed.pathname}`;
      } catch {
        return value;
      }
    }
    return value;
  }

  const prefix = value.startsWith('/') ? '' : '/';
  return `${getAssetBaseUrl()}${prefix}${value}`;
};

export const normalizeImagePathForStorage = (input?: string | null) => {
  if (!input) return undefined;
  const value = input.trim();
  if (!value) return undefined;
  if (isLocalhostUrl(value)) {
    try {
      const parsed = new URL(value);
      return parsed.pathname;
    } catch {
      return value;
    }
  }
  return value;
};
