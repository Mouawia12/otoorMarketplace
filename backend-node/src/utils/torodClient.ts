import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

import { config } from "../config/env";
import { AppError } from "./errors";

type TorodApiResponse<T> = {
  data?: T;
  result?: T;
  message?: string;
  error?: string;
  errors?: unknown;
  success?: boolean;
} & Partial<T>;

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;

const client = axios.create({
  baseURL: config.torod.baseUrl,
  timeout: 10000,
});

const authClient = axios.create({
  baseURL: config.torod.baseUrl,
  timeout: 10000,
});

const DEFAULT_TOKEN_TTL_MS = 45 * 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 30 * 1000;

let cachedToken: { value: string; expiresAt: number } | null = null;
let tokenPromise: Promise<string> | null = null;

const asRecord = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const pickString = (...values: Array<unknown>) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0) as
    | string
    | undefined;

const resolveToken = (payload: unknown) => {
  const data = asRecord(payload);
  const nested = asRecord(data.data ?? data.result);
  return pickString(
    data.access_token,
    data.bearer_token,
    data.token,
    data.accessToken,
    nested.access_token,
    nested.bearer_token,
    nested.token,
    nested.accessToken
  );
};

const resolveExpiry = (payload: unknown) => {
  const data = asRecord(payload);
  const nested = asRecord(data.data ?? data.result);
  const expiresIn =
    data.expires_in ??
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

  const expiresAt =
    data.expires_at ??
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
    client_id: config.torod.clientId,
    client_secret: config.torod.clientSecret,
  });
  const response = await authClient.post("/token", body.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "Client-Id": config.torod.clientId,
    },
  });
  const token = resolveToken(response.data);

  if (!token) {
    throw AppError.unauthorized("Torod token response is missing access token");
  }

  const expiresAt =
    resolveExpiry(response.data) ?? Date.now() + DEFAULT_TOKEN_TTL_MS;
  cachedToken = {
    value: token,
    expiresAt,
  };
  return token;
};

const getAccessToken = async () => {
  if (
    cachedToken &&
    Date.now() < cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS
  ) {
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
  headers["Client-Id"] = config.torod.clientId;
  headers["Content-Type"] = "application/json";
  request.headers = headers;
  return request;
});

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const extractPayload = <T>(response: AxiosResponse<TorodApiResponse<T>>) => {
  const payload = response.data;
  if (payload && typeof payload === "object") {
    if ("data" in payload && payload.data !== undefined) {
      return payload.data as T;
    }
    if ("result" in payload && payload.result !== undefined) {
      return payload.result as T;
    }
  }
  return payload as unknown as T;
};

const toAppError = (message: string, statusCode: number, details?: unknown) => {
  switch (statusCode) {
    case 400:
      return AppError.badRequest(message, details);
    case 401:
      return AppError.unauthorized(message);
    case 403:
      return AppError.forbidden(message);
    case 404:
      return AppError.notFound(message);
    default:
      return new AppError(message, statusCode, details);
  }
};

export const torodRequest = async <T>(
  request: AxiosRequestConfig,
  attempt = 1
): Promise<T> => {
  try {
    const response = await client.request<TorodApiResponse<T>>(request);
    const payload = response.data;

    if (payload?.success === false) {
      const message =
        payload?.message || payload?.error || "Torod request was rejected";
      throw toAppError(message, response.status || 400, payload);
    }

    return extractPayload(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;

      if (statusCode === 401 && attempt < MAX_ATTEMPTS) {
        invalidateToken();
        return torodRequest<T>(request, attempt + 1);
      }

      if (
        statusCode &&
        statusCode >= 500 &&
        statusCode < 600 &&
        attempt < MAX_ATTEMPTS
      ) {
        const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        await delay(delayMs);
        return torodRequest<T>(request, attempt + 1);
      }

      const apiMessage =
        (error.response?.data as { message?: string; error?: string })?.message ||
        (error.response?.data as { message?: string; error?: string })?.error ||
        error.message;

      throw toAppError(
        apiMessage || "Torod request failed",
        statusCode || 500,
        error.response?.data
      );
    }

    throw AppError.internal("Torod request failed", error);
  }
};

export type { TorodApiResponse };
