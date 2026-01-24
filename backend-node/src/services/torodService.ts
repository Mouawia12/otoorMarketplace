import FormData from "form-data";

import { AppError } from "../utils/errors";
import type { AxiosRequestConfig } from "axios";
import { torodRequest } from "../utils/torodClient";

type TorodRecord = Record<string, unknown>;

const pickString = (...values: Array<unknown>) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0) as
    | string
    | undefined;

const pickStringOrNumber = (...values: Array<unknown>) => {
  const value = values.find(
    (entry) =>
      (typeof entry === "string" && entry.trim().length > 0) ||
      (typeof entry === "number" && Number.isFinite(entry))
  );
  if (typeof value === "number") {
    return String(value);
  }
  return value as string | undefined;
};

const asRecord = (value: unknown): TorodRecord =>
  value && typeof value === "object" ? (value as TorodRecord) : {};

const extractTrackingNumber = (payload: TorodRecord) => {
  const nestedShipment = asRecord(payload.shipment);
  const nestedData = asRecord(payload.data);
  return pickStringOrNumber(
    payload.tracking_number,
    payload.tracking_id,
    payload.trackingNumber,
    payload.trackingId,
    payload.tracking_no,
    payload.awb,
    payload.awb_number,
    payload.airwaybill,
    nestedShipment.tracking_number,
    nestedShipment.tracking_id,
    nestedShipment.trackingNumber,
    nestedData.tracking_number,
    nestedData.tracking_id,
    nestedData.trackingNumber
  );
};

const extractLabelUrl = (payload: TorodRecord) => {
  const nestedShipment = asRecord(payload.shipment);
  const nestedData = asRecord(payload.data);
  const labelObject = payload.label && typeof payload.label === "object"
    ? (payload.label as TorodRecord)
    : {};
  return pickString(
    payload.label_url,
    payload.labelUrl,
    payload.label_link,
    payload.label,
    payload.aws_label,
    payload.awsLabel,
    labelObject.url,
    labelObject.link,
    payload.awb_label,
    nestedShipment.label_url,
    nestedShipment.labelUrl,
    nestedData.label_url,
    nestedData.labelUrl
  );
};

const extractStatus = (payload: TorodRecord) => {
  const nestedShipment = asRecord(payload.shipment);
  const nestedData = asRecord(payload.data);
  return pickString(
    payload.status,
    payload.shipment_status,
    payload.current_status,
    nestedShipment.status,
    nestedData.status
  );
};

export type TorodOrderPayload = {
  reference: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_region?: string;
  customer_country?: string;
  payment_method?: string;
  cod_amount?: number;
  cod_currency?: string;
  items: Array<{
    name: string;
    quantity: number;
    price?: number;
    weight?: number;
    sku?: string;
  }>;
  metadata?: Record<string, unknown>;
} & Record<string, unknown>;

export type TorodShipmentPayload = Record<string, unknown>;

export type TorodShipment = {
  id: string;
  trackingNumber?: string;
  labelUrl?: string;
  status?: string;
  raw: unknown;
};

export type TorodOrder = {
  id: string;
  trackingNumber?: string;
  status?: string;
  raw: unknown;
};

const mapOrder = (data: unknown): TorodOrder => {
  const payload = asRecord(data);
  const nestedData = asRecord(payload.data);
  const id = pickStringOrNumber(
    payload.order_id,
    payload.orderId,
    payload.id,
    nestedData.order_id,
    nestedData.orderId,
    nestedData.id
  );

  if (!id) {
    throw AppError.internal("Unable to parse Torod order response", payload);
  }

  const trackingNumber = extractTrackingNumber(payload);
  const status = extractStatus(payload);
  const order: TorodOrder = { id, raw: data };
  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
  }
  if (status) {
    order.status = status;
  }
  return order;
};

const mapShipment = (data: unknown): TorodShipment => {
  const payload = asRecord(data);
  const nestedData = asRecord(payload.data);
  const trackingNumber = extractTrackingNumber(payload);
  const id = pickStringOrNumber(
    payload.shipment_id,
    payload.shipmentId,
    payload.id,
    nestedData.shipment_id,
    nestedData.shipmentId,
    nestedData.id,
    payload.tracking_id,
    payload.trackingId,
    trackingNumber
  );

  if (!id) {
    throw AppError.internal("Unable to parse Torod shipment response", payload);
  }

  const labelUrl = extractLabelUrl(payload);
  const status = extractStatus(payload);
  const shipment: TorodShipment = { id, raw: data };
  if (trackingNumber) {
    shipment.trackingNumber = trackingNumber;
  }
  if (labelUrl) {
    shipment.labelUrl = labelUrl;
  }
  if (status) {
    shipment.status = status;
  }
  return shipment;
};

