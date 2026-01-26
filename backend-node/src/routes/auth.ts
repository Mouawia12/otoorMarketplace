import { Router, type Response } from "express";
import { z } from "zod";

import {
  authenticateUser,
  registerUser,
  loginSchema,
  authenticateWithGoogle,
  changePassword,
  changePasswordSchema,
  requestPasswordReset,
  resetPassword,
  resendVerificationEmail,
  verifyEmailToken,
} from "../services/authService";
import { authenticate } from "../middleware/auth";
import { getUserProfile, updateUserProfile } from "../services/userService";
import { toPlainObject } from "../utils/serializer";
import { AppError } from "../utils/errors";
import { config } from "../config/env";
import { signAccessToken } from "../utils/jwt";

const router = Router();

const setAuthCookie = (res: Response, token: string) => {
  res.cookie(config.auth.cookieName, token, {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: config.auth.cookieSameSite,
    maxAge: config.auth.cookieMaxAgeSeconds * 1000,
    path: "/",
  });
};

router.post("/register", async (req, res, next) => {
  try {
    const payload = await registerUser(req.body);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const payload = await authenticateUser(data);
    setAuthCookie(res, payload.token);
    res.json({
      user: payload.user,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/google", async (req, res, next) => {
  try {
    const payload = await authenticateWithGoogle(req.body);
    setAuthCookie(res, payload.token);
    res.json({
      user: payload.user,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(config.auth.cookieName, {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: config.auth.cookieSameSite,
    path: "/",
  });
  res.json({ success: true });
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    await requestPasswordReset(req.body);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    await resetPassword(req.body);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/resend-verification", async (req, res, next) => {
  try {
    const result = await resendVerificationEmail(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/verify-email", async (req, res, next) => {
  try {
    const result = await verifyEmailToken(req.body);
    setAuthCookie(res, result.token);
    res.json({
      user: result.user,
      already_verified: result.already_verified,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/change-password", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const data = changePasswordSchema.parse(req.body);
    await changePassword(req.user.id, data);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw new Error("User not found in request");
    }

    const profile = await getUserProfile(req.user.id);
    const refreshedToken = signAccessToken({
      sub: req.user.id,
      roles: req.user.roles,
    });
    setAuthCookie(res, refreshedToken);
    res.json(toPlainObject(profile));
  } catch (error) {
    next(error);
  }
});

router.patch("/me", authenticate(), async (req, res, next) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const schema = z.object({
      full_name: z.string().min(2).optional(),
      phone: z.string().optional(),
      avatar_url: z.string().url().optional(),
    });

    const data = schema.parse(req.body);
    const profile = await updateUserProfile(req.user.id, {
      full_name: data.full_name ?? undefined,
      phone: data.phone ?? undefined,
      avatar_url: data.avatar_url ?? undefined,
    });
    res.json(toPlainObject(profile));
  } catch (error) {
    next(error);
  }
});

export default router;
