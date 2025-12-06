import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import arLocale from '../i18n/locales/ar.json';
import enLocale from '../i18n/locales/en.json';
import {
  FooterPageContent,
  FooterPageKey,
  LocalizedField,
} from '../types/staticPages';

type LocalePages = Record<FooterPageKey, any>;

const localeAr = (arLocale.pages ?? {}) as LocalePages;
const localeEn = (enLocale.pages ?? {}) as LocalePages;

const pageIcons: Record<FooterPageKey, string> = {
  about: '🌿',
  authenticity: '🪪',
  'how-it-works': '⚙️',
  help: '💡',
  'help-buying-preowned': '🧴',
  'help-bidding-guide': '🔨',
  shipping: '🚚',
  returns: '↩️',
  privacy: '🔐',
  terms: '📜',
  contact: '💬',
};

const heroImages: Record<FooterPageKey, string> = {
  about: 'https://images.unsplash.com/photo-1501927023255-9063be98970f?auto=format&fit=crop&w=1200&q=60',
  authenticity: 'https://images.unsplash.com/photo-1435773658541-98cedf12d3cd?auto=format&fit=crop&w=1200&q=60',
  'how-it-works': 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=60',
  help: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=60',
  'help-buying-preowned': 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=60',
  'help-bidding-guide': 'https://images.unsplash.com/photo-1518544889280-37f4ca38e4b0?auto=format&fit=crop&w=1200&q=60',
  shipping: 'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=1200&q=60',
  returns: 'https://images.unsplash.com/photo-1515165562835-c4c1bfa1e66b?auto=format&fit=crop&w=1200&q=60',
  privacy: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=60',
  terms: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=60',
  contact: 'https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=1200&q=60',
};

const pageKeys: FooterPageKey[] = [
  'about',
  'authenticity',
  'how-it-works',
  'help',
  'help-buying-preowned',
  'help-bidding-guide',
  'shipping',
  'returns',
  'privacy',
  'terms',
  'contact',
];

const nowISO = () => new Date().toISOString();

const localized = (slug: FooterPageKey, getter: (entry: any) => string): LocalizedField => ({
  ar: getter(localeAr[slug]) ?? '',
  en: getter(localeEn[slug]) ?? '',
});

const buildDefaultSection = (slug: FooterPageKey) => {
  const arEntry = localeAr[slug] ?? {};
  const enEntry = localeEn[slug] ?? {};
  const joinBody = (entry: any) => {
    const body = entry?.body ?? {};
    const p1 = body?.p1 ?? '';
    const p2 = body?.p2 ?? '';
    return [p1, p2].filter(Boolean).join('\n\n').trim();
  };

  const highlightKeys: Array<'l1' | 'l2' | 'l3'> = ['l1', 'l2', 'l3'];
  const highlights = highlightKeys
    .map((key) => ({
      ar: arEntry?.body?.[key] ?? '',
      en: enEntry?.body?.[key] ?? '',
    }))
    .filter((item) => item.ar || item.en);

  return {
    id: `${slug}-primary`,
    title: localized(slug, (entry) => entry?.body?.p1 ?? entry?.title ?? ''),
    body: {
      ar: joinBody(arEntry),
      en: joinBody(enEntry),
    },
    image: heroImages[slug],
    highlights,
  };
};

const defaultFooterPages = pageKeys.reduce<Record<FooterPageKey, FooterPageContent>>(
  (acc, slug) => {
    acc[slug] = {
      slug,
      icon: pageIcons[slug] ?? '📄',
      label: localized(slug, (entry) => entry?.title ?? slug),
      heroTitle: localized(slug, (entry) => entry?.title ?? slug),
      heroSubtitle: localized(slug, (entry) => entry?.desc ?? ''),
      heroImage: heroImages[slug],
      seoDescription: localized(slug, (entry) => entry?.desc ?? ''),
      sections: [buildDefaultSection(slug)],
      lastUpdated: nowISO(),
    };
    return acc;
  },
  {} as Record<FooterPageKey, FooterPageContent>
);

interface PagesState {
  pages: Record<FooterPageKey, FooterPageContent>;
  updatePageContent: (slug: FooterPageKey, updates: Partial<FooterPageContent>) => void;
  resetPage: (slug: FooterPageKey) => void;
}

export const usePagesStore = create<PagesState>()(
  persist(
    (set) => ({
      pages: defaultFooterPages,
      updatePageContent: (slug, updates) => {
        set((state) => {
          const current = state.pages[slug];
          if (!current) return state;
          const updated: FooterPageContent = {
            ...current,
            ...updates,
            lastUpdated: nowISO(),
          };
          return {
            pages: {
              ...state.pages,
              [slug]: updated,
            },
          };
        });
      },
      resetPage: (slug) => {
        set((state) => ({
          pages: {
            ...state.pages,
            [slug]: { ...defaultFooterPages[slug], lastUpdated: nowISO() },
          },
        }));
      },
    }),
    {
      name: 'otoor-footer-pages',
    }
  )
);

export const footerPageList = pageKeys.map((slug) => defaultFooterPages[slug]);
