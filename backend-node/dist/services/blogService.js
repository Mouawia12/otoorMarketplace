"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePost = exports.updatePost = exports.createPost = exports.getPostById = exports.getPostBySlug = exports.listAllPosts = exports.listPublishedPosts = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const buffer_1 = require("buffer");
const client_1 = require("@prisma/client");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const env_1 = require("../config/env");
const toLangEnum = (lang) => {
    const upper = lang.toUpperCase();
    if (upper === "AR")
        return client_1.PostLang.AR;
    return client_1.PostLang.EN;
};
const slugify = (text) => text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
const normalizeCoverUrl = (cover) => {
    if (!cover)
        return null;
    if (/^https?:\/\//i.test(cover) || cover.startsWith("data:") || cover.startsWith("blob:")) {
        return cover;
    }
    return `${env_1.config.assetBaseUrl}/${cover.replace(/^\/+/, "")}`;
};
const ensureBlogUploadDir = () => {
    const dir = path_1.default.join(process.cwd(), env_1.config.uploads.dir, "blog");
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    return dir;
};
const saveCoverFromDataUrl = (dataUrl) => {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
        throw errors_1.AppError.badRequest("Invalid cover image data");
    }
    const mime = match[1];
    const base64 = match[2];
    const buffer = buffer_1.Buffer.from(base64, "base64");
    const ext = mime.split("/")[1] || "png";
    const dir = ensureBlogUploadDir();
    const filename = `blog-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const filepath = path_1.default.join(dir, filename);
    fs_1.default.writeFileSync(filepath, buffer);
    // return relative path (for assetBaseUrl prefix)
    const relative = path_1.default.relative(process.cwd(), filepath).replace(/\\/g, "/");
    return relative.startsWith("uploads/") ? relative : `uploads/${filename}`;
};
const splitTags = (tags) => tags
    ? tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
const joinTags = (tags) => (tags && tags.length ? tags.join(",") : null);
const serializePost = (post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    description: post.description,
    cover: normalizeCoverUrl(post.coverUrl),
    author: post.author,
    category: post.category ?? "",
    tags: splitTags(post.tags),
    content: post.content,
    status: post.status.toLowerCase(),
    lang: post.lang === client_1.PostLang.AR ? "ar" : "en",
    date: post.createdAt.toISOString().slice(0, 10),
    updated_at: post.updatedAt.toISOString(),
});
const listPublishedPosts = async (lang) => {
    const where = {
        status: client_1.PostStatus.PUBLISHED,
    };
    if (lang) {
        where.lang = toLangEnum(lang);
    }
    const posts = await client_2.prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
    });
    return posts.map(serializePost);
};
exports.listPublishedPosts = listPublishedPosts;
const listAllPosts = async () => {
    const posts = await client_2.prisma.post.findMany({
        orderBy: { createdAt: "desc" },
    });
    return posts.map(serializePost);
};
exports.listAllPosts = listAllPosts;
const getPostBySlug = async (slug, lang) => {
    const post = await client_2.prisma.post.findFirst({
        where: {
            slug,
            status: client_1.PostStatus.PUBLISHED,
            ...(lang ? { lang: toLangEnum(lang) } : {}),
        },
    });
    if (!post)
        return null;
    return serializePost(post);
};
exports.getPostBySlug = getPostBySlug;
const getPostById = async (id) => {
    const post = await client_2.prisma.post.findUnique({
        where: { id },
    });
    if (!post) {
        throw errors_1.AppError.notFound("Post not found");
    }
    return serializePost(post);
};
exports.getPostById = getPostById;
const prepareCover = (input) => {
    if (input.coverData) {
        return saveCoverFromDataUrl(input.coverData);
    }
    if (input.coverUrl) {
        return input.coverUrl;
    }
    return null;
};
const createPost = async (input) => {
    const slug = slugify(input.slug || input.title);
    if (!slug) {
        throw errors_1.AppError.badRequest("Slug is required");
    }
    const existing = await client_2.prisma.post.findUnique({ where: { slug } });
    if (existing) {
        throw errors_1.AppError.badRequest("Slug already exists");
    }
    const coverUrl = prepareCover(input);
    const post = await client_2.prisma.post.create({
        data: {
            title: input.title,
            slug,
            description: input.description,
            coverUrl: coverUrl ?? "",
            author: input.author ?? "Admin",
            category: input.category ?? "",
            tags: joinTags(input.tags),
            content: input.content,
            status: input.status ?? client_1.PostStatus.DRAFT,
            lang: toLangEnum(input.lang),
            ...(input.date ? { createdAt: new Date(input.date) } : {}),
        },
    });
    return serializePost(post);
};
exports.createPost = createPost;
const updatePost = async (id, input) => {
    const existing = await client_2.prisma.post.findUnique({ where: { id } });
    if (!existing) {
        throw errors_1.AppError.notFound("Post not found");
    }
    let coverUrl;
    if (input.coverData || input.coverUrl) {
        const saved = prepareCover(input);
        coverUrl = saved ?? existing.coverUrl;
    }
    const slug = input.slug && input.slug !== existing.slug
        ? slugify(input.slug)
        : existing.slug;
    if (slug !== existing.slug) {
        const dup = await client_2.prisma.post.findUnique({ where: { slug } });
        if (dup && dup.id !== id) {
            throw errors_1.AppError.badRequest("Slug already exists");
        }
    }
    const post = await client_2.prisma.post.update({
        where: { id },
        data: {
            title: input.title ?? existing.title,
            slug,
            description: input.description ?? existing.description,
            coverUrl: coverUrl !== undefined ? coverUrl : existing.coverUrl,
            author: input.author ?? existing.author,
            category: input.category ?? existing.category,
            tags: input.tags ? joinTags(input.tags) : existing.tags,
            content: input.content ?? existing.content,
            status: input.status ?? existing.status,
            lang: input.lang ? toLangEnum(input.lang) : existing.lang,
            ...(input.date ? { createdAt: new Date(input.date) } : {}),
        },
    });
    return serializePost(post);
};
exports.updatePost = updatePost;
const deletePost = async (id) => {
    await client_2.prisma.post.delete({ where: { id } });
    return { success: true };
};
exports.deletePost = deletePost;
//# sourceMappingURL=blogService.js.map