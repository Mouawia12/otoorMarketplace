"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFooterPages = listFooterPages;
exports.getFooterPage = getFooterPage;
exports.saveFooterPageDraft = saveFooterPageDraft;
exports.publishFooterPage = publishFooterPage;
exports.getPublishedFooterPages = getPublishedFooterPages;
exports.getPublishedFooterPage = getPublishedFooterPage;
const client_1 = require("@prisma/client");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const footerPage_1 = require("../types/footerPage");
const allowedSlugs = new Set(footerPage_1.footerPageKeys);
const parseContent = (value) => {
    if (!value)
        return null;
    return footerPage_1.footerPageContentSchema.parse(value);
};
const ensureSlug = (slug) => {
    if (!allowedSlugs.has(slug)) {
        throw errors_1.AppError.badRequest("Unknown footer page slug");
    }
    return slug;
};
const mapRecord = (page) => ({
    slug: ensureSlug(page.slug),
    status: page.status,
    draftContent: footerPage_1.footerPageContentSchema.parse(page.draftContent),
    publishedContent: parseContent(page.publishedContent),
    updatedAt: page.updatedAt,
    publishedAt: page.publishedAt,
});
async function listFooterPages() {
    const pages = await client_2.prisma.footerPage.findMany({
        orderBy: { slug: "asc" },
    });
    return pages.map(mapRecord);
}
async function getFooterPage(slug) {
    const page = await client_2.prisma.footerPage.findUnique({
        where: { slug: ensureSlug(slug) },
    });
    if (!page) {
        return null;
    }
    return mapRecord(page);
}
async function saveFooterPageDraft(slug, content, userId) {
    const parsed = footerPage_1.footerPageContentSchema.parse(content);
    if (parsed.slug !== slug) {
        throw errors_1.AppError.badRequest("Slug mismatch between path and payload");
    }
    const record = await client_2.prisma.footerPage.upsert({
        where: { slug: ensureSlug(slug) },
        create: {
            slug,
            draftContent: parsed,
            status: client_1.FooterPageStatus.DRAFT,
            updatedById: userId,
        },
        update: {
            draftContent: parsed,
            status: client_1.FooterPageStatus.DRAFT,
            updatedById: userId,
        },
    });
    return mapRecord(record);
}
async function publishFooterPage(slug, userId) {
    const existing = await client_2.prisma.footerPage.findUnique({
        where: { slug: ensureSlug(slug) },
    });
    if (!existing) {
        throw errors_1.AppError.notFound("Footer page draft not found");
    }
    const draft = footerPage_1.footerPageContentSchema.parse(existing.draftContent);
    const record = await client_2.prisma.footerPage.update({
        where: { slug },
        data: {
            publishedContent: draft,
            status: client_1.FooterPageStatus.PUBLISHED,
            publishedAt: new Date(),
            publishedById: userId,
        },
    });
    return mapRecord(record);
}
async function getPublishedFooterPages() {
    const pages = await client_2.prisma.footerPage.findMany({
        where: { publishedContent: { not: client_1.Prisma.DbNull } },
    });
    return pages
        .map((page) => ({
        slug: ensureSlug(page.slug),
        content: parseContent(page.publishedContent),
    }))
        .filter((item) => item.content !== null);
}
async function getPublishedFooterPage(slug) {
    const page = await client_2.prisma.footerPage.findUnique({
        where: { slug: ensureSlug(slug) },
    });
    if (!page || !page.publishedContent) {
        return null;
    }
    return {
        slug: ensureSlug(page.slug),
        content: footerPage_1.footerPageContentSchema.parse(page.publishedContent),
    };
}
//# sourceMappingURL=footerPageService.js.map