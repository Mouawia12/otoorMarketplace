import { config } from "../config/env";
import { AppError } from "../utils/errors";
import { redboxRequest } from "../utils/redboxClient";

type ShipmentKind = "direct" | "agency" | "omni";

export interface RedboxContact {
  name: string;
  phone: string;
  email?: string;
  cityCode?: string;
  country?: string;
  address?: string;
}

export interface RedboxItem {
  name: string;
  quantity: number;
  price?: number;
  weight?: number;
  sku?: string;
}

export interface RedboxShipmentPayload {
  pointId?: string;
  reference?: string;
  type?: "redbox" | "omni";
  customerCityCode?: string;
  customerCountry?: string;
  codAmount?: number;
  codCurrency?: string;
  metadata?: Record<string, unknown>;
  sender?: RedboxContact;
  receiver?: RedboxContact;
  items?: RedboxItem[];
  businessId?: string;
}

export interface RedboxShipment {
  id: string;
  trackingNumber?: string | undefined;
  labelUrl?: string | undefined;
  status?: string | undefined;
  pointId?: string | undefined;
  raw?: unknown;
}

export interface RedboxLabelResponse {
  url: string;
  labelUrl?: string | undefined;
  label_url?: string | undefined;
  link?: string | undefined;
}

const assertShipmentId = (shipmentId?: string) => {
  if (!shipmentId) {
    throw AppError.badRequest("Shipment id is required");
  }
  return shipmentId;
};

const normalizeShipmentPayload = (
  payload: RedboxShipmentPayload,
  options?: {
    requirePointId?: boolean;
    includeBusinessId?: boolean;
  }
) => {
  const requirePointId = options?.requirePointId ?? true;
  const includeBusinessId = options?.includeBusinessId ?? false;
  const businessId = payload.businessId ?? config.redbox.businessId;

  if (requirePointId && !payload.pointId) {
    throw AppError.badRequest("RedBox point_id is required");
  }

  if (includeBusinessId && !businessId) {
    throw AppError.badRequest("RedBox business_id is required");
  }

  return {
    ...(includeBusinessId ? { business_id: businessId } : {}),
    ...(payload.pointId ? { point_id: payload.pointId } : {}),
    reference: payload.reference,
    type: payload.type ?? "redbox",
    customer_city_code: payload.customerCityCode,
    customer_country: payload.customerCountry,
    cod_amount: payload.codAmount,
    cod_currency: payload.codCurrency,
    metadata: payload.metadata,
    sender: payload.sender && {
      ...payload.sender,
      city_code: payload.sender.cityCode,
    },
    receiver: payload.receiver && {
      ...payload.receiver,
      city_code: payload.receiver.cityCode,
    },
    items: payload.items,
  };
};

const mapShipment = (data: unknown): RedboxShipment => {
  const payload = data as Record<string, unknown>;
  const id =
    (payload?.shipment_id as string | undefined) ??
    (payload?.shipmentId as string | undefined) ??
    (payload?.id as string | undefined) ??
    (payload?.data as { shipment_id?: string })?.shipment_id;

  const trackingNumber =
    (payload?.tracking_number as string | undefined) ??
    (payload?.trackingNumber as string | undefined) ??
    (payload?.tracking_no as string | undefined) ??
    (payload?.awb as string | undefined);

  const labelUrl =
    (payload?.label_url as string | undefined) ??
    (payload?.labelUrl as string | undefined) ??
    (payload?.label as string | undefined);

  const status =
    (payload?.shipment_status as string | undefined) ??
    (payload?.status as string | undefined) ??
    (payload?.current_status as string | undefined);

  const pointId =
    (payload?.point_id as string | undefined) ??
    (payload?.pointId as string | undefined);

  if (!id) {
    throw AppError.internal("Unable to parse RedBox shipment response", payload);
  }

  return {
    id,
    trackingNumber,
    labelUrl,
    status,
    pointId,
    raw: data,
  };
};

