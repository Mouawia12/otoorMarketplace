"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authService_1 = require("../services/authService");
const auth_1 = require("../middleware/auth");
const userService_1 = require("../services/userService");
const serializer_1 = require("../utils/serializer");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.post("/register", async (req, res, next) => {
    try {
        const payload = await (0, authService_1.registerUser)(req.body);
        res.status(201).json({
            access_token: payload.token,
            user: payload.user,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post("/login", async (req, res, next) => {
    try {
        const data = authService_1.loginSchema.parse(req.body);
        const payload = await (0, authService_1.authenticateUser)(data);
        res.json({
            access_token: payload.token,
            user: payload.user,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post("/google", async (req, res, next) => {
    try {
        const payload = await (0, authService_1.authenticateWithGoogle)(req.body);
        res.json({
            access_token: payload.token,
            user: payload.user,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post("/change-password", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const data = authService_1.changePasswordSchema.parse(req.body);
        await (0, authService_1.changePassword)(req.user.id, data);
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
router.get("/me", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error("User not found in request");
        }
        const profile = await (0, userService_1.getUserProfile)(req.user.id);
        res.json((0, serializer_1.toPlainObject)(profile));
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map