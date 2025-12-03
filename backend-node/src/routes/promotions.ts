import { Router } from "express";
import { PromotionType, RoleName } from "@prisma/client";

import { authenticate } from "../middleware/auth";
import {
  createPromotion,
  deletePromotion,
  getActivePromotions,
  listPromotions,
  updatePromotion,
} from "../services/promotionService";
import { AppError } from "../utils/errors";

const router = Router();

router.get(
  "/",
  authenticate({ roles: [RoleName.ADMIN, RoleName.SUPER_ADMIN] }),
  async (_req, res, next) => {
    try {
      const promotions = await listPromotions();
      res.json(promotions);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/",
  authenticate({ roles: [RoleName.ADMIN, RoleName.SUPER_ADMIN] }),
  async (req, res, next) => {
    try {
      const promotion = await createPromotion(req.body);
      res.status(201).json(promotion);
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:id",
  authenticate({ roles: [RoleName.ADMIN, RoleName.SUPER_ADMIN] }),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        throw AppError.badRequest("Invalid promotion id");
      }
      const promotion = await updatePromotion(id, req.body);
      res.json(promotion);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  authenticate({ roles: [RoleName.ADMIN, RoleName.SUPER_ADMIN] }),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        throw AppError.badRequest("Invalid promotion id");
      }
      await deletePromotion(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

router.get("/public", async (req, res, next) => {
  try {
    const typesParam =
      typeof req.query.types === "string" ? req.query.types : undefined;
    const types = typesParam
      ? typesParam
          .split(",")
          .map((value) => value.trim().toUpperCase())
          .filter((value): value is PromotionType =>
            Object.keys(PromotionType).includes(value),
          )
      : undefined;
    const filters = types && types.length > 0 ? { types } : undefined;
    const promotions = await getActivePromotions(filters);
    res.json(promotions);
  } catch (error) {
    next(error);
  }
});

export default router;
