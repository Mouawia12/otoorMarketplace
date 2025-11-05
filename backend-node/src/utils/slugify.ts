import { slugify } from "transliteration";

export const makeSlug = (value: string) => {
  const base = slugify(value, { lowercase: true, separator: "-" });
  return base.replace(/-+/g, "-");
};
