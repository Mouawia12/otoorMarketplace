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

export const normalizeSearchText = (value: string) => {
  if (!value) return "";
  const sanitized = sanitize(value);
  const normalized = normalizeArabic(stripLatinDiacritics(sanitized));
  return normalizeWhitespace(normalized.toLowerCase());
};

export const matchesSearch = (text: string, query: string) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const normalizedText = normalizeSearchText(text);
  return normalizedText.includes(normalizedQuery);
};
