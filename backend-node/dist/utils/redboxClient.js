"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redboxRequest = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const errors_1 = require("./errors");
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;
const client = axios_1.default.create({
    baseURL: env_1.config.redbox.baseUrl,
    timeout: 10000,
});
console.log("RedBox Base URL:", env_1.config.redbox.baseUrl);
client.interceptors.request.use((request) => {
    const headers = request.headers ?? {};
    headers.Authorization = `Bearer ${env_1.config.redbox.token}`;
    if (env_1.config.redbox.businessId) {
        headers["business-id"] = env_1.config.redbox.businessId;
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
const normalizeStatusCode = (payload, fallback) => {
    const explicitCode = typeof payload.response_code === "number"
        ? payload.response_code
        : typeof payload.code === "number"
            ? payload.code
            : undefined;
    return explicitCode ?? fallback;
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
const redboxRequest = async (request, attempt = 1) => {
    try {
        const response = await client.request(request);
        const payload = response.data;
        const statusCode = normalizeStatusCode(payload, response.status);
        const successFlag = payload?.success;
        if (successFlag === false || statusCode >= 400) {
            const message = payload?.msg ||
                payload?.message ||
                `RedBox request failed with status ${statusCode}`;
            throw toAppError(message, statusCode);
        }
        return extractPayload(response);
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        if (axios_1.default.isAxiosError(error)) {
            const statusCode = error.response?.status;
            if (statusCode &&
                statusCode >= 500 &&
                statusCode < 600 &&
                attempt < MAX_ATTEMPTS) {
                const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
                await delay(delayMs);
                return (0, exports.redboxRequest)(request, attempt + 1);
            }
            if (statusCode === 401) {
                throw errors_1.AppError.unauthorized("RedBox authentication failed");
            }
            if (statusCode === 403) {
                throw errors_1.AppError.forbidden("RedBox access forbidden");
            }
            const apiMessage = error.response?.data?.msg ||
                error.response?.data?.message ||
                error.message;
            throw toAppError(apiMessage || "RedBox request failed", statusCode || 500, error.response?.data);
        }
        throw errors_1.AppError.internal("RedBox request failed", error);
    }
};
exports.redboxRequest = redboxRequest;
//# sourceMappingURL=redboxClient.js.map