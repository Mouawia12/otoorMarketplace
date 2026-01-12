import { transliterate } from "transliteration";

const ARABIC_DIACRITICS = /[\u064B-\u0652\u0670]/g;
const ARABIC_TATWEEL = /\u0640/g;

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const normalizeArabic = (value: string) =>
  value
    .replace(ARABIC_DIACRITICS, "")
    .replace(ARABIC_TATWEEL, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه");

const stripLatinDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const sanitize = (value: string) =>
  value.replace(/[^0-9a-zA-Z\u0600-\u06FF\s]/g, " ");

const normalizeSearchText = (value: string) => {
  const sanitized = sanitize(value);
  const normalized = normalizeArabic(stripLatinDiacritics(sanitized));
  return normalizeWhitespace(normalized.toLowerCase());
};

export const buildSearchVariants = (input: string) => {
  const raw = normalizeWhitespace(input);
  if (!raw) {
    return [];
  }

  const variants = new Set<string>();
  variants.add(raw);

  const normalized = normalizeSearchText(raw);
  if (normalized) {
    variants.add(normalized);
  }

  const lower = raw.toLowerCase();
  if (lower) {
    variants.add(lower);
  }

  const transliterated = transliterate(raw);
  if (transliterated && transliterated !== raw) {
    const normalizedTranslit = normalizeSearchText(transliterated);
    if (normalizedTranslit) {
      variants.add(normalizedTranslit);
    }
  }

  return Array.from(variants).filter(Boolean);
};
