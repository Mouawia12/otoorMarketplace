"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const notificationService_1 = require("../services/notificationService");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.use((0, auth_1.authenticate)());
router.get("/", async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const schema = zod_1.z.object({
            limit: zod_1.z.coerce.number().int().min(1).max(50).optional(),
            unreadOnly: zod_1.z
                .union([zod_1.z.boolean(), zod_1.z.string()])
                .optional()
                .transform((value) => {
                if (typeof value === "boolean")
                    return value;
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
        const queryOptions = {};
        if (typeof parsed.limit === "number") {
            queryOptions.limit = parsed.limit;
        }
        if (typeof parsed.unreadOnly === "boolean") {
            queryOptions.unreadOnly = parsed.unreadOnly;
        }
        const payload = await (0, notificationService_1.listUserNotifications)(req.user.id, queryOptions);
        res.json(payload);
    }
    catch (error) {
        next(error);
    }
});
router.post("/:notificationId/read", async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const notificationId = Number(req.params.notificationId);
        if (Number.isNaN(notificationId)) {
            throw errors_1.AppError.badRequest("Invalid notification id");
        }
        await (0, notificationService_1.markNotificationAsRead)(req.user.id, notificationId);
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
router.post("/mark-all-read", async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        await (0, notificationService_1.markAllNotificationsAsRead)(req.user.id);
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map