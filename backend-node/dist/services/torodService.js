"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWarehouse = exports.getShipment = exports.createShipment = exports.trackShipment = exports.shipOrder = exports.createOrder = exports.listCourierPartners = exports.listDistricts = exports.listCities = exports.listRegions = exports.listCountries = void 0;
const errors_1 = require("../utils/errors");
const torodClient_1 = require("../utils/torodClient");
const pickString = (...values) => values.find((value) => typeof value === "string" && value.trim().length > 0);
const asRecord = (value) => value && typeof value === "object" ? value : {};
const extractTrackingNumber = (payload) => {
    const nestedShipment = asRecord(payload.shipment);
    const nestedData = asRecord(payload.data);
    return pickString(payload.tracking_number, payload.trackingNumber, payload.tracking_no, payload.awb, payload.awb_number, payload.airwaybill, nestedShipment.tracking_number, nestedShipment.trackingNumber, nestedData.tracking_number, nestedData.trackingNumber);
};
const extractLabelUrl = (payload) => {
    const nestedShipment = asRecord(payload.shipment);
    const nestedData = asRecord(payload.data);
    const labelObject = payload.label && typeof payload.label === "object"
        ? payload.label
        : {};
    return pickString(payload.label_url, payload.labelUrl, payload.label_link, payload.label, labelObject.url, labelObject.link, payload.awb_label, nestedShipment.label_url, nestedShipment.labelUrl, nestedData.label_url, nestedData.labelUrl);
};
const extractStatus = (payload) => {
    const nestedShipment = asRecord(payload.shipment);
    const nestedData = asRecord(payload.data);
    return pickString(payload.status, payload.shipment_status, payload.current_status, nestedShipment.status, nestedData.status);
};
const mapOrder = (data) => {
    const payload = asRecord(data);
    const nestedData = asRecord(payload.data);
    const id = pickString(payload.order_id, payload.orderId, payload.id, nestedData.order_id, nestedData.orderId, nestedData.id);
    if (!id) {
        throw errors_1.AppError.internal("Unable to parse Torod order response", payload);
    }
    const trackingNumber = extractTrackingNumber(payload);
    const status = extractStatus(payload);
    const order = { id, raw: data };
    if (trackingNumber) {
        order.trackingNumber = trackingNumber;
    }
    if (status) {
        order.status = status;
    }
    return order;
};
const mapShipment = (data) => {
    const payload = asRecord(data);
    const nestedData = asRecord(payload.data);
    const trackingNumber = extractTrackingNumber(payload);
    const id = pickString(payload.shipment_id, payload.shipmentId, payload.id, nestedData.shipment_id, nestedData.shipmentId, nestedData.id, trackingNumber);
    if (!id) {
        throw errors_1.AppError.internal("Unable to parse Torod shipment response", payload);
    }
    const labelUrl = extractLabelUrl(payload);
    const status = extractStatus(payload);
    const shipment = { id, raw: data };
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
const requestWithFallback = async (requests, errorMessage) => {
    let lastError;
    for (const request of requests) {
        try {
            return await (0, torodClient_1.torodRequest)(request);
        }
        catch (error) {
            lastError = error;
            if (error instanceof errors_1.AppError && [404, 405].includes(error.statusCode)) {
                continue;
            }
            throw error;
        }
    }
    if (lastError instanceof errors_1.AppError) {
        throw lastError;
    }
    throw errors_1.AppError.badRequest(errorMessage);
};
const listCountries = async (page = 1) => (0, torodClient_1.torodRequest)({
    method: "GET",
    url: "/get-all/countries",
    params: { page },
});
exports.listCountries = listCountries;
const listRegions = async (countryId, page = 1) => {
    if (!countryId) {
        throw errors_1.AppError.badRequest("country_id is required");
    }
    return (0, torodClient_1.torodRequest)({
        method: "GET",
        url: "/get-all/regions",
        params: { country_id: countryId, page },
    });
};
exports.listRegions = listRegions;
const listCities = async (regionId, page = 1) => {
    if (!regionId) {
        throw errors_1.AppError.badRequest("region_id is required");
    }
    return (0, torodClient_1.torodRequest)({
        method: "GET",
        url: "/get-all/cities",
        params: { region_id: regionId, page },
    });
};
exports.listCities = listCities;
const listDistricts = async (cityId, page = 1) => {
    if (!cityId) {
        throw errors_1.AppError.badRequest("cities_id is required");
    }
    return (0, torodClient_1.torodRequest)({
        method: "GET",
        url: "/get-all/districts",
        params: { cities_id: cityId, page },
    });
};
exports.listDistricts = listDistricts;
const listCourierPartners = async (cityId) => {
    if (!cityId) {
        throw errors_1.AppError.badRequest("city_id is required");
    }
    return (0, torodClient_1.torodRequest)({
        method: "GET",
        url: "/courier-partners",
        params: { city_id: cityId },
    });
};
exports.listCourierPartners = listCourierPartners;
const createOrder = async (payload) => {
    const data = await requestWithFallback([
        { method: "POST", url: "/order/create", data: payload },
        { method: "POST", url: "/orders", data: payload },
        { method: "POST", url: "/orders/create", data: payload },
    ], "Torod order creation failed");
    return mapOrder(data);
};
exports.createOrder = createOrder;
const shipOrder = async (orderId, payload) => {
    if (!orderId) {
        throw errors_1.AppError.badRequest("Torod order id is required");
    }
    const data = await requestWithFallback([
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
    ], "Torod shipment creation failed");
    return mapShipment(data);
};
exports.shipOrder = shipOrder;
const trackShipment = async (trackingNumber) => {
    if (!trackingNumber) {
        throw errors_1.AppError.badRequest("Tracking number is required");
    }
    const data = await requestWithFallback([
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
    ], "Torod tracking request failed");
    return mapShipment(data);
};
exports.trackShipment = trackShipment;
exports.createShipment = exports.shipOrder;
exports.getShipment = exports.trackShipment;
const createWarehouse = async (payload) => {
    if (!payload || typeof payload !== "object") {
        throw errors_1.AppError.badRequest("Warehouse payload is required");
    }
    return (0, torodClient_1.torodRequest)({
        method: "POST",
        url: "/warehouses",
        data: payload,
    });
};
exports.createWarehouse = createWarehouse;
//# sourceMappingURL=torodService.js.map