const requestWithFallback = async <T>(
  requests: AxiosRequestConfig[],
  errorMessage: string
): Promise<T> => {
  let lastError: unknown;
  for (const request of requests) {
    try {
      return await torodRequest<T>(request);
    } catch (error) {
      lastError = error;
      if (error instanceof AppError && [404, 405].includes(error.statusCode)) {
        continue;
      }
      throw error;
    }
  }
  if (lastError instanceof AppError) {
    throw lastError;
  }
  throw AppError.badRequest(errorMessage);
};

export const listCountries = async (page = 1) =>
  torodRequest<unknown>({
    method: "GET",
    url: "/get-all/countries",
    params: { page },
  });

export const listRegions = async (countryId: string, page = 1) => {
  if (!countryId) {
    throw AppError.badRequest("country_id is required");
  }
  return torodRequest<unknown>({
    method: "GET",
    url: "/get-all/regions",
    params: { country_id: countryId, page },
  });
};

export const listCities = async (regionId: string, page = 1) => {
  if (!regionId) {
    throw AppError.badRequest("region_id is required");
  }
  return torodRequest<unknown>({
    method: "GET",
    url: "/get-all/cities",
    params: { region_id: regionId, page },
  });
};

export const listDistricts = async (cityId: string, page = 1) => {
  if (!cityId) {
    throw AppError.badRequest("city_id is required");
  }
  try {
    return await requestWithFallback<unknown>(
      [
        {
          method: "GET",
          url: "/get-all/districts",
          params: { cities_id: cityId, page },
        },
        {
          method: "GET",
          url: "/get-all/districts",
          params: { city_id: cityId, page },
        },
        {
          method: "GET",
          url: "/districts",
          params: { city_id: cityId, page },
        },
      ],
      "Torod districts request failed"
    );
  } catch (error) {
    if (error instanceof AppError && [404, 406].includes(error.statusCode)) {
      return { data: [] };
    }
    throw error;
  }
};

export const listAllCourierPartners = async (page = 1) =>
  torodRequest<unknown>({
    method: "GET",
    url: "/get-all/courier/partners",
    params: { page },
  });

type CourierPartnersPayload = {
  shipper_city_id?: number;
  customer_city_id: number;
  payment: string;
  weight: number;
  order_total: number;
  no_of_box: number;
  type: string;
  filter_by: string;
  warehouse?: number | string;
};

const normalizeCourierPayload = (payload: CourierPartnersPayload) => {
  const weight = Number(payload.weight);
  return {
    ...payload,
    weight: Number.isFinite(weight) && weight > 0 ? weight : 1,
    payment: payload.payment,
  };
};

const toFormData = (payload: CourierPartnersPayload) => {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, String(value));
  });
  return form;
};

export const listCourierPartners = async (payload: CourierPartnersPayload) => {
  if (!payload?.customer_city_id) {
    throw AppError.badRequest("customer_city_id is required");
  }
  const data = normalizeCourierPayload(payload);
  try {
    const requests = ["/courier/partners/by/cityid", "/courier/partners/list"];
    let lastError: unknown;
    for (const url of requests) {
      try {
        const formData = toFormData(data);
        console.log("TOROD COURIER PARTNERS REQUEST:", {
          url,
          payload: data,
        });
        return await torodRequest<unknown>({
          method: "POST",
          url,
          data: formData,
          headers: formData.getHeaders(),
        });
      } catch (error) {
        lastError = error;
        if (error instanceof AppError) {
          console.log("TOROD COURIER PARTNERS ERROR:", {
            url,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details,
          });
        }
        if (error instanceof AppError && [404, 405].includes(error.statusCode)) {
          continue;
        }
        if (error instanceof AppError && error.statusCode === 422) {
          const details = error.details as { message?: unknown } | undefined;
          const message =
            typeof details?.message === "string"
              ? details.message
              : typeof details?.message === "object" && details?.message
              ? JSON.stringify(details.message)
              : error.message;
          if (message && message.toLowerCase().includes("shipper_city_id")) {
            continue;
          }
        }
        throw error;
      }
    }
    if (lastError instanceof AppError) {
      throw lastError;
    }
    throw AppError.badRequest("Torod courier partners request failed");
  } catch (error) {
    if (error instanceof AppError && [404, 405, 406].includes(error.statusCode)) {
      return { data: [] };
    }
    throw error;
  }
};

export const listOrderCourierPartners = async (
  payload: {
    order_id: string;
    warehouse?: number | string;
    type?: string;
    filter_by?: string;
  }
) => {
  if (!payload?.order_id) {
    throw AppError.badRequest("order_id is required");
  }
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, String(value));
  });
  return torodRequest<unknown>({
    method: "POST",
    url: "/courier/partners",
    data: form,
    headers: form.getHeaders(),
  });
};

