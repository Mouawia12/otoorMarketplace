"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const footerPageService_1 = require("../services/footerPageService");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.get("/", (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] }), async (_req, res, next) => {
    try {
        const pages = await (0, footerPageService_1.listFooterPages)();
        res.json({ pages });
    }
    catch (error) {
        next(error);
    }
});
router.get("/public", async (_req, res, next) => {
    try {
        const pages = await (0, footerPageService_1.getPublishedFooterPages)();
        res.json({ pages });
    }
    catch (error) {
        next(error);
    }
});
router.get("/public/:slug", async (req, res, next) => {
    try {
        const slug = req.params.slug;
        if (typeof slug !== "string") {
            throw errors_1.AppError.badRequest("Invalid slug");
        }
        const page = await (0, footerPageService_1.getPublishedFooterPage)(slug);
        if (!page) {
            throw errors_1.AppError.notFound("Footer page not published");
        }
        res.json({ page });
    }
    catch (error) {
        next(error);
    }
});
router.get("/:slug", (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] }), async (req, res, next) => {
    try {
        const slug = req.params.slug;
        if (typeof slug !== "string") {
            throw errors_1.AppError.badRequest("Invalid slug");
        }
        const page = await (0, footerPageService_1.getFooterPage)(slug);
        if (!page) {
            throw errors_1.AppError.notFound("Footer page not found");
        }
        res.json({ page });
    }
    catch (error) {
        next(error);
    }
});
router.put("/:slug/draft", (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] }), async (req, res, next) => {
    try {
        const slug = req.params.slug;
        if (typeof slug !== "string") {
            throw errors_1.AppError.badRequest("Invalid slug");
        }
        const content = req.body?.content;
        if (!content) {
            throw errors_1.AppError.badRequest("Missing footer page content");
        }
        const page = await (0, footerPageService_1.saveFooterPageDraft)(slug, content, req.user.id);
        res.json({ page });
    }
    catch (error) {
        next(error);
    }
});
router.post("/:slug/publish", (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] }), async (req, res, next) => {
    try {
        const slug = req.params.slug;
        if (typeof slug !== "string") {
            throw errors_1.AppError.badRequest("Invalid slug");
        }
        const page = await (0, footerPageService_1.publishFooterPage)(slug, req.user.id);
        res.json({ page });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=footerPages.js.map