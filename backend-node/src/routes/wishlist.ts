import { Router } from "express";

import { authenticate } from "../middleware/auth";
import {
  addToWishlist,
  removeFromWishlist,
  listWishlist,
} from "../services/wishlistService";
import { AppError } from "../utils/errors";

const router = Router();

router.get("/", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const items = await listWishlist(req.user.id);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const item = await addToWishlist({
      userId: req.user.id,
      productId: Number(req.body.productId),
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

router.delete("/:productId", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const productId = Number(req.params.productId);
    if (Number.isNaN(productId)) {
      throw AppError.badRequest("Invalid product id");
    }
    await removeFromWishlist({
      userId: req.user.id,
      productId,
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
