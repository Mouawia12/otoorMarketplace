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
  deleteUserByAdmin,
  updateProductStatusAsAdmin,
} from "../services/adminService";
import { moderateProduct } from "../services/productService";
import { listAuctions, updateAuction } from "../services/auctionService";
import { AppError } from "../utils/errors";
import {
  createProductTemplate,
  deleteProductTemplate,
  getProductTemplateById,
  listProductTemplates,
  updateProductTemplate,
} from "../services/productTemplateService";
import {
  listAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from "../services/blogService";

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

router.delete("/users/:id", adminOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid user id");
    }
    const result = await deleteUserByAdmin(
      id,
      req.user.roles as RoleName[],
      req.user.id
    );
    res.json(result);
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

router.get("/product-templates", adminOnly, async (req, res, next) => {
  try {
    const templates = await listProductTemplates(req.query);
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

router.post("/product-templates", adminOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const template = await createProductTemplate({
      ...req.body,
      createdById: req.user.id,
    });
    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
});

router.get("/product-templates/:id", adminOnly, async (req, res, next) => {
  try {
    const templateId = Number(req.params.id);
    if (Number.isNaN(templateId)) {
      throw AppError.badRequest("Invalid template id");
    }
    const template = await getProductTemplateById(templateId);
    res.json(template);
  } catch (error) {
    next(error);
  }
});

router.patch("/product-templates/:id", adminOnly, async (req, res, next) => {
  try {
    const templateId = Number(req.params.id);
    if (Number.isNaN(templateId)) {
      throw AppError.badRequest("Invalid template id");
    }
    const template = await updateProductTemplate(templateId, req.body);
    res.json(template);
  } catch (error) {
    next(error);
  }
});

router.delete("/product-templates/:id", adminOnly, async (req, res, next) => {
  try {
    const templateId = Number(req.params.id);
    if (Number.isNaN(templateId)) {
      throw AppError.badRequest("Invalid template id");
    }
    await deleteProductTemplate(templateId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/blog", adminOnly, async (_req, res, next) => {
  try {
    const posts = await listAllPosts();
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

router.get("/blog/:id", adminOnly, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid post id");
    }
    const post = await getPostById(id);
    res.json(post);
  } catch (error) {
    next(error);
  }
});

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

router.post("/blog", adminOnly, async (req, res, next) => {
  try {
    const body = req.body || {};
    const post = await createPost({
      title: body.title,
      slug: body.slug,
      description: body.description,
      content: body.content,
      coverData: body.coverData,
      coverUrl: body.coverUrl,
      author: body.author,
      category: body.category,
      tags: toStringArray(body.tags),
      status: body.status?.toUpperCase(),
      lang: (body.lang || "ar").toLowerCase(),
    } as any);
    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

router.put("/blog/:id", adminOnly, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid post id");
    }
    const body = req.body || {};
    const post = await updatePost(id, {
      title: body.title,
      slug: body.slug,
      description: body.description,
      content: body.content,
      coverData: body.coverData,
      coverUrl: body.coverUrl,
      author: body.author,
      category: body.category,
      tags: toStringArray(body.tags),
      status: body.status?.toUpperCase(),
      lang: body.lang,
    } as any);
    res.json(post);
  } catch (error) {
    next(error);
  }
});

router.delete("/blog/:id", adminOnly, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid post id");
    }
    const result = await deletePost(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
