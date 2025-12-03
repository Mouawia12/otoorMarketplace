"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const promotionService_1 = require("../services/promotionService");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.get("/", (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] }), async (_req, res, next) => {
    try {
        const promotions = await (0, promotionService_1.listPromotions)();
        res.json(promotions);
    }
    catch (error) {
        next(error);
    }
});
router.post("/", (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] }), async (req, res, next) => {
    try {
        const promotion = await (0, promotionService_1.createPromotion)(req.body);
        res.status(201).json(promotion);
    }
    catch (error) {
        next(error);
    }
});
router.patch("/:id", (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] }), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid promotion id");
        }
        const promotion = await (0, promotionService_1.updatePromotion)(id, req.body);
        res.json(promotion);
    }
    catch (error) {
        next(error);
    }
});
router.delete("/:id", (0, auth_1.authenticate)({ roles: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] }), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid promotion id");
        }
        await (0, promotionService_1.deletePromotion)(id);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
router.get("/public", async (req, res, next) => {
    try {
        const typesParam = typeof req.query.types === "string" ? req.query.types : undefined;
        const types = typesParam
            ? typesParam
                .split(",")
                .map((value) => value.trim().toUpperCase())
                .filter((value) => Object.keys(client_1.PromotionType).includes(value))
            : undefined;
        const filters = types && types.length > 0 ? { types } : undefined;
        const promotions = await (0, promotionService_1.getActivePromotions)(filters);
        res.json(promotions);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=promotions.js.map