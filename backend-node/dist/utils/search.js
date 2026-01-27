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
const ARABIC_PREFIXES = ["ال", "وال", "بال", "لل", "فال", "كال"];
const ARABIC_SUFFIXES = [
    "يات",
    "ات",
    "ون",
    "ين",
    "ان",
    "ة",
    "ه",
    "ي",
];
const stripArabicPrefix = (token) => {
    for (const prefix of ARABIC_PREFIXES) {
        if (token.startsWith(prefix) && token.length - prefix.length >= 2) {
            return token.slice(prefix.length);
        }
    }
    return token;
};
const stripArabicSuffix = (token) => {
    for (const suffix of ARABIC_SUFFIXES) {
        if (token.endsWith(suffix) && token.length - suffix.length >= 2) {
            return token.slice(0, -suffix.length);
        }
    }
    return token;
};
const normalizeArabicTokenVariants = (token) => {
    const base = normalizeSearchText(token);
    if (!base)
        return [];
    const variants = new Set([base]);
    const withoutPrefix = stripArabicPrefix(base);
    variants.add(withoutPrefix);
    variants.add(stripArabicSuffix(base));
    variants.add(stripArabicSuffix(withoutPrefix));
    return Array.from(variants).filter((value) => value.length >= 2);
};
const buildArabicTokenCombinations = (normalized) => {
    const tokens = normalized.split(" ").filter(Boolean);
    if (tokens.length === 0)
        return [];
    const perTokenVariants = tokens.map((token) => normalizeArabicTokenVariants(token));
    if (perTokenVariants.some((variants) => variants.length === 0)) {
        return [];
    }
    const combinations = [];
    const backtrack = (index, parts) => {
        if (index === perTokenVariants.length) {
            combinations.push(parts.join(" "));
            return;
        }
        const variantsForToken = perTokenVariants[index];
        if (!variantsForToken) {
            return;
        }
        for (const variant of variantsForToken) {
            backtrack(index + 1, [...parts, variant]);
        }
    };
    backtrack(0, []);
    return combinations;
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
        for (const combo of buildArabicTokenCombinations(normalized)) {
            variants.add(combo);
        }
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