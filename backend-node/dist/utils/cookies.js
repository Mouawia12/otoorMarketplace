"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCookies = void 0;
const parseCookies = (cookieHeader) => {
    const cookies = {};
    if (!cookieHeader) {
        return cookies;
    }
    const parts = cookieHeader.split(";");
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) {
            continue;
        }
        const equalsIndex = trimmed.indexOf("=");
        if (equalsIndex === -1) {
            continue;
        }
        const key = trimmed.slice(0, equalsIndex).trim();
        const value = trimmed.slice(equalsIndex + 1).trim();
        if (!key) {
            continue;
        }
        cookies[key] = decodeURIComponent(value);
    }
    return cookies;
};
exports.parseCookies = parseCookies;
//# sourceMappingURL=cookies.js.map