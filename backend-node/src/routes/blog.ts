import { Router } from "express";

import { listPublishedPosts, getPostBySlug } from "../services/blogService";
import { AppError } from "../utils/errors";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const lang = typeof req.query.lang === "string" ? req.query.lang : undefined;
    const posts = await listPublishedPosts(lang);
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const lang = typeof req.query.lang === "string" ? req.query.lang : undefined;
    const slug = req.params.slug;
    const post = await getPostBySlug(slug, lang);
    if (!post) {
      throw AppError.notFound("Post not found");
    }
    res.json(post);
  } catch (error) {
    next(error);
  }
});

export default router;
