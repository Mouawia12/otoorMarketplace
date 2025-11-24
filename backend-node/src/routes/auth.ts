import { Router } from "express";
import { z } from "zod";

import {
  authenticateUser,
  registerUser,
  loginSchema,
  authenticateWithGoogle,
  changePassword,
  changePasswordSchema,
} from "../services/authService";
import { authenticate } from "../middleware/auth";
import { getUserProfile, updateUserProfile } from "../services/userService";
import { toPlainObject } from "../utils/serializer";
import { AppError } from "../utils/errors";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const payload = await registerUser(req.body);
    res.status(201).json({
      access_token: payload.token,
      user: payload.user,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const payload = await authenticateUser(data);
    res.json({
      access_token: payload.token,
      user: payload.user,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/google", async (req, res, next) => {
  try {
    const payload = await authenticateWithGoogle(req.body);
    res.json({
      access_token: payload.token,
      user: payload.user,
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
