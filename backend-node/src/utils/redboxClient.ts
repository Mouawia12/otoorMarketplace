import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

import { config } from "../config/env";
import { AppError } from "./errors";

type RedboxApiResponse<T> = {
  success?: boolean;
  response_code?: number;
  msg?: string;
  message?: string;
  data?: T;
  result?: T;
} & Partial<T>;

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;

const client = axios.create({
  baseURL: config.redbox.baseUrl,
  timeout: 10000,
});

console.log("RedBox Base URL:", config.redbox.baseUrl);

client.interceptors.request.use((request) => {
  const headers = request.headers ?? {};
  headers.Authorization = `Bearer ${config.redbox.token}`;
  if (config.redbox.businessId) {
    headers["business-id"] = config.redbox.businessId;
  }
  request.headers = headers;
  return request;
});

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const extractPayload = <T>(response: AxiosResponse<RedboxApiResponse<T>>) => {
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

const normalizeStatusCode = <T>(payload: RedboxApiResponse<T>, fallback: number) => {
  const explicitCode =
    typeof payload.response_code === "number"
      ? payload.response_code
      : typeof (payload as { code?: number }).code === "number"
      ? (payload as { code?: number }).code
      : undefined;

  return explicitCode ?? fallback;
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

export const redboxRequest = async <T>(
  request: AxiosRequestConfig,
  attempt = 1
): Promise<T> => {
  try {
    const response = await client.request<RedboxApiResponse<T>>(request);
    const payload = response.data;
    const statusCode = normalizeStatusCode(payload, response.status);
    const successFlag = payload?.success;

    if (successFlag === false || statusCode >= 400) {
      const message =
        payload?.msg ||
        payload?.message ||
        `RedBox request failed with status ${statusCode}`;
      throw toAppError(message, statusCode);
    }

    return extractPayload(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;

      if (
        statusCode &&
        statusCode >= 500 &&
        statusCode < 600 &&
        attempt < MAX_ATTEMPTS
      ) {
        const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        await delay(delayMs);
        return redboxRequest<T>(request, attempt + 1);
      }

      if (statusCode === 401) {
        throw AppError.unauthorized("RedBox authentication failed");
      }

      if (statusCode === 403) {
        throw AppError.forbidden("RedBox access forbidden");
      }

      const apiMessage =
        (error.response?.data as { msg?: string; message?: string })?.msg ||
        (error.response?.data as { msg?: string; message?: string })?.message ||
        error.message;

      throw toAppError(
        apiMessage || "RedBox request failed",
        statusCode || 500,
        error.response?.data
      );
    }

    throw AppError.internal("RedBox request failed", error);
  }
};

export type { RedboxApiResponse };
