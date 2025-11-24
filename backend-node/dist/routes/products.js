"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productService_1 = require("../services/productService");
const reviewService_1 = require("../services/reviewService");
const auth_1 = require("../middleware/auth");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.get("/", async (req, res, next) => {
    try {
        const result = await (0, productService_1.listProducts)(req.query);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/meta", async (_req, res, next) => {
    try {
        const meta = await (0, productService_1.getProductFiltersMeta)();
        res.json(meta);
    }
    catch (error) {
        next(error);
    }
});
router.get("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid product id");
        }
        const product = await (0, productService_1.getProductById)(id);
        res.json(product);
    }
    catch (error) {
        next(error);
    }
});
router.get("/:id/related", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid product id");
        }
        const limit = req.query.limit ? Number(req.query.limit) : 4;
        const related = await (0, productService_1.getRelatedProducts)(id, Number.isNaN(limit) ? 4 : limit);
        res.json({ products: related });
    }
    catch (error) {
        next(error);
    }
});
router.get("/:id/reviews", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid product id");
        }
        const reviews = await (0, reviewService_1.listProductReviews)(id);
        res.json(reviews);
    }
    catch (error) {
        next(error);
    }
});
router.post("/:id/reviews", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid product id");
        }
        const rating = Number(req.body?.rating);
        const orderId = Number(req.body?.order_id);
        const comment = typeof req.body?.comment === "string" ? req.body.comment : undefined;
        const review = await (0, reviewService_1.createProductReview)({
            userId: req.user.id,
            productId: id,
            orderId,
            rating,
            comment,
        });
        res.status(201).json(review);
    }
    catch (error) {
        next(error);
    }
});
router.post("/", (0, auth_1.authenticate)({ roles: ["SELLER", "ADMIN", "SUPER_ADMIN"] }), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const product = await (0, productService_1.createProduct)({
            ...req.body,
            sellerId: req.user.id,
        });
        res.status(201).json(product);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map