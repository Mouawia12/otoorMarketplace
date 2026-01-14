"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const productService_1 = require("../services/productService");
const sellerService_1 = require("../services/sellerService");
const auctionService_1 = require("../services/auctionService");
const errors_1 = require("../utils/errors");
const productTemplateService_1 = require("../services/productTemplateService");
const router = (0, express_1.Router)();
const sellerRoles = [client_1.RoleName.SELLER, client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN];
const sellerOnly = (0, auth_1.authenticate)({ roles: sellerRoles });
router.get("/dashboard", sellerOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const stats = await (0, sellerService_1.getSellerDashboardStats)(req.user.id);
        res.json(stats);
    }
    catch (error) {
        next(error);
    }
});
router.get("/products", sellerOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const status = typeof req.query.status === "string" ? req.query.status : undefined;
        const filters = status ? { status } : {};
        const products = await (0, sellerService_1.listSellerProductsWithFilters)(req.user.id, filters);
        res.json(products);
    }
    catch (error) {
        next(error);
    }
});
router.post("/products", sellerOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const product = await (0, productService_1.createProduct)({
            ...req.body,
            sellerId: req.user.id,
        }, { roles: req.user.roles });
        res.status(201).json(product);
    }
    catch (error) {
        next(error);
    }
});
router.patch("/products/:id", sellerOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const productId = Number(req.params.id);
        if (Number.isNaN(productId)) {
            throw errors_1.AppError.badRequest("Invalid product id");
        }
        const product = await (0, productService_1.updateProduct)(productId, req.user.id, req.body, {
            roles: req.user.roles,
        });
        res.json(product);
    }
    catch (error) {
        next(error);
    }
});
router.delete("/products/:id", sellerOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const productId = Number(req.params.id);
        if (Number.isNaN(productId)) {
            throw errors_1.AppError.badRequest("Invalid product id");
        }
        await (0, productService_1.deleteProduct)(productId, req.user.id);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
router.get("/orders", sellerOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const status = typeof req.query.status === "string" ? req.query.status : undefined;
        const orders = await (0, sellerService_1.listSellerOrders)(req.user.id, status);
        res.json(orders);
    }
    catch (error) {
        next(error);
    }
});
router.get("/earnings", sellerOnly, async (req, res, next) => {
    try {
        if (!req.user)
            throw errors_1.AppError.unauthorized();
        const { records, summary } = await (0, sellerService_1.listSellerEarnings)(req.user.id);
        const exportFormat = typeof req.query.export === "string" ? req.query.export.toLowerCase() : "";
        if (exportFormat === "csv" || exportFormat === "excel") {
            const header = [
                "id",
                "order_id",
                "date",
                "product_name",
                "product_name_ar",
                "amount",
                "commission",
                "net_earnings",
            ];
            const rows = records.map((r) => [
                r.id,
                r.orderId,
                r.date.toISOString(),
                `"${r.productName.replace(/"/g, '""')}"`,
                `"${r.productNameAr.replace(/"/g, '""')}"`,
                r.amount.toFixed(2),
                r.commission.toFixed(2),
                r.netEarnings.toFixed(2),
            ].join(","));
            const csv = [header.join(","), ...rows].join("\n");
            res.header("Content-Type", "text/csv");
            res.header("Content-Disposition", "attachment; filename=earnings.csv");
            return res.send(csv);
        }
        res.json({ records, summary });
    }
    catch (error) {
        next(error);
    }
});
router.get("/auctions", sellerOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const statusParam = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
        const status = statusParam && Object.values(client_1.AuctionStatus).includes(statusParam)
            ? statusParam
            : undefined;
        const auctions = await (0, auctionService_1.listAuctions)({
            seller_id: req.user.id,
            status,
            include_pending: true,
        });
        res.json(auctions);
    }
    catch (error) {
        next(error);
    }
});
router.get("/product-templates", sellerOnly, async (req, res, next) => {
    try {
        const result = await (0, productTemplateService_1.listProductTemplates)(req.query);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/product-templates/:id", sellerOnly, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid template id");
        }
        const template = await (0, productTemplateService_1.getProductTemplateById)(id);
        res.json(template);
    }
    catch (error) {
        next(error);
    }
});
router.post("/auctions", sellerOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const auction = await (0, auctionService_1.createAuction)({
            sellerId: req.user.id,
            productId: Number(req.body?.productId),
            startingPrice: Number(req.body?.startingPrice),
            minimumIncrement: Number(req.body?.minimumIncrement ?? 10),
            startTime: req.body?.startTime ? new Date(req.body.startTime) : new Date(),
            endTime: req.body?.endTime ? new Date(req.body.endTime) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        res.status(201).json(auction);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=seller.js.map