import { z } from "zod";

export const footerPageKeys = [
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
] as const;

export type FooterPageKey = (typeof footerPageKeys)[number];

export const localizedFieldSchema = z.object({
  ar: z.string(),
  en: z.string(),
});

export const footerPageSectionSchema = z.object({
  id: z.string(),
  title: localizedFieldSchema,
  body: localizedFieldSchema,
  image: z.string().optional(),
  highlights: z.array(localizedFieldSchema),
});

export const footerPageContentSchema = z.object({
  slug: z.enum(footerPageKeys),
  icon: z.string(),
  label: localizedFieldSchema,
  heroTitle: localizedFieldSchema,
  heroSubtitle: localizedFieldSchema,
  heroImage: z.string(),
  seoDescription: localizedFieldSchema,
  sections: z.array(footerPageSectionSchema),
  lastUpdated: z.string().optional(),
});

export type FooterPageContent = z.infer<typeof footerPageContentSchema>;
