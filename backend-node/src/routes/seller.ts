import { Router } from "express";
import { RoleName, AuctionStatus } from "@prisma/client";

import { authenticate } from "../middleware/auth";
import { createProduct, updateProduct } from "../services/productService";
import {
  getSellerDashboardStats,
  listSellerProductsWithFilters,
  listSellerOrders,
} from "../services/sellerService";
import { createAuction, listAuctions } from "../services/auctionService";
import { AppError } from "../utils/errors";

const router = Router();
const sellerRoles = [RoleName.SELLER, RoleName.ADMIN, RoleName.SUPER_ADMIN];
const sellerOnly = authenticate({ roles: sellerRoles });

router.get("/dashboard", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const stats = await getSellerDashboardStats(req.user.id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get("/products", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const filters = status ? { status } : {};
    const products = await listSellerProductsWithFilters(req.user.id, filters);
    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.post("/products", sellerOnly, async (req, res, next) => {
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

router.patch("/products/:id", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const productId = Number(req.params.id);
    if (Number.isNaN(productId)) {
      throw AppError.badRequest("Invalid product id");
    }

    const product = await updateProduct(productId, req.user.id, req.body);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.get("/orders", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const orders = await listSellerOrders(req.user.id, status);
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

router.get("/auctions", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const statusParam = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const status = statusParam && Object.values(AuctionStatus).includes(statusParam as AuctionStatus)
      ? (statusParam as AuctionStatus)
      : undefined;

    const auctions = await listAuctions({
      seller_id: req.user.id,
      status,
    });

    res.json(auctions);
  } catch (error) {
    next(error);
  }
});

router.post("/auctions", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const auction = await createAuction({
      sellerId: req.user.id,
      productId: Number(req.body?.productId),
      startingPrice: Number(req.body?.startingPrice),
      minimumIncrement: Number(req.body?.minimumIncrement ?? 10),
      startTime: req.body?.startTime ? new Date(req.body.startTime) : new Date(),
      endTime: req.body?.endTime ? new Date(req.body.endTime) : new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.status(201).json(auction);
  } catch (error) {
    next(error);
  }
});

export default router;
