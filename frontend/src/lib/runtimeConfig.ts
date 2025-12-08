const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const stripApiSuffix = (value: string) =>
  stripTrailingSlash(value).replace(/\/api$/i, '');

const KNOWN_PROD_HOSTS = new Set([
  'fragraworld.com',
  'www.fragraworld.com',
]);

const getConfiguredApiBase = () =>
  import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? null;

const detectHostedApiBase = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:8080/api';
  }

  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8080/api';
  }

  if (KNOWN_PROD_HOSTS.has(host)) {
    return 'https://api.fragraworld.com/api';
  }

  return `${window.location.origin}/api`;
};

const resolveApiBase = () => {
  const configured = getConfiguredApiBase();
  if (configured) {
    return stripTrailingSlash(configured);
  }

  const detected = detectHostedApiBase();
  if (detected) {
    return stripTrailingSlash(detected);
  }

  return 'http://localhost:8080/api';
};

const apiBaseUrl = resolveApiBase();

const resolveAssetBase = () => {
  const configuredAsset = import.meta.env.VITE_ASSET_BASE_URL;
  if (configuredAsset) {
    return stripTrailingSlash(configuredAsset);
  }

  return stripApiSuffix(apiBaseUrl);
};

const assetBaseUrl = resolveAssetBase();

type ImageOptimizationConfig = {
  enabled: boolean;
  template?: string;
  bypassHosts: Set<string>;
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return !['false', '0', 'no', 'off'].includes(normalized);
};

const parseHosts = (value?: string) =>
  value
    ? value
        .split(',')
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean)
    : [];

const defaultOptimizerTemplate =
  'https://wsrv.nl/?url={{url}}&w=900&h=900&fit=cover&output=webp&q=80';

const imageOptimizerConfig: ImageOptimizationConfig = (() => {
  const enabled = parseBoolean(
    import.meta.env.VITE_IMAGE_OPTIMIZER_ENABLED,
    true
  );
  const template =
    import.meta.env.VITE_IMAGE_OPTIMIZER_TEMPLATE?.trim() ||
    defaultOptimizerTemplate;
  const bypassHosts = new Set(parseHosts(import.meta.env.VITE_IMAGE_OPTIMIZER_BYPASS));

  if (!enabled || !template.includes('{{url}}')) {
    return { enabled: false, template: undefined, bypassHosts };
  }

  return {
    enabled: true,
    template,
    bypassHosts,
  };
})();

export const getResolvedApiBaseUrl = () => apiBaseUrl;
export const getResolvedAssetBaseUrl = () => assetBaseUrl;
export const getImageOptimizationConfig = () => imageOptimizerConfig;
