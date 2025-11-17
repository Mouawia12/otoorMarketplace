import fs from "fs";
import path from "path";
import { Buffer } from "buffer";
import { Prisma, PostStatus, PostLang } from "@prisma/client";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { config } from "../config/env";

type CreatePostInput = {
  title: string;
  slug?: string;
  description: string;
  content: string;
  coverData?: string; // data URL
  coverUrl?: string;
  author?: string;
  category?: string;
  tags?: string[];
  status?: PostStatus;
  lang: "ar" | "en";
  date?: string;
};

type UpdatePostInput = Partial<CreatePostInput>;

const toLangEnum = (lang: string): PostLang => {
  const upper = lang.toUpperCase();
  if (upper === "AR") return PostLang.AR;
  return PostLang.EN;
};

const slugify = (text: string) =>
  text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeCoverUrl = (cover: string | null | undefined) => {
  if (!cover) return null;
  if (/^https?:\/\//i.test(cover) || cover.startsWith("data:") || cover.startsWith("blob:")) {
    return cover;
  }
  return `${config.assetBaseUrl}/${cover.replace(/^\/+/, "")}`;
};

const ensureBlogUploadDir = () => {
  const dir = path.join(process.cwd(), config.uploads.dir, "blog");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const saveCoverFromDataUrl = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw AppError.badRequest("Invalid cover image data");
  }

  const mime = match[1] as string;
  const base64 = match[2] as string;
  const buffer = Buffer.from(base64, "base64");
  const ext = mime.split("/")[1] || "png";
  const dir = ensureBlogUploadDir();
  const filename = `blog-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const filepath = path.join(dir, filename);

  fs.writeFileSync(filepath, buffer);

  // return relative path (for assetBaseUrl prefix)
  const relative = path.relative(process.cwd(), filepath).replace(/\\/g, "/");
  return relative.startsWith("uploads/") ? relative : `uploads/${filename}`;
};

const splitTags = (tags?: string | null) =>
  tags
    ? tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

const joinTags = (tags?: string[]) => (tags && tags.length ? tags.join(",") : null);

const serializePost = (post: Prisma.PostGetPayload<{}>) => ({
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
  lang: post.lang === PostLang.AR ? "ar" : "en",
  date: post.createdAt.toISOString().slice(0, 10),
  updated_at: post.updatedAt.toISOString(),
});

export const listPublishedPosts = async (lang?: string) => {
  const where: Prisma.PostWhereInput = {
    status: PostStatus.PUBLISHED,
  };

  if (lang) {
    where.lang = toLangEnum(lang);
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return posts.map(serializePost);
};

export const listAllPosts = async () => {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
  });
  return posts.map(serializePost);
};

export const getPostBySlug = async (slug: string, lang?: string) => {
  const post = await prisma.post.findFirst({
    where: {
      slug,
      status: PostStatus.PUBLISHED,
      ...(lang ? { lang: toLangEnum(lang) } : {}),
    },
  });
  if (!post) return null;
  return serializePost(post);
};

export const getPostById = async (id: number) => {
  const post = await prisma.post.findUnique({
    where: { id },
  });
  if (!post) {
    throw AppError.notFound("Post not found");
  }
  return serializePost(post);
};

const prepareCover = (input: { coverData?: string; coverUrl?: string }) => {
  if (input.coverData) {
    return saveCoverFromDataUrl(input.coverData);
  }
  if (input.coverUrl) {
    return input.coverUrl;
  }
  return null;
};

export const createPost = async (input: CreatePostInput) => {
  const slug = slugify(input.slug || input.title);
  if (!slug) {
    throw AppError.badRequest("Slug is required");
  }

  const existing = await prisma.post.findUnique({ where: { slug } });
  if (existing) {
    throw AppError.badRequest("Slug already exists");
  }

  const coverUrl = prepareCover(input);

  const post = await prisma.post.create({
    data: {
      title: input.title,
      slug,
      description: input.description,
      coverUrl: coverUrl ?? "",
      author: input.author ?? "Admin",
      category: input.category ?? "",
      tags: joinTags(input.tags),
      content: input.content,
      status: input.status ?? PostStatus.DRAFT,
      lang: toLangEnum(input.lang),
      ...(input.date ? { createdAt: new Date(input.date) } : {}),
    },
  });

  return serializePost(post);
};

export const updatePost = async (id: number, input: UpdatePostInput) => {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("Post not found");
  }

  let coverUrl: string | undefined;
  if (input.coverData || input.coverUrl) {
    const saved = prepareCover(input);
    coverUrl = saved ?? existing.coverUrl;
  }

  const slug =
    input.slug && input.slug !== existing.slug
      ? slugify(input.slug)
      : existing.slug;

  if (slug !== existing.slug) {
    const dup = await prisma.post.findUnique({ where: { slug } });
    if (dup && dup.id !== id) {
      throw AppError.badRequest("Slug already exists");
    }
  }

  const post = await prisma.post.update({
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

export const deletePost = async (id: number) => {
  await prisma.post.delete({ where: { id } });
  return { success: true };
};
