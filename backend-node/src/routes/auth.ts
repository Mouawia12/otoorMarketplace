import { Router } from "express";
import { z } from "zod";

import { authenticateUser, registerUser, loginSchema } from "../services/authService";
import { authenticate } from "../middleware/auth";
import { getUserProfile } from "../services/userService";
import { toPlainObject } from "../utils/serializer";

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

export default router;
