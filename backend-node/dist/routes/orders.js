"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const orderService_1 = require("../services/orderService");
const errors_1 = require("../utils/errors");
const client_2 = require("../prisma/client");
const ALLOWED_STATUS_PARAMS = [
    "pending",
    "seller_confirmed",
    "processing",
    "shipped",
    "completed",
    "delivered",
    "canceled",
    "cancelled",
    "refunded",
];
const router = (0, express_1.Router)();
router.get("/", (0, auth_1.authenticate)({ roles: [client_1.RoleName.SUPER_ADMIN, client_1.RoleName.ADMIN, client_1.RoleName.SELLER] }), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const statusQuery = typeof req.query.status === "string" ? req.query.status : undefined;
        if (statusQuery && !ALLOWED_STATUS_PARAMS.includes(statusQuery.toLowerCase())) {
            throw errors_1.AppError.badRequest("Invalid status filter");
        }
        const roles = req.user.roles.map((r) => r.toUpperCase());
        const pageRaw = typeof req.query.page === "string" ? Number(req.query.page) : undefined;
        const page = typeof pageRaw === "number" && Number.isFinite(pageRaw) ? pageRaw : undefined;
        const pageSizeRaw = typeof req.query.page_size === "string" ? Number(req.query.page_size) : undefined;
        const pageSize = typeof pageSizeRaw === "number" && Number.isFinite(pageSizeRaw) ? pageSizeRaw : undefined;
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const wantsPagination = typeof page === "number" || typeof pageSize === "number" || typeof search === "string";
        if (roles.includes(client_1.RoleName.ADMIN) || roles.includes(client_1.RoleName.SUPER_ADMIN)) {
            if (wantsPagination) {
                const options = {};
                if (statusQuery)
                    options.status = statusQuery;
                if (typeof page === "number")
                    options.page = page;
                if (typeof pageSize === "number")
                    options.page_size = pageSize;
                if (typeof search === "string")
                    options.search = search;
                const result = await (0, orderService_1.listOrdersWithPagination)(options);
                res.json(result);
                return;
            }
            const orders = await (0, orderService_1.listAllOrders)(statusQuery);
            res.json(orders);
            return;
        }
        if (wantsPagination) {
            const options = {
                sellerId: req.user.id,
            };
            if (statusQuery)
                options.status = statusQuery;
            if (typeof page === "number")
                options.page = page;
            if (typeof pageSize === "number")
                options.page_size = pageSize;
            if (typeof search === "string")
                options.search = search;
            const result = await (0, orderService_1.listOrdersWithPagination)(options);
            res.json(result);
            return;
        }
        const orders = await (0, orderService_1.listOrdersForSeller)(req.user.id, statusQuery);
        res.json(orders);
    }
    catch (error) {
        next(error);
    }
});
router.get("/mine", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const orders = await (0, orderService_1.listOrdersByUser)(req.user.id);
        res.json(orders);
    }
    catch (error) {
        next(error);
    }
});
router.post("/", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        // Debug logging to diagnose 403/auth issues in production
        console.log("ORDER AUTH USER:", req.user);
        console.log("ORDER AUTH HEADER:", req.headers.authorization);
        console.log("ORDER PAYLOAD:", req.body);
        const body = req.body ?? {};
        let items = body.items;
        if (!Array.isArray(items) || items.length === 0) {
            if (!body.product_id) {
                throw errors_1.AppError.badRequest("product_id is required");
            }
            const quantity = Number(body.quantity ?? 1);
            const product = await client_2.prisma.product.findUnique({
                where: { id: Number(body.product_id) },
                select: { basePrice: true },
            });
            if (!product) {
                throw errors_1.AppError.badRequest("Product not found");
            }
            items = [
                {
                    productId: Number(body.product_id),
                    quantity,
                    unitPrice: Number(body.unit_price ?? product.basePrice.toNumber()),
                },
            ];
        }
        const shippingInput = body.shipping ??
            (body.shipping_name
                ? {
                    name: body.shipping_name,
                    phone: body.shipping_phone,
                    city: body.shipping_city,
                    region: body.shipping_region,
                    address: body.shipping_address,
                    type: body.shipping_method,
                    customer_city_code: body.customer_city_code,
                    customer_country: body.customer_country,
                    cod_amount: body.cod_amount,
                    cod_currency: body.cod_currency,
                    torod_shipping_company_id: body.torod_shipping_company_id,
                    torod_warehouse_id: body.torod_warehouse_id,
                    torod_country_id: body.torod_country_id,
                    torod_region_id: body.torod_region_id,
                    torod_city_id: body.torod_city_id,
                    torod_district_id: body.torod_district_id,
                    torod_metadata: body.torod_metadata,
                }
                : undefined);
        const order = await (0, orderService_1.createOrder)({
            buyerId: req.user.id,
            paymentMethod: body.payment_method ?? "COD",
            shipping: shippingInput,
            items,
            couponCode: typeof body.coupon_code === "string" ? body.coupon_code : undefined,
            couponCodes: Array.isArray(body.coupon_codes)
                ? body.coupon_codes.filter((code) => typeof code === "string")
                : undefined,
        });
        res.status(201).json(order);
    }
    catch (error) {
        next(error);
    }
});
router.patch("/:id/status", (0, auth_1.authenticate)({ roles: [client_1.RoleName.SUPER_ADMIN, client_1.RoleName.ADMIN, client_1.RoleName.SELLER] }), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const orderId = Number(req.params.id);
        if (Number.isNaN(orderId)) {
            throw errors_1.AppError.badRequest("Invalid order id");
        }
        const status = req.body?.status;
        if (typeof status !== "string") {
            throw errors_1.AppError.badRequest("Status is required");
        }
        const order = await (0, orderService_1.updateOrderStatus)(orderId, status, req.user.roles.map((role) => role.toUpperCase()));
        res.json(order);
    }
    catch (error) {
        next(error);
    }
});
router.post("/:id/confirm-delivery", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const orderId = Number(req.params.id);
        if (Number.isNaN(orderId)) {
            throw errors_1.AppError.badRequest("Invalid order id");
        }
        const order = await (0, orderService_1.confirmOrderDelivery)(orderId, req.user.id);
        res.json(order);
    }
    catch (error) {
        next(error);
    }
});
router.get("/:id/label", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const orderId = Number(req.params.id);
        if (Number.isNaN(orderId)) {
            throw errors_1.AppError.badRequest("Invalid order id");
        }
        const result = await (0, orderService_1.getOrderLabel)(orderId, req.user.id, req.user.roles);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/:id/tracking", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const orderId = Number(req.params.id);
        if (Number.isNaN(orderId)) {
            throw errors_1.AppError.badRequest("Invalid order id");
        }
        const result = await (0, orderService_1.getOrderTracking)(orderId, req.user.id, req.user.roles);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map