"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWarehouses = exports.listAddresses = exports.createAddress = exports.createWarehouse = exports.listOrders = exports.getPaymentLink = exports.getWalletBalance = exports.getShipment = exports.createShipment = exports.trackShipment = exports.shipOrder = exports.createOrder = exports.listOrderCourierPartners = exports.listCourierPartners = exports.listAllCourierPartners = exports.listDistricts = exports.listCities = exports.listRegions = exports.listCountries = void 0;
const form_data_1 = __importDefault(require("form-data"));
const errors_1 = require("../utils/errors");
const torodClient_1 = require("../utils/torodClient");
const pickString = (...values) => values.find((value) => typeof value === "string" && value.trim().length > 0);
const pickStringOrNumber = (...values) => {
    const value = values.find((entry) => (typeof entry === "string" && entry.trim().length > 0) ||
        (typeof entry === "number" && Number.isFinite(entry)));
    if (typeof value === "number") {
        return String(value);
    }
    return value;
};
const asRecord = (value) => value && typeof value === "object" ? value : {};
const extractTrackingNumber = (payload) => {
    const nestedShipment = asRecord(payload.shipment);
    const nestedData = asRecord(payload.data);
    return pickStringOrNumber(payload.tracking_number, payload.tracking_id, payload.trackingNumber, payload.trackingId, payload.tracking_no, payload.awb, payload.awb_number, payload.airwaybill, nestedShipment.tracking_number, nestedShipment.tracking_id, nestedShipment.trackingNumber, nestedData.tracking_number, nestedData.tracking_id, nestedData.trackingNumber);
};
const extractLabelUrl = (payload) => {
    const nestedShipment = asRecord(payload.shipment);
    const nestedData = asRecord(payload.data);
    const labelObject = payload.label && typeof payload.label === "object"
        ? payload.label
        : {};
    return pickString(payload.label_url, payload.labelUrl, payload.label_link, payload.label, payload.aws_label, payload.awsLabel, labelObject.url, labelObject.link, payload.awb_label, nestedShipment.label_url, nestedShipment.labelUrl, nestedData.label_url, nestedData.labelUrl);
};
const extractStatus = (payload) => {
    const nestedShipment = asRecord(payload.shipment);
    const nestedData = asRecord(payload.data);
    return pickString(payload.status, payload.shipment_status, payload.current_status, nestedShipment.status, nestedData.status);
};
const mapOrder = (data) => {
    const payload = asRecord(data);
    const nestedData = asRecord(payload.data);
    const id = pickStringOrNumber(payload.order_id, payload.orderId, payload.id, nestedData.order_id, nestedData.orderId, nestedData.id);
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
    const id = pickStringOrNumber(payload.shipment_id, payload.shipmentId, payload.id, nestedData.shipment_id, nestedData.shipmentId, nestedData.id, payload.tracking_id, payload.trackingId, trackingNumber);
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
        throw errors_1.AppError.badRequest("city_id is required");
    }
    try {
        return await requestWithFallback([
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
        ], "Torod districts request failed");
    }
    catch (error) {
        if (error instanceof errors_1.AppError && [404, 406].includes(error.statusCode)) {
            return { data: [] };
        }
        throw error;
    }
};
exports.listDistricts = listDistricts;
const listAllCourierPartners = async (page = 1) => (0, torodClient_1.torodRequest)({
    method: "GET",
    url: "/get-all/courier/partners",
    params: { page },
});
exports.listAllCourierPartners = listAllCourierPartners;
const normalizeCourierPayload = (payload) => {
    const weight = Number(payload.weight);
    return {
        ...payload,
        weight: Number.isFinite(weight) && weight > 0 ? weight : 1,
        payment: payload.payment,
    };
};
const toFormData = (payload) => {
    const form = new form_data_1.default();
    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null)
            return;
        form.append(key, String(value));
    });
    return form;
};
const listCourierPartners = async (payload) => {
    if (!payload?.customer_city_id) {
        throw errors_1.AppError.badRequest("customer_city_id is required");
    }
    const data = normalizeCourierPayload(payload);
    try {
        const requests = ["/courier/partners/by/cityid", "/courier/partners/list"];
        let lastError;
        for (const url of requests) {
            try {
                const formData = toFormData(data);
                console.log("TOROD COURIER PARTNERS REQUEST:", {
                    url,
                    payload: data,
                });
                return await (0, torodClient_1.torodRequest)({
                    method: "POST",
                    url,
                    data: formData,
                    headers: formData.getHeaders(),
                });
            }
            catch (error) {
                lastError = error;
                if (error instanceof errors_1.AppError) {
                    console.log("TOROD COURIER PARTNERS ERROR:", {
                        url,
                        message: error.message,
                        statusCode: error.statusCode,
                        details: error.details,
                    });
                }
                if (error instanceof errors_1.AppError && [404, 405].includes(error.statusCode)) {
                    continue;
                }
                if (error instanceof errors_1.AppError && error.statusCode === 422) {
                    const details = error.details;
                    const message = typeof details?.message === "string"
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
        if (lastError instanceof errors_1.AppError) {
            throw lastError;
        }
        throw errors_1.AppError.badRequest("Torod courier partners request failed");
    }
    catch (error) {
        if (error instanceof errors_1.AppError && [404, 405, 406].includes(error.statusCode)) {
            return { data: [] };
        }
        throw error;
    }
};
exports.listCourierPartners = listCourierPartners;
const listOrderCourierPartners = async (payload) => {
    if (!payload?.order_id) {
        throw errors_1.AppError.badRequest("order_id is required");
    }
    const form = new form_data_1.default();
    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null)
            return;
        form.append(key, String(value));
    });
    return (0, torodClient_1.torodRequest)({
        method: "POST",
        url: "/courier/partners",
        data: form,
        headers: form.getHeaders(),
    });
};
exports.listOrderCourierPartners = listOrderCourierPartners;
const createOrder = async (payload) => {
    const form = new form_data_1.default();
    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null)
            return;
        if (typeof value === "object") {
            form.append(key, JSON.stringify(value));
            return;
        }
        form.append(key, String(value));
    });
    const data = await requestWithFallback([
        { method: "POST", url: "/order/create", data: form, headers: form.getHeaders() },
        { method: "POST", url: "/orders", data: form, headers: form.getHeaders() },
        { method: "POST", url: "/orders/create", data: form, headers: form.getHeaders() },
    ], "Torod order creation failed");
    return mapOrder(data);
};
exports.createOrder = createOrder;
const shipOrder = async (orderId, payload) => {
    if (!orderId) {
        throw errors_1.AppError.badRequest("Torod order id is required");
    }
    const form = new form_data_1.default();
    form.append("order_id", String(orderId));
    if (payload && typeof payload === "object") {
        Object.entries(payload).forEach(([key, value]) => {
            if (value === undefined || value === null)
                return;
            form.append(key, String(value));
        });
    }
    const data = await requestWithFallback([
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
const getWalletBalance = async () => (0, torodClient_1.torodRequest)({
    method: "GET",
    url: "/get-wallet-balance",
});
exports.getWalletBalance = getWalletBalance;
const getPaymentLink = async (amount) => {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw errors_1.AppError.badRequest("amount is required");
    }
    const form = new form_data_1.default();
    form.append("amount", String(amount));
    return (0, torodClient_1.torodRequest)({
        method: "POST",
        url: "/get-payment-link",
        data: form,
        headers: form.getHeaders(),
    });
};
exports.getPaymentLink = getPaymentLink;
const listOrders = async (page = 1) => {
    return requestWithFallback([
        { method: "GET", url: "/order/list", params: { page } },
        { method: "GET", url: "/orders/list", params: { page } },
        { method: "GET", url: "/order/list?page=" + page },
    ], "Torod orders list failed");
};
exports.listOrders = listOrders;
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
const createAddress = async (payload) => {
    if (!payload || typeof payload !== "object") {
        throw errors_1.AppError.badRequest("Address payload is required");
    }
    const form = new form_data_1.default();
    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null)
            return;
        form.append(key, String(value));
    });
    return requestWithFallback([
        { method: "POST", url: "/create/address", data: form, headers: form.getHeaders() },
        { method: "POST", url: "/address", data: form, headers: form.getHeaders() },
        { method: "POST", url: "/addresses", data: form, headers: form.getHeaders() },
        { method: "POST", url: "/address/create", data: form, headers: form.getHeaders() },
    ], "Torod address creation failed");
};
exports.createAddress = createAddress;
const listAddresses = async (page = 1) => {
    try {
        return await requestWithFallback([
            { method: "GET", url: "/address/list", params: { page } },
            { method: "GET", url: "/addresses/list", params: { page } },
        ], "Torod address list failed");
    }
    catch (error) {
        if (error instanceof errors_1.AppError && [404, 405, 406].includes(error.statusCode)) {
            return { data: [] };
        }
        throw error;
    }
};
exports.listAddresses = listAddresses;
const listWarehouses = async (page = 1) => {
    try {
        return await requestWithFallback([
            { method: "GET", url: "/addresses/list", params: { page } },
            { method: "GET", url: "/warehouses/list", params: { page } },
            { method: "GET", url: "/warehouses", params: { page } },
            { method: "GET", url: "/address/list", params: { page } },
        ], "Torod warehouses request failed");
    }
    catch (error) {
        if (error instanceof errors_1.AppError && [404, 405, 406].includes(error.statusCode)) {
            return { data: [] };
        }
        throw error;
    }
};
exports.listWarehouses = listWarehouses;
//# sourceMappingURL=torodService.js.map