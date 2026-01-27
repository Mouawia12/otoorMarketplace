"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const orderService_1 = require("../services/orderService");
const errors_1 = require("../utils/errors");
const client_2 = require("../prisma/client");
const axios_1 = __importDefault(require("axios"));
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
        const body = req.body ?? {};
        const shippingMethodRaw = body.shipping?.shipping_method ??
            body.shipping?.shippingMethod ??
            body.shipping?.type ??
            body.shipping_method ??
            body.shippingMethod ??
            body.shipping_type;
        const shippingCompanyIdRaw = body.shipping?.shipping_company_id ??
            body.shipping?.torod_shipping_company_id ??
            body.shipping_company_id ??
            body.torod_shipping_company_id;
        const shippingCompanyId = Number(shippingCompanyIdRaw);
        const hasShippingCompany = typeof shippingCompanyIdRaw !== "undefined" &&
            typeof shippingCompanyIdRaw !== "object" &&
            Number.isFinite(shippingCompanyId) &&
            shippingCompanyId > 0;
        const hasGroupSelections = Array.isArray(body.shipping?.torod_group_selections) &&
            body.shipping.torod_group_selections.length > 0;
        const normalizedShippingMethod = typeof shippingMethodRaw === "string" ? shippingMethodRaw.trim().toLowerCase() : "";
        const deferTorodShipment = Boolean(body.shipping?.deferTorodShipment ??
            body.shipping?.defer_torod_shipment ??
            body.deferTorodShipment ??
            body.defer_torod_shipment) || (normalizedShippingMethod === "torod" && !hasShippingCompany && !hasGroupSelections);
        if (normalizedShippingMethod === "torod" && !hasShippingCompany && !deferTorodShipment) {
            res.status(422).json({
                message: "لا توجد شركة شحن متاحة لهذه المدينة",
            });
            return;
        }
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
                    defer_torod_shipment: deferTorodShipment,
                    torod_warehouse_id: body.torod_warehouse_id,
                    torod_country_id: body.torod_country_id,
                    torod_region_id: body.torod_region_id,
                    torod_city_id: body.torod_city_id,
                    torod_district_id: body.torod_district_id,
                    torod_metadata: body.torod_metadata,
                    torod_group_selections: body.shipping?.torod_group_selections ?? body.torod_group_selections,
                }
                : undefined);
        const order = await (0, orderService_1.createOrder)({
            buyerId: req.user.id,
            paymentMethod: body.payment_method ?? "COD",
            paymentMethodId: body.payment_method_id ?? body.paymentMethodId,
            paymentMethodCode: body.payment_method_code ?? body.paymentMethodCode,
            language: typeof body.language === "string" ? body.language : undefined,
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
        const order = await (0, orderService_1.updateOrderStatus)(orderId, status, req.user.roles.map((role) => role.toUpperCase()), req.user.id);
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
router.post("/:id/torod/partners", (0, auth_1.authenticate)({ roles: [client_1.RoleName.SUPER_ADMIN, client_1.RoleName.ADMIN, client_1.RoleName.SELLER] }), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const orderId = Number(req.params.id);
        if (Number.isNaN(orderId)) {
            throw errors_1.AppError.badRequest("Invalid order id");
        }
        const result = await (0, orderService_1.listTorodPartnersForOrder)(orderId, req.user.id, req.user.roles, req.body ?? {});
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.post("/torod/partners/checkout", async (req, res, next) => {
    try {
        const result = await (0, orderService_1.listTorodPartnersForCheckout)(req.body ?? {});
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.post("/:id/torod/ship", (0, auth_1.authenticate)({ roles: [client_1.RoleName.SUPER_ADMIN, client_1.RoleName.ADMIN, client_1.RoleName.SELLER] }), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const orderId = Number(req.params.id);
        if (Number.isNaN(orderId)) {
            throw errors_1.AppError.badRequest("Invalid order id");
        }
        const result = await (0, orderService_1.shipTorodOrderForOrder)(orderId, req.user.id, req.user.roles, req.body ?? {});
        res.json(result);
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
        const result = await (0, orderService_1.getOrderLabel)(orderId, req.user.id, req.user.roles, req.query);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/:id/label/print", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const orderId = Number(req.params.id);
        if (Number.isNaN(orderId)) {
            throw errors_1.AppError.badRequest("Invalid order id");
        }
        const result = await (0, orderService_1.getOrderLabel)(orderId, req.user.id, req.user.roles, req.query);
        const labelUrl = result.label_url;
        if (!labelUrl) {
            throw errors_1.AppError.notFound("Label not found");
        }
        const resolvedUrl = labelUrl.startsWith("http")
            ? labelUrl
            : `${req.protocol}://${req.get("host")}${labelUrl.startsWith("/") ? "" : "/"}${labelUrl}`;
        const response = await axios_1.default.get(resolvedUrl, {
            responseType: "arraybuffer",
            timeout: 20000,
        });
        const responseContentType = response.headers["content-type"];
        const contentType = responseContentType && responseContentType.includes("pdf")
            ? responseContentType
            : "application/pdf";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", "inline; filename=label.pdf");
        res.send(Buffer.from(response.data));
    }
    catch (error) {
        next(error);
    }
});
router.get("/:id/label/print-view", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const orderId = Number(req.params.id);
        if (Number.isNaN(orderId)) {
            throw errors_1.AppError.badRequest("Invalid order id");
        }
        const query = typeof req.originalUrl === "string" && req.originalUrl.includes("?")
            ? req.originalUrl.split("?")[1]
            : "";
        const printUrl = `${req.baseUrl}/${orderId}/label/print${query ? `?${query}` : ""}`;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(`
      <!doctype html>
      <html lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>طباعة بوليصة الشحن</title>
          <style>
            html, body { margin: 0; padding: 0; height: 100%; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
            #status { padding: 16px; text-align: center; }
            iframe { border: 0; width: 100%; height: 100%; display: none; }
          </style>
        </head>
        <body>
          <div id="status">جاري تحميل البوليصة...</div>
          <iframe id="label-frame" src="about:blank"></iframe>
          <script>
            const frame = document.getElementById('label-frame');
            const statusEl = document.getElementById('status');
            fetch("${printUrl}", { credentials: "include" })
              .then((response) => response.blob())
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                frame.src = url;
                frame.style.display = "block";
                statusEl.style.display = "none";
                frame.onload = () => {
                  setTimeout(() => {
                    try {
                      frame.contentWindow && frame.contentWindow.focus();
                      frame.contentWindow && frame.contentWindow.print();
                    } catch (err) {
                      window.print();
                    }
                  }, 300);
                };
              })
              .catch(() => {
                statusEl.textContent = "تعذر تحميل البوليصة";
              });
          </script>
        </body>
      </html>
    `);
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
        const result = await (0, orderService_1.getOrderTracking)(orderId, req.user.id, req.user.roles, req.query);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map