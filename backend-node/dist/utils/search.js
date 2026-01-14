"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSearchVariants = void 0;
const transliteration_1 = require("transliteration");
const ARABIC_DIACRITICS = /[\u064B-\u0652\u0670]/g;
const ARABIC_TATWEEL = /\u0640/g;
const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();
const normalizeArabic = (value) => value
    .replace(ARABIC_DIACRITICS, "")
    .replace(ARABIC_TATWEEL, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه");
const stripLatinDiacritics = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const sanitize = (value) => value.replace(/[^0-9a-zA-Z\u0600-\u06FF\s]/g, " ");
const normalizeSearchText = (value) => {
    const sanitized = sanitize(value);
    const normalized = normalizeArabic(stripLatinDiacritics(sanitized));
    return normalizeWhitespace(normalized.toLowerCase());
};
const buildSearchVariants = (input) => {
    const raw = normalizeWhitespace(input);
    if (!raw) {
        return [];
    }
    const variants = new Set();
    variants.add(raw);
    const normalized = normalizeSearchText(raw);
    if (normalized) {
        variants.add(normalized);
    }
    const lower = raw.toLowerCase();
    if (lower) {
        variants.add(lower);
    }
    const transliterated = (0, transliteration_1.transliterate)(raw);
    if (transliterated && transliterated !== raw) {
        const normalizedTranslit = normalizeSearchText(transliterated);
        if (normalizedTranslit) {
            variants.add(normalizedTranslit);
        }
    }
    return Array.from(variants).filter(Boolean);
};
exports.buildSearchVariants = buildSearchVariants;
//# sourceMappingURL=search.js.map