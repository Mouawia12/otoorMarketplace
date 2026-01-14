import { AppError } from "../utils/errors";
import { torodRequest } from "../utils/torodClient";

type TorodRecord = Record<string, unknown>;

const pickString = (...values: Array<unknown>) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0) as
    | string
    | undefined;

const asRecord = (value: unknown): TorodRecord =>
  value && typeof value === "object" ? (value as TorodRecord) : {};

const extractTrackingNumber = (payload: TorodRecord) => {
  const nestedShipment = asRecord(payload.shipment);
  const nestedData = asRecord(payload.data);
  return pickString(
    payload.tracking_number,
    payload.trackingNumber,
    payload.tracking_no,
    payload.awb,
    payload.awb_number,
    payload.airwaybill,
    nestedShipment.tracking_number,
    nestedShipment.trackingNumber,
    nestedData.tracking_number,
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
  const id = pickString(
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
  const id = pickString(
    payload.shipment_id,
    payload.shipmentId,
    payload.id,
    nestedData.shipment_id,
    nestedData.shipmentId,
    nestedData.id,
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
  requests: Array<{ method: string; url: string; data?: unknown; params?: unknown }>,
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
    throw AppError.badRequest("cities_id is required");
  }
  return torodRequest<unknown>({
    method: "GET",
    url: "/get-all/districts",
    params: { cities_id: cityId, page },
  });
};

export const listCourierPartners = async (cityId: string) => {
  if (!cityId) {
    throw AppError.badRequest("city_id is required");
  }
  return torodRequest<unknown>({
    method: "GET",
    url: "/courier-partners",
    params: { city_id: cityId },
  });
};

export const createOrder = async (payload: TorodOrderPayload): Promise<TorodOrder> => {
  const data = await requestWithFallback<unknown>(
    [
      { method: "POST", url: "/order/create", data: payload },
      { method: "POST", url: "/orders", data: payload },
      { method: "POST", url: "/orders/create", data: payload },
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

  const data = await requestWithFallback<unknown>(
    [
      {
        method: "POST",
        url: "/order/ship-process",
        data: { order_id: orderId, ...(payload ?? {}) },
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
        data: { order_id: orderId, ...(payload ?? {}) },
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
