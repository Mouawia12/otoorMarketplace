"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const sellerProfileService_1 = require("../services/sellerProfileService");
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.get("/me", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user)
            throw errors_1.AppError.unauthorized();
        const profile = await (0, sellerProfileService_1.getSellerProfile)(req.user.id);
        res.json({ profile });
    }
    catch (error) {
        next(error);
    }
});
router.post("/me", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user)
            throw errors_1.AppError.unauthorized();
        const profile = await (0, sellerProfileService_1.upsertSellerProfile)(req.user.id, req.body);
        res.status(201).json(profile);
    }
    catch (error) {
        next(error);
    }
});
router.get("/", (0, auth_1.authenticate)({ roles: ["ADMIN", "SUPER_ADMIN"] }), async (req, res, next) => {
    try {
        const status = req.query.status?.toString().toUpperCase();
        const profiles = await (0, sellerProfileService_1.listSellerProfiles)(status);
        res.json({ profiles });
    }
    catch (error) {
        next(error);
    }
});
router.patch("/:userId/status", (0, auth_1.authenticate)({ roles: ["ADMIN", "SUPER_ADMIN"] }), async (req, res, next) => {
    try {
        const userId = Number(req.params.userId);
        if (Number.isNaN(userId))
            throw errors_1.AppError.badRequest("Invalid user id");
        const statusRaw = req.body?.status;
        if (typeof statusRaw !== "string")
            throw errors_1.AppError.badRequest("Status is required");
        const status = statusRaw.toUpperCase();
        if (!Object.values(client_1.SellerStatus).includes(status)) {
            throw errors_1.AppError.badRequest("Invalid status");
        }
        const profile = await (0, sellerProfileService_1.updateSellerProfileStatus)(userId, status);
        res.json(profile);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=sellerProfile.js.map