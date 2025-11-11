"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeImagePathForStorage = exports.toPublicAssetUrl = void 0;
const env_1 = require("../config/env");
const assetBaseUrl = env_1.config.assetBaseUrl || "http://localhost:8080";
const stripTrailingSlash = (value) => value.replace(/\/+$/, "");
const stripLeadingSlash = (value) => value.replace(/^\/+/, "/");
const normalizedBase = stripTrailingSlash(assetBaseUrl);
const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);
const isLocalhostUrl = (value) => /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(value);
const toPublicAssetUrl = (input) => {
    if (!input)
        return input ?? "";
    const trimmed = input.trim();
    if (!trimmed)
        return "";
    if (isAbsoluteUrl(trimmed)) {
        if (isLocalhostUrl(trimmed)) {
            try {
                const parsed = new URL(trimmed);
                return `${normalizedBase}${parsed.pathname}`;
            }
            catch {
                return trimmed;
            }
        }
        return trimmed;
    }
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${normalizedBase}${path}`;
};
exports.toPublicAssetUrl = toPublicAssetUrl;
const normalizeImagePathForStorage = (input) => {
    if (!input)
        return undefined;
    const trimmed = input.trim();
    if (!trimmed)
        return undefined;
    if (isAbsoluteUrl(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            return parsed.pathname || "/";
        }
        catch {
            return trimmed;
        }
    }
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};
exports.normalizeImagePathForStorage = normalizeImagePathForStorage;
//# sourceMappingURL=assets.js.map