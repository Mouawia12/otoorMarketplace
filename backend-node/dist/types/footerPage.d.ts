import { z } from "zod";
export declare const footerPageKeys: readonly ["about", "authenticity", "how-it-works", "help", "help-buying-preowned", "help-bidding-guide", "shipping", "returns", "privacy", "terms", "contact"];
export type FooterPageKey = (typeof footerPageKeys)[number];
export declare const localizedFieldSchema: z.ZodObject<{
    ar: z.ZodString;
    en: z.ZodString;
}, z.core.$strip>;
export declare const footerPageSectionSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodObject<{
        ar: z.ZodString;
        en: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        ar: z.ZodString;
        en: z.ZodString;
    }, z.core.$strip>;
    image: z.ZodOptional<z.ZodString>;
    highlights: z.ZodArray<z.ZodObject<{
        ar: z.ZodString;
        en: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const footerPageContentSchema: z.ZodObject<{
    slug: z.ZodEnum<{
        shipping: "shipping";
        about: "about";
        authenticity: "authenticity";
        "how-it-works": "how-it-works";
        help: "help";
        "help-buying-preowned": "help-buying-preowned";
        "help-bidding-guide": "help-bidding-guide";
        returns: "returns";
        privacy: "privacy";
        terms: "terms";
        contact: "contact";
    }>;
    icon: z.ZodString;
    label: z.ZodObject<{
        ar: z.ZodString;
        en: z.ZodString;
    }, z.core.$strip>;
    heroTitle: z.ZodObject<{
        ar: z.ZodString;
        en: z.ZodString;
    }, z.core.$strip>;
    heroSubtitle: z.ZodObject<{
        ar: z.ZodString;
        en: z.ZodString;
    }, z.core.$strip>;
    heroImage: z.ZodString;
    seoDescription: z.ZodObject<{
        ar: z.ZodString;
        en: z.ZodString;
    }, z.core.$strip>;
    sections: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodObject<{
            ar: z.ZodString;
            en: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            ar: z.ZodString;
            en: z.ZodString;
        }, z.core.$strip>;
        image: z.ZodOptional<z.ZodString>;
        highlights: z.ZodArray<z.ZodObject<{
            ar: z.ZodString;
            en: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    lastUpdated: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type FooterPageContent = z.infer<typeof footerPageContentSchema>;
//# sourceMappingURL=footerPage.d.ts.map