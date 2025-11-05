import { Router } from "express";

import {
  listProducts,
  getProductById,
  getRelatedProducts,
  createProduct,
} from "../services/productService";
import { authenticate } from "../middleware/auth";
import { AppError } from "../utils/errors";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const result = await listProducts(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid product id");
    }
    const product = await getProductById(id);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/related", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid product id");
    }
    const limit = req.query.limit ? Number(req.query.limit) : 4;
    const related = await getRelatedProducts(id, Number.isNaN(limit) ? 4 : limit);
    res.json({ products: related });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate({ roles: ["SELLER", "ADMIN", "SUPER_ADMIN"] }), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const product = await createProduct({
      ...req.body,
      sellerId: req.user.id,
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

export default router;
