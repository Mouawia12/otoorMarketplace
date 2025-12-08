"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.footerPageContentSchema = exports.footerPageSectionSchema = exports.localizedFieldSchema = exports.footerPageKeys = void 0;
const zod_1 = require("zod");
exports.footerPageKeys = [
    "about",
    "authenticity",
    "how-it-works",
    "help",
    "help-buying-preowned",
    "help-bidding-guide",
    "shipping",
    "returns",
    "privacy",
    "terms",
    "contact",
];
exports.localizedFieldSchema = zod_1.z.object({
    ar: zod_1.z.string(),
    en: zod_1.z.string(),
});
exports.footerPageSectionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: exports.localizedFieldSchema,
    body: exports.localizedFieldSchema,
    image: zod_1.z.string().optional(),
    highlights: zod_1.z.array(exports.localizedFieldSchema),
});
exports.footerPageContentSchema = zod_1.z.object({
    slug: zod_1.z.enum(exports.footerPageKeys),
    icon: zod_1.z.string(),
    label: exports.localizedFieldSchema,
    heroTitle: exports.localizedFieldSchema,
    heroSubtitle: exports.localizedFieldSchema,
    heroImage: zod_1.z.string(),
    seoDescription: exports.localizedFieldSchema,
    sections: zod_1.z.array(exports.footerPageSectionSchema),
    lastUpdated: zod_1.z.string().optional(),
});
//# sourceMappingURL=footerPage.js.map