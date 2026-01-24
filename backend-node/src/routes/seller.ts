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
import {
  listSellerWarehouses,
  createSellerWarehouse,
  updateSellerWarehouse,
  deleteSellerWarehouse,
  transferWarehouseProducts,
} from "../services/sellerWarehouseService";
import {
  createManualShipment,
  listManualShipments,
  listManualShipmentPartners,
} from "../services/manualShipmentService";
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
    const warehouseId =
      typeof req.query.warehouse_id === "string" && req.query.warehouse_id
        ? Number(req.query.warehouse_id)
        : undefined;
    const filters = {
      ...(status ? { status } : {}),
      ...(warehouseId ? { warehouseId } : {}),
    };
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

router.patch("/products/:id", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const productId = Number(req.params.id);
    if (Number.isNaN(productId)) {
      throw AppError.badRequest("Invalid product id");
    }

    const product = await updateProduct(productId, req.user.id, req.body, {
      roles: req.user.roles as RoleName[],
    });
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
      include_pending: true,
    });

    res.json(auctions);
  } catch (error) {
    next(error);
  }
});

router.get("/product-templates", sellerOnly, async (req, res, next) => {
  try {
    const result = await listProductTemplates(req.query);
    res.json(result);
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

router.get("/warehouses", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const warehouses = await listSellerWarehouses(req.user.id);
    res.json({ warehouses });
  } catch (error) {
    next(error);
  }
});

router.post("/warehouses", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const warehouse = await createSellerWarehouse(req.user.id, req.body ?? {});
    res.status(201).json(warehouse);
  } catch (error) {
    next(error);
  }
});

router.patch("/warehouses/:id", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const warehouseId = Number(req.params.id);
    if (Number.isNaN(warehouseId)) {
      throw AppError.badRequest("Invalid warehouse id");
    }
    const warehouse = await updateSellerWarehouse(req.user.id, warehouseId, req.body ?? {});
    res.json(warehouse);
  } catch (error) {
    next(error);
  }
});

router.delete("/warehouses/:id", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const warehouseId = Number(req.params.id);
    if (Number.isNaN(warehouseId)) {
      throw AppError.badRequest("Invalid warehouse id");
    }
    const result = await deleteSellerWarehouse(req.user.id, warehouseId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/warehouses/transfer-products", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const sourceWarehouseId = Number(req.body?.source_warehouse_id);
    const targetWarehouseId = Number(req.body?.target_warehouse_id);
    const productIds = Array.isArray(req.body?.product_ids)
      ? req.body.product_ids.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id))
      : [];
    if (!Number.isFinite(sourceWarehouseId) || !Number.isFinite(targetWarehouseId)) {
      throw AppError.badRequest("Invalid warehouse id");
    }
    const result = await transferWarehouseProducts(
      req.user.id,
      sourceWarehouseId,
      targetWarehouseId,
      productIds
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/manual-shipments", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const response = await listManualShipments(req.user.id, req.user.roles);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post("/manual-shipments/partners", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const response = await listManualShipmentPartners(
      req.user.id,
      req.user.roles,
      req.body ?? {}
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post("/manual-shipments", sellerOnly, async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const response = await createManualShipment(
      req.user.id,
      req.user.roles,
      req.body ?? {}
    );
    res.status(201).json(response);
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
