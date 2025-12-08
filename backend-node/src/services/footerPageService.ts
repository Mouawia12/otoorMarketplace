import { FooterPageStatus, Prisma } from "@prisma/client";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import {
  FooterPageContent,
  FooterPageKey,
  footerPageContentSchema,
  footerPageKeys,
} from "../types/footerPage";

type FooterPageRecord = {
  slug: FooterPageKey;
  status: FooterPageStatus;
  draftContent: FooterPageContent;
  publishedContent: FooterPageContent | null;
  updatedAt: Date;
  publishedAt: Date | null;
};

const allowedSlugs = new Set<string>(footerPageKeys);

const parseContent = (
  value: Prisma.JsonValue | null,
): FooterPageContent | null => {
  if (!value) return null;
  return footerPageContentSchema.parse(value);
};

const ensureSlug = (slug: string): FooterPageKey => {
  if (!allowedSlugs.has(slug)) {
    throw AppError.badRequest("Unknown footer page slug");
  }
  return slug as FooterPageKey;
};

const mapRecord = (page: {
  slug: string;
  draftContent: Prisma.JsonValue;
  publishedContent: Prisma.JsonValue | null;
  status: FooterPageStatus;
  updatedAt: Date;
  publishedAt: Date | null;
}): FooterPageRecord => ({
  slug: ensureSlug(page.slug),
  status: page.status,
  draftContent: footerPageContentSchema.parse(page.draftContent),
  publishedContent: parseContent(page.publishedContent),
  updatedAt: page.updatedAt,
  publishedAt: page.publishedAt,
});

export async function listFooterPages() {
  const pages = await prisma.footerPage.findMany({
    orderBy: { slug: "asc" },
  });
  return pages.map(mapRecord);
}

export async function getFooterPage(slug: string) {
  const page = await prisma.footerPage.findUnique({
    where: { slug: ensureSlug(slug) },
  });
  if (!page) {
    return null;
  }
  return mapRecord(page);
}

export async function saveFooterPageDraft(
  slug: string,
  content: FooterPageContent,
  userId: number,
) {
  const parsed = footerPageContentSchema.parse(content);
  if (parsed.slug !== slug) {
    throw AppError.badRequest("Slug mismatch between path and payload");
  }

  const record = await prisma.footerPage.upsert({
    where: { slug: ensureSlug(slug) },
    create: {
      slug,
      draftContent: parsed,
      status: FooterPageStatus.DRAFT,
      updatedById: userId,
    },
    update: {
      draftContent: parsed,
      status: FooterPageStatus.DRAFT,
      updatedById: userId,
    },
  });

  return mapRecord(record);
}

export async function publishFooterPage(slug: string, userId: number) {
  const existing = await prisma.footerPage.findUnique({
    where: { slug: ensureSlug(slug) },
  });

  if (!existing) {
    throw AppError.notFound("Footer page draft not found");
  }

  const draft = footerPageContentSchema.parse(existing.draftContent);

  const record = await prisma.footerPage.update({
    where: { slug },
    data: {
      publishedContent: draft,
      status: FooterPageStatus.PUBLISHED,
      publishedAt: new Date(),
      publishedById: userId,
    },
  });

  return mapRecord(record);
}

export async function getPublishedFooterPages() {
  const pages = await prisma.footerPage.findMany({
    where: { publishedContent: { not: Prisma.DbNull } },
  });
  return pages
    .map((page) => ({
      slug: ensureSlug(page.slug),
      content: parseContent(page.publishedContent),
    }))
    .filter((item) => item.content !== null);
}

export async function getPublishedFooterPage(slug: string) {
  const page = await prisma.footerPage.findUnique({
    where: { slug: ensureSlug(slug) },
  });
  if (!page || !page.publishedContent) {
    return null;
  }
  return {
    slug: ensureSlug(page.slug),
    content: footerPageContentSchema.parse(page.publishedContent),
  };
}
