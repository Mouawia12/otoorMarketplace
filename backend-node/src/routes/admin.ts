import { Router } from "express";
import { RoleName, AuctionStatus } from "@prisma/client";

import { authenticate } from "../middleware/auth";
import {
  getAdminDashboardStats,
  getAdminModerationQueue,
  listPendingProducts,
  listProductsForAdmin,
  listUsersForAdmin,
  updateUserStatus,
  updateProductStatusAsAdmin,
} from "../services/adminService";
import { moderateProduct } from "../services/productService";
import { listAuctions, updateAuction } from "../services/auctionService";
import { AppError } from "../utils/errors";

const router = Router();

const adminOnly = authenticate({ roles: [RoleName.ADMIN, RoleName.SUPER_ADMIN] });

router.get("/dashboard", adminOnly, async (_req, res, next) => {
  try {
    const stats = await getAdminDashboardStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard/moderation", adminOnly, async (_req, res, next) => {
  try {
    const queue = await getAdminModerationQueue();
    res.json(queue);
  } catch (error) {
    next(error);
  }
});

router.get("/users", adminOnly, async (_req, res, next) => {
  try {
    const users = await listUsersForAdmin();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id", adminOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid user id");
    }
    const status = req.body?.status;
    if (typeof status !== "string") {
      throw AppError.badRequest("Status is required");
    }

    const user = await updateUserStatus(
      id,
      status,
      req.user.roles as RoleName[]
    );
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get("/products/pending", adminOnly, async (_req, res, next) => {
  try {
    const products = await listPendingProducts();
    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.patch("/products/:id/moderate", adminOnly, async (req, res, next) => {
  try {
    const productId = Number(req.params.id);
    if (Number.isNaN(productId)) {
      throw AppError.badRequest("Invalid product id");
    }

    const action = req.body?.action;
    if (action !== "approve" && action !== "reject") {
      throw AppError.badRequest("Invalid moderation action");
    }

    const product = await moderateProduct(productId, action);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.get("/products", adminOnly, async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const products = await listProductsForAdmin(status);
    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.patch("/products/:id/status", adminOnly, async (req, res, next) => {
  try {
    const productId = Number(req.params.id);
    if (Number.isNaN(productId)) {
      throw AppError.badRequest("Invalid product id");
    }
    const status = req.body?.status;
    if (typeof status !== "string") {
      throw AppError.badRequest("Status value is required");
    }
    const product = await updateProductStatusAsAdmin(productId, status);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.get("/auctions", adminOnly, async (req, res, next) => {
  try {
    const statusParam = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const status = statusParam && Object.values(AuctionStatus).includes(statusParam as AuctionStatus)
      ? (statusParam as AuctionStatus)
      : undefined;

    const auctions = await listAuctions({
      status,
    });
    res.json(auctions);
  } catch (error) {
    next(error);
  }
});

router.patch("/auctions/:id", adminOnly, async (req, res, next) => {
  try {
    const auctionId = Number(req.params.id);
    if (Number.isNaN(auctionId)) {
      throw AppError.badRequest("Invalid auction id");
    }

    const auction = await updateAuction(auctionId, {
      endTime: req.body?.endTime,
      status: req.body?.status,
    });

    res.json(auction);
  } catch (error) {
    next(error);
  }
});

export default router;