export const createOrder = async (payload: TorodOrderPayload): Promise<TorodOrder> => {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "object") {
      form.append(key, JSON.stringify(value));
      return;
    }
    form.append(key, String(value));
  });

  const data = await requestWithFallback<unknown>(
    [
      { method: "POST", url: "/order/create", data: form, headers: form.getHeaders() },
      { method: "POST", url: "/orders", data: form, headers: form.getHeaders() },
      { method: "POST", url: "/orders/create", data: form, headers: form.getHeaders() },
    ],
    "Torod order creation failed"
  );

  return mapOrder(data);
};

export const shipOrder = async (
  orderId: string,
  payload?: TorodShipmentPayload
): Promise<TorodShipment> => {
  if (!orderId) {
    throw AppError.badRequest("Torod order id is required");
  }

  const form = new FormData();
  form.append("order_id", String(orderId));
  if (payload && typeof payload === "object") {
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      form.append(key, String(value));
    });
  }

  const data = await requestWithFallback<unknown>(
    [
      {
        method: "POST",
        url: "/order/ship/process",
        data: form,
        headers: form.getHeaders(),
      },
      {
        method: "POST",
        url: "/order/ship-process",
        data: form,
        headers: form.getHeaders(),
      },
      {
        method: "POST",
        url: `/orders/${orderId}/shipments`,
        data: payload,
      },
      {
        method: "POST",
        url: `/orders/${orderId}/ship-process`,
        data: payload,
      },
      {
        method: "POST",
        url: "/orders/ship-process",
        data: form,
        headers: form.getHeaders(),
      },
    ],
    "Torod shipment creation failed"
  );

  return mapShipment(data);
};

export const trackShipment = async (trackingNumber: string): Promise<TorodShipment> => {
  if (!trackingNumber) {
    throw AppError.badRequest("Tracking number is required");
  }

  const data = await requestWithFallback<unknown>(
    [
      { method: "GET", url: `/shipments/${trackingNumber}` },
      {
        method: "GET",
        url: "/shipment/track",
        params: { tracking_number: trackingNumber },
      },
      {
        method: "GET",
        url: "/order/track",
        params: { tracking_number: trackingNumber },
      },
      {
        method: "GET",
        url: "/shipment-order/track",
        params: { tracking_number: trackingNumber },
      },
    ],
    "Torod tracking request failed"
  );

  return mapShipment(data);
};

export const createShipment = shipOrder;
export const getShipment = trackShipment;

export const getWalletBalance = async () =>
  torodRequest<unknown>({
    method: "GET",
    url: "/get-wallet-balance",
  });

export const getPaymentLink = async (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw AppError.badRequest("amount is required");
  }
  const form = new FormData();
  form.append("amount", String(amount));
  return torodRequest<unknown>({
    method: "POST",
    url: "/get-payment-link",
    data: form,
    headers: form.getHeaders(),
  });
};

export const listOrders = async (page = 1) => {
  return requestWithFallback<unknown>(
    [
      { method: "GET", url: "/order/list", params: { page } },
      { method: "GET", url: "/orders/list", params: { page } },
      { method: "GET", url: "/order/list?page=" + page },
    ],
    "Torod orders list failed"
  );
};

export const createWarehouse = async (payload: Record<string, unknown>) => {
  if (!payload || typeof payload !== "object") {
    throw AppError.badRequest("Warehouse payload is required");
  }

  return torodRequest<unknown>({
    method: "POST",
    url: "/warehouses",
    data: payload,
  });
};

export const createAddress = async (payload: Record<string, unknown>) => {
  if (!payload || typeof payload !== "object") {
    throw AppError.badRequest("Address payload is required");
  }

  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, String(value));
  });

  return requestWithFallback<unknown>(
    [
      { method: "POST", url: "/create/address", data: form, headers: form.getHeaders() },
      { method: "POST", url: "/address", data: form, headers: form.getHeaders() },
      { method: "POST", url: "/addresses", data: form, headers: form.getHeaders() },
      { method: "POST", url: "/address/create", data: form, headers: form.getHeaders() },
    ],
    "Torod address creation failed"
  );
};

export const listAddresses = async (page = 1) => {
  try {
    return await requestWithFallback<unknown>(
      [
        { method: "GET", url: "/address/list", params: { page } },
        { method: "GET", url: "/addresses/list", params: { page } },
      ],
      "Torod address list failed"
    );
  } catch (error) {
    if (error instanceof AppError && [404, 405, 406].includes(error.statusCode)) {
      return { data: [] };
    }
    throw error;
  }
};

export const listWarehouses = async (page = 1) => {
  try {
    return await requestWithFallback<unknown>(
      [
        { method: "GET", url: "/addresses/list", params: { page } },
        { method: "GET", url: "/warehouses/list", params: { page } },
        { method: "GET", url: "/warehouses", params: { page } },
        { method: "GET", url: "/address/list", params: { page } },
      ],
      "Torod warehouses request failed"
    );
  } catch (error) {
    if (error instanceof AppError && [404, 405, 406].includes(error.statusCode)) {
      return { data: [] };
    }
    throw error;
  }
};
