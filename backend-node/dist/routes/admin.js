"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const adminService_1 = require("../services/adminService");
const productService_1 = require("../services/productService");
const auctionService_1 = require("../services/auctionService");
const errors_1 = require("../utils/errors");
const productTemplateService_1 = require("../services/productTemplateService");
const router = (0, express_1.Router)();
const adminOnly = (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] });
router.get("/dashboard", adminOnly, async (_req, res, next) => {
    try {
        const stats = await (0, adminService_1.getAdminDashboardStats)();
        res.json(stats);
    }
    catch (error) {
        next(error);
    }
});
router.get("/dashboard/moderation", adminOnly, async (_req, res, next) => {
    try {
        const queue = await (0, adminService_1.getAdminModerationQueue)();
        res.json(queue);
    }
    catch (error) {
        next(error);
    }
});
router.get("/users", adminOnly, async (_req, res, next) => {
    try {
        const users = await (0, adminService_1.listUsersForAdmin)();
        res.json(users);
    }
    catch (error) {
        next(error);
    }
});
router.patch("/users/:id", adminOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid user id");
        }
        const status = req.body?.status;
        if (typeof status !== "string") {
            throw errors_1.AppError.badRequest("Status is required");
        }
        const user = await (0, adminService_1.updateUserStatus)(id, status, req.user.roles);
        res.json(user);
    }
    catch (error) {
        next(error);
    }
});
router.get("/products/pending", adminOnly, async (_req, res, next) => {
    try {
        const products = await (0, adminService_1.listPendingProducts)();
        res.json(products);
    }
    catch (error) {
        next(error);
    }
});
router.patch("/products/:id/moderate", adminOnly, async (req, res, next) => {
    try {
        const productId = Number(req.params.id);
        if (Number.isNaN(productId)) {
            throw errors_1.AppError.badRequest("Invalid product id");
        }
        const action = req.body?.action;
        if (action !== "approve" && action !== "reject") {
            throw errors_1.AppError.badRequest("Invalid moderation action");
        }
        const product = await (0, productService_1.moderateProduct)(productId, action);
        res.json(product);
    }
    catch (error) {
        next(error);
    }
});
router.get("/products", adminOnly, async (req, res, next) => {
    try {
        const status = typeof req.query.status === "string" ? req.query.status : undefined;
        const products = await (0, adminService_1.listProductsForAdmin)(status);
        res.json(products);
    }
    catch (error) {
        next(error);
    }
});
router.patch("/products/:id/status", adminOnly, async (req, res, next) => {
    try {
        const productId = Number(req.params.id);
        if (Number.isNaN(productId)) {
            throw errors_1.AppError.badRequest("Invalid product id");
        }
        const status = req.body?.status;
        if (typeof status !== "string") {
            throw errors_1.AppError.badRequest("Status value is required");
        }
        const product = await (0, adminService_1.updateProductStatusAsAdmin)(productId, status);
        res.json(product);
    }
    catch (error) {
        next(error);
    }
});
router.get("/auctions", adminOnly, async (req, res, next) => {
    try {
        const statusParam = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
        const status = statusParam && Object.values(client_1.AuctionStatus).includes(statusParam)
            ? statusParam
            : undefined;
        const auctions = await (0, auctionService_1.listAuctions)({
            status,
        });
        res.json(auctions);
    }
    catch (error) {
        next(error);
    }
});
router.patch("/auctions/:id", adminOnly, async (req, res, next) => {
    try {
        const auctionId = Number(req.params.id);
        if (Number.isNaN(auctionId)) {
            throw errors_1.AppError.badRequest("Invalid auction id");
        }
        const auction = await (0, auctionService_1.updateAuction)(auctionId, {
            endTime: req.body?.endTime,
            status: req.body?.status,
        });
        res.json(auction);
    }
    catch (error) {
        next(error);
    }
});
router.get("/product-templates", adminOnly, async (req, res, next) => {
    try {
        const templates = await (0, productTemplateService_1.listProductTemplates)(req.query);
        res.json(templates);
    }
    catch (error) {
        next(error);
    }
});
router.post("/product-templates", adminOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const template = await (0, productTemplateService_1.createProductTemplate)({
            ...req.body,
            createdById: req.user.id,
        });
        res.status(201).json(template);
    }
    catch (error) {
        next(error);
    }
});
router.get("/product-templates/:id", adminOnly, async (req, res, next) => {
    try {
        const templateId = Number(req.params.id);
        if (Number.isNaN(templateId)) {
            throw errors_1.AppError.badRequest("Invalid template id");
        }
        const template = await (0, productTemplateService_1.getProductTemplateById)(templateId);
        res.json(template);
    }
    catch (error) {
        next(error);
    }
});
router.patch("/product-templates/:id", adminOnly, async (req, res, next) => {
    try {
        const templateId = Number(req.params.id);
        if (Number.isNaN(templateId)) {
            throw errors_1.AppError.badRequest("Invalid template id");
        }
        const template = await (0, productTemplateService_1.updateProductTemplate)(templateId, req.body);
        res.json(template);
    }
    catch (error) {
        next(error);
    }
});
router.delete("/product-templates/:id", adminOnly, async (req, res, next) => {
    try {
        const templateId = Number(req.params.id);
        if (Number.isNaN(templateId)) {
            throw errors_1.AppError.badRequest("Invalid template id");
        }
        await (0, productTemplateService_1.deleteProductTemplate)(templateId);
        res.status(204).end();
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map