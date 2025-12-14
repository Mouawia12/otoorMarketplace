import { Router } from "express";

import { getBankTransferSettings, getSocialLinks } from "../services/settingService";

const router = Router();

router.get("/bank-transfer", async (_req, res, next) => {
  try {
    const settings = await getBankTransferSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

router.get("/social-links", async (_req, res, next) => {
  try {
    const links = await getSocialLinks();
    res.json(links);
  } catch (error) {
    next(error);
  }
});

export default router;
