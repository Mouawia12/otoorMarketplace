"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.torodRequest = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const errors_1 = require("./errors");
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;
const client = axios_1.default.create({
    baseURL: env_1.config.torod.baseUrl,
    timeout: 20000,
    headers: {
        Accept: "application/json",
    },
});
const authClient = axios_1.default.create({
    baseURL: env_1.config.torod.baseUrl,
    timeout: 20000,
    headers: {
        Accept: "application/json",
    },
});
const DEFAULT_TOKEN_TTL_MS = 45 * 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 30 * 1000;
let cachedToken = null;
let tokenPromise = null;
const asRecord = (value) => value && typeof value === "object" ? value : {};
const pickString = (...values) => values.find((value) => typeof value === "string" && value.trim().length > 0);
const resolveToken = (payload) => {
    const data = asRecord(payload);
    const nested = asRecord(data.data ?? data.result);
    return pickString(data.access_token, data.bearer_token, data.token, data.accessToken, nested.access_token, nested.bearer_token, nested.token, nested.accessToken);
};
const resolveExpiry = (payload) => {
    const data = asRecord(payload);
    const nested = asRecord(data.data ?? data.result);
    const expiresIn = data.expires_in ??
        data.expiresIn ??
        nested.expires_in ??
        nested.expiresIn ??
        data.expiry_in ??
        data.expiryIn;
    if (expiresIn !== undefined) {
        const seconds = Number(expiresIn);
        if (!Number.isNaN(seconds)) {
            return Date.now() + seconds * 1000;
        }
    }
    const expiresAt = data.expires_at ??
        data.expiresAt ??
        nested.expires_at ??
        nested.expiresAt;
    if (typeof expiresAt === "number") {
        return expiresAt > 1e12 ? expiresAt : expiresAt * 1000;
    }
    if (typeof expiresAt === "string") {
        const asNumber = Number(expiresAt);
        if (!Number.isNaN(asNumber)) {
            return asNumber > 1e12 ? asNumber : asNumber * 1000;
        }
        const parsed = Date.parse(expiresAt);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return undefined;
};
const fetchToken = async () => {
    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: env_1.config.torod.clientId,
        client_secret: env_1.config.torod.clientSecret,
    });
    const response = await authClient.post("/token", body.toString(), {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            "Client-Id": env_1.config.torod.clientId,
        },
    });
    const token = resolveToken(response.data);
    if (!token) {
        throw errors_1.AppError.unauthorized("Torod token response is missing access token");
    }
    const expiresAt = resolveExpiry(response.data) ?? Date.now() + DEFAULT_TOKEN_TTL_MS;
    cachedToken = {
        value: token,
        expiresAt,
    };
    return token;
};
const getAccessToken = async () => {
    if (cachedToken &&
        Date.now() < cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
        return cachedToken.value;
    }
    if (!tokenPromise) {
        tokenPromise = fetchToken().finally(() => {
            tokenPromise = null;
        });
    }
    return tokenPromise;
};
const invalidateToken = () => {
    cachedToken = null;
};
client.interceptors.request.use(async (request) => {
    const headers = request.headers ?? {};
    const token = await getAccessToken();
    headers.Authorization = `Bearer ${token}`;
    headers["Client-Id"] = env_1.config.torod.clientId;
    if (!headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = "application/json";
    }
    request.headers = headers;
    return request;
});
const delay = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
const extractPayload = (response) => {
    const payload = response.data;
    if (payload && typeof payload === "object") {
        if ("data" in payload && payload.data !== undefined) {
            return payload.data;
        }
        if ("result" in payload && payload.result !== undefined) {
            return payload.result;
        }
    }
    return payload;
};
const normalizeApiMessage = (value, fallback) => {
    if (typeof value === "string" && value.trim().length > 0) {
        return value;
    }
    if (value && typeof value === "object") {
        const record = value;
        const first = Object.values(record).find((item) => typeof item === "string");
        if (typeof first === "string" && first.trim().length > 0) {
            return first;
        }
    }
    return fallback;
};
const toAppError = (message, statusCode, details) => {
    switch (statusCode) {
        case 400:
            return errors_1.AppError.badRequest(message, details);
        case 401:
            return errors_1.AppError.unauthorized(message);
        case 403:
            return errors_1.AppError.forbidden(message);
        case 404:
            return errors_1.AppError.notFound(message);
        default:
            return new errors_1.AppError(message, statusCode, details);
    }
};
const torodRequest = async (request, attempt = 1) => {
    try {
        const response = await client.request(request);
        const payload = response.data;
        if (payload?.success === false) {
            const message = normalizeApiMessage(payload?.message || payload?.error, "Torod request was rejected");
            throw toAppError(message, response.status || 400, payload);
        }
        return extractPayload(response);
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        if (axios_1.default.isAxiosError(error)) {
            const statusCode = error.response?.status;
            if (error.code === "ECONNABORTED") {
                throw toAppError("Torod request timed out", 504);
            }
            if (statusCode === 401 && attempt < MAX_ATTEMPTS) {
                invalidateToken();
                return (0, exports.torodRequest)(request, attempt + 1);
            }
            if (statusCode &&
                statusCode >= 500 &&
                statusCode < 600 &&
                attempt < MAX_ATTEMPTS) {
                const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
                await delay(delayMs);
                return (0, exports.torodRequest)(request, attempt + 1);
            }
            const apiMessage = normalizeApiMessage(error.response?.data?.message ||
                error.response?.data?.error, error.message);
            throw toAppError(apiMessage || "Torod request failed", statusCode || 500, error.response?.data);
        }
        throw errors_1.AppError.internal("Torod request failed", error);
    }
};
exports.torodRequest = torodRequest;
//# sourceMappingURL=torodClient.js.map