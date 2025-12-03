"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const couponService_1 = require("../services/couponService");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
const resolveAccess = (roles) => {
    const isAdmin = roles.includes(client_1.RoleName.ADMIN) || roles.includes(client_1.RoleName.SUPER_ADMIN);
    const isSeller = roles.includes(client_1.RoleName.SELLER);
    return { isAdmin, isSeller };
};
router.get("/", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const { isAdmin, isSeller } = resolveAccess(req.user.roles);
        if (!isAdmin && !isSeller) {
            throw errors_1.AppError.forbidden();
        }
        const sellerScope = !isAdmin ? req.user.id : undefined;
        const coupons = await (0, couponService_1.listCoupons)(sellerScope ? { sellerId: sellerScope } : undefined);
        res.json(coupons);
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
        const { isAdmin, isSeller } = resolveAccess(req.user.roles);
        if (!isAdmin && !isSeller) {
            throw errors_1.AppError.forbidden();
        }
        const sellerScope = !isAdmin && isSeller ? req.user.id : undefined;
        const coupon = await (0, couponService_1.createCoupon)(req.body, sellerScope ? { sellerId: sellerScope } : undefined);
        res.status(201).json(coupon);
    }
    catch (error) {
        next(error);
    }
});
router.patch("/:id", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const couponId = Number(req.params.id);
        if (Number.isNaN(couponId)) {
            throw errors_1.AppError.badRequest("رقم الكوبون غير صالح");
        }
        const { isAdmin, isSeller } = resolveAccess(req.user.roles);
        if (!isAdmin && !isSeller) {
            throw errors_1.AppError.forbidden();
        }
        const sellerScope = !isAdmin && isSeller ? req.user.id : undefined;
        const coupon = await (0, couponService_1.updateCoupon)(couponId, req.body, sellerScope ? { sellerId: sellerScope } : undefined);
        res.json(coupon);
    }
    catch (error) {
        next(error);
    }
});
router.delete("/:id", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const couponId = Number(req.params.id);
        if (Number.isNaN(couponId)) {
            throw errors_1.AppError.badRequest("رقم الكوبون غير صالح");
        }
        const { isAdmin, isSeller } = resolveAccess(req.user.roles);
        if (!isAdmin && !isSeller) {
            throw errors_1.AppError.forbidden();
        }
        const sellerScope = !isAdmin && isSeller ? req.user.id : undefined;
        await (0, couponService_1.deleteCoupon)(couponId, sellerScope ? { sellerId: sellerScope } : undefined);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
router.post("/validate", async (req, res, next) => {
    try {
        const payload = await (0, couponService_1.validateCoupon)(req.body);
        res.json(payload);
    }
    catch (error) {
        next(error);
    }
});
router.post("/redeem", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        const payload = await (0, couponService_1.redeemCoupon)(req.body);
        res.json(payload);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=coupons.js.map