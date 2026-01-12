import { Router } from "express";

import {
  listProducts,
  getProductById,
  getRelatedProducts,
  createProduct,
  getProductFiltersMeta,
  listProductSuggestions,
} from "../services/productService";
import {
  createProductReview,
  listProductReviews,
} from "../services/reviewService";
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

router.get("/meta", async (_req, res, next) => {
  try {
    const meta = await getProductFiltersMeta();
    res.json(meta);
  } catch (error) {
    next(error);
  }
});

router.get("/suggestions", async (req, res, next) => {
  try {
    const suggestions = await listProductSuggestions(req.query);
    res.json({ suggestions });
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

router.get("/:id/reviews", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid product id");
    }

    const reviews = await listProductReviews(id);
    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/reviews", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid product id");
    }

    const rating = Number(req.body?.rating);
    const orderId = Number(req.body?.order_id);
    const comment = typeof req.body?.comment === "string" ? req.body.comment : undefined;

    const review = await createProductReview({
      userId: req.user.id,
      productId: id,
      orderId,
      rating,
      comment,
    });

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate({ roles: ["SELLER", "ADMIN", "SUPER_ADMIN"] }), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const product = await createProduct(
      {
        ...req.body,
        sellerId: req.user.id,
      },
      { roles: req.user.roles as RoleName[] }
    );

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

export default router;
