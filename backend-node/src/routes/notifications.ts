import { Router } from "express";
import { z } from "zod";

import { authenticate } from "../middleware/auth";
import {
  listUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationService";
import { AppError } from "../utils/errors";

const router = Router();

router.use(authenticate());

router.get("/", async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const schema = z.object({
      limit: z.coerce.number().int().min(1).max(50).optional(),
      unreadOnly: z
        .union([z.boolean(), z.string()])
        .optional()
        .transform((value) => {
          if (typeof value === "boolean") return value;
          if (typeof value === "string") {
            return value === "true";
          }
          return false;
        }),
    });

    const parsed = schema.parse({
      limit: req.query.limit,
      unreadOnly: req.query.unread ?? req.query.unreadOnly,
    });

    const queryOptions: { limit?: number; unreadOnly?: boolean } = {};
    if (typeof parsed.limit === "number") {
      queryOptions.limit = parsed.limit;
    }
    if (typeof parsed.unreadOnly === "boolean") {
      queryOptions.unreadOnly = parsed.unreadOnly;
    }

    const payload = await listUserNotifications(req.user.id, queryOptions);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.post("/:notificationId/read", async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const notificationId = Number(req.params.notificationId);
    if (Number.isNaN(notificationId)) {
      throw AppError.badRequest("Invalid notification id");
    }

    await markNotificationAsRead(req.user.id, notificationId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/mark-all-read", async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    await markAllNotificationsAsRead(req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
