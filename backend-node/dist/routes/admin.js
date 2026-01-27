"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const adminService_1 = require("../services/adminService");
const productService_1 = require("../services/productService");
const auctionService_1 = require("../services/auctionService");
const errors_1 = require("../utils/errors");
const productTemplateService_1 = require("../services/productTemplateService");
const blogService_1 = require("../services/blogService");
const auditLogService_1 = require("../services/auditLogService");
const settingService_1 = require("../services/settingService");
const perfumeImportService_1 = require("../services/perfumeImportService");
const uploads_1 = require("../utils/uploads");
const router = (0, express_1.Router)();
const adminOnly = (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] });
const perfumeImportDir = path_1.default.join((0, uploads_1.getUploadRoot)(), "perfume-imports");
if (!fs_1.default.existsSync(perfumeImportDir)) {
    fs_1.default.mkdirSync(perfumeImportDir, { recursive: true });
}
const importStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, perfumeImportDir),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || ".csv";
        const baseName = path_1.default
            .basename(file.originalname, ext)
            .toLowerCase()
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "");
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${baseName || "perfumes"}-${uniqueSuffix}${ext}`);
    },
});
const allowedImportTypes = new Set([
    "text/csv",
    "text/plain",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const importUpload = (0, multer_1.default)({
    storage: importStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedImportTypes.has(file.mimetype) || ext === ".csv" || ext === ".xlsx") {
            cb(null, true);
            return;
        }
        cb(errors_1.AppError.badRequest("Only CSV or XLSX files are allowed"));
    },
});
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
router.get("/users", adminOnly, async (req, res, next) => {
    try {
        const users = await (0, adminService_1.listUsersForAdmin)(req.query);
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
        const products = await (0, adminService_1.listProductsForAdmin)(req.query);
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
router.delete("/products/:id", adminOnly, async (req, res, next) => {
    try {
        const productId = Number(req.params.id);
        if (Number.isNaN(productId)) {
            throw errors_1.AppError.badRequest("Invalid product id");
        }
        await (0, productService_1.deleteProductAsAdmin)(productId);
        await logAdminAction(req, {
            action: "product.delete",
            targetType: "product",
            targetId: productId,
            description: `Deleted product ${productId}`,
        });
        res.json({ success: true });
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
            scope: "admin",
            include_pending: true,
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
        const result = await (0, productTemplateService_1.listProductTemplates)(req.query);
        res.json(result);
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
router.post("/perfumes/import", adminOnly, (0, rateLimit_1.rateLimit)({ windowMs: 10 * 60 * 1000, max: 5, keyGenerator: (req) => `${req.ip}-${req.user?.id ?? "admin"}` }), importUpload.single("file"), async (req, res, next) => {
    try {
        if (!req.file) {
            throw errors_1.AppError.badRequest("No import file received");
        }
        const modeParam = typeof req.body?.mode === "string" ? req.body.mode.toLowerCase() : "insert_only";
        const mode = modeParam === "replace"
            ? client_1.PerfumeImportMode.REPLACE
            : modeParam === "upsert"
                ? client_1.PerfumeImportMode.UPSERT
                : client_1.PerfumeImportMode.INSERT_ONLY;
        const downloadImages = typeof req.body?.downloadImages === "string"
            ? req.body.downloadImages.toLowerCase() === "true"
            : Boolean(req.body?.downloadImages);
        const job = await (0, perfumeImportService_1.createPerfumeImportJob)({
            storedFilename: req.file.filename,
            filePath: req.file.path,
            originalFilename: req.file.originalname,
            mode,
            downloadImages,
            createdById: req.user?.id ?? null,
        });
        await logAdminAction(req, {
            action: "perfume.import",
            targetType: "perfume_import",
            targetId: job.id,
            description: `Started perfume import ${job.id}`,
            metadata: { mode: mode.toLowerCase(), filename: req.file.originalname },
        });
        res.status(202).json({ jobId: job.id });
    }
    catch (error) {
        next(error);
    }
});
router.get("/perfumes/import/:jobId/status", adminOnly, async (req, res, next) => {
    try {
        const jobId = Number(req.params.jobId);
        if (Number.isNaN(jobId)) {
            throw errors_1.AppError.badRequest("Invalid job id");
        }
        const status = await (0, perfumeImportService_1.getPerfumeImportStatus)(jobId);
        res.json(status);
    }
    catch (error) {
        next(error);
    }
});
router.get("/perfumes/import/:jobId/errors.csv", adminOnly, async (req, res, next) => {
    try {
        const jobId = Number(req.params.jobId);
        if (Number.isNaN(jobId)) {
            throw errors_1.AppError.badRequest("Invalid job id");
        }
        const filePath = await (0, perfumeImportService_1.getPerfumeImportErrorsPath)(jobId);
        res.download(filePath, `perfume-import-${jobId}-errors.csv`);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map