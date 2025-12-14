import { Router } from "express";
import { RoleName, AuctionStatus } from "@prisma/client";

import { authenticate } from "../middleware/auth";
import { createProduct, updateProduct, deleteProduct } from "../services/productService";
import {
  getSellerDashboardStats,
  listSellerProductsWithFilters,
  listSellerOrders,
  listSellerEarnings,
} from "../services/sellerService";
import { createAuction, listAuctions } from "../services/auctionService";
import { AppError } from "../utils/errors";
import {
  getProductTemplateById,
  listProductTemplates,
} from "../services/productTemplateService";

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

router.delete("/products/:id", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const productId = Number(req.params.id);
    if (Number.isNaN(productId)) {
      throw AppError.badRequest("Invalid product id");
    }

    await deleteProduct(productId, req.user.id);
    res.status(204).send();
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

router.get("/earnings", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthorized();
    const { records, summary } = await listSellerEarnings(req.user.id);

    const exportFormat = typeof req.query.export === "string" ? req.query.export.toLowerCase() : "";
    if (exportFormat === "csv" || exportFormat === "excel") {
      const header = [
        "id",
        "order_id",
        "date",
        "product_name",
        "product_name_ar",
        "amount",
        "commission",
        "net_earnings",
      ];
      const rows = records.map((r) =>
        [
          r.id,
          r.orderId,
          r.date.toISOString(),
          `"${r.productName.replace(/"/g, '""')}"`,
          `"${r.productNameAr.replace(/"/g, '""')}"`,
          r.amount.toFixed(2),
          r.commission.toFixed(2),
          r.netEarnings.toFixed(2),
        ].join(",")
      );
      const csv = [header.join(","), ...rows].join("\n");
      res.header("Content-Type", "text/csv");
      res.header("Content-Disposition", "attachment; filename=earnings.csv");
      return res.send(csv);
    }

    res.json({ records, summary });
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

router.get("/product-templates", sellerOnly, async (req, res, next) => {
  try {
    const templates = await listProductTemplates(req.query);
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

router.get("/product-templates/:id", sellerOnly, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid template id");
    }
    const template = await getProductTemplateById(id);
    res.json(template);
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
