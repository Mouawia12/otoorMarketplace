import { config } from "../config/env";

const assetBaseUrl = config.assetBaseUrl || "http://localhost:8080";

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const stripLeadingSlash = (value: string) => value.replace(/^\/+/, "/");

const normalizedBase = stripTrailingSlash(assetBaseUrl);

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);
const isLocalhostUrl = (value: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(value);
const assetHost = (() => {
  try {
    return new URL(normalizedBase).hostname.toLowerCase();
  } catch {
    return "";
  }
})();

const isAssetHostUrl = (value: string) => {
  if (!assetHost) return false;
  try {
    return new URL(value).hostname.toLowerCase() === assetHost;
  } catch {
    return false;
  }
};

export const toPublicAssetUrl = (input?: string | null) => {
  if (!input) return input ?? "";
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (isAbsoluteUrl(trimmed)) {
    if (isLocalhostUrl(trimmed)) {
      try {
        const parsed = new URL(trimmed);
        return `${normalizedBase}${parsed.pathname}`;
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${normalizedBase}${path}`;
};

export const normalizeImagePathForStorage = (input?: string | null) => {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  if (isAbsoluteUrl(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (isLocalhostUrl(trimmed) || isAssetHostUrl(trimmed)) {
        return parsed.pathname || "/";
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};
