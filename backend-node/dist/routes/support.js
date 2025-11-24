"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const supportService_1 = require("../services/supportService");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.get("/", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user)
            throw errors_1.AppError.unauthorized();
        const roleFilter = req.user.roles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r))
            ? req.query.role?.toString()
            : undefined;
        const payload = {
            userId: req.user.id,
            all: req.user.roles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r)),
        };
        if (roleFilter) {
            payload.role = roleFilter;
        }
        const tickets = await (0, supportService_1.listSupportTickets)(payload);
        res.json({ tickets });
    }
    catch (error) {
        next(error);
    }
});
router.get("/:id", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user)
            throw errors_1.AppError.unauthorized();
        const id = Number(req.params.id);
        if (Number.isNaN(id))
            throw errors_1.AppError.badRequest("Invalid ticket id");
        const isAdmin = req.user.roles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r));
        const ticket = await (0, supportService_1.getSupportTicket)(id, req.user.id, isAdmin);
        res.json(ticket);
    }
    catch (error) {
        next(error);
    }
});
router.post("/", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user)
            throw errors_1.AppError.unauthorized();
        const role = req.user.roles.includes(client_1.RoleName.SELLER) || req.user.roles.includes("SELLER") ? "seller" : "buyer";
        const ticket = await (0, supportService_1.createSupportTicket)({
            userId: req.user.id,
            subject: req.body?.subject,
            message: req.body?.message,
            role,
        });
        res.status(201).json(ticket);
    }
    catch (error) {
        next(error);
    }
});
router.patch("/:id/status", (0, auth_1.authenticate)({ roles: ["ADMIN", "SUPER_ADMIN"] }), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id))
            throw errors_1.AppError.badRequest("Invalid ticket id");
        const status = req.body?.status;
        if (!status || typeof status !== "string")
            throw errors_1.AppError.badRequest("Status is required");
        const ticket = await (0, supportService_1.updateSupportTicketStatus)(id, status);
        res.json(ticket);
    }
    catch (error) {
        next(error);
    }
});
router.post("/:id/replies", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user)
            throw errors_1.AppError.unauthorized();
        const id = Number(req.params.id);
        if (Number.isNaN(id))
            throw errors_1.AppError.badRequest("Invalid ticket id");
        const message = req.body?.message;
        if (!message || typeof message !== "string")
            throw errors_1.AppError.badRequest("Message is required");
        const isAdmin = req.user.roles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r));
        const ticket = await (0, supportService_1.getSupportTicket)(id, req.user.id, isAdmin);
        // only owner or admin can reply
        if (!isAdmin && ticket.user_id !== req.user.id) {
            throw errors_1.AppError.unauthorized();
        }
        const reply = await (0, supportService_1.addSupportReply)({
            ticketId: id,
            userId: req.user.id,
            message,
        });
        res.status(201).json(reply);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=support.js.map