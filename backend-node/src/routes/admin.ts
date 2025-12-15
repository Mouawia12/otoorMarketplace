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
import { listAdminAuditLogs, safeRecordAdminAuditLog } from "../services/auditLogService";
import {
  getBankTransferSettings,
  getPlatformSettings,
  getSocialLinks,
  updateBankTransferSettings,
  updatePlatformSettings,
  updateSocialLinks,
} from "../services/settingService";

const router = Router();

const adminOnly = authenticate({ roles: [RoleName.ADMIN, RoleName.SUPER_ADMIN] });

type AuditDetails = {
  action: string;
  targetType: string;
  targetId?: number;
  description?: string;
  metadata?: Record<string, unknown>;
};

const logAdminAction = async (req: any, details: AuditDetails) => {
  if (!req.user) {
    return;
  }
  const payload = {
    actorId: req.user.id,
    action: details.action,
    targetType: details.targetType,
    targetId: details.targetId,
    description: details.description,
    metadata: details.metadata,
  };

  await safeRecordAdminAuditLog(
    typeof req.ip === "string" && req.ip.length > 0
      ? { ...payload, ipAddress: req.ip }
      : payload
  );
};

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

router.get("/audit-logs", adminOnly, async (req, res, next) => {
  try {
    const logs = await listAdminAuditLogs(req.query);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

router.get("/settings/bank-transfer", adminOnly, async (_req, res, next) => {
  try {
    const settings = await getBankTransferSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

router.put("/settings/bank-transfer", adminOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const settings = await updateBankTransferSettings(req.body);
    await logAdminAction(req, {
      action: "settings.update",
      targetType: "settings",
      description: "Updated bank transfer settings",
    });
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

router.get("/settings/platform", adminOnly, async (_req, res, next) => {
  try {
    const settings = await getPlatformSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

router.put("/settings/platform", adminOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const settings = await updatePlatformSettings(req.body);
    await logAdminAction(req, {
      action: "settings.update",
      targetType: "settings",
      description: "Updated platform settings",
    });
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

router.get("/settings/social-links", adminOnly, async (_req, res, next) => {
  try {
    const links = await getSocialLinks();
    res.json(links);
  } catch (error) {
    next(error);
  }
});

router.put("/settings/social-links", adminOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const links = await updateSocialLinks(req.body ?? {});
    await logAdminAction(req, {
      action: "settings.update",
      targetType: "settings",
      description: "Updated social media links",
      metadata: { section: "social_links" },
    });
    res.json(links);
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
    const payload: {
      status?: string;
      seller_status?: string;
      roles?: string[];
    } = {};

    if ("status" in req.body) {
      if (typeof req.body.status !== "string") {
        throw AppError.badRequest("Status must be a string");
      }
      payload.status = req.body.status;
    }

    if ("seller_status" in req.body) {
      if (typeof req.body.seller_status !== "string") {
        throw AppError.badRequest("Seller status must be a string");
      }
      payload.seller_status = req.body.seller_status;
    }

    if ("roles" in req.body) {
      if (!Array.isArray(req.body.roles)) {
        throw AppError.badRequest("Roles must be an array");
      }
      payload.roles = req.body.roles as string[];
    }

    if (
      payload.status === undefined &&
      payload.seller_status === undefined &&
      payload.roles === undefined
    ) {
      throw AppError.badRequest("No valid fields provided");
    }

    const auditContext =
      typeof req.ip === "string" && req.ip.length > 0
        ? { actorId: req.user.id, ipAddress: req.ip }
        : { actorId: req.user.id };
    const user = await updateUserStatus(id, payload, req.user.roles as RoleName[], auditContext);

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

    await logAdminAction(req, {
      action: "user.delete",
      targetType: "user",
      targetId: id,
      description: `Deleted user ${id}`,
    });

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

    await logAdminAction(req, {
      action: "product.moderate",
      targetType: "product",
      targetId: productId,
      description: `Moderated product ${productId} with action ${action}`,
      metadata: { action },
    });

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

    await logAdminAction(req, {
      action: "product.status",
      targetType: "product",
      targetId: productId,
      description: `Changed product ${productId} status to ${status}`,
    });

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
      include_pending: true,
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

    await logAdminAction(req, {
      action: "auction.update",
      targetType: "auction",
      targetId: auctionId,
      description: `Updated auction ${auctionId}`,
      metadata: req.body,
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

    await logAdminAction(req, {
      action: "template.create",
      targetType: "product_template",
      targetId: template.id,
      description: `Created template ${template.id}`,
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

    await logAdminAction(req, {
      action: "template.update",
      targetType: "product_template",
      targetId: templateId,
      description: `Updated template ${templateId}`,
      metadata: req.body,
    });

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

    await logAdminAction(req, {
      action: "template.delete",
      targetType: "product_template",
      targetId: templateId,
      description: `Deleted template ${templateId}`,
    });

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

    await logAdminAction(req, {
      action: "blog.create",
      targetType: "blog_post",
      targetId: post.id,
      description: `Created blog post ${post.id}`,
    });
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

    await logAdminAction(req, {
      action: "blog.update",
      targetType: "blog_post",
      targetId: id,
      description: `Updated blog post ${id}`,
    });
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

    await logAdminAction(req, {
      action: "blog.delete",
      targetType: "blog_post",
      targetId: id,
      description: `Deleted blog post ${id}`,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
