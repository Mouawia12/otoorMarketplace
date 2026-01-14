"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const authService_1 = require("../services/authService");
const auth_1 = require("../middleware/auth");
const userService_1 = require("../services/userService");
const serializer_1 = require("../utils/serializer");
const errors_1 = require("../utils/errors");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
const setAuthCookie = (res, token) => {
    res.cookie(env_1.config.auth.cookieName, token, {
        httpOnly: true,
        secure: env_1.config.nodeEnv === "production",
        sameSite: "lax",
        maxAge: env_1.config.auth.cookieMaxAgeSeconds * 1000,
        path: "/",
    });
};
router.post("/register", async (req, res, next) => {
    try {
        const payload = await (0, authService_1.registerUser)(req.body);
        setAuthCookie(res, payload.token);
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
        setAuthCookie(res, payload.token);
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
        setAuthCookie(res, payload.token);
        res.json({
            access_token: payload.token,
            user: payload.user,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post("/logout", (_req, res) => {
    res.clearCookie(env_1.config.auth.cookieName, {
        httpOnly: true,
        secure: env_1.config.nodeEnv === "production",
        sameSite: "lax",
        path: "/",
    });
    res.json({ success: true });
});
router.post("/forgot-password", async (req, res, next) => {
    try {
        await (0, authService_1.requestPasswordReset)(req.body);
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
router.post("/reset-password", async (req, res, next) => {
    try {
        await (0, authService_1.resetPassword)(req.body);
        res.json({ success: true });
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
router.patch("/me", (0, auth_1.authenticate)(), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const schema = zod_1.z.object({
            full_name: zod_1.z.string().min(2).optional(),
            phone: zod_1.z.string().optional(),
            avatar_url: zod_1.z.string().url().optional(),
        });
        const data = schema.parse(req.body);
        const profile = await (0, userService_1.updateUserProfile)(req.user.id, {
            full_name: data.full_name ?? undefined,
            phone: data.phone ?? undefined,
            avatar_url: data.avatar_url ?? undefined,
        });
        res.json((0, serializer_1.toPlainObject)(profile));
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map