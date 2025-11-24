import { Router } from "express";
import { RoleName } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import {
  createSupportTicket,
  getSupportTicket,
  listSupportTickets,
  updateSupportTicketStatus,
  addSupportReply,
} from "../services/supportService";
import { AppError } from "../utils/errors";

const router = Router();

router.get("/", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthorized();
    const roleFilter = req.user.roles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r))
      ? req.query.role?.toString()
      : undefined;
    const payload: { userId?: number; all?: boolean; role?: string | undefined } = {
      userId: req.user.id,
      all: req.user.roles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r)),
    };
    if (roleFilter) {
      payload.role = roleFilter;
    }
    const tickets = await listSupportTickets(payload);
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthorized();
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw AppError.badRequest("Invalid ticket id");
    const isAdmin = req.user.roles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r));
    const ticket = await getSupportTicket(id, req.user.id, isAdmin);
    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthorized();
    const role =
      req.user.roles.includes(RoleName.SELLER) || req.user.roles.includes("SELLER") ? "seller" : "buyer";
    const ticket = await createSupportTicket({
      userId: req.user.id,
      subject: req.body?.subject,
      message: req.body?.message,
      role,
    });
    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", authenticate({ roles: ["ADMIN", "SUPER_ADMIN"] }), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw AppError.badRequest("Invalid ticket id");
    const status = req.body?.status;
    if (!status || typeof status !== "string") throw AppError.badRequest("Status is required");
    const ticket = await updateSupportTicketStatus(id, status);
    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/replies", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthorized();
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw AppError.badRequest("Invalid ticket id");
    const message = req.body?.message;
    if (!message || typeof message !== "string") throw AppError.badRequest("Message is required");

    const isAdmin = req.user.roles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r));
    const ticket = await getSupportTicket(id, req.user.id, isAdmin);
    // only owner or admin can reply
    if (!isAdmin && ticket.user_id !== req.user.id) {
      throw AppError.unauthorized();
    }

    const reply = await addSupportReply({
      ticketId: id,
      userId: req.user.id,
      message,
    });
    res.status(201).json(reply);
  } catch (error) {
    next(error);
  }
});

export default router;
