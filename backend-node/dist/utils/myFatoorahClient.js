"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.myFatoorahRequest = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const errors_1 = require("./errors");
const client = axios_1.default.create({
    baseURL: env_1.config.myfatoorah.baseUrl,
    timeout: 15000,
});
client.interceptors.request.use((request) => {
    const headers = request.headers ?? {};
    headers.Authorization = `Bearer ${env_1.config.myfatoorah.apiToken}`;
    headers["Content-Type"] = "application/json";
    headers.Accept = "application/json";
    request.headers = headers;
    return request;
});
const extractMessage = (payload) => {
    if (payload.Message && payload.Message.trim().length > 0) {
        return payload.Message;
    }
    const errors = payload.ValidationErrors ?? [];
    const combined = errors
        .map((error) => [error.Name, error.Error].filter(Boolean).join(": "))
        .filter(Boolean);
    return combined.length > 0 ? combined.join(" | ") : undefined;
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
const unwrapPayload = (response) => {
    const payload = response.data;
    if (payload && typeof payload === "object" && "Data" in payload) {
        return payload.Data;
    }
    return payload;
};
const myFatoorahRequest = async (request) => {
    try {
        const response = await client.request(request);
        const payload = response.data;
        if (payload?.IsSuccess === false) {
            const message = extractMessage(payload) || "MyFatoorah request was rejected";
            throw toAppError(message, response.status || 400, payload);
        }
        return unwrapPayload(response);
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        if (axios_1.default.isAxiosError(error)) {
            const statusCode = error.response?.status ?? 500;
            const payload = error.response?.data;
            const apiMessage = (payload && extractMessage(payload)) || error.message || "MyFatoorah request failed";
            throw toAppError(apiMessage, statusCode, payload);
        }
        throw errors_1.AppError.internal("MyFatoorah request failed", error);
    }
};
exports.myFatoorahRequest = myFatoorahRequest;
//# sourceMappingURL=myFatoorahClient.js.map