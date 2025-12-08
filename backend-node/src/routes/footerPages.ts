import { Router } from "express";
import { RoleName } from "@prisma/client";

import { authenticate } from "../middleware/auth";
import {
  getFooterPage,
  getPublishedFooterPage,
  getPublishedFooterPages,
  listFooterPages,
  publishFooterPage,
  saveFooterPageDraft,
} from "../services/footerPageService";
import { AppError } from "../utils/errors";
import type { FooterPageContent } from "../types/footerPage";

const router = Router();

router.get(
  "/",
  authenticate({ roles: [RoleName.ADMIN, RoleName.SUPER_ADMIN] }),
  async (_req, res, next) => {
    try {
      const pages = await listFooterPages();
      res.json({ pages });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/public", async (_req, res, next) => {
  try {
    const pages = await getPublishedFooterPages();
    res.json({ pages });
  } catch (error) {
    next(error);
  }
});

router.get("/public/:slug", async (req, res, next) => {
  try {
    const slug = req.params.slug;
    if (typeof slug !== "string") {
      throw AppError.badRequest("Invalid slug");
    }
    const page = await getPublishedFooterPage(slug);
    if (!page) {
      throw AppError.notFound("Footer page not published");
    }
    res.json({ page });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:slug",
  authenticate({ roles: [RoleName.ADMIN, RoleName.SUPER_ADMIN] }),
  async (req, res, next) => {
    try {
      const slug = req.params.slug;
      if (typeof slug !== "string") {
        throw AppError.badRequest("Invalid slug");
      }
      const page = await getFooterPage(slug);
      if (!page) {
        throw AppError.notFound("Footer page not found");
      }
      res.json({ page });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:slug/draft",
  authenticate({ roles: [RoleName.ADMIN, RoleName.SUPER_ADMIN] }),
  async (req, res, next) => {
    try {
      const slug = req.params.slug;
      if (typeof slug !== "string") {
        throw AppError.badRequest("Invalid slug");
      }
      const content = req.body?.content as FooterPageContent | undefined;
      if (!content) {
        throw AppError.badRequest("Missing footer page content");
      }
      const page = await saveFooterPageDraft(
        slug,
        content,
        req.user!.id,
      );
      res.json({ page });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:slug/publish",
  authenticate({ roles: [RoleName.ADMIN, RoleName.SUPER_ADMIN] }),
  async (req, res, next) => {
    try {
      const slug = req.params.slug;
      if (typeof slug !== "string") {
        throw AppError.badRequest("Invalid slug");
      }
      const page = await publishFooterPage(slug, req.user!.id);
      res.json({ page });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
