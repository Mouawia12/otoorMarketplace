"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const wishlistService_1 = require("../services/wishlistService");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.get("/", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const items = await (0, wishlistService_1.listWishlist)(req.user.id);
        res.json({ items });
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
        const item = await (0, wishlistService_1.addToWishlist)({
            userId: req.user.id,
            productId: Number(req.body.productId),
        });
        res.status(201).json(item);
    }
    catch (error) {
        next(error);
    }
});
router.delete("/:productId", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const productId = Number(req.params.productId);
        if (Number.isNaN(productId)) {
            throw errors_1.AppError.badRequest("Invalid product id");
        }
        await (0, wishlistService_1.removeFromWishlist)({
            userId: req.user.id,
            productId,
        });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=wishlist.js.map