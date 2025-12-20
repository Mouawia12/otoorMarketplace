import { Router } from "express";
import { RoleName } from "@prisma/client";

import { authenticate } from "../middleware/auth";
import {
  createOrder,
  listAllOrders,
  listOrdersByUser,
  listOrdersForSeller,
  updateOrderStatus,
  confirmOrderDelivery,
  getOrderLabel,
  getOrderTracking,
} from "../services/orderService";
import { AppError } from "../utils/errors";
import { prisma } from "../prisma/client";

const ALLOWED_STATUS_PARAMS = [
  "pending",
  "seller_confirmed",
  "processing",
  "shipped",
  "completed",
  "delivered",
  "canceled",
  "cancelled",
  "refunded",
];

const router = Router();

router.get(
  "/",
  authenticate({ roles: [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.SELLER] }),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }

      const statusQuery = typeof req.query.status === "string" ? req.query.status : undefined;
      if (statusQuery && !ALLOWED_STATUS_PARAMS.includes(statusQuery.toLowerCase())) {
        throw AppError.badRequest("Invalid status filter");
      }

      const roles = req.user.roles.map((r) => r.toUpperCase());
      let orders;

      if (roles.includes(RoleName.ADMIN) || roles.includes(RoleName.SUPER_ADMIN)) {
        orders = await listAllOrders(statusQuery);
      } else {
        orders = await listOrdersForSeller(req.user.id, statusQuery);
      }

      res.json(orders);
    } catch (error) {
      next(error);
    }
  }
);

router.get("/mine", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const orders = await listOrdersByUser(req.user.id);
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    // Debug logging to diagnose 403/auth issues in production
    console.log("ORDER AUTH USER:", req.user);
    console.log("ORDER AUTH HEADER:", req.headers.authorization);
    console.log("ORDER PAYLOAD:", req.body);

    const body = req.body ?? {};

    let items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      if (!body.product_id) {
        throw AppError.badRequest("product_id is required");
      }
      const quantity = Number(body.quantity ?? 1);
      const product = await prisma.product.findUnique({
        where: { id: Number(body.product_id) },
        select: { basePrice: true },
      });
      if (!product) {
        throw AppError.badRequest("Product not found");
      }
      items = [
        {
          productId: Number(body.product_id),
          quantity,
          unitPrice: Number(body.unit_price ?? product.basePrice.toNumber()),
        },
      ];
    }

    const shippingInput =
      body.shipping ??
      (body.shipping_name
        ? {
            name: body.shipping_name,
            phone: body.shipping_phone,
            city: body.shipping_city,
            region: body.shipping_region,
            address: body.shipping_address,
            type: body.shipping_method,
            redbox_point_id: body.redbox_point_id,
            customer_city_code: body.customer_city_code,
            customer_country: body.customer_country,
            cod_amount: body.cod_amount,
            cod_currency: body.cod_currency,
            redbox_type: body.redbox_type,
            shipment_type: body.shipment_type,
          }
        : undefined);

    const order = await createOrder({
      buyerId: req.user.id,
      paymentMethod: body.payment_method ?? "COD",
      shipping: shippingInput,
      items,
      couponCode: typeof body.coupon_code === "string" ? body.coupon_code : undefined,
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/:id/status",
  authenticate({ roles: [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.SELLER] }),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }

      const orderId = Number(req.params.id);
      if (Number.isNaN(orderId)) {
        throw AppError.badRequest("Invalid order id");
      }

      const status = req.body?.status;
      if (typeof status !== "string") {
        throw AppError.badRequest("Status is required");
      }

      const order = await updateOrderStatus(
        orderId,
        status,
        req.user.roles.map((role) => role.toUpperCase())
      );

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

router.post("/:id/confirm-delivery", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const orderId = Number(req.params.id);
    if (Number.isNaN(orderId)) {
      throw AppError.badRequest("Invalid order id");
    }

    const order = await confirmOrderDelivery(orderId, req.user.id);
    res.json(order);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/label", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const orderId = Number(req.params.id);
    if (Number.isNaN(orderId)) {
      throw AppError.badRequest("Invalid order id");
    }

    const result = await getOrderLabel(orderId, req.user.id, req.user.roles);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/tracking", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const orderId = Number(req.params.id);
    if (Number.isNaN(orderId)) {
      throw AppError.badRequest("Invalid order id");
    }

    const result = await getOrderTracking(orderId, req.user.id, req.user.roles);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
export default router;
