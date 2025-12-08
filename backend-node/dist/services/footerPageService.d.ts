import { FooterPageStatus } from "@prisma/client";
import { FooterPageContent, FooterPageKey } from "../types/footerPage";
type FooterPageRecord = {
    slug: FooterPageKey;
    status: FooterPageStatus;
    draftContent: FooterPageContent;
    publishedContent: FooterPageContent | null;
    updatedAt: Date;
    publishedAt: Date | null;
};
export declare function listFooterPages(): Promise<FooterPageRecord[]>;
export declare function getFooterPage(slug: string): Promise<FooterPageRecord | null>;
export declare function saveFooterPageDraft(slug: string, content: FooterPageContent, userId: number): Promise<FooterPageRecord>;
export declare function publishFooterPage(slug: string, userId: number): Promise<FooterPageRecord>;
export declare function getPublishedFooterPages(): Promise<{
    slug: "shipping" | "about" | "authenticity" | "how-it-works" | "help" | "help-buying-preowned" | "help-bidding-guide" | "returns" | "privacy" | "terms" | "contact";
    content: {
        slug: "shipping" | "about" | "authenticity" | "how-it-works" | "help" | "help-buying-preowned" | "help-bidding-guide" | "returns" | "privacy" | "terms" | "contact";
        icon: string;
        label: {
            ar: string;
            en: string;
        };
        heroTitle: {
            ar: string;
            en: string;
        };
        heroSubtitle: {
            ar: string;
            en: string;
        };
        heroImage: string;
        seoDescription: {
            ar: string;
            en: string;
        };
        sections: {
            id: string;
            title: {
                ar: string;
                en: string;
            };
            body: {
                ar: string;
                en: string;
            };
            highlights: {
                ar: string;
                en: string;
            }[];
            image?: string | undefined;
        }[];
        lastUpdated?: string | undefined;
    } | null;
}[]>;
export declare function getPublishedFooterPage(slug: string): Promise<{
    slug: "shipping" | "about" | "authenticity" | "how-it-works" | "help" | "help-buying-preowned" | "help-bidding-guide" | "returns" | "privacy" | "terms" | "contact";
    content: {
        slug: "shipping" | "about" | "authenticity" | "how-it-works" | "help" | "help-buying-preowned" | "help-bidding-guide" | "returns" | "privacy" | "terms" | "contact";
        icon: string;
        label: {
            ar: string;
            en: string;
        };
        heroTitle: {
            ar: string;
            en: string;
        };
        heroSubtitle: {
            ar: string;
            en: string;
        };
        heroImage: string;
        seoDescription: {
            ar: string;
            en: string;
        };
        sections: {
            id: string;
            title: {
                ar: string;
                en: string;
            };
            body: {
                ar: string;
                en: string;
            };
            highlights: {
                ar: string;
                en: string;
            }[];
            image?: string | undefined;
        }[];
        lastUpdated?: string | undefined;
    };
} | null>;
export {};
//# sourceMappingURL=footerPageService.d.ts.map