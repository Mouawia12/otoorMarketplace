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
const blogService_1 = require("../services/blogService");
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
        const payload = {};
        if ("status" in req.body) {
            if (typeof req.body.status !== "string") {
                throw errors_1.AppError.badRequest("Status must be a string");
            }
            payload.status = req.body.status;
        }
        if ("seller_status" in req.body) {
            if (typeof req.body.seller_status !== "string") {
                throw errors_1.AppError.badRequest("Seller status must be a string");
            }
            payload.seller_status = req.body.seller_status;
        }
        if ("roles" in req.body) {
            if (!Array.isArray(req.body.roles)) {
                throw errors_1.AppError.badRequest("Roles must be an array");
            }
            payload.roles = req.body.roles;
        }
        if (payload.status === undefined &&
            payload.seller_status === undefined &&
            payload.roles === undefined) {
            throw errors_1.AppError.badRequest("No valid fields provided");
        }
        const user = await (0, adminService_1.updateUserStatus)(id, payload, req.user.roles);
        res.json(user);
    }
    catch (error) {
        next(error);
    }
});
router.delete("/users/:id", adminOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid user id");
        }
        const result = await (0, adminService_1.deleteUserByAdmin)(id, req.user.roles, req.user.id);
        res.json(result);
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
router.get("/blog", adminOnly, async (_req, res, next) => {
    try {
        const posts = await (0, blogService_1.listAllPosts)();
        res.json(posts);
    }
    catch (error) {
        next(error);
    }
});
router.get("/blog/:id", adminOnly, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid post id");
        }
        const post = await (0, blogService_1.getPostById)(id);
        res.json(post);
    }
    catch (error) {
        next(error);
    }
});
const toStringArray = (value) => {
    if (Array.isArray(value)) {
        return value.map((v) => String(v)).filter(Boolean);
    }
    if (typeof value === "string") {
        return value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
    }
    return [];
};
router.post("/blog", adminOnly, async (req, res, next) => {
    try {
        const body = req.body || {};
        const post = await (0, blogService_1.createPost)({
            title: body.title,
            slug: body.slug,
            description: body.description,
            content: body.content,
            coverData: body.coverData,
            coverUrl: body.coverUrl,
            author: body.author,
            category: body.category,
            tags: toStringArray(body.tags),
            status: body.status?.toUpperCase(),
            lang: (body.lang || "ar").toLowerCase(),
        });
        res.status(201).json(post);
    }
    catch (error) {
        next(error);
    }
});
router.put("/blog/:id", adminOnly, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid post id");
        }
        const body = req.body || {};
        const post = await (0, blogService_1.updatePost)(id, {
            title: body.title,
            slug: body.slug,
            description: body.description,
            content: body.content,
            coverData: body.coverData,
            coverUrl: body.coverUrl,
            author: body.author,
            category: body.category,
            tags: toStringArray(body.tags),
            status: body.status?.toUpperCase(),
            lang: body.lang,
        });
        res.json(post);
    }
    catch (error) {
        next(error);
    }
});
router.delete("/blog/:id", adminOnly, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid post id");
        }
        const result = await (0, blogService_1.deletePost)(id);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map