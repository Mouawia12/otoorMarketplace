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

export const getResolvedApiBaseUrl = () => apiBaseUrl;
export const getResolvedAssetBaseUrl = () => assetBaseUrl;
