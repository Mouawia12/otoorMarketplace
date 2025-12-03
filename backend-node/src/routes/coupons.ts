import { Router } from "express";
import { RoleName } from "@prisma/client";

import { authenticate } from "../middleware/auth";
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  redeemCoupon,
  updateCoupon,
  validateCoupon,
} from "../services/couponService";
import { AppError } from "../utils/errors";

const router = Router();

const resolveAccess = (roles: RoleName[]) => {
  const isAdmin =
    roles.includes(RoleName.ADMIN) || roles.includes(RoleName.SUPER_ADMIN);
  const isSeller = roles.includes(RoleName.SELLER);
  return { isAdmin, isSeller };
};

router.get("/", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const { isAdmin, isSeller } = resolveAccess(
      req.user.roles as RoleName[],
    );
    if (!isAdmin && !isSeller) {
      throw AppError.forbidden();
    }

    const sellerScope = !isAdmin ? req.user.id : undefined;
    const coupons = await listCoupons(
      sellerScope ? { sellerId: sellerScope } : undefined,
    );
    res.json(coupons);
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const { isAdmin, isSeller } = resolveAccess(
      req.user.roles as RoleName[],
    );
    if (!isAdmin && !isSeller) {
      throw AppError.forbidden();
    }

    const sellerScope = !isAdmin && isSeller ? req.user.id : undefined;
    const coupon = await createCoupon(
      req.body,
      sellerScope ? { sellerId: sellerScope } : undefined,
    );
    res.status(201).json(coupon);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const couponId = Number(req.params.id);
    if (Number.isNaN(couponId)) {
      throw AppError.badRequest("رقم الكوبون غير صالح");
    }
    const { isAdmin, isSeller } = resolveAccess(
      req.user.roles as RoleName[],
    );
    if (!isAdmin && !isSeller) {
      throw AppError.forbidden();
    }
    const sellerScope = !isAdmin && isSeller ? req.user.id : undefined;
    const coupon = await updateCoupon(
      couponId,
      req.body,
      sellerScope ? { sellerId: sellerScope } : undefined,
    );
    res.json(coupon);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const couponId = Number(req.params.id);
    if (Number.isNaN(couponId)) {
      throw AppError.badRequest("رقم الكوبون غير صالح");
    }
    const { isAdmin, isSeller } = resolveAccess(
      req.user.roles as RoleName[],
    );
    if (!isAdmin && !isSeller) {
      throw AppError.forbidden();
    }
    const sellerScope = !isAdmin && isSeller ? req.user.id : undefined;
    await deleteCoupon(
      couponId,
      sellerScope ? { sellerId: sellerScope } : undefined,
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/validate", async (req, res, next) => {
  try {
    const payload = await validateCoupon(req.body);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.post("/redeem", authenticate(), async (req, res, next) => {
  try {
    const payload = await redeemCoupon(req.body);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;
