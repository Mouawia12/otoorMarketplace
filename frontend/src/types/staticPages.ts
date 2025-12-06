export type FooterPageKey =
  | 'about'
  | 'authenticity'
  | 'how-it-works'
  | 'help'
  | 'help-buying-preowned'
  | 'help-bidding-guide'
  | 'shipping'
  | 'returns'
  | 'privacy'
  | 'terms'
  | 'contact';

export type LocaleCode = 'ar' | 'en';

export interface LocalizedField {
  ar: string;
  en: string;
}

export interface FooterPageSection {
  id: string;
  title: LocalizedField;
  body: LocalizedField;
  image?: string;
  highlights: LocalizedField[];
}

export interface FooterPageContent {
  slug: FooterPageKey;
  label: LocalizedField;
  icon: string;
  heroTitle: LocalizedField;
  heroSubtitle: LocalizedField;
  heroImage: string;
  seoDescription: LocalizedField;
  sections: FooterPageSection[];
  lastUpdated: string;
}
