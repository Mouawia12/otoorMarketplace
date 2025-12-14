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
const auditLogService_1 = require("../services/auditLogService");
const settingService_1 = require("../services/settingService");
const router = (0, express_1.Router)();
const adminOnly = (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] });
const logAdminAction = async (req, details) => {
    if (!req.user) {
        return;
    }
    const payload = {
        actorId: req.user.id,
        action: details.action,
        targetType: details.targetType,
        targetId: details.targetId,
        description: details.description,
        metadata: details.metadata,
    };
    await (0, auditLogService_1.safeRecordAdminAuditLog)(typeof req.ip === "string" && req.ip.length > 0
        ? { ...payload, ipAddress: req.ip }
        : payload);
};
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
router.get("/audit-logs", adminOnly, async (req, res, next) => {
    try {
        const logs = await (0, auditLogService_1.listAdminAuditLogs)(req.query);
        res.json(logs);
    }
    catch (error) {
        next(error);
    }
});
router.get("/settings/bank-transfer", adminOnly, async (_req, res, next) => {
    try {
        const settings = await (0, settingService_1.getBankTransferSettings)();
        res.json(settings);
    }
    catch (error) {
        next(error);
    }
});
router.put("/settings/bank-transfer", adminOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const settings = await (0, settingService_1.updateBankTransferSettings)(req.body);
        await logAdminAction(req, {
            action: "settings.update",
            targetType: "settings",
            description: "Updated bank transfer settings",
        });
        res.json(settings);
    }
    catch (error) {
        next(error);
    }
});
router.get("/settings/platform", adminOnly, async (_req, res, next) => {
    try {
        const settings = await (0, settingService_1.getPlatformSettings)();
        res.json(settings);
    }
    catch (error) {
        next(error);
    }
});
router.put("/settings/platform", adminOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const settings = await (0, settingService_1.updatePlatformSettings)(req.body);
        await logAdminAction(req, {
            action: "settings.update",
            targetType: "settings",
            description: "Updated platform settings",
        });
        res.json(settings);
    }
    catch (error) {
        next(error);
    }
});
router.get("/settings/social-links", adminOnly, async (_req, res, next) => {
    try {
        const links = await (0, settingService_1.getSocialLinks)();
        res.json(links);
    }
    catch (error) {
        next(error);
    }
});
router.put("/settings/social-links", adminOnly, async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const links = await (0, settingService_1.updateSocialLinks)(req.body ?? {});
        await logAdminAction(req, {
            action: "settings.update",
            targetType: "settings",
            description: "Updated social media links",
            metadata: { section: "social_links" },
        });
        res.json(links);
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
        const auditContext = typeof req.ip === "string" && req.ip.length > 0
            ? { actorId: req.user.id, ipAddress: req.ip }
            : { actorId: req.user.id };
        const user = await (0, adminService_1.updateUserStatus)(id, payload, req.user.roles, auditContext);
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
        await logAdminAction(req, {
            action: "user.delete",
            targetType: "user",
            targetId: id,
            description: `Deleted user ${id}`,
        });
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
        await logAdminAction(req, {
            action: "product.moderate",
            targetType: "product",
            targetId: productId,
            description: `Moderated product ${productId} with action ${action}`,
            metadata: { action },
        });
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
        await logAdminAction(req, {
            action: "product.status",
            targetType: "product",
            targetId: productId,
            description: `Changed product ${productId} status to ${status}`,
        });
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
        await logAdminAction(req, {
            action: "auction.update",
            targetType: "auction",
            targetId: auctionId,
            description: `Updated auction ${auctionId}`,
            metadata: req.body,
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
        await logAdminAction(req, {
            action: "template.create",
            targetType: "product_template",
            targetId: template.id,
            description: `Created template ${template.id}`,
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
        await logAdminAction(req, {
            action: "template.update",
            targetType: "product_template",
            targetId: templateId,
            description: `Updated template ${templateId}`,
            metadata: req.body,
        });
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
        await logAdminAction(req, {
            action: "template.delete",
            targetType: "product_template",
            targetId: templateId,
            description: `Deleted template ${templateId}`,
        });
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
        await logAdminAction(req, {
            action: "blog.create",
            targetType: "blog_post",
            targetId: post.id,
            description: `Created blog post ${post.id}`,
        });
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
        await logAdminAction(req, {
            action: "blog.update",
            targetType: "blog_post",
            targetId: id,
            description: `Updated blog post ${id}`,
        });
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
        await logAdminAction(req, {
            action: "blog.delete",
            targetType: "blog_post",
            targetId: id,
            description: `Deleted blog post ${id}`,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map