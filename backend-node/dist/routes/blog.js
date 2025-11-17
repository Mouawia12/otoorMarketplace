"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const blogService_1 = require("../services/blogService");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.get("/", async (req, res, next) => {
    try {
        const lang = typeof req.query.lang === "string" ? req.query.lang : undefined;
        const posts = await (0, blogService_1.listPublishedPosts)(lang);
        res.json(posts);
    }
    catch (error) {
        next(error);
    }
});
router.get("/:slug", async (req, res, next) => {
    try {
        const lang = typeof req.query.lang === "string" ? req.query.lang : undefined;
        const slug = req.params.slug;
        const post = await (0, blogService_1.getPostBySlug)(slug, lang);
        if (!post) {
            throw errors_1.AppError.notFound("Post not found");
        }
        res.json(post);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=blog.js.map