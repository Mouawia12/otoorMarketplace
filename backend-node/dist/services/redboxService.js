"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCOD = exports.extendShipment = exports.cancelShipment = exports.getActivities = exports.getStatus = exports.getLabel = exports.createOmniOrder = exports.createShipmentAgency = exports.createShipmentDirect = exports.searchNearbyPoints = exports.getPointsByCity = exports.getCities = void 0;
const env_1 = require("../config/env");
const errors_1 = require("../utils/errors");
const redboxClient_1 = require("../utils/redboxClient");
const assertShipmentId = (shipmentId) => {
    if (!shipmentId) {
        throw errors_1.AppError.badRequest("Shipment id is required");
    }
    return shipmentId;
};
const normalizeShipmentPayload = (payload) => {
    if (!payload.pointId) {
        throw errors_1.AppError.badRequest("RedBox point_id is required");
    }
    return {
        business_id: payload.businessId ?? env_1.config.redbox.businessId,
        point_id: payload.pointId,
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
const mapShipment = (data) => {
    const payload = data;
    const id = payload?.shipment_id ??
        payload?.shipmentId ??
        payload?.id ??
        payload?.data?.shipment_id;
    const trackingNumber = payload?.tracking_number ??
        payload?.trackingNumber ??
        payload?.tracking_no ??
        payload?.awb;
    const labelUrl = payload?.label_url ??
        payload?.labelUrl ??
        payload?.label;
    const status = payload?.shipment_status ??
        payload?.status ??
        payload?.current_status;
    const pointId = payload?.point_id ??
        payload?.pointId;
    if (!id) {
        throw errors_1.AppError.internal("Unable to parse RedBox shipment response", payload);
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
const requestShipment = async (kind, payload) => {
    const body = normalizeShipmentPayload(payload);
    const url = kind === "omni" ? "/shipments/omni" : `/shipments/${kind}`;
    const data = await (0, redboxClient_1.redboxRequest)({
        method: "POST",
        url,
        data: body,
    });
    return mapShipment(data);
};
const getCities = async (country) => {
    const countryCode = country?.trim() || env_1.config.redbox.defaultCountry || "SA";
    return (0, redboxClient_1.redboxRequest)({
        method: "GET",
        url: `/countries/${countryCode}/cities`,
    });
};
exports.getCities = getCities;
const getPointsByCity = async (cityCode) => {
    if (!cityCode) {
        throw errors_1.AppError.badRequest("cityCode is required");
    }
    return (0, redboxClient_1.redboxRequest)({
        method: "GET",
        url: `/cities/${cityCode}/points`,
    });
};
exports.getPointsByCity = getPointsByCity;
const searchNearbyPoints = async (params) => {
    if (Number.isNaN(params.lat) || Number.isNaN(params.lng)) {
        throw errors_1.AppError.badRequest("lat and lng are required");
    }
    return (0, redboxClient_1.redboxRequest)({
        method: "GET",
        url: "/points/nearby",
        params: {
            lat: params.lat,
            lng: params.lng,
            radius: params.radius,
            type: params.type,
            ...(env_1.config.redbox.businessId ? { business_id: env_1.config.redbox.businessId } : {}),
        },
    });
};
exports.searchNearbyPoints = searchNearbyPoints;
const createShipmentDirect = (payload) => requestShipment("direct", payload);
exports.createShipmentDirect = createShipmentDirect;
const createShipmentAgency = (payload) => requestShipment("agency", payload);
exports.createShipmentAgency = createShipmentAgency;
const createOmniOrder = (payload) => requestShipment("omni", payload);
exports.createOmniOrder = createOmniOrder;
const getLabel = async (shipmentId) => {
    const id = assertShipmentId(shipmentId);
    const data = await (0, redboxClient_1.redboxRequest)({
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
exports.getLabel = getLabel;
const getStatus = async (shipmentId) => {
    const id = assertShipmentId(shipmentId);
    const data = await (0, redboxClient_1.redboxRequest)({
        method: "GET",
        url: `/shipments/${id}`,
    });
    return mapShipment(data);
};
exports.getStatus = getStatus;
const getActivities = async (shipmentId) => {
    const id = assertShipmentId(shipmentId);
    return (0, redboxClient_1.redboxRequest)({
        method: "GET",
        url: `/shipments/${id}/activities`,
    });
};
exports.getActivities = getActivities;
const cancelShipment = async (shipmentId, reason) => {
    const id = assertShipmentId(shipmentId);
    return (0, redboxClient_1.redboxRequest)({
        method: "POST",
        url: `/shipments/${id}/cancel`,
        data: reason ? { reason } : undefined,
    });
};
exports.cancelShipment = cancelShipment;
const extendShipment = async (shipmentId, days) => {
    const id = assertShipmentId(shipmentId);
    if (!Number.isFinite(days) || days <= 0) {
        throw errors_1.AppError.badRequest("days must be greater than 0");
    }
    return (0, redboxClient_1.redboxRequest)({
        method: "POST",
        url: `/shipments/${id}/extend`,
        data: { days },
    });
};
exports.extendShipment = extendShipment;
const updateCOD = async (shipmentId, amount, currency = "SAR") => {
    const id = assertShipmentId(shipmentId);
    if (!Number.isFinite(amount) || amount < 0) {
        throw errors_1.AppError.badRequest("amount must be zero or positive");
    }
    return (0, redboxClient_1.redboxRequest)({
        method: "POST",
        url: `/shipments/${id}/cod`,
        data: { amount, currency },
    });
};
exports.updateCOD = updateCOD;
//# sourceMappingURL=redboxService.js.map