const requestShipment = async (kind: ShipmentKind, payload: RedboxShipmentPayload) => {
  const isOmni = kind === "omni";
  const isAgency = kind === "agency";
  const body = normalizeShipmentPayload(payload, {
    requirePointId: !isOmni,
    includeBusinessId: isAgency,
  });
  const url = isOmni
    ? "/omni/orders"
    : isAgency
    ? "/businesses/shipments"
    : "/shipments";
  const data = await redboxRequest<unknown>({
    method: "POST",
    url,
    data: body,
  });

  return mapShipment(data);
};

export const getCities = async (country?: string) => {
  const countryCode = country?.trim() || config.redbox.defaultCountry || "SA";
  return redboxRequest<unknown>({
    method: "GET",
    url: `/countries/${countryCode}/cities`,
  });
};

export const getPointsByCity = async (cityCode: string, type?: string) => {
  if (!cityCode) {
    throw AppError.badRequest("cityCode is required");
  }
  return redboxRequest<unknown>({
    method: "GET",
    url: `/cities/${cityCode}/points`,
    params: type ? { type } : undefined,
  });
};

export const searchNearbyPoints = async (params: {
  lat: number;
  lng: number;
  radius?: number;
  type?: string;
}) => {
  if (Number.isNaN(params.lat) || Number.isNaN(params.lng)) {
    throw AppError.badRequest("lat and lng are required");
  }

  return redboxRequest<unknown>({
    method: "GET",
    url: "/points/search/nearby",
    params: {
      lat: params.lat,
      lng: params.lng,
      radius: params.radius,
      type: params.type,
      ...(config.redbox.businessId ? { business_id: config.redbox.businessId } : {}),
    },
  });
};

export const createShipmentDirect = (payload: RedboxShipmentPayload) =>
  requestShipment("direct", payload);

export const createShipmentAgency = (payload: RedboxShipmentPayload) =>
  requestShipment("agency", payload);

export const createOmniOrder = (payload: RedboxShipmentPayload) =>
  requestShipment("omni", payload);

export const getLabel = async (shipmentId: string): Promise<RedboxLabelResponse> => {
  const id = assertShipmentId(shipmentId);
  const data = await redboxRequest<RedboxLabelResponse>({
    method: "GET",
    url: `/shipments/${id}/label`,
  });

  return {
    url: data.url ?? data.labelUrl ?? data.label_url ?? data.link ?? "",
    labelUrl: data.labelUrl ?? data.label_url,
    label_url: data.label_url,
    link: data.link,
  };
};

export const getStatus = async (shipmentId: string) => {
  const id = assertShipmentId(shipmentId);
  const data = await redboxRequest<unknown>({
    method: "GET",
    url: `/shipments/${id}/status`,
  });
  return mapShipment(data);
};

export const getActivities = async (shipmentId: string) => {
  const id = assertShipmentId(shipmentId);
  return redboxRequest<unknown>({
    method: "GET",
    url: `/shipments/${id}/activities`,
  });
};

export const cancelShipment = async (shipmentId: string, reason?: string) => {
  const id = assertShipmentId(shipmentId);
  return redboxRequest<unknown>({
    method: "POST",
    url: `/shipments/${id}/cancel`,
    data: reason ? { reason } : undefined,
  });
};

export const extendShipment = async (shipmentId: string, days: number) => {
  const id = assertShipmentId(shipmentId);
  if (!Number.isFinite(days) || days <= 0) {
    throw AppError.badRequest("days must be greater than 0");
  }

  return redboxRequest<unknown>({
    method: "POST",
    url: `/shipments/${id}/extend`,
    data: { days },
  });
};

export const updateCOD = async (
  shipmentId: string,
  amount: number,
  currency = "SAR"
) => {
  const id = assertShipmentId(shipmentId);
  if (!Number.isFinite(amount) || amount < 0) {
    throw AppError.badRequest("amount must be zero or positive");
  }

  return redboxRequest<unknown>({
    method: "POST",
    url: `/shipments/${id}/cod`,
    data: { amount, currency },
  });
};
