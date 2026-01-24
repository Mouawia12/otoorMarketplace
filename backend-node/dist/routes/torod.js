"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const torodService_1 = require("../services/torodService");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.get("/countries", async (req, res, next) => {
    try {
        const page = Number(req.query.page ?? 1);
        const result = await (0, torodService_1.listCountries)(Number.isFinite(page) ? page : 1);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/regions", async (req, res, next) => {
    try {
        const countryId = typeof req.query.country_id === "string"
            ? req.query.country_id
            : typeof req.query.countryId === "string"
                ? req.query.countryId
                : undefined;
        const page = Number(req.query.page ?? 1);
        if (!countryId) {
            throw errors_1.AppError.badRequest("country_id is required");
        }
        const result = await (0, torodService_1.listRegions)(countryId, Number.isFinite(page) ? page : 1);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/cities", async (req, res, next) => {
    try {
        const regionId = typeof req.query.region_id === "string"
            ? req.query.region_id
            : typeof req.query.regionId === "string"
                ? req.query.regionId
                : undefined;
        const page = Number(req.query.page ?? 1);
        if (!regionId) {
            throw errors_1.AppError.badRequest("region_id is required");
        }
        const result = await (0, torodService_1.listCities)(regionId, Number.isFinite(page) ? page : 1);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/districts", async (req, res, next) => {
    try {
        const cityId = typeof req.query.cities_id === "string"
            ? req.query.cities_id
            : typeof req.query.city_id === "string"
                ? req.query.city_id
                : typeof req.query.cityId === "string"
                    ? req.query.cityId
                    : undefined;
        const page = Number(req.query.page ?? 1);
        if (!cityId) {
            throw errors_1.AppError.badRequest("cities_id is required");
        }
        const result = await (0, torodService_1.listDistricts)(cityId, Number.isFinite(page) ? page : 1);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/courier-partners", async (req, res, next) => {
    try {
        const cityId = typeof req.query.city_id === "string"
            ? req.query.city_id
            : typeof req.query.cityId === "string"
                ? req.query.cityId
                : undefined;
        if (!cityId) {
            throw errors_1.AppError.badRequest("city_id is required");
        }
        const result = await (0, torodService_1.listCourierPartners)({
            shipper_city_id: Number(cityId),
            customer_city_id: Number(cityId),
            payment: "COD",
            weight: 1,
            order_total: 1,
            no_of_box: 1,
            type: "delivery",
            filter_by: "city",
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/courier-partners/all", async (req, res, next) => {
    try {
        const page = Number(req.query.page ?? 1);
        const result = await (0, torodService_1.listAllCourierPartners)(Number.isFinite(page) ? page : 1);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.post("/courier-partners/by-city-id", async (req, res, next) => {
    try {
        const body = req.body ?? {};
        console.log("TOROD COURIER PARTNERS BODY:", body);
        const cityId = typeof body.customer_city_id !== "undefined"
            ? Number(body.customer_city_id)
            : typeof body.city_id !== "undefined"
                ? Number(body.city_id)
                : typeof req.query.city_id === "string"
                    ? Number(req.query.city_id)
                    : undefined;
        if (!cityId || Number.isNaN(cityId)) {
            throw errors_1.AppError.badRequest("city_id is required");
        }
        const result = await (0, torodService_1.listCourierPartners)({
            shipper_city_id: Number(body.shipper_city_id ?? cityId),
            customer_city_id: cityId,
            payment: typeof body.payment === "string"
                ? body.payment
                : body.payment_method === "COD"
                    ? "coo"
                    : "Prepaid",
            weight: Number(body.weight ?? 1),
            order_total: Number(body.order_total ?? 1),
            no_of_box: Number(body.no_of_box ?? 1),
            type: String(body.type ?? "normal"),
            filter_by: String(body.filter_by ?? "cheapest"),
            warehouse: body.warehouse,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.post("/order-courier-partners", async (req, res, next) => {
    try {
        const body = req.body ?? {};
        const orderId = typeof body.order_id === "string" ? body.order_id : String(body.order_id ?? "");
        if (!orderId.trim()) {
            throw errors_1.AppError.badRequest("order_id is required");
        }
        const result = await (0, torodService_1.listOrderCourierPartners)({
            order_id: orderId,
            warehouse: body.warehouse,
            type: body.type,
            filter_by: body.filter_by,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.post("/courier-partners/by-city", async (req, res, next) => {
    try {
        const body = req.body ?? {};
        console.log("TOROD COURIER PARTNERS BY CITY BODY:", body);
        const cityId = typeof body.customer_city_id !== "undefined"
            ? Number(body.customer_city_id)
            : typeof body.city_id !== "undefined"
                ? Number(body.city_id)
                : undefined;
        if (!cityId || Number.isNaN(cityId)) {
            throw errors_1.AppError.badRequest("city_id is required");
        }
        const result = await (0, torodService_1.listCourierPartners)({
            shipper_city_id: Number(body.shipper_city_id ?? cityId),
            customer_city_id: cityId,
            payment: typeof body.payment === "string"
                ? body.payment
                : body.payment_method === "COD"
                    ? "coo"
                    : "Prepaid",
            weight: Number(body.weight ?? 1),
            order_total: Number(body.order_total ?? 1),
            no_of_box: Number(body.no_of_box ?? 1),
            type: String(body.type ?? "normal"),
            filter_by: String(body.filter_by ?? "cheapest"),
            warehouse: body.warehouse,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.post("/courier-partners/list", async (req, res, next) => {
    try {
        const body = req.body ?? {};
        console.log("TOROD COURIER PARTNERS LIST BODY:", body);
        const cityId = typeof body.customer_city_id !== "undefined"
            ? Number(body.customer_city_id)
            : typeof body.city_id !== "undefined"
                ? Number(body.city_id)
                : undefined;
        if (!cityId || Number.isNaN(cityId)) {
            throw errors_1.AppError.badRequest("customer_city_id is required");
        }
        const result = await (0, torodService_1.listCourierPartners)({
            shipper_city_id: Number(body.shipper_city_id ?? cityId),
            customer_city_id: cityId,
            payment: String(body.payment ?? "Prepaid"),
            weight: Number(body.weight ?? 1),
            order_total: Number(body.order_total ?? 1),
            no_of_box: Number(body.no_of_box ?? 1),
            type: String(body.type ?? "normal"),
            filter_by: String(body.filter_by ?? "cheapest"),
            warehouse: body.warehouse,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/orders", (0, auth_1.authenticate)({ roles: [client_1.RoleName.SUPER_ADMIN, client_1.RoleName.ADMIN] }), async (req, res, next) => {
    try {
        const page = Number(req.query.page ?? 1);
        const result = await (0, torodService_1.listOrders)(Number.isFinite(page) ? page : 1);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/warehouses", async (req, res, next) => {
    try {
        const page = Number(req.query.page ?? 1);
        const result = await (0, torodService_1.listWarehouses)(Number.isFinite(page) ? page : 1);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/test-address", (0, auth_1.authenticate)({ roles: [client_1.RoleName.SELLER, client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] }), async (req, res, next) => {
    try {
        const query = req.query ?? {};
        const requiredFields = [
            "warehouse_name",
            "warehouse",
            "contact_name",
            "phone_number",
            "email",
            "type",
        ];
        const missing = requiredFields.filter((field) => typeof query[field] !== "string" || !query[field]?.toString().trim());
        if (missing.length > 0) {
            throw errors_1.AppError.badRequest(`Missing fields: ${missing.join(", ")}`);
        }
        const payload = {
            warehouse_name: query.warehouse_name,
            warehouse: query.warehouse,
            contact_name: query.contact_name,
            phone_number: query.phone_number,
            email: query.email,
            type: query.type,
            country_id: query.country_id,
            region_id: query.region_id,
            city_id: query.city_id,
            district_id: query.district_id,
            address: query.address,
            locate_address: query.locate_address,
            latitude: query.latitude,
            longitude: query.longitude,
            zip_code: query.zip_code,
            short_address: query.short_address,
        };
        console.log("TOROD TEST ADDRESS PAYLOAD:", payload);
        const result = await (0, torodService_1.createAddress)(payload);
        res.json({ request: payload, response: result });
    }
    catch (error) {
        next(error);
    }
});
router.get("/wallet-balance", (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] }), async (_req, res, next) => {
    try {
        const result = await (0, torodService_1.getWalletBalance)();
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.post("/wallet-payment-link", (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] }), async (req, res, next) => {
    try {
        const rawAmount = req.body?.amount;
        const amount = Number(rawAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            throw errors_1.AppError.badRequest("amount is required");
        }
        if (amount % 10 !== 0) {
            throw errors_1.AppError.badRequest("amount must be a multiple of 10");
        }
        const result = await (0, torodService_1.getPaymentLink)(amount);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/addresses", async (req, res, next) => {
    try {
        const page = Number(req.query.page ?? 1);
        const result = await (0, torodService_1.listAddresses)(Number.isFinite(page) ? page : 1);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=torod.js.map