import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

import { config } from "../config/env";
import { AppError } from "./errors";

type MyFatoorahError = {
  Name?: string;
  Error?: string;
};

type MyFatoorahResponse<T> = {
  IsSuccess?: boolean;
  Message?: string;
  ValidationErrors?: MyFatoorahError[];
  Data?: T;
} & Partial<T>;

const client = axios.create({
  baseURL: config.myfatoorah.baseUrl,
  timeout: 15000,
});

client.interceptors.request.use((request) => {
  const headers = request.headers ?? {};
  headers.Authorization = `Bearer ${config.myfatoorah.apiToken}`;
  headers["Content-Type"] = "application/json";
  headers.Accept = "application/json";
  request.headers = headers;
  return request;
});

const extractMessage = (payload: MyFatoorahResponse<unknown>) => {
  if (payload.Message && payload.Message.trim().length > 0) {
    return payload.Message;
  }
  const errors = payload.ValidationErrors ?? [];
  const combined = errors
    .map((error) => [error.Name, error.Error].filter(Boolean).join(": "))
    .filter(Boolean);
  return combined.length > 0 ? combined.join(" | ") : undefined;
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

const unwrapPayload = <T>(response: AxiosResponse<MyFatoorahResponse<T>>) => {
  const payload = response.data;
  if (payload && typeof payload === "object" && "Data" in payload) {
    return payload.Data as T;
  }
  return payload as unknown as T;
};

export const myFatoorahRequest = async <T>(
  request: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await client.request<MyFatoorahResponse<T>>(request);
    const payload = response.data;
    if (payload?.IsSuccess === false) {
      const message =
        extractMessage(payload) || "MyFatoorah request was rejected";
      throw toAppError(message, response.status || 400, payload);
    }
    return unwrapPayload(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status ?? 500;
      const payload = error.response?.data as MyFatoorahResponse<unknown>;
      const apiMessage =
        (payload && extractMessage(payload)) || error.message || "MyFatoorah request failed";
      throw toAppError(apiMessage, statusCode, payload);
    }

    throw AppError.internal("MyFatoorah request failed", error);
  }
};
