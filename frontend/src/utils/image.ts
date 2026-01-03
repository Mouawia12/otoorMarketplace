import { getResolvedAssetBaseUrl, getImageOptimizationConfig } from '../lib/runtimeConfig';
import { resolveStaticAssetUrl } from './staticAssets';

let cachedBaseUrl: string | null = null;
let cachedOptimizerConfig: ReturnType<typeof getImageOptimizationConfig> | null = null;

export const getAssetBaseUrl = () => {
  if (!cachedBaseUrl) {
    cachedBaseUrl = getResolvedAssetBaseUrl();
  }
  return cachedBaseUrl;
};

const getOptimizerConfig = () => {
  if (!cachedOptimizerConfig) {
    cachedOptimizerConfig = getImageOptimizationConfig();
  }
  return cachedOptimizerConfig;
};

const isLocalhostUrl = (url: string) =>
  /^http:\/\/(localhost|127\.0\.0\.1)/i.test(url);

type ResolveImageOptions = {
  disableOptimization?: boolean;
  fit?: 'cover' | 'contain';
};

const applyImageOptimization = (url: string, options?: ResolveImageOptions) => {
  if (options?.disableOptimization) {
    return url;
  }
  const config = getOptimizerConfig();
  if (!config.enabled || !config.template) {
    return url;
  }

  if (!/^https?:\/\//i.test(url) || /^data:/i.test(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (config.bypassHosts.has(host)) {
      return url;
    }
  } catch {
    return url;
  }

  let template = config.template;
  if (options?.fit) {
    template = template.replace(/([?&]fit=)[^&]+/i, `$1${options.fit}`);
  }
  return template.replace('{{url}}', encodeURIComponent(url));
};

export const resolveImageUrl = (input?: string | null, options?: ResolveImageOptions) => {
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
        const resolved = `${getAssetBaseUrl()}${parsed.pathname}`;
        return applyImageOptimization(resolved, options);
      } catch {
        return applyImageOptimization(value, options);
      }
    }
    return applyImageOptimization(value, options);
  }

  const prefix = value.startsWith('/') ? '' : '/';
  const resolved = `${getAssetBaseUrl()}${prefix}${value}`;
  return applyImageOptimization(resolved, options);
};

export const resolveProductImageUrl = (input?: string | null, options?: ResolveImageOptions) =>
  resolveImageUrl(input, { ...options, fit: options?.fit ?? 'contain' });

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
