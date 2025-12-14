import { Router } from "express";
import { SellerStatus } from "@prisma/client";

import { authenticate } from "../middleware/auth";
import {
  upsertSellerProfile,
  getSellerProfile,
  listSellerProfiles,
  updateSellerProfileStatus,
} from "../services/sellerProfileService";
import { AppError } from "../utils/errors";
import { safeRecordAdminAuditLog } from "../services/auditLogService";

const router = Router();

router.get("/me", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthorized();
    const profile = await getSellerProfile(req.user.id);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

router.post("/me", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthorized();
    const profile = await upsertSellerProfile(req.user.id, req.body);
    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
});

router.get("/", authenticate({ roles: ["ADMIN", "SUPER_ADMIN"] }), async (req, res, next) => {
  try {
    const status = req.query.status?.toString().toUpperCase() as SellerStatus | undefined;
    const profiles = await listSellerProfiles(status);
    res.json({ profiles });
  } catch (error) {
    next(error);
  }
});

router.patch("/:userId/status", authenticate({ roles: ["ADMIN", "SUPER_ADMIN"] }), async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) throw AppError.badRequest("Invalid user id");
    const statusRaw = req.body?.status;
    if (typeof statusRaw !== "string") throw AppError.badRequest("Status is required");
    const status = statusRaw.toUpperCase() as SellerStatus;
    if (!Object.values(SellerStatus).includes(status)) {
      throw AppError.badRequest("Invalid status");
    }
    const profile = await updateSellerProfileStatus(userId, status);

    if (req.user) {
      const auditPayload = {
        actorId: req.user.id,
        action: "user.seller_status",
        targetType: "user",
        targetId: userId,
        description: `Updated seller status for user ${userId} to ${status}`,
        metadata: { status },
      };

      await safeRecordAdminAuditLog(
        typeof req.ip === "string" && req.ip.length > 0
          ? { ...auditPayload, ipAddress: req.ip }
          : auditPayload
      );
    }

    res.json(profile);
  } catch (error) {
    next(error);
  }
});

export default router;
