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

const ARABIC_PREFIXES = ["ال", "وال", "بال", "لل", "فال", "كال"] as const;
const ARABIC_SUFFIXES = [
  "يات",
  "ات",
  "ون",
  "ين",
  "ان",
  "ة",
  "ه",
  "ي",
] as const;

const stripArabicPrefix = (token: string) => {
  for (const prefix of ARABIC_PREFIXES) {
    if (token.startsWith(prefix) && token.length - prefix.length >= 2) {
      return token.slice(prefix.length);
    }
  }
  return token;
};

const stripArabicSuffix = (token: string) => {
  for (const suffix of ARABIC_SUFFIXES) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 2) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
};

const normalizeArabicTokenVariants = (token: string) => {
  const base = normalizeSearchText(token);
  if (!base) return [];

  const variants = new Set<string>([base]);
  const withoutPrefix = stripArabicPrefix(base);
  variants.add(withoutPrefix);
  variants.add(stripArabicSuffix(base));
  variants.add(stripArabicSuffix(withoutPrefix));

  return Array.from(variants).filter((value) => value.length >= 2);
};

const buildArabicTokenCombinations = (normalized: string) => {
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length === 0) return [];

  const perTokenVariants = tokens.map((token) => normalizeArabicTokenVariants(token));
  if (perTokenVariants.some((variants) => variants.length === 0)) {
    return [];
  }

  const combinations: string[] = [];

  const backtrack = (index: number, parts: string[]) => {
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

    for (const combo of buildArabicTokenCombinations(normalized)) {
      variants.add(combo);
    }
